// main.js
import { masterCharacters } from './data/characters/index.js';
import { render } from './ui/index.js';
import { initBattleSystem, generateRandomEnemies } from './battle/index.js';
import { setupLibraryScreen } from './screens/libraryScreen.js';
import { setupCharacterSelection, getSelectedPlayerIds } from './screens/characterSelectScreen.js';
import { setupCustomBattleSelection, getCustomBattleSelection } from './screens/customBattleScreen.js';
import { showReplacementSelection } from './screens/replacementScreen.js';
import { renderBattleStatsPanel, showBattleResult } from './screens/resultScreen.js';
import { showCharacterDetail } from './screens/shared.js';
import { initBattleStats } from './battle/stats.js';
import { applySpeciesSetBonuses } from './battle/setBonuses.js';
import { APP_VERSION } from './version.js';
import { createCharacterFromData } from './partySlots.js';

// グローバル関数として登録（HTMLや動的生成要素からの呼び出し用）
window.showCharacterDetail = showCharacterDetail;
window.showReplacementSelection = showReplacementSelection;
window.showBattleResult = showBattleResult;

const appVersionEl = document.getElementById('app-version');
if (appVersionEl) {
    appVersionEl.textContent = `v${APP_VERSION}`;
}

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, false);

let gameState = {
    players: [],
    enemies: [],
    floor: 1,
    currentFloor: 1,
    maxFloor: 5,
    isChainMode: true,
    turn: 0
};

// パーティ作成ヘルパー関数
function createParty(idList) {
    if (!idList || idList.length === 0) return [];
    return idList.map(id => {
        const data = masterCharacters.find(char => char.id === id);
        return createCharacterFromData(data);
    }).filter(char => char !== null);
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
    }
};

window.openLibrary = function () {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('library-screen').classList.remove('hidden');
    setupLibraryScreen();
};

window.backToMenu = function () {
    document.getElementById('library-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
};

window.toggleFullLog = function () {
    const panel = document.getElementById('full-log-panel');
    if (!panel) return;
    const isHidden = panel.classList.toggle('hidden');
    document.querySelectorAll('.full-log-toggle').forEach(btn => {
        btn.textContent = isHidden ? '📜' : '✖️';
        btn.title = isHidden ? '全ログ表示' : '全ログを閉じる';
        btn.setAttribute('aria-label', isHidden ? '全ログ表示' : '全ログを閉じる');
    });
    if (!isHidden) {
        panel.scrollTop = panel.scrollHeight;
    }
};

window.refreshBattleStatsPanel = function () {
    const panel = document.getElementById('battle-stats-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    const activeTab = panel.dataset.activeTab || 'dealt';
    panel.innerHTML = renderBattleStatsPanel(gameState, activeTab);
    panel.dataset.activeTab = activeTab;
};

window.toggleBattleStatsPanel = function () {
    const panel = document.getElementById('battle-stats-panel');
    if (!panel) return;

    const isHidden = panel.classList.toggle('hidden');
    document.querySelectorAll('.battle-stats-toggle').forEach(btn => {
        btn.textContent = isHidden ? '📊' : '✖️';
        btn.title = isHidden ? 'ランキング表示' : 'ランキングを閉じる';
        btn.setAttribute('aria-label', isHidden ? 'ランキング表示' : 'ランキングを閉じる');
    });
    if (!isHidden) {
        panel.dataset.activeTab = panel.dataset.activeTab || 'dealt';
        window.refreshBattleStatsPanel();
    }
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
});

// ⚔️ バトル本番の開始
function startAdventureBattle() {
    document.getElementById('char-select-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');

    gameState.floor = 1;
    gameState.currentFloor = 1;
    gameState.maxFloor = 6;
    gameState.isChainMode = true;

    const selectedIds = getSelectedPlayerIds();
    gameState.players = createParty(selectedIds);
    gameState.enemies = generateRandomEnemies(gameState);
    gameState.turn = 0;
    applySpeciesSetBonuses(gameState, { healToFull: true });
    initBattleStats(gameState);

    const floorText = document.getElementById('floor-text');
    if (floorText) floorText.innerText = `1 / ${gameState.maxFloor}`;

    initBattleSystem(gameState);
    render(gameState);
}

function startCustomBattle() {
    document.getElementById('custom-select-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');

    const selection = getCustomBattleSelection();
    gameState.floor = 1;
    gameState.currentFloor = 1;
    gameState.maxFloor = 1;
    gameState.isChainMode = false;
    gameState.players = createParty(selection.playerIds);
    gameState.enemies = createParty(selection.enemyIds);
    gameState.nextEnemies = null;
    gameState.turn = 0;
    applySpeciesSetBonuses(gameState, { healToFull: true });
    initBattleStats(gameState);

    const floorText = document.getElementById('floor-text');
    if (floorText) floorText.innerText = 'CUSTOM';

    initBattleSystem(gameState);
    render(gameState);
}
