import { insertRow, selectRows } from './supabaseClient.js';
import { APP_VERSION, BALANCE_VERSION } from '../version.js';
import { buildBattleResult } from './battleResultSerializer.js';

const BATTLE_RESULTS_KEY = 'reelquest:battle_results:v1';
const MAX_LOCAL_RESULTS = 100000;
const MAX_LOCAL_PERSISTED_RESULTS = 300;
const MAX_AGGREGATE_ROWS = 100000;
const STATS_SYNC_CACHE_MS = 60 * 1000;
const STATS_SELECT_COLUMNS = [
    'id',
    'mode',
    'floor',
    'winner',
    'player_party_slots',
    'enemy_party_slots',
    'player_set_bonuses',
    'enemy_set_bonuses',
    'player_relics',
    'enemy_relics',
    'game_version',
    'balance_version',
    'ranked',
    'created_at'
].join(',');
const LEGACY_STATS_SELECT_COLUMNS = STATS_SELECT_COLUMNS
    .split(',')
    .filter(column => column !== 'player_relics' && column !== 'enemy_relics')
    .join(',');
const AGGREGATE_SELECT_COLUMNS = {
    character_global_stats: 'character_id,side,mode,floor,balance_version,wins,losses,uses',
    character_pair_stats: 'character_a_id,character_b_id,side,mode,floor,balance_version,wins,losses,uses',
    species_set_stats: 'species,tier,side,mode,floor,balance_version,wins,losses,uses',
    character_species_set_stats: 'character_id,species,tier,side,mode,floor,balance_version,wins,losses,uses',
    relic_stats: 'relic_id,side,mode,floor,balance_version,wins,losses,uses'
};

function createEmptyAggregateStatsCache() {
    return {
        global: null,
        pair: null,
        speciesSet: null,
        characterSpeciesSet: null,
        relic: null,
        loaded: false,
        detailLoaded: false,
        detailCharacters: new Set()
    };
}

let battleResultsCache = null;
let lastSupabaseSyncAt = 0;
let aggregateStatsCache = createEmptyAggregateStatsCache();

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || '') || fallback;
    } catch (e) {
        return fallback;
    }
}

function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Local battle result cache is full. Keeping data in memory for this session.');
    }
}

function getCachedResults() {
    if (battleResultsCache) return battleResultsCache;
    battleResultsCache = readJson(BATTLE_RESULTS_KEY, []);
    return battleResultsCache;
}

function setCachedResults(results) {
    battleResultsCache = results.slice(-MAX_LOCAL_RESULTS);
    writeJson(BATTLE_RESULTS_KEY, battleResultsCache.slice(-MAX_LOCAL_PERSISTED_RESULTS));
    return battleResultsCache;
}

function appendCachedResults(results = []) {
    if (!results.length) return getCachedResults();
    const cache = getCachedResults();
    cache.push(...results);
    if (cache.length > MAX_LOCAL_RESULTS) {
        cache.splice(0, cache.length - MAX_LOCAL_RESULTS);
    }
    writeJson(BATTLE_RESULTS_KEY, cache.slice(-MAX_LOCAL_PERSISTED_RESULTS));
    return cache;
}

function toBattleResult(gameState) {
    return buildBattleResult(gameState);
}

export async function submitBattleResult(gameState) {
    if (!gameState || gameState.statsSubmitted) return null;
    const result = toBattleResult(gameState);
    appendCachedResults([result]);
    try {
        await insertRow('battle_results', result);
        aggregateStatsCache.loaded = false;
    } catch (e) {
        console.warn('Supabase battle_results insert failed. Kept local result instead.');
    }
    gameState.statsSubmitted = true;
    return result;
}

export function getBattleResults() {
    return getCachedResults();
}

export function clearLocalStatsCache() {
    battleResultsCache = [];
    lastSupabaseSyncAt = 0;
    aggregateStatsCache = createEmptyAggregateStatsCache();
    try {
        localStorage.removeItem(BATTLE_RESULTS_KEY);
        localStorage.removeItem('reelquest:ranked_parties:v1');
        localStorage.removeItem('reelquest:ranked_profile:v1');
    } catch (e) {
        console.warn('Failed to clear local stats cache.');
    }
}

function mergeBattleResults(remoteResults = []) {
    const localResults = getCachedResults();
    const byId = new Map(localResults.map(result => [result.id, result]));
    remoteResults.forEach(result => byId.set(result.id, result));
    const merged = [...byId.values()].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    return setCachedResults(merged);
}

function buildAggregateBaseQuery(table) {
    const columns = AGGREGATE_SELECT_COLUMNS[table] || '*';
    return `?select=${columns}&game_version=eq.${encodeURIComponent(APP_VERSION)}`;
}

function getAggregateRowKey(table, row) {
    if (table === 'character_pair_stats') {
        return [
            row.character_a_id,
            row.character_b_id,
            row.side,
            row.mode,
            row.floor,
            row.balance_version
        ].join('__');
    }
    if (table === 'character_species_set_stats') {
        return [
            row.character_id,
            row.species,
            row.tier,
            row.side,
            row.mode,
            row.floor,
            row.balance_version
        ].join('__');
    }
    return JSON.stringify(row);
}

function mergeAggregateRows(table, currentRows = [], nextRows = []) {
    const byKey = new Map(currentRows.map(row => [getAggregateRowKey(table, row), row]));
    nextRows.forEach(row => byKey.set(getAggregateRowKey(table, row), row));
    return [...byKey.values()];
}

function buildCharacterPairFilter(characterId) {
    const safeId = encodeURIComponent(characterId);
    return `&or=(character_a_id.eq.${safeId},character_b_id.eq.${safeId})`;
}

async function syncAggregatedStatsFromSupabase(options = {}) {
    try {
        const needsSummary = !aggregateStatsCache.loaded;
        const detailCharacterId = options.detailCharacterId || null;
        const needsDetail = !!options.includeDetailStats
            && (detailCharacterId
                ? !aggregateStatsCache.detailCharacters.has(detailCharacterId)
                : !aggregateStatsCache.detailLoaded);
        if (!needsSummary && !needsDetail) {
            lastSupabaseSyncAt = Date.now();
            return true;
        }

        if (needsSummary) {
            const [globalRows, speciesSetRows, relicRows] = await Promise.all([
                selectAggregateRows('character_global_stats'),
                selectAggregateRows('species_set_stats'),
                selectAggregateRows('relic_stats')
            ]);
            aggregateStatsCache = {
                ...aggregateStatsCache,
                global: globalRows || [],
                speciesSet: speciesSetRows || [],
                relic: relicRows || [],
                loaded: true
            };
        }

        if (needsDetail) {
            const pairFilter = detailCharacterId ? buildCharacterPairFilter(detailCharacterId) : '';
            const characterSetFilter = detailCharacterId ? `&character_id=eq.${encodeURIComponent(detailCharacterId)}` : '';
            const [pairRows, characterSpeciesSetRows] = await Promise.all([
                selectAggregateRows('character_pair_stats', pairFilter),
                selectAggregateRows('character_species_set_stats', characterSetFilter)
            ]);
            const nextDetailCharacters = new Set(aggregateStatsCache.detailCharacters);
            if (detailCharacterId) nextDetailCharacters.add(detailCharacterId);
            aggregateStatsCache = {
                ...aggregateStatsCache,
                pair: detailCharacterId
                    ? mergeAggregateRows('character_pair_stats', aggregateStatsCache.pair || [], pairRows || [])
                    : pairRows || [],
                characterSpeciesSet: detailCharacterId
                    ? mergeAggregateRows('character_species_set_stats', aggregateStatsCache.characterSpeciesSet || [], characterSpeciesSetRows || [])
                    : characterSpeciesSetRows || [],
                detailLoaded: !detailCharacterId,
                detailCharacters: nextDetailCharacters
            };
        }
        lastSupabaseSyncAt = Date.now();
        return true;
    } catch (e) {
        aggregateStatsCache.loaded = false;
        aggregateStatsCache.detailLoaded = false;
        console.warn('Supabase aggregate stats select failed. Falling back to raw battle results.');
        return false;
    }
}

async function selectAggregateRows(table, extraQuery = '') {
    const pageSize = 1000;
    const rows = [];
    const baseQuery = `${buildAggregateBaseQuery(table)}${extraQuery}`;
    for (let offset = 0; offset < MAX_AGGREGATE_ROWS; offset += pageSize) {
        const page = await selectRows(table, `${baseQuery}&limit=${pageSize}&offset=${offset}`);
        if (!page?.length) break;
        rows.push(...page);
        if (page.length < pageSize) break;
    }
    return rows;
}

async function fetchRemoteBattleResults(columns) {
    const pageSize = 1000;
    const remoteResults = [];
    for (let offset = 0; offset < MAX_LOCAL_RESULTS; offset += pageSize) {
        const query = [
            `?select=${columns}`,
            `&game_version=eq.${encodeURIComponent(APP_VERSION)}`,
            '&order=created_at.desc',
            `&limit=${pageSize}`,
            `&offset=${offset}`
        ].join('');
        const page = await selectRows('battle_results', query);
        if (!page?.length) break;
        remoteResults.push(...page);
        if (page.length < pageSize) break;
    }
    return remoteResults;
}

export async function syncBattleResultsFromSupabase(options = {}) {
    const includeDetailStats = !!options.includeDetailStats;
    const detailCharacterId = options.detailCharacterId || null;
    const includeRawResults = !!options.includeRawResults;
    if (
        !includeRawResults
        &&
        battleResultsCache?.length
        && Date.now() - lastSupabaseSyncAt < STATS_SYNC_CACHE_MS
        && (!includeDetailStats
            || aggregateStatsCache.detailLoaded
            || (detailCharacterId && aggregateStatsCache.detailCharacters.has(detailCharacterId)))
    ) {
        return battleResultsCache;
    }

    if (!includeRawResults && await syncAggregatedStatsFromSupabase({ includeDetailStats, detailCharacterId })) {
        return getBattleResults();
    }

    try {
        const remoteResults = await fetchRemoteBattleResults(STATS_SELECT_COLUMNS);
        lastSupabaseSyncAt = Date.now();
        return mergeBattleResults(remoteResults);
    } catch (e) {
        try {
            const remoteResults = await fetchRemoteBattleResults(LEGACY_STATS_SELECT_COLUMNS);
            lastSupabaseSyncAt = Date.now();
            return mergeBattleResults(remoteResults);
        } catch (legacyError) {
            console.warn('Supabase battle_results select failed. Using local results instead.');
            return getBattleResults();
        }
    }
}

export async function submitBattleResults(results = [], options = {}) {
    const safeResults = results.filter(Boolean);
    if (!safeResults.length) return [];

    appendCachedResults(safeResults);

    // Supabase free tier can time out when insert triggers aggregate too many rows at once.
    const chunkSize = Math.max(20, Math.min(1000, Number(options.chunkSize || 20)));
    const concurrency = Math.max(1, Math.min(4, Number(options.concurrency || 3)));
    const chunks = [];
    for (let i = 0; i < safeResults.length; i += chunkSize) {
        chunks.push(safeResults.slice(i, i + chunkSize));
    }
    await runWithConcurrency(chunks, concurrency, insertBattleResultChunk);

    return safeResults;
}

async function runWithConcurrency(items = [], concurrency = 1, worker) {
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (cursor < items.length) {
            const item = items[cursor];
            cursor += 1;
            await worker(item);
        }
    });
    await Promise.all(workers);
}

async function insertBattleResultChunk(chunk = []) {
    try {
        await insertRow('battle_results', chunk);
        aggregateStatsCache.loaded = false;
    } catch (e) {
        if (chunk.length <= 1) {
            console.error('Supabase battle_results insert failed. This generated result was kept locally only.', e);
            return;
        }

        const midpoint = Math.ceil(chunk.length / 2);
        console.warn(`Supabase battle_results bulk insert timed out. Retrying as ${midpoint}/${chunk.length - midpoint}.`, e);
        await insertBattleResultChunk(chunk.slice(0, midpoint));
        await insertBattleResultChunk(chunk.slice(midpoint));
    }
}

function matchesFilters(result, filters = {}) {
    if (filters.mode && result.mode !== filters.mode) return false;
    if (filters.floor && result.floor !== Number(filters.floor)) return false;
    if (filters.rank && result.ranked?.rank !== filters.rank) return false;
    if (filters.balanceVersion && (result.balance_version || 'unknown') !== filters.balanceVersion) return false;
    return true;
}

function filterByMinUses(records, filters = {}) {
    const minUses = Math.max(0, Number(filters.minUses || 0));
    if (!minUses) return records;
    return records.filter(record => Number(record.uses || 0) >= minUses);
}

export function getAvailableBalanceVersions() {
    const versions = new Set([
        ...(aggregateStatsCache.global || []).map(row => row.balance_version || 'unknown'),
        ...getBattleResults().map(result => result.balance_version || 'unknown')
    ]);
    versions.add(BALANCE_VERSION);
    return [...versions].sort((a, b) => {
        if (a === BALANCE_VERSION) return -1;
        if (b === BALANCE_VERSION) return 1;
        return String(b).localeCompare(String(a));
    });
}

function matchesAggregateFilters(row, filters = {}, options = {}) {
    if (filters.mode && row.mode !== filters.mode) return false;
    if (filters.balanceVersion && row.balance_version !== filters.balanceVersion) return false;
    const side = filters.side && filters.side !== 'all' ? filters.side : 'all';
    if (row.side !== side) return false;
    if (options.ignoreFloor) return Number(row.floor) > 0;
    const floor = filters.floor ? Number(filters.floor) : 0;
    return Number(row.floor) === floor;
}

function aggregateRows(rows = [], getId, filters = {}, options = {}) {
    const stats = new Map();
    rows.filter(row => matchesAggregateFilters(row, filters, options)).forEach(row => {
        const id = getId(row);
        const record = stats.get(id) || { id, wins: 0, losses: 0, uses: 0 };
        record.wins += Number(row.wins || 0);
        record.losses += Number(row.losses || 0);
        record.uses += Number(row.uses || 0);
        record.winRate = record.uses > 0 ? record.wins / record.uses : 0;
        stats.set(id, record);
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses);
}

function getSetKey(row) {
    return `${row.species}__${row.tier}`;
}

function aggregateSetRows(rows = [], filters = {}) {
    const stats = new Map();
    rows.filter(row => matchesAggregateFilters(row, filters)).forEach(row => {
        const id = getSetKey(row);
        const record = stats.get(id) || {
            id,
            species: row.species,
            tier: Number(row.tier || 0),
            wins: 0,
            losses: 0,
            uses: 0
        };
        record.wins += Number(row.wins || 0);
        record.losses += Number(row.losses || 0);
        record.uses += Number(row.uses || 0);
        record.winRate = record.uses > 0 ? record.wins / record.uses : 0;
        stats.set(id, record);
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses || String(a.species).localeCompare(String(b.species)));
}

function updateRecord(map, key, won) {
    const record = map.get(key) || { id: key, wins: 0, losses: 0, uses: 0 };
    record.uses += 1;
    if (won === true) record.wins += 1;
    else if (won === false) record.losses += 1;
    record.winRate = record.uses > 0 ? record.wins / record.uses : 0;
    map.set(key, record);
}

function getPartyOutcome(result, side) {
    if (result.winner === 'draw') return null;
    return result.winner === side;
}

function getResultSideEntries(result, filters = {}) {
    return [
        { side: 'player', slots: result.player_party_slots || [] },
        { side: 'enemy', slots: result.enemy_party_slots || [] }
    ].filter(entry => !filters.side || filters.side === 'all' || entry.side === filters.side);
}

function getResultRelicEntries(result, filters = {}) {
    return [
        { side: 'player', relics: result.player_relics || result.relics || [] },
        { side: 'enemy', relics: result.enemy_relics || [] }
    ].filter(entry => !filters.side || filters.side === 'all' || entry.side === filters.side);
}

export function getCharacterStats(filters = {}) {
    if (aggregateStatsCache.loaded) {
        return aggregateRows(aggregateStatsCache.global, row => row.character_id, filters);
    }

    const stats = new Map();
    getBattleResults().filter(result => matchesFilters(result, filters)).forEach(result => {
        getResultSideEntries(result, filters).forEach(({ side, slots }) => {
            const won = getPartyOutcome(result, side);
            slots.forEach(slot => updateRecord(stats, slot.character_id, won));
        });
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses);
}

function getPairKey(a, b) {
    return [a, b].sort().join('__');
}

export function getCharacterPairStats(characterId, filters = {}) {
    if (
        aggregateStatsCache.loaded
        && (aggregateStatsCache.detailLoaded || aggregateStatsCache.detailCharacters.has(characterId))
    ) {
        return aggregateRows(
            aggregateStatsCache.pair.filter(row => row.character_a_id === characterId || row.character_b_id === characterId),
            row => row.character_a_id === characterId ? row.character_b_id : row.character_a_id,
            filters
        );
    }

    const stats = new Map();
    getBattleResults().filter(result => matchesFilters(result, filters)).forEach(result => {
        getResultSideEntries(result, filters).forEach(({ side, slots }) => {
            const won = getPartyOutcome(result, side);
            const ids = slots.map(slot => slot.character_id);
            if (!ids.includes(characterId)) return;
            ids.filter(id => id !== characterId).forEach(partnerId => {
                const key = getPairKey(characterId, partnerId);
                const record = stats.get(key) || { id: partnerId, wins: 0, losses: 0, uses: 0 };
                record.uses += 1;
                if (won === true) record.wins += 1;
                else if (won === false) record.losses += 1;
                record.winRate = record.uses > 0 ? record.wins / record.uses : 0;
                stats.set(key, record);
            });
        });
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses);
}

export function getSpeciesSetStats(filters = {}) {
    if (aggregateStatsCache.loaded) {
        return aggregateSetRows(aggregateStatsCache.speciesSet, filters);
    }

    const stats = new Map();
    getBattleResults().filter(result => matchesFilters(result, filters)).forEach(result => {
        [
            { side: 'player', setBonuses: result.player_set_bonuses || [] },
            { side: 'enemy', setBonuses: result.enemy_set_bonuses || [] }
        ].filter(entry => !filters.side || filters.side === 'all' || entry.side === filters.side)
            .forEach(({ side, setBonuses }) => {
                const won = getPartyOutcome(result, side);
                setBonuses.forEach(setBonus => {
                    const id = `${setBonus.species}__${setBonus.tier}`;
                    const record = stats.get(id) || {
                        id,
                        species: setBonus.species,
                        tier: Number(setBonus.tier || 0),
                        wins: 0,
                        losses: 0,
                        uses: 0
                    };
                    record.uses += 1;
                    if (won === true) record.wins += 1;
                    else if (won === false) record.losses += 1;
                    record.winRate = record.uses > 0 ? record.wins / record.uses : 0;
                    stats.set(id, record);
                });
            });
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses);
}

export function getRelicStats(filters = {}) {
    if (aggregateStatsCache.loaded) {
        return aggregateRows(aggregateStatsCache.relic || [], row => row.relic_id, filters);
    }

    const stats = new Map();
    getBattleResults().filter(result => matchesFilters(result, filters)).forEach(result => {
        getResultRelicEntries(result, filters).forEach(({ side, relics }) => {
            const won = getPartyOutcome(result, side);
            [...new Set(relics || [])].forEach(relicId => updateRecord(stats, relicId, won));
        });
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses);
}

export function getCharacterSpeciesSetStats(characterId, filters = {}) {
    if (
        aggregateStatsCache.loaded
        && (aggregateStatsCache.detailLoaded || aggregateStatsCache.detailCharacters.has(characterId))
    ) {
        return aggregateSetRows(
            aggregateStatsCache.characterSpeciesSet.filter(row => row.character_id === characterId),
            filters
        );
    }

    const stats = new Map();
    getBattleResults().filter(result => matchesFilters(result, filters)).forEach(result => {
        [
            { side: 'player', slots: result.player_party_slots || [], setBonuses: result.player_set_bonuses || [] },
            { side: 'enemy', slots: result.enemy_party_slots || [], setBonuses: result.enemy_set_bonuses || [] }
        ].filter(entry => !filters.side || filters.side === 'all' || entry.side === filters.side)
            .forEach(({ side, slots, setBonuses }) => {
                if (!slots.some(slot => slot.character_id === characterId)) return;
                const won = getPartyOutcome(result, side);
                setBonuses.forEach(setBonus => {
                    const id = `${setBonus.species}__${setBonus.tier}`;
                    const record = stats.get(id) || {
                        id,
                        species: setBonus.species,
                        tier: Number(setBonus.tier || 0),
                        wins: 0,
                        losses: 0,
                        uses: 0
                    };
                    record.uses += 1;
                    if (won === true) record.wins += 1;
                    else if (won === false) record.losses += 1;
                    record.winRate = record.uses > 0 ? record.wins / record.uses : 0;
                    stats.set(id, record);
                });
            });
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses);
}

function getPartyKey(slots = []) {
    return slots
        .map(slot => slot.character_id)
        .sort()
        .join('__');
}

export function getPartyStats(characterId = null, filters = {}) {
    const stats = new Map();
    getBattleResults().filter(result => matchesFilters(result, filters)).forEach(result => {
        getResultSideEntries(result, filters).forEach(({ side, slots }) => {
            if (!slots.length) return;
            if (characterId && !slots.some(slot => slot.character_id === characterId)) return;

            const key = getPartyKey(slots);
            const won = getPartyOutcome(result, side);
            const record = stats.get(key) || {
                id: key,
                characterIds: slots.map(slot => slot.character_id).sort(),
                slotCost: slots.reduce((total, slot) => total + (slot.slot_cost || 1), 0),
                wins: 0,
                losses: 0,
                uses: 0
            };
            record.uses += 1;
            if (won === true) record.wins += 1;
            else if (won === false) record.losses += 1;
            record.winRate = record.uses > 0 ? record.wins / record.uses : 0;
            stats.set(key, record);
        });
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => b.winRate - a.winRate || b.uses - a.uses);
}

export function getFloorStats(characterId = null, filters = {}) {
    if (aggregateStatsCache.loaded) {
        const rows = characterId
            ? aggregateStatsCache.global.filter(row => row.character_id === characterId)
            : aggregateStatsCache.global;
        return aggregateRows(rows, row => String(row.floor), filters, { ignoreFloor: true })
            .sort((a, b) => Number(a.id) - Number(b.id));
    }

    const stats = new Map();
    getBattleResults().filter(result => matchesFilters(result, filters)).forEach(result => {
        getResultSideEntries(result, filters).forEach(({ side, slots }) => {
            if (characterId && !slots.some(slot => slot.character_id === characterId)) return;
            const won = getPartyOutcome(result, side);
            updateRecord(stats, String(result.floor || 1), won);
        });
    });
    return filterByMinUses([...stats.values()], filters)
        .sort((a, b) => Number(a.id) - Number(b.id));
}

export function getModeFloorClearStats(filters = {}) {
    const mode = filters.mode || 'adventure';
    const stats = new Map();
    getBattleResults().filter(result => (
        result.mode === mode
        && (!filters.balanceVersion || (result.balance_version || 'unknown') === filters.balanceVersion)
    )).forEach(result => {
        const floor = Math.max(1, Number(result.floor || 1));
        const key = String(floor);
        const record = stats.get(key) || {
            id: key,
            floor,
            clears: 0,
            failures: 0,
            attempts: 0,
            clearRate: 0,
            wins: 0,
            losses: 0,
            uses: 0,
            winRate: 0
        };
        record.attempts += 1;
        if (result.winner === 'player') record.clears += 1;
        else record.failures += 1;
        record.uses = record.attempts;
        record.wins = record.clears;
        record.losses = record.failures;
        record.clearRate = record.attempts > 0 ? record.clears / record.attempts : 0;
        record.winRate = record.clearRate;
        stats.set(key, record);
    });
    return filterByMinUses([...stats.values()], { minUses: filters.minUses })
        .sort((a, b) => Number(a.floor) - Number(b.floor));
}
