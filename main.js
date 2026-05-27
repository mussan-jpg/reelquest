// main.js
import { masterCharacters } from './data/characters/index.js';
import { render } from './ui/index.js';
import { ADVENTURE_MAX_FLOOR, initBattleSystem, generateRandomEnemies, shouldIncludeSpecialEnemies } from './battle/index.js';
import { clearFullLog, playBattleStartVisualEffects } from './battle/core.js';
import { setupLibraryScreen } from './screens/libraryScreen.js';
import { setupCharacterSelection, getSelectedPlayerIds } from './screens/characterSelectScreen.js';
import { setupCustomBattleSelection, getCustomBattleSelection } from './screens/customBattleScreen.js';
import { setupRankedMatchScreen, getRankedMatchSelection } from './screens/rankedMatchScreen.js';
import { setupStatisticsScreen } from './screens/statisticsScreen.js';
import { showReplacementSelection } from './screens/replacementScreen.js';
import { showRelicSelection } from './screens/relicScreen.js';
import { renderBattleStatsPanel, showBattleResult } from './screens/resultScreen.js';
import { showCharacterDetail } from './screens/shared.js';
import { renderBattleCharacterCard } from './ui/battleCharacterCard.js';
import { playHitEffect, previewStatusEffect, showPopupEffect } from './ui/effects.js';
import { statusEffects } from './statusEffects.js';
import { initBattleStats } from './battle/stats.js';
import { SPECIES_BONUSES, applySpeciesSetBonuses } from './battle/setBonuses.js';
import { applyRelicBattleStart, ensureRelicState } from './battle/relics.js';
import { APP_VERSION } from './version.js';
import { createCharacterFromData, getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT, resetRunCharacterProgress } from './partySlots.js';
import { submitBattleResult } from './services/statsApi.js';
import { applyRankedResult } from './services/onlineApi.js';
import { generateCustomSeedBattleResults, generateSeedBattleResults } from './services/statSeed.js';
import { clearLocalMaintenanceData, clearSupabaseMaintenanceData as clearSupabaseData } from './services/maintenanceApi.js';

// グローバル関数として登録（HTMLや動的生成要素からの呼び出し用）
window.showCharacterDetail = showCharacterDetail;
window.showReplacementSelection = showReplacementSelection;
window.showRelicSelection = showRelicSelection;
window.showBattleResult = async function (state) {
    if (state?.mode === 'maintenance-preview') {
        return showBattleResult(state);
    }

    const result = await submitBattleResult(state);
    if (state?.mode === 'ranked' && result && !state.rankedResultApplied) {
        applyRankedResult(result.winner, state.rankedMatch?.opponentPartyId);
        state.rankedResultApplied = true;
    }
    return showBattleResult(state);
};

const appVersionEl = document.getElementById('app-version');
if (appVersionEl) {
    appVersionEl.textContent = `v${APP_VERSION}`;
}

function applyPartySlotModeText() {
    const slotText = `${PARTY_SLOT_LIMIT}枠`;
    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    };

    setText('rush-slot-description', `候補から${slotText}ぶん選び、${ADVENTURE_MAX_FLOOR}階まで勝ち抜け！`);
    setText('char-select-title', `👥 パーティ結成（${slotText}選択） 👥`);
    setText('custom-battle-description', `味方${slotText}・敵${slotText}を自由に選んで戦えます`);
    setText('replacement-source-limit', `現在メンバー・合成素材・新候補から合計${slotText}`);
}

applyPartySlotModeText();

const MAINTENANCE_LOCAL_PASSCODE_KEY = 'reelquest:maintenance_unlocked:v1';
const MAINTENANCE_PASSCODE = 'Rq7mK2vP9xL4sT8';

function isLocalMaintenanceEnvironment() {
    const { protocol, hostname } = window.location;
    return protocol === 'file:'
        || hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1';
}

const maintenanceMenuBtn = document.getElementById('maintenance-menu-btn');
if (maintenanceMenuBtn && isLocalMaintenanceEnvironment()) {
    maintenanceMenuBtn.classList.remove('hidden');
}

const rankedMenuBtn = document.getElementById('ranked-menu-btn');
if (rankedMenuBtn && isLocalMaintenanceEnvironment()) {
    rankedMenuBtn.disabled = false;
    rankedMenuBtn.setAttribute('aria-disabled', 'false');
    const subText = rankedMenuBtn.querySelector('.btn-sub');
    if (subText) subText.textContent = '編成を登録して非同期ランク戦に挑む';
}

function waitForUiPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, false);

let gameState = {
    players: [],
    enemies: [],
    floor: 1,
    currentFloor: 1,
    maxFloor: ADVENTURE_MAX_FLOOR,
    isChainMode: true,
    turn: 0
};

let maintenanceStatusTestCharacter = null;

const MAINTENANCE_DAMAGE_TESTS = {
    boosted: {
        label: '増加ダメージ',
        text: { value: '48', formula: '+12', severity: 'boosted' },
        color: '#f97316',
        impact: 'light'
    },
    mitigated: {
        label: '軽減ダメージ',
        text: { value: '24', formula: '-10', severity: 'normal' },
        color: '#e74c3c',
        impact: 'none'
    },
    small: {
        label: '小ダメージ',
        text: { value: '12', formula: '', severity: 'normal' },
        color: '#e74c3c',
        impact: 'none'
    },
    medium: {
        label: '中ダメージ',
        text: { value: '36', formula: '', severity: 'normal' },
        color: '#dc2626',
        impact: 'light'
    },
    heavy: {
        label: '大ダメージ',
        text: { value: '88', formula: '', severity: 'heavy', callout: '大ダメージ!' },
        color: '#ef4444',
        impact: 'heavy'
    },
    devastating: {
        label: '特大ダメージ',
        text: { value: '128', formula: '', severity: 'devastating', callout: '壊滅的!' },
        color: '#dc2626',
        impact: 'devastating'
    }
};

function getMaintenanceStatusTests() {
    return Object.entries(statusEffects || {}).map(([id, effect]) => ({
        id,
        label: effect?.name || id
    }));
}

function createMaintenanceStatusTestCharacter() {
    const data = masterCharacters.find(char => char.id === 'char_yusha')
        || masterCharacters.find(char => !char.isSpecialOnly)
        || masterCharacters[0];
    const character = createCharacterFromData(data);
    character.name = '状態異常テスター';
    character.hp = Math.max(1, Math.floor(character.maxHp * 0.72));
    character.shield = 0;
    character.status = getMaintenanceStatusTests().map(test => test.id);
    character.currentReel = 0;
    return character;
}

function renderMaintenanceStatusTest() {
    const cardEl = document.getElementById('maintenance-status-test-card');
    const controlsEl = document.getElementById('maintenance-status-test-controls');
    if (!cardEl || !controlsEl) return;

    maintenanceStatusTestCharacter = createMaintenanceStatusTestCharacter();
    const statusTests = getMaintenanceStatusTests();
    cardEl.innerHTML = renderBattleCharacterCard(maintenanceStatusTestCharacter, 'mt', 0);
    controlsEl.innerHTML = `
        ${statusTests.map(test => `
            <button type="button" onclick="previewMaintenanceStatusEffect('${test.id}')">${test.label}</button>
        `).join('')}
        <button type="button" onclick="previewMaintenanceStatusEffect('all')">全バッジ点滅</button>
        ${Object.entries(MAINTENANCE_DAMAGE_TESTS).map(([id, test]) => `
            <button type="button" onclick="previewMaintenanceDamageEffect('${id}')">${test.label}</button>
        `).join('')}
        <button type="button" onclick="resetMaintenanceStatusTest()">リセット</button>
    `;
}

window.resetMaintenanceStatusTest = function () {
    renderMaintenanceStatusTest();
};

window.previewMaintenanceStatusEffect = function (statusId) {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('状態異常VFX確認はローカル環境でのみ利用できます。');
        return;
    }

    if (!maintenanceStatusTestCharacter) {
        renderMaintenanceStatusTest();
    }

    previewStatusEffect('mt', 0, statusId, { poisonDamage: 18 });
};

window.previewMaintenanceDamageEffect = function (testId) {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('ダメージVFX確認はローカル環境でのみ利用できます。');
        return;
    }

    if (!maintenanceStatusTestCharacter) {
        renderMaintenanceStatusTest();
    }

    const test = MAINTENANCE_DAMAGE_TESTS[testId];
    if (!test) return;

    showPopupEffect('mt', 0, test.text, 'damage-detail', test.color);
    playHitEffect('mt', 0, { impact: test.impact });
};

// パーティ作成ヘルパー関数
function createParty(idList, state = gameState) {
    if (!idList || idList.length === 0) return [];
    return idList.map(id => {
        const data = masterCharacters.find(char => char.id === id);
        return createCharacterFromData(data, { gameState: state });
    }).filter(char => char !== null);
}

function createMaintenancePreviewParty() {
    const chosen = [];
    const preferredSpecies = new Set(['human', 'slime', 'dragon', 'nature', 'beast']);
    const candidates = masterCharacters
        .filter(char => !char.isSpecialOnly)
        .sort((a, b) => {
            const aPreferred = preferredSpecies.has(a.species) ? 0 : 1;
            const bPreferred = preferredSpecies.has(b.species) ? 0 : 1;
            return aPreferred - bPreferred || getSlotCost(a) - getSlotCost(b);
        });

    for (const candidate of candidates) {
        if (getOccupiedSlots(chosen) + getSlotCost(candidate) > PARTY_SLOT_LIMIT) continue;
        chosen.push(candidate);
        if (getOccupiedSlots(chosen) >= PARTY_SLOT_LIMIT) break;
    }

    return chosen.map(createCharacterFromData).filter(Boolean);
}

function createMaintenanceScreenPreviewState(floor = 1) {
    const safeFloor = Math.max(1, Math.min(ADVENTURE_MAX_FLOOR, Number(floor || 1)));
    const previewState = {
        players: createMaintenancePreviewParty(),
        enemies: [],
        floor: safeFloor,
        currentFloor: safeFloor,
        maxFloor: ADVENTURE_MAX_FLOOR,
        isChainMode: false,
        mode: 'maintenance-preview',
        turn: 5,
        relics: [],
        statsSubmitted: true,
        rankedResultApplied: true,
        rankedMatch: null,
        nextEnemies: null
    };

    ensureRelicState(previewState);
    previewState.enemies = generateRandomEnemies(previewState, { includeSpecialOnly: shouldIncludeSpecialEnemies(safeFloor) });
    previewState.nextEnemies = generateRandomEnemies(
        { ...previewState, currentFloor: Math.min(ADVENTURE_MAX_FLOOR, safeFloor + 1) },
        { includeSpecialOnly: shouldIncludeSpecialEnemies(safeFloor + 1) }
    );
    applySpeciesSetBonuses(previewState, { healToFull: true });
    initBattleStats(previewState);
    return previewState;
}

function fillMaintenanceResultSample(state) {
    const applyStats = (stats, index, side) => {
        if (!stats) return;
        const sideOffset = side === 'p' ? 0 : 18;
        stats.damageDealt = 80 + index * 22 + sideOffset;
        stats.damageResisted = 12 + index * 7;
        stats.damageTaken = side === 'p' ? 18 + index * 13 : 70 + index * 20;
        stats.damageMitigated = index % 2 === 0 ? 0 : 18 + index * 6;
        stats.healingDone = index === 0 ? 24 : 0;
        stats.shieldGranted = index === 1 ? 32 : 0;
        stats.statusInflicted = index % 2;
        stats.statReduced = side === 'p' ? index * 2 : index;
        stats.statIncreased = side === 'p' ? 6 + index * 4 : 0;
    };

    (state.players || []).forEach((char, index) => {
        char.hp = Math.max(1, Math.floor(char.maxHp * (0.72 - index * 0.1)));
        char.status = index === 2 ? ['weak'] : [];
        applyStats(state.battleStats?.p?.[index], index, 'p');
    });
    (state.enemies || []).forEach((char, index) => {
        char.hp = 0;
        char.status = index % 2 === 0 ? ['weak', 'weakened'] : [];
        applyStats(state.battleStats?.e?.[index], index, 'e');
    });
}

// 🌐 画面遷移
window.selectMode = function (mode) {
    if (mode === 'rush') {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('char-select-screen').classList.remove('hidden');
        setupCharacterSelection(startAdventureBattle);
    } else if (mode === 'custom') {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('custom-select-screen').classList.remove('hidden');
        setupCustomBattleSelection(startCustomBattle);
    } else if (mode === 'ranked') {
        if (!isLocalMaintenanceEnvironment()) {
            window.alert('ランクマッチはサーバ側実装準備中です。');
            return;
        }
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('ranked-screen').classList.remove('hidden');
        setupRankedMatchScreen(startRankedBattle);
    }
};

window.openMaintenanceGate = function () {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('管理メンテナンスはローカル環境でのみ利用できます。');
        return;
    }

    const alreadyUnlocked = sessionStorage.getItem(MAINTENANCE_LOCAL_PASSCODE_KEY) === 'true';
    if (!alreadyUnlocked) {
        const passcode = window.prompt('管理メンテナンス用パスコードを入力してください。');
        if (passcode !== MAINTENANCE_PASSCODE) {
            window.alert('パスコードが違います。');
            return;
        }
        sessionStorage.setItem(MAINTENANCE_LOCAL_PASSCODE_KEY, 'true');
    }

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('maintenance-screen').classList.remove('hidden');
    renderMaintenanceSeedFilters();
    renderMaintenanceStatusTest();
};

function renderMaintenanceSeedFilters() {
    const gradeSelect = document.getElementById('seed-stats-grade-filter');
    const speciesSelect = document.getElementById('seed-stats-species-filter');
    const tierSelect = document.getElementById('seed-stats-tier-filter');

    if (gradeSelect && gradeSelect.options.length === 0) {
        gradeSelect.innerHTML = [
            '<option value="all">すべて</option>',
            ...[1, 2, 3, 4, 5, 6].map(grade => `<option value="${grade}">グレード${grade}</option>`)
        ].join('');
    }

    if (speciesSelect && speciesSelect.options.length === 0) {
        speciesSelect.innerHTML = [
            '<option value="all">すべて</option>',
            ...Object.entries(SPECIES_BONUSES).map(([species, bonus]) => (
                `<option value="${species}">${bonus.label}</option>`
            ))
        ].join('');
    }

    if (tierSelect && tierSelect.options.length === 0) {
        tierSelect.innerHTML = [
            '<option value="all">すべて</option>',
            '<option value="1">TIER1構成</option>',
            '<option value="2">TIER2構成</option>',
            '<option value="3">TIER3構成</option>'
        ].join('');
    }
}

function getSeedStatsFilters() {
    return {
        grade: document.getElementById('seed-stats-grade-filter')?.value || 'all',
        setSpecies: document.getElementById('seed-stats-species-filter')?.value || 'all',
        setTier: document.getElementById('seed-stats-tier-filter')?.value || 'all'
    };
}

function getSeedStatsFilterSummary(filters = getSeedStatsFilters()) {
    const parts = [];
    if (filters.grade && filters.grade !== 'all') parts.push(`グレード${filters.grade}`);
    if (filters.setTier && filters.setTier !== 'all') {
        const speciesLabel = filters.setSpecies && filters.setSpecies !== 'all'
            ? SPECIES_BONUSES[filters.setSpecies]?.label || filters.setSpecies
            : '任意種族';
        parts.push(`${speciesLabel} TIER${filters.setTier}`);
    } else if (filters.setSpecies && filters.setSpecies !== 'all') {
        parts.push(`${SPECIES_BONUSES[filters.setSpecies]?.label || filters.setSpecies}`);
    }
    return parts.length ? parts.join(' / ') : 'フィルターなし';
}

function setSeedStatsControlsDisabled(disabled) {
    [
        'seed-stats-count-input',
        'seed-stats-grade-filter',
        'seed-stats-species-filter',
        'seed-stats-tier-filter'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

window.generateSeedStats = async function () {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('統計データ生成はローカル環境でのみ利用できます。');
        return;
    }

    const button = document.getElementById('seed-stats-btn');
    const countInput = document.getElementById('seed-stats-count-input');
    const seedCount = Math.max(1, Math.min(100000, Number(countInput?.value || 50000)));
    const filters = getSeedStatsFilters();
    const filterSummary = getSeedStatsFilterSummary(filters);
    if (countInput) countInput.value = String(seedCount);
    if (!window.confirm(`ランダムなモード1統計を${seedCount.toLocaleString()}件生成してDBに送信します。\n条件: ${filterSummary}\n実行しますか？`)) return;

    if (button) {
        button.disabled = true;
        button.querySelector('.btn-main').textContent = '⏳ 生成中...';
        button.querySelector('.btn-sub').textContent = '準備中...';
    }
    setSeedStatsControlsDisabled(true);

    await waitForUiPaint();

    try {
        await generateSeedBattleResults(seedCount, {
            batchSize: 1000,
            insertChunkSize: 20,
            insertConcurrency: 1,
            filters,
            onProgress: ({ completed, total }) => {
                if (!button) return;
                const percent = Math.floor((completed / total) * 100);
                button.querySelector('.btn-sub').textContent = `${completed.toLocaleString()} / ${total.toLocaleString()}件 (${percent}%)`;
            }
        });
        window.alert(`ランダム統計${seedCount.toLocaleString()}件を生成しました。\n条件: ${filterSummary}\n統計画面とSupabaseのbattle_resultsを確認してください。`);
    } catch (e) {
        console.error(e);
        window.alert('統計生成中にエラーが発生しました。ローカル保存分は残っている可能性があります。');
    } finally {
        if (button) {
            button.disabled = false;
            button.querySelector('.btn-main').textContent = '🧪 統計データ生成';
            button.querySelector('.btn-sub').textContent = '指定件数分のモード1統計を追加';
        }
        setSeedStatsControlsDisabled(false);
    }
};

window.generateCustomSeedStats = async function () {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('統計データ生成はローカル環境でのみ利用できます。');
        return;
    }

    const button = document.getElementById('seed-custom-stats-btn');
    const countInput = document.getElementById('seed-stats-count-input');
    const seedCount = Math.max(1, Math.min(100000, Number(countInput?.value || 50000)));
    const filters = getSeedStatsFilters();
    const filterSummary = getSeedStatsFilterSummary(filters);
    if (countInput) countInput.value = String(seedCount);
    if (!window.confirm(`ランダムなカスタムマッチ統計を${seedCount.toLocaleString()}件生成してDBに送信します。味方/敵それぞれにレリックを1個持たせます。\n条件: ${filterSummary}\n実行しますか？`)) return;

    if (button) {
        button.disabled = true;
        button.querySelector('.btn-main').textContent = '⏳ 生成中...';
        button.querySelector('.btn-sub').textContent = '準備中...';
    }
    setSeedStatsControlsDisabled(true);

    await waitForUiPaint();

    try {
        await generateCustomSeedBattleResults(seedCount, {
            batchSize: 1000,
            insertChunkSize: 20,
            insertConcurrency: 1,
            filters,
            onProgress: ({ completed, total }) => {
                if (!button) return;
                const percent = Math.floor((completed / total) * 100);
                button.querySelector('.btn-sub').textContent = `${completed.toLocaleString()} / ${total.toLocaleString()}件 (${percent}%)`;
            }
        });
        window.alert(`カスタムマッチ統計${seedCount.toLocaleString()}件を生成しました。\n条件: ${filterSummary}\n統計画面とSupabaseのbattle_resultsを確認してください。`);
    } catch (e) {
        console.error(e);
        window.alert('カスタム統計生成中にエラーが発生しました。ローカル保存分は残っている可能性があります。');
    } finally {
        if (button) {
            button.disabled = false;
            button.querySelector('.btn-main').textContent = '🧪 カスタム統計データ生成';
            button.querySelector('.btn-sub').textContent = 'ランダム編成＋両陣営レリック1個で追加';
        }
        setSeedStatsControlsDisabled(false);
    }
};

window.clearSupabaseMaintenanceData = async function () {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('管理メンテナンスはローカル環境でのみ利用できます。');
        return;
    }

    if (!window.confirm('Supabase上の生ログ・ランク・集計テーブルを全削除します。元に戻せません。続行しますか？')) return;
    const passcode = window.prompt('Supabaseメンテナンス用パスコードを入力してください。');
    if (!passcode) return;

    try {
        await clearSupabaseData(passcode);
        clearLocalMaintenanceData();
        window.alert('Supabaseデータとローカル統計キャッシュを削除しました。');
    } catch (e) {
        console.error(e);
        window.alert('Supabaseデータ削除に失敗しました。SQLのメンテナンス用パスコード設定と再実行を確認してください。');
    }
};

window.returnToMaintenanceFromPreview = function () {
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('replacement-screen').classList.add('hidden');
    document.getElementById('relic-screen').classList.add('hidden');
    document.getElementById('maintenance-screen').classList.remove('hidden');
    renderMaintenanceStatusTest();
    window.isBattleRoundRunning = false;
    window.resolvePendingCommand = null;
    window.advanceToTurnEndRequested = false;
    window.fastTurnMode = false;
};

window.previewMaintenanceBattleFloor = function (floor) {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('戦闘背景確認はローカル環境でのみ利用できます。');
        return;
    }

    const safeFloor = Math.max(1, Math.min(ADVENTURE_MAX_FLOOR, Number(floor || 1)));
    document.getElementById('maintenance-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');

    gameState.floor = safeFloor;
    gameState.currentFloor = safeFloor;
    gameState.maxFloor = ADVENTURE_MAX_FLOOR;
    gameState.isChainMode = false;
    gameState.mode = 'maintenance-preview';
    gameState.relics = [];
    resetRunCharacterProgress(gameState);
    ensureRelicState(gameState);
    gameState.statsSubmitted = true;
    gameState.rankedResultApplied = true;
    gameState.rankedMatch = null;
    gameState.nextEnemies = null;
    gameState.players = createMaintenancePreviewParty();
    gameState.enemies = generateRandomEnemies(gameState, { includeSpecialOnly: shouldIncludeSpecialEnemies(safeFloor) });
    gameState.turn = 0;

    applySpeciesSetBonuses(gameState, { healToFull: true });
    initBattleStats(gameState);

    const floorText = document.getElementById('floor-text');
    if (floorText) floorText.innerText = `${safeFloor} / ${gameState.maxFloor}`;

    initBattleSystem(gameState);
    render(gameState);
};

window.previewMaintenanceResultScreen = async function () {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('リザルト確認はローカル環境でのみ利用できます。');
        return;
    }

    const previewState = createMaintenanceScreenPreviewState(1);
    fillMaintenanceResultSample(previewState);
    window.latestBattleResultState = previewState;

    document.getElementById('maintenance-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('replacement-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.add('hidden');

    await showBattleResult(previewState);
    window.returnToMaintenanceFromPreview();
};

window.previewMaintenanceReplacementScreen = async function () {
    if (!isLocalMaintenanceEnvironment()) {
        window.alert('入れ替え画面確認はローカル環境でのみ利用できます。');
        return;
    }

    const previewState = createMaintenanceScreenPreviewState(1);
    document.getElementById('maintenance-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');

    await showReplacementSelection(previewState);
    window.returnToMaintenanceFromPreview();
};

window.openLibrary = function () {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('library-screen').classList.remove('hidden');
    setupLibraryScreen();
};

window.openStatistics = function () {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('statistics-screen').classList.remove('hidden');
    setupStatisticsScreen();
};

window.backToMenu = function () {
    document.getElementById('library-screen').classList.add('hidden');
    document.getElementById('statistics-screen').classList.add('hidden');
    document.getElementById('ranked-screen').classList.add('hidden');
    document.getElementById('maintenance-screen').classList.add('hidden');
    document.getElementById('replacement-screen').classList.add('hidden');
    document.getElementById('relic-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
};

window.toggleFullLog = function () {
    const panel = document.getElementById('full-log-panel');
    if (!panel) return;
    const isHidden = panel.classList.toggle('hidden');
    document.querySelectorAll('.full-log-toggle').forEach(btn => {
        btn.textContent = isHidden ? '履歴' : '閉じる';
        btn.title = isHidden ? '全ログ表示' : '全ログを閉じる';
        btn.setAttribute('aria-label', isHidden ? '全ログ表示' : '全ログを閉じる');
    });
    if (!isHidden) {
        const content = document.getElementById('full-log-content');
        if (content) content.scrollTop = content.scrollHeight;
    }
};

window.copyFullLogToClipboard = async function () {
    const content = document.getElementById('full-log-content');
    const button = document.getElementById('full-log-copy-button');
    const text = content?.innerText?.trim() || '';
    if (!text) {
        if (button) button.textContent = 'ログなし';
        setTimeout(() => {
            if (button) button.textContent = 'コピー';
        }, 1200);
        return;
    }

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        if (button) button.textContent = 'コピー済み';
    } catch (error) {
        console.error('Failed to copy battle log:', error);
        if (button) button.textContent = '失敗';
    }

    setTimeout(() => {
        if (button) button.textContent = 'コピー';
    }, 1400);
};

window.refreshBattleStatsPanel = function () {
    const panel = document.getElementById('battle-stats-panel');
    if (!panel) return;
    const activeTab = panel.dataset.activeTab || 'dealt';
    const previousTab = panel.dataset.renderedTab;
    const previousWidths = new Map();
    if (previousTab === activeTab) {
        panel.querySelectorAll('.battle-stats-row[data-battle-stats-key]').forEach(row => {
            previousWidths.set(row.dataset.battleStatsKey, {
                bar: row.style.getPropertyValue('--battle-stats-bar-width') || '0%',
                taken: row.style.getPropertyValue('--battle-stats-taken-width') || '0%',
                mitigate: row.style.getPropertyValue('--battle-stats-mitigate-width') || '0%',
                dealt: row.style.getPropertyValue('--battle-stats-dealt-width') || '0%',
                resisted: row.style.getPropertyValue('--battle-stats-resisted-width') || '0%'
            });
        });
    }

    panel.innerHTML = renderBattleStatsPanel(gameState, activeTab);
    panel.dataset.activeTab = activeTab;
    panel.dataset.renderedTab = activeTab;

    const rows = [...panel.querySelectorAll('.battle-stats-row[data-battle-stats-key]')];
    rows.forEach(row => {
        const target = {
            bar: row.style.getPropertyValue('--battle-stats-bar-width') || '0%',
            taken: row.style.getPropertyValue('--battle-stats-taken-width') || '0%',
            mitigate: row.style.getPropertyValue('--battle-stats-mitigate-width') || '0%',
            dealt: row.style.getPropertyValue('--battle-stats-dealt-width') || '0%',
            resisted: row.style.getPropertyValue('--battle-stats-resisted-width') || '0%'
        };
        row.dataset.targetBarWidth = target.bar;
        row.dataset.targetTakenWidth = target.taken;
        row.dataset.targetMitigateWidth = target.mitigate;
        row.dataset.targetDealtWidth = target.dealt;
        row.dataset.targetResistedWidth = target.resisted;

        const previous = previousWidths.get(row.dataset.battleStatsKey) || { bar: '0%', taken: '0%', mitigate: '0%', dealt: '0%', resisted: '0%' };
        row.style.setProperty('--battle-stats-bar-width', previous.bar);
        row.style.setProperty('--battle-stats-taken-width', previous.taken);
        row.style.setProperty('--battle-stats-mitigate-width', previous.mitigate);
        row.style.setProperty('--battle-stats-dealt-width', previous.dealt);
        row.style.setProperty('--battle-stats-resisted-width', previous.resisted);
    });

    // Recreateされた行に「前の幅」を一度描画させてから、次フレームで目標幅へ遷移させる。
    panel.offsetHeight;
    requestAnimationFrame(() => {
        rows.forEach(row => {
            row.style.setProperty('--battle-stats-bar-width', row.dataset.targetBarWidth || '0%');
            row.style.setProperty('--battle-stats-taken-width', row.dataset.targetTakenWidth || '0%');
            row.style.setProperty('--battle-stats-mitigate-width', row.dataset.targetMitigateWidth || '0%');
            row.style.setProperty('--battle-stats-dealt-width', row.dataset.targetDealtWidth || '0%');
            row.style.setProperty('--battle-stats-resisted-width', row.dataset.targetResistedWidth || '0%');
        });
    });
};

window.toggleBattleStatsPanel = function () {
    const panel = document.getElementById('battle-stats-panel');
    if (!panel) return;

    panel.classList.remove('hidden');
    panel.dataset.activeTab = panel.dataset.activeTab || 'dealt';
    window.refreshBattleStatsPanel();
};

window.setBattleSpeed = function (speed) {
    const safeSpeed = [1, 3, 10].includes(Number(speed)) ? Number(speed) : 1;
    const container = document.getElementById('battle-speed');
    if (!container) return;

    container.dataset.speed = String(safeSpeed);
    container.querySelectorAll('.battle-speed-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.speed) === safeSpeed);
    });
};

// モーダルを閉じるためのイベントを登録
document.addEventListener('DOMContentLoaded', () => {
    const host = window.location.hostname;
    const isLocalServer = ['localhost', '127.0.0.1', '::1'].includes(host);
    document.body.classList.toggle('is-local-server', isLocalServer);
    if (!isLocalServer) {
        const debugMode = document.getElementById('debug-mode');
        if (debugMode) debugMode.checked = false;
    }

    const modal = document.getElementById('detail-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    }
    const battleStatsPanel = document.getElementById('battle-stats-panel');
    if (battleStatsPanel) {
        battleStatsPanel.addEventListener('click', (e) => {
            const tabButton = e.target.closest('[data-battle-stats-tab]');
            if (!tabButton) return;
            battleStatsPanel.dataset.activeTab = tabButton.dataset.battleStatsTab;
            window.refreshBattleStatsPanel();
        });
    }
    const fullLogPanel = document.getElementById('full-log-panel');
    if (fullLogPanel) {
        fullLogPanel.addEventListener('click', (e) => {
            if (e.target === fullLogPanel) {
                window.toggleFullLog();
            }
        });
    }
});

// ⚔️ バトル本番の開始
function startAdventureBattle() {
    document.getElementById('char-select-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');
    clearFullLog();

    gameState.floor = 1;
    gameState.currentFloor = 1;
    gameState.maxFloor = ADVENTURE_MAX_FLOOR;
    gameState.isChainMode = true;
    gameState.mode = 'adventure';
    gameState.relics = [];
    resetRunCharacterProgress(gameState);
    ensureRelicState(gameState);
    gameState.statsSubmitted = false;
    gameState.rankedResultApplied = false;

    const selectedIds = getSelectedPlayerIds();
    gameState.players = createParty(selectedIds);
    gameState.enemies = generateRandomEnemies(gameState);
    gameState.turn = 0;
    applySpeciesSetBonuses(gameState, { healToFull: true });
    const relicStartEvents = applyRelicBattleStart(gameState);
    initBattleStats(gameState);

    const floorText = document.getElementById('floor-text');
    if (floorText) floorText.innerText = `1 / ${gameState.maxFloor}`;

    initBattleSystem(gameState);
    render(gameState);
    void playBattleStartVisualEffects(gameState, relicStartEvents);
}

function startCustomBattle() {
    document.getElementById('custom-select-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');
    clearFullLog();

    const selection = getCustomBattleSelection();
    gameState.floor = 1;
    gameState.currentFloor = 1;
    gameState.maxFloor = 1;
    gameState.isChainMode = false;
    gameState.mode = 'custom';
    gameState.relics = [];
    resetRunCharacterProgress(gameState);
    ensureRelicState(gameState);
    gameState.statsSubmitted = false;
    gameState.rankedResultApplied = false;
    gameState.players = createParty(selection.playerIds);
    gameState.enemies = createParty(selection.enemyIds);
    gameState.nextEnemies = null;
    gameState.turn = 0;
    applySpeciesSetBonuses(gameState, { healToFull: true });
    const relicStartEvents = applyRelicBattleStart(gameState);
    initBattleStats(gameState);

    const floorText = document.getElementById('floor-text');
    if (floorText) floorText.innerText = 'CUSTOM';

    initBattleSystem(gameState);
    render(gameState);
    void playBattleStartVisualEffects(gameState, relicStartEvents);
}

function startRankedBattle() {
    document.getElementById('ranked-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');
    clearFullLog();

    const selection = getRankedMatchSelection();
    const opponent = selection.opponent;
    gameState.floor = 1;
    gameState.currentFloor = 1;
    gameState.maxFloor = 1;
    gameState.isChainMode = false;
    gameState.mode = 'ranked';
    gameState.relics = [];
    ensureRelicState(gameState);
    gameState.statsSubmitted = false;
    gameState.rankedResultApplied = false;
    gameState.players = createParty(selection.playerIds);
    gameState.enemies = createParty(opponent?.party_ids || []);
    gameState.nextEnemies = null;
    gameState.turn = 0;
    gameState.rankedMatch = {
        opponentPartyId: opponent?.id || null,
        rank: opponent?.rank || 'bronze',
        opponentRating: opponent?.rating || 1000
    };
    applySpeciesSetBonuses(gameState, { healToFull: true });
    const relicStartEvents = applyRelicBattleStart(gameState);
    initBattleStats(gameState);

    const floorText = document.getElementById('floor-text');
    if (floorText) floorText.innerText = 'RANKED';

    initBattleSystem(gameState);
    render(gameState);
    void playBattleStartVisualEffects(gameState, relicStartEvents);
}
