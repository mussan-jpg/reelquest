import { masterCharacters } from '../data/characters/index.js';
import { getAvailableBalanceVersions, getCharacterStats, getCharacterPairStats, getCharacterSpeciesSetStats, getFloorStats, getModeFloorClearStats, getRelicStats, getSpeciesSetStats, syncBattleResultsFromSupabase } from '../services/statsApi.js';
import { ADVENTURE_MAX_FLOOR } from '../battle/enemy.js';
import { describeSpeciesTierUnlock, SPECIES_BONUSES } from '../battle/setBonuses.js';
import { RELICS } from '../battle/relics.js';
import { BALANCE_VERSION } from '../version.js';
import { formatCharacterTypeLabel, formatSpeciesLabel, getCharacterType, getSpeciesIcon, getSpeciesTooltip, showCharacterDetail } from './shared.js';
import { escapeHtml } from '../ui/tooltip.js';
import { getRarityCssVars, getSetTierCssVars } from '../ui/rarityTheme.js';
import { renderGradeTabs, renderOptionButtons } from '../ui/components.js';

let activeMode = 'all';
let activeFloor = 'all';
let activeSide = 'all';
let activeBalanceVersion = BALANCE_VERSION;
let activeGrades = new Set();
let activeCharacterSpecies = new Set();
let activeMinUses = 0;
let activeStatisticsView = 'characters';
let activeSetSpecies = 'all';
let activeSetTier = 'all';
let activeSetCharacterSpecies = null;
let selectedCharacterId = null;
let activeCharacterStatsTab = 'partners';
let statisticsCharacterHistory = [];
let latestStatisticsCopyContext = null;
let latestRankingStatisticsCopyContext = null;
let statisticsCopyFeedbackTimer = null;

function getName(id) {
    return masterCharacters.find(char => char.id === id)?.name || id;
}

function getCharacterData(id) {
    return masterCharacters.find(char => char.id === id) || null;
}

function getRelicData(id) {
    return RELICS.find(relic => relic.id === id) || null;
}

function getCharacterRarity(id) {
    return getCharacterData(id)?.rarity || 1;
}

function getCharacterSlotCost(id) {
    return getCharacterData(id)?.slotCost || 1;
}

function getSpeciesLabel(species) {
    return SPECIES_BONUSES[species]?.label || species;
}

function renderCharacterMeta(charData) {
    if (!charData) return '';
    const characterType = getCharacterType(charData);
    return `
        <span class="statistics-character-tags">
            <span data-tooltip="${escapeHtml(getSpeciesTooltip(charData))}">${formatSpeciesLabel(charData)}</span>
            <span data-tooltip="${escapeHtml(characterType.description || '')}">${formatCharacterTypeLabel(characterType)}</span>
        </span>
    `;
}

function getFilters() {
    return {
        mode: activeMode === 'all' ? null : activeMode,
        floor: activeFloor === 'all' ? null : Number(activeFloor),
        side: activeSide,
        balanceVersion: activeBalanceVersion === 'all' ? null : activeBalanceVersion,
        minUses: activeMinUses
    };
}

function formatRate(record) {
    if (!record?.uses) return '0.0%';
    return `${(record.winRate * 100).toFixed(1)}%`;
}

function getBarWidth(record) {
    return `${Math.round((record?.winRate || 0) * 100)}%`;
}

function getRarityBarStyle(rarity) {
    return getRarityCssVars(rarity);
}

function getCharacterBarStyle(characterId) {
    return getRarityBarStyle(getCharacterRarity(characterId));
}

function getSetTierBarStyle(tier) {
    return getSetTierCssVars(tier);
}

function renderRows(records, emptyText = '統計データがありません', options = {}) {
    if (!records.length) return `<div class="statistics-empty">${emptyText}</div>`;
    return records.map((record, index) => {
        const charData = getCharacterData(record.id);
        return `
        <button type="button" class="statistics-row" style="--statistics-rate-width:${getBarWidth(record)};${getCharacterBarStyle(record.id)}" ${options.clickable === false ? '' : `data-character-id="${record.id}"`}>
            <span class="statistics-rank">${index + 1}</span>
            ${charData ? `
                <span class="statistics-character-cell">
                    <img class="statistics-character-icon" src="${charData.image}" alt="${charData.name}" data-detail-character-id="${charData.id}" data-tooltip="右クリックで詳細表示">
                    <span>
                        <strong>${options.nameFormatter ? options.nameFormatter(record) : charData.name}</strong>
                        <em>★${getCharacterRarity(record.id)} / ${getCharacterSlotCost(record.id)}枠</em>
                        ${renderCharacterMeta(charData)}
                    </span>
                </span>
            ` : `<strong>${options.nameFormatter ? options.nameFormatter(record) : getName(record.id)}</strong>`}
            <span>${formatRate(record)}</span>
            <small>${record.wins}勝 ${record.losses}敗 / ${record.uses}戦</small>
        </button>
    `;
    }).join('');
}

function getSpeciesSetLabel(record) {
    const bonus = SPECIES_BONUSES[record.species];
    return `${bonus?.label || record.species} TIER${record.tier}`;
}

function getSpeciesSetEffectText(record) {
    return describeSpeciesTierUnlock(SPECIES_BONUSES[record.species], Number(record.tier));
}

function filterSetStats(records = [], options = {}) {
    if (options.ignoreSetFilters) return records;
    return records.filter(record => {
        if (activeSetSpecies !== 'all' && record.species !== activeSetSpecies) return false;
        if (activeSetTier !== 'all' && Number(record.tier) !== Number(activeSetTier)) return false;
        return true;
    });
}

function roundWinRate(value) {
    return Number((Number(value || 0)).toFixed(4));
}

function getBaseCopyFields(record) {
    return {
        wins: Number(record.wins || 0),
        losses: Number(record.losses || 0),
        uses: Number(record.uses || 0),
        winRate: roundWinRate(record.winRate)
    };
}

function getStatisticsCopyFilters() {
    return {
        mode: activeStatisticsView === 'floor-clear' ? 'adventure' : activeMode,
        floor: activeStatisticsView === 'floor-clear' ? 'all' : activeFloor,
        side: activeStatisticsView === 'floor-clear' ? 'player-clear' : activeSide,
        balanceVersion: activeBalanceVersion,
        minUses: activeMinUses,
        characterGrades: activeGrades.size ? [...activeGrades].sort((a, b) => Number(a) - Number(b)) : ['all'],
        characterSpecies: activeCharacterSpecies.size ? [...activeCharacterSpecies].sort() : ['all'],
        setSpecies: activeSetSpecies,
        setTier: activeSetTier
    };
}

function normalizeCharacterCopyRecord(record) {
    const charData = getCharacterData(record.id);
    return {
        id: record.id,
        name: charData?.name || getName(record.id),
        species: charData?.species || 'none',
        speciesLabel: charData ? formatSpeciesLabel(charData) : '不明',
        grade: getCharacterRarity(record.id),
        slotCost: getCharacterSlotCost(record.id),
        ...getBaseCopyFields(record)
    };
}

function normalizeSetCopyRecord(record) {
    return {
        species: record.species,
        speciesLabel: getSpeciesLabel(record.species),
        tier: Number(record.tier || 0),
        effectText: getSpeciesSetEffectText(record),
        ...getBaseCopyFields(record)
    };
}

function normalizeRelicCopyRecord(record) {
    const relic = getRelicData(record.id);
    return {
        id: record.id,
        name: relic?.name || record.id,
        desc: relic?.desc || '',
        ...getBaseCopyFields(record)
    };
}

function normalizeFloorCopyRecord(record) {
    return {
        floor: Number(record.floor || record.id || 0),
        clears: Number(record.clears || record.wins || 0),
        attempts: Number(record.attempts || record.uses || 0),
        clearRate: roundWinRate(record.clearRate ?? record.winRate),
        ...getBaseCopyFields(record)
    };
}

function normalizeStatisticsCopyRecords(view, records = []) {
    if (view === 'sets' || view === 'character-sets') return records.map(normalizeSetCopyRecord);
    if (view === 'relics') return records.map(normalizeRelicCopyRecord);
    if (view === 'floors' || view === 'floor-clear' || view === 'character-floors') return records.map(normalizeFloorCopyRecord);
    return records.map(normalizeCharacterCopyRecord);
}

function getPercentileGroupSize(total) {
    if (total <= 0) return 0;
    if (total === 1) return 1;
    return Math.min(Math.ceil(total * 0.2), Math.floor(total / 2));
}

function addPercentileSuggestion(item, index, total, group) {
    const rank = group === 'top' ? index + 1 : total - index;
    const percentileLabel = group === 'top' ? '上位20%' : '下位20%';
    return {
        ...item,
        percentileGroup: percentileLabel,
        rankPosition: rank,
        suggestion: group === 'top'
            ? 'コピー対象データ群の上位20%。相対的に勝ちすぎているためナーフ候補として検討'
            : 'コピー対象データ群の下位20%。相対的に勝てていないためバフ候補として検討'
    };
}

function createStatisticsCopyContext({ view, viewLabel, records, detail = null }) {
    const ranking = normalizeStatisticsCopyRecords(view, records);
    const percentileGroupSize = getPercentileGroupSize(ranking.length);
    return {
        type: 'reelquest-statistics-ranking',
        view,
        viewLabel,
        balanceVersion: BALANCE_VERSION,
        filters: getStatisticsCopyFilters(),
        detail,
        ranking,
        topOverperformers: ranking
            .slice(0, percentileGroupSize)
            .map((item, index) => addPercentileSuggestion(item, index, ranking.length, 'top')),
        underperformers: ranking.length <= 1
            ? []
            : ranking
                .slice(-percentileGroupSize)
                .reverse()
                .map((item, index) => addPercentileSuggestion(item, index, ranking.length, 'bottom')),
        sampleWarnings: ranking
            .filter(item => item.uses < 30)
            .slice(0, 10)
            .map(item => ({ ...item, warning: '30戦未満のため参考値' }))
    };
}

function setLatestStatisticsCopyContext(context) {
    latestStatisticsCopyContext = context;
    updateStatisticsCopyControls();
}

function buildStatisticsCopyText(context) {
    const snapshot = {
        ...context,
        generatedAt: new Date().toISOString()
    };
    const lines = [
        '# リールクエスト統計スナップショット',
        '',
        `- ビュー: ${snapshot.viewLabel}`,
        `- バランス: ${snapshot.filters.balanceVersion}`,
        `- 条件: mode=${snapshot.filters.mode}, floor=${snapshot.filters.floor}, side=${snapshot.filters.side}, minUses=${snapshot.filters.minUses}`,
        `- 件数: ${snapshot.ranking.length}`,
        `- ナーフ候補: コピー対象内の上位20%（${snapshot.topOverperformers.length}件）`,
        `- バフ候補: コピー対象内の下位20%（${snapshot.underperformers.length}件）`,
        '',
        '```json',
        JSON.stringify(snapshot, null, 2),
        '```'
    ];
    return lines.join('\n');
}

function getStatisticsCopyActionHtml(idPrefix = 'statistics-detail') {
    return `
        <div class="statistics-copy-action">
            <button type="button" id="${idPrefix}-copy-cursor-btn" class="statistics-copy-btn" data-statistics-copy-cursor title="現在の条件・表示中ランキングをCursor用にコピー">
                Cursor用にコピー
            </button>
            <span id="${idPrefix}-copy-status" class="statistics-copy-status" aria-live="polite"></span>
        </div>
    `;
}

function showStatisticsCopyStatus(button, message, isError = false) {
    const action = button.closest('.statistics-copy-action');
    const status = action?.querySelector('.statistics-copy-status');
    if (status) {
        status.textContent = message;
        status.classList.toggle('is-error', isError);
    }
}

function resetStatisticsCopyFeedback() {
    document.querySelectorAll('[data-statistics-copy-cursor], #statistics-copy-cursor-btn').forEach(button => {
        button.textContent = 'Cursor用にコピー';
    });
    document.querySelectorAll('.statistics-copy-status').forEach(status => {
        status.textContent = '';
        status.classList.remove('is-error');
    });
}

function updateStatisticsCopyControls() {
    const hasCopyData = !!latestStatisticsCopyContext?.ranking?.length;
    document.querySelectorAll('[data-statistics-copy-cursor], #statistics-copy-cursor-btn').forEach(button => {
        button.disabled = !hasCopyData;
        button.setAttribute('aria-disabled', hasCopyData ? 'false' : 'true');
    });
}

function bindStatisticsCopyActions(scope = document) {
    const buttons = scope.querySelectorAll('[data-statistics-copy-cursor], #statistics-copy-cursor-btn');
    buttons.forEach(button => {
        button.onclick = async () => {
            if (!latestStatisticsCopyContext?.ranking?.length) {
                showStatisticsCopyStatus(button, 'コピーできるランキングがありません', true);
                return;
            }
            try {
                await navigator.clipboard.writeText(buildStatisticsCopyText(latestStatisticsCopyContext));
                clearTimeout(statisticsCopyFeedbackTimer);
                resetStatisticsCopyFeedback();
                button.textContent = 'コピーしました';
                showStatisticsCopyStatus(button, '現在の条件とランキングをコピーしました');
                statisticsCopyFeedbackTimer = setTimeout(resetStatisticsCopyFeedback, 2400);
            } catch (error) {
                console.error('Failed to copy statistics snapshot.', error);
                showStatisticsCopyStatus(button, 'コピーに失敗しました。ブラウザ権限を確認してください', true);
            }
        };
    });
    updateStatisticsCopyControls();
}

function renderSetRows(records, emptyText = 'セット効果データがありません') {
    if (!records.length) return `<div class="statistics-empty">${emptyText}</div>`;
    return records.map((record, index) => {
        const bonus = SPECIES_BONUSES[record.species];
        const speciesTooltip = escapeHtml(getSpeciesTooltip({ species: record.species }));
        return `
            <button type="button" class="statistics-row statistics-set-row" style="--statistics-rate-width:${getBarWidth(record)};${getSetTierBarStyle(record.tier)}" data-set-species-row="${record.species}">
                <span class="statistics-rank">${index + 1}</span>
                <span class="statistics-set-cell">
                    <span class="statistics-set-icon statistics-set-icon--inspectable" data-tooltip="${speciesTooltip}" aria-label="${escapeHtml(`${bonus?.label || record.species}の全TIER効果`)}">${getSpeciesIcon({ species: record.species }) || '?'}</span>
                    <span>
                        <strong>${getSpeciesSetLabel(record)}</strong>
                        <em>${bonus?.name || 'セット効果'} <span class="statistics-set-hover-hint">アイコンで全TIER効果</span></em>
                        <small class="statistics-set-effect">${getSpeciesSetEffectText(record)}</small>
                        <small class="statistics-set-action">キャラ一覧を見る</small>
                    </span>
                </span>
                <span>${formatRate(record)}</span>
                <small>${record.wins}勝 ${record.losses}敗 / ${record.uses}戦</small>
            </button>
        `;
    }).join('');
}

function renderRelicRows(records, emptyText = 'レリックデータがありません') {
    if (!records.length) return `<div class="statistics-empty">${emptyText}</div>`;
    return records.map((record, index) => {
        const relic = getRelicData(record.id);
        return `
            <div class="statistics-row statistics-relic-row" style="--statistics-rate-width:${getBarWidth(record)};">
                <span class="statistics-rank">${index + 1}</span>
                <span class="statistics-set-cell">
                    ${relic?.image
                        ? `<img class="statistics-relic-icon" src="${escapeHtml(relic.image)}" alt="${escapeHtml(relic.name)}">`
                        : `<span class="statistics-set-icon" aria-hidden="true">◇</span>`}
                    <span>
                        <strong>${escapeHtml(relic?.name || record.id)}</strong>
                        <small class="statistics-set-effect">${escapeHtml(relic?.desc || '説明なし')}</small>
                    </span>
                </span>
                <span>${formatRate(record)}</span>
                <small>${record.wins}勝 ${record.losses}敗 / ${record.uses}戦</small>
            </div>
        `;
    }).join('');
}

function renderSetSpeciesCharacters(container) {
    if (!container) return;
    container.classList.toggle('hidden', !activeSetCharacterSpecies);
    if (!activeSetCharacterSpecies) {
        container.innerHTML = '';
        return;
    }

    const characters = masterCharacters
        .filter(char => char.species === activeSetCharacterSpecies)
        .sort((a, b) => (getCharacterRarity(a.id) - getCharacterRarity(b.id)) || a.name.localeCompare(b.name));
    const speciesIcon = getSpeciesIcon({ species: activeSetCharacterSpecies });
    const speciesLabel = getSpeciesLabel(activeSetCharacterSpecies);

    container.innerHTML = `
        <div class="statistics-set-species-backdrop" data-close-set-species-popup></div>
        <section class="statistics-set-species-dialog" role="dialog" aria-modal="true" aria-label="${speciesLabel}のキャラ一覧">
            <div class="statistics-set-species-head">
                <div>
                    <strong>${speciesIcon} ${speciesLabel}のキャラ</strong>
                    <span>${characters.length}体 / キャラを押すと詳細統計へ</span>
                </div>
                <button type="button" id="statistics-clear-set-species-characters" aria-label="閉じる">閉じる</button>
            </div>
            <div class="statistics-set-species-grid">
                ${characters.map(char => `
                    <button type="button" class="statistics-set-species-card" data-character-id="${char.id}">
                        <img src="${char.image}" alt="${char.name}">
                        <span>
                            <strong>${char.name}</strong>
                            <em>★${getCharacterRarity(char.id)} / ${getCharacterSlotCost(char.id)}枠</em>
                        </span>
                    </button>
                `).join('')}
            </div>
        </section>
    `;

    const closePopup = () => {
        activeSetCharacterSpecies = null;
        setupStatisticsScreen({ skipSync: true });
    };

    container.querySelector('#statistics-clear-set-species-characters')?.addEventListener('click', closePopup);
    container.querySelector('[data-close-set-species-popup]')?.addEventListener('click', closePopup);
    container.querySelectorAll('[data-character-id]').forEach(button => {
        button.addEventListener('click', () => {
            selectedCharacterId = button.dataset.characterId;
            statisticsCharacterHistory = [];
            activeCharacterStatsTab = 'sets';
            activeSetCharacterSpecies = null;
            container.classList.add('hidden');
            container.innerHTML = '';
            setupStatisticsScreen({ includeDetailStats: true });
        });
    });
}

function renderFloorRows(records, options = {}) {
    if (!records.length) return '<div class="statistics-empty">階層別データがありません</div>';
    return records.map(record => `
        <div class="statistics-floor-row">
            <div class="statistics-floor-bar" style="--statistics-rate-width:${getBarWidth(record)};${options.barStyle || ''}">
                <span class="statistics-rank">${record.id}F</span>
                <strong>階層 ${record.id}</strong>
                <small>${record.wins}勝 ${record.losses}敗 / ${record.uses}戦</small>
            </div>
            <strong class="statistics-floor-rate">${formatRate(record)}</strong>
        </div>
    `).join('');
}

function renderFloorClearRows(records) {
    if (!records.length) return '<div class="statistics-empty">モード1の踏破データがありません</div>';
    return records.map(record => `
        <div class="statistics-floor-row">
            <div class="statistics-floor-bar" style="--statistics-rate-width:${Math.round((record.clearRate || 0) * 100)}%;${getSetTierBarStyle(3)}">
                <span class="statistics-rank">${record.floor || record.id}F</span>
                <strong>階層 ${record.floor || record.id}</strong>
                <small>${record.clears}踏破 ${record.failures}失敗 / ${record.attempts}挑戦</small>
            </div>
            <strong class="statistics-floor-rate">${((record.clearRate || 0) * 100).toFixed(1)}%</strong>
        </div>
    `).join('');
}

function renderSelectedCharacterHeader(charData, characterStats) {
    const record = characterStats.find(item => item.id === charData.id) || { wins: 0, losses: 0, uses: 0, winRate: 0 };
    return `
        <div class="statistics-character-header">
            <div class="statistics-character-nav">
                <button type="button" id="statistics-back-to-ranking" class="statistics-back-btn">← ランキングへ戻る</button>
                ${statisticsCharacterHistory.length ? `
                    <button type="button" id="statistics-back-to-previous-character" class="statistics-back-btn statistics-back-btn--secondary">
                        ← 前のキャラへ戻る
                    </button>
                ` : ''}
                ${getStatisticsCopyActionHtml('statistics-detail')}
            </div>
            <div class="statistics-character-summary">
                <img class="statistics-character-large-icon" src="${charData.image}" alt="${charData.name}" data-detail-character-id="${charData.id}" data-tooltip="右クリックで詳細表示">
                <div>
                    <h2>${charData.name}</h2>
                    <p>★${getCharacterRarity(charData.id)} / ${getCharacterSlotCost(charData.id)}枠</p>
                    ${renderCharacterMeta(charData)}
                </div>
                <div class="statistics-character-score" style="--statistics-rate-width:${getBarWidth(record)};${getRarityBarStyle(getCharacterRarity(charData.id))}">
                    <strong>${formatRate(record)}</strong>
                    <span>${record.wins}勝 ${record.losses}敗 / ${record.uses}戦</span>
                </div>
            </div>
        </div>
    `;
}

function scrollStatisticsDetailTop() {
    const characterView = document.getElementById('statistics-character-view');
    characterView?.scrollIntoView({ block: 'start' });
}

function renderStatsTabs() {
    const tabs = [
        { id: 'partners', label: '相方' },
        { id: 'floors', label: '階層' },
        { id: 'sets', label: 'セット効果' }
    ];
    return `
        <div class="statistics-detail-tabs">
            ${tabs.map(tab => `
                <button type="button" class="${activeCharacterStatsTab === tab.id ? 'active' : ''}" data-statistics-detail-tab="${tab.id}">
                    ${tab.label}
                </button>
            `).join('')}
        </div>
    `;
}

function filterByActiveGrades(records) {
    if (activeGrades.size === 0) return records;
    return records.filter(record => activeGrades.has(String(getCharacterRarity(record.id))));
}

function filterByActiveCharacterSpecies(records) {
    if (activeCharacterSpecies.size === 0) return records;
    return records.filter(record => {
        const species = getCharacterData(record.id)?.species || 'none';
        return activeCharacterSpecies.has(species);
    });
}

function filterCharacterRows(records) {
    return filterByActiveCharacterSpecies(filterByActiveGrades(records));
}

function renderFilterButtons(container, options, activeValue, onChange) {
    renderOptionButtons(container, options, {
        activeValue,
        dataKey: 'value',
        onClick: value => {
            onChange(value);
            setupStatisticsScreen({ skipSync: true });
        }
    });
}

function renderGradeFilterButtons(container) {
    const activeValues = activeGrades.size === 0 ? new Set(['all']) : activeGrades;
    renderGradeTabs(container, [1, 2, 3, 4, 5, 6], {
        activeValues,
        dataKey: 'grade',
        onClick: grade => {
            if (grade === 'all') {
                activeGrades.clear();
            } else if (activeGrades.has(grade)) {
                activeGrades.delete(grade);
            } else {
                activeGrades.add(grade);
            }
            setupStatisticsScreen({ skipSync: true });
        },
        onContextMenu: grade => {
            activeGrades.clear();
            if (grade !== 'all') {
                activeGrades.add(grade);
            }
            setupStatisticsScreen({ skipSync: true });
        }
    });
}

function renderCharacterSpeciesFilterButtons(container) {
    if (!container) return;
    const speciesEntries = Object.entries(SPECIES_BONUSES);
    const activeValues = activeCharacterSpecies.size === 0 ? new Set(['all']) : activeCharacterSpecies;
    renderOptionButtons(container, [
        { value: 'all', label: 'すべて' },
        ...speciesEntries.map(([species, bonus]) => ({
            value: species,
            label: `${getSpeciesIcon({ species })} ${bonus.label.replace('族', '')}`
        }))
    ], {
        activeValues,
        dataKey: 'species',
        onClick: species => {
            if (species === 'all') {
                activeCharacterSpecies.clear();
            } else if (activeCharacterSpecies.has(species)) {
                activeCharacterSpecies.delete(species);
            } else {
                activeCharacterSpecies.add(species);
            }
            setupStatisticsScreen({ skipSync: true });
        },
        onContextMenu: species => {
            activeCharacterSpecies.clear();
            if (species !== 'all') {
                activeCharacterSpecies.add(species);
            }
            setupStatisticsScreen({ skipSync: true });
        }
    });
}

function renderSetFilterPanel(container) {
    if (!container) return;
    container.classList.toggle('hidden', activeStatisticsView !== 'sets');
    if (activeStatisticsView !== 'sets') {
        container.innerHTML = '';
        return;
    }

    const speciesOptions = [
        { value: 'all', label: '全種族' },
        ...Object.entries(SPECIES_BONUSES).map(([species, bonus]) => ({
            value: species,
            label: `${getSpeciesIcon({ species })} ${bonus.label.replace('族', '')}`
        }))
    ];
    const tierOptions = [
        { value: 'all', label: '全TIER' },
        ...[1, 2, 3].map(tier => ({ value: String(tier), label: `TIER${tier}` }))
    ];

    container.innerHTML = `
        <div class="statistics-set-filter-row">
            <span>種族</span>
            <div class="statistics-filter-buttons statistics-set-filter-buttons" data-set-filter="species">
                ${speciesOptions.map(option => `
                    <button type="button" class="statistics-filter-btn ${option.value === activeSetSpecies ? 'active' : ''}" data-value="${option.value}">
                        ${option.label}
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="statistics-set-filter-row">
            <span>TIER</span>
            <div class="statistics-filter-buttons statistics-set-filter-buttons" data-set-filter="tier">
                ${tierOptions.map(option => `
                    <button type="button" class="statistics-filter-btn ${option.value === activeSetTier ? 'active' : ''}" data-value="${option.value}">
                        ${option.label}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    container.querySelector('[data-set-filter="species"]')?.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            activeSetSpecies = button.dataset.value;
            setupStatisticsScreen({ skipSync: true });
        });
    });
    container.querySelector('[data-set-filter="tier"]')?.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            activeSetTier = button.dataset.value;
            setupStatisticsScreen({ skipSync: true });
        });
    });
}

function setupMinUsesInput(input) {
    if (!input) return;
    input.value = String(activeMinUses);
    const applyMinUses = () => {
        activeMinUses = Math.max(0, Math.floor(Number(input.value || 0)));
        input.value = String(activeMinUses);
        setupStatisticsScreen({ skipSync: true });
    };
    input.onchange = applyMinUses;
    input.onkeydown = event => {
        if (event.key === 'Enter') {
            input.blur();
            applyMinUses();
        }
    };
}

function renderMinUsesPresets(container) {
    if (!container) return;
    const presets = [0, 10, 100, 1000];
    renderOptionButtons(container, presets.map(value => ({ value: String(value), label: String(value) })), {
        activeValue: String(activeMinUses),
        dataKey: 'value',
        onClick: value => {
            activeMinUses = Number(value || 0);
            setupStatisticsScreen({ skipSync: true });
        }
    });
}

function bindDetailIconEvents(scope = document) {
    scope.querySelectorAll('[data-detail-character-id]').forEach(icon => {
        icon.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
            showCharacterDetail(icon.dataset.detailCharacterId);
        });
    });
}

function renderCharacterDetail(characterStats = getCharacterStats(getFilters())) {
    const detail = document.getElementById('statistics-character-detail');
    const characterView = document.getElementById('statistics-character-view');
    const listLayout = document.querySelector('#statistics-screen .statistics-layout');
    if (!detail || !characterView || !listLayout) return;
    if (!selectedCharacterId) {
        characterView.classList.add('hidden');
        listLayout.classList.remove('hidden');
        if (latestRankingStatisticsCopyContext) {
            setLatestStatisticsCopyContext(latestRankingStatisticsCopyContext);
        }
        return;
    }

    const charData = getCharacterData(selectedCharacterId);
    if (!charData) return;

    const pairStats = filterCharacterRows(getCharacterPairStats(selectedCharacterId, getFilters()));
    const setStats = filterSetStats(getCharacterSpeciesSetStats(selectedCharacterId, getFilters()), { ignoreSetFilters: true });
    const floorStats = getFloorStats(selectedCharacterId, {
        mode: activeMode === 'all' ? null : activeMode,
        side: activeSide,
        balanceVersion: activeBalanceVersion === 'all' ? null : activeBalanceVersion,
        minUses: activeMinUses
    });
    const tabContent = activeCharacterStatsTab === 'floors'
            ? renderFloorRows(floorStats, { barStyle: getRarityBarStyle(getCharacterRarity(selectedCharacterId)) })
            : activeCharacterStatsTab === 'sets'
                ? renderSetRows(setStats, 'セット効果データがありません')
                : renderRows(pairStats, '相方データがありません');
    const detailRecords = activeCharacterStatsTab === 'floors'
        ? floorStats
        : activeCharacterStatsTab === 'sets'
            ? setStats
            : pairStats;
    setLatestStatisticsCopyContext(createStatisticsCopyContext({
        view: activeCharacterStatsTab === 'floors'
            ? 'character-floors'
            : activeCharacterStatsTab === 'sets'
                ? 'character-sets'
                : 'character-partners',
        viewLabel: `${charData.name} 詳細 / ${activeCharacterStatsTab === 'floors' ? '階層' : activeCharacterStatsTab === 'sets' ? 'セット効果' : '相方'}`,
        records: detailRecords,
        detail: {
            characterId: charData.id,
            characterName: charData.name,
            tab: activeCharacterStatsTab
        }
    }));

    detail.innerHTML = `
        ${renderSelectedCharacterHeader(charData, characterStats)}
        ${renderStatsTabs()}
        <section class="statistics-detail-tab-panel">
            ${tabContent}
        </section>
    `;
    listLayout.classList.add('hidden');
    characterView.classList.remove('hidden');

    document.getElementById('statistics-back-to-ranking')?.addEventListener('click', () => {
        selectedCharacterId = null;
        statisticsCharacterHistory = [];
        renderCharacterDetail(characterStats);
    });
    document.getElementById('statistics-back-to-previous-character')?.addEventListener('click', () => {
        const previousId = statisticsCharacterHistory.pop();
        if (!previousId) return;
        selectedCharacterId = previousId;
        activeCharacterStatsTab = 'partners';
        renderCharacterDetail(characterStats);
        scrollStatisticsDetailTop();
    });
    detail.querySelectorAll('[data-statistics-detail-tab]').forEach(button => {
        button.addEventListener('click', () => {
            activeCharacterStatsTab = button.dataset.statisticsDetailTab;
            renderCharacterDetail(characterStats);
        });
    });
    detail.querySelectorAll('[data-character-id]').forEach(button => {
        button.addEventListener('click', () => {
            if (selectedCharacterId && selectedCharacterId !== button.dataset.characterId) {
                statisticsCharacterHistory.push(selectedCharacterId);
            }
            selectedCharacterId = button.dataset.characterId;
            activeCharacterStatsTab = 'partners';
            setupStatisticsScreen({ includeDetailStats: true });
        });
    });
    detail.querySelectorAll('[data-set-species-row]').forEach(button => {
        button.addEventListener('click', () => {
            activeSetCharacterSpecies = button.dataset.setSpeciesRow;
            renderSetSpeciesCharacters(document.getElementById('statistics-set-species-characters'));
        });
    });
    bindStatisticsCopyActions(detail);
    bindDetailIconEvents(detail);
}

export async function setupStatisticsScreen(options = {}) {
    const viewFilter = document.getElementById('statistics-view-filter');
    const rankingTitle = document.getElementById('statistics-ranking-title');
    const setFilterPanel = document.getElementById('statistics-set-filter-panel');
    const setSpeciesCharacters = document.getElementById('statistics-set-species-characters');
    const modeFilter = document.getElementById('statistics-mode-filter');
    const floorFilter = document.getElementById('statistics-floor-filter');
    const sideFilter = document.getElementById('statistics-side-filter');
    const balanceFilter = document.getElementById('statistics-balance-filter');
    const gradeFilter = document.getElementById('statistics-grade-filter');
    const speciesFilter = document.getElementById('statistics-character-species-filter');
    const minUsesPresets = document.getElementById('statistics-min-uses-presets');
    const minUsesInput = document.getElementById('statistics-min-uses-input');
    const ranking = document.getElementById('statistics-ranking');
    if (!ranking) return;
    ranking.innerHTML = '<div class="statistics-empty">統計を読み込み中...</div>';

    if (!options.skipSync) {
        await syncBattleResultsFromSupabase({
            includeDetailStats: !!selectedCharacterId || !!options.includeDetailStats,
            detailCharacterId: selectedCharacterId,
            includeRawResults: activeStatisticsView === 'floor-clear'
        });
    }

    const versions = getAvailableBalanceVersions();
    if (!versions.includes(activeBalanceVersion) && activeBalanceVersion !== 'all') {
        activeBalanceVersion = BALANCE_VERSION;
    }

    renderFilterButtons(viewFilter, [
        { value: 'characters', label: 'キャラ' },
        { value: 'sets', label: 'セット効果' },
        { value: 'relics', label: 'レリック' },
        { value: 'floor-clear', label: 'モード1踏破率' }
    ], activeStatisticsView, value => {
        activeStatisticsView = value;
        activeSetCharacterSpecies = null;
        selectedCharacterId = null;
        statisticsCharacterHistory = [];
    });
    renderSetFilterPanel(setFilterPanel);
    renderSetSpeciesCharacters(setSpeciesCharacters);

    renderFilterButtons(modeFilter, [
        { value: 'all', label: 'すべて' },
        { value: 'adventure', label: 'モード' },
        { value: 'ranked', label: 'ランクマッチ' },
        { value: 'custom', label: 'カスタム' }
    ], activeMode, value => { activeMode = value; });

    renderFilterButtons(floorFilter, [
        { value: 'all', label: '全階層' },
        ...Array.from({ length: ADVENTURE_MAX_FLOOR }, (_, index) => index + 1).map(floor => ({ value: String(floor), label: `${floor}F` }))
    ], activeFloor, value => { activeFloor = value; });

    renderFilterButtons(sideFilter, [
        { value: 'all', label: '両方' },
        { value: 'player', label: '自軍' },
        { value: 'enemy', label: '敵軍' }
    ], activeSide, value => { activeSide = value; });

    renderFilterButtons(balanceFilter, [
        { value: 'all', label: '全バランス' },
        ...versions.map(version => ({
            value: version,
            label: version === BALANCE_VERSION ? `現在 ${version}` : version
        }))
    ], activeBalanceVersion, value => { activeBalanceVersion = value; });
    renderGradeFilterButtons(gradeFilter);
    renderCharacterSpeciesFilterButtons(speciesFilter);
    renderMinUsesPresets(minUsesPresets);
    setupMinUsesInput(minUsesInput);

    const characterStats = filterCharacterRows(getCharacterStats(getFilters()));
    const setStats = filterSetStats(getSpeciesSetStats(getFilters()));
    const relicStats = getRelicStats(getFilters());
    const floorClearStats = getModeFloorClearStats({
        mode: 'adventure',
        balanceVersion: activeBalanceVersion === 'all' ? null : activeBalanceVersion,
        minUses: activeMinUses
    });
    const activeRankingRecords = activeStatisticsView === 'sets'
        ? setStats
        : activeStatisticsView === 'relics'
            ? relicStats
            : activeStatisticsView === 'floor-clear'
                ? floorClearStats
                : characterStats;
    if (rankingTitle) {
        rankingTitle.textContent = activeStatisticsView === 'sets'
            ? 'セット効果ランキング'
            : activeStatisticsView === 'relics'
                ? 'レリックランキング'
                : activeStatisticsView === 'floor-clear'
                    ? 'モード1 階層別踏破率'
                    : 'キャラランキング';
    }
    latestRankingStatisticsCopyContext = createStatisticsCopyContext({
        view: activeStatisticsView,
        viewLabel: activeStatisticsView === 'sets'
            ? 'セット効果ランキング'
            : activeStatisticsView === 'relics'
                ? 'レリックランキング'
                : activeStatisticsView === 'floor-clear'
                    ? 'モード1 階層別踏破率'
                    : 'キャラランキング',
        records: activeRankingRecords
    });
    setLatestStatisticsCopyContext(latestRankingStatisticsCopyContext);
    ranking.innerHTML = activeStatisticsView === 'sets'
        ? renderSetRows(setStats)
        : activeStatisticsView === 'relics'
            ? renderRelicRows(relicStats)
            : activeStatisticsView === 'floor-clear'
                ? renderFloorClearRows(floorClearStats)
                : renderRows(characterStats);
    ranking.querySelectorAll('[data-set-species-row]').forEach(button => {
        button.addEventListener('click', () => {
            activeSetCharacterSpecies = button.dataset.setSpeciesRow;
            setupStatisticsScreen({ skipSync: true });
        });
    });
    ranking.querySelectorAll('[data-character-id]').forEach(button => {
        button.addEventListener('click', () => {
            selectedCharacterId = button.dataset.characterId;
            statisticsCharacterHistory = [];
            activeCharacterStatsTab = 'partners';
            setupStatisticsScreen({ includeDetailStats: true });
        });
    });
    bindDetailIconEvents(document.getElementById('statistics-screen'));
    bindStatisticsCopyActions(document.getElementById('statistics-screen'));
    renderCharacterDetail(characterStats);
}
