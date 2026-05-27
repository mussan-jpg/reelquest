// screens/customBattleScreen.js
import { masterCharacters } from '../data/characters/index.js';
import { createCharacterCard, getCharacterRarity } from './shared.js';
import { getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';
import { buildFusionReplacement, findFusionRuleForParty } from './specialEventScreen.js';
import { SPECIES_BONUSES } from '../battle/setBonuses.js';

let selectedPlayerIds = [];
let selectedEnemyIds = [];
let activeRarityTab = 'all';
let activePickSide = 'player';
let activeSpeciesFilter = 'all';

export function getCustomBattleSelection() {
    return {
        playerIds: [...selectedPlayerIds],
        enemyIds: [...selectedEnemyIds]
    };
}

function getSelectedCharacters(ids) {
    return ids
        .map(id => masterCharacters.find(char => char.id === id))
        .filter(Boolean);
}

function updateStartButton() {
    const playerSlots = getOccupiedSlots(getSelectedCharacters(selectedPlayerIds));
    const enemySlots = getOccupiedSlots(getSelectedCharacters(selectedEnemyIds));
    const playerSlotsEl = document.getElementById('custom-player-slots');
    const enemySlotsEl = document.getElementById('custom-enemy-slots');
    const startBtn = document.getElementById('start-custom-battle-btn');

    if (playerSlotsEl) playerSlotsEl.textContent = `${playerSlots} / ${PARTY_SLOT_LIMIT}`;
    if (enemySlotsEl) enemySlotsEl.textContent = `${enemySlots} / ${PARTY_SLOT_LIMIT}`;
    if (startBtn) {
        startBtn.disabled = playerSlots !== PARTY_SLOT_LIMIT || enemySlots !== PARTY_SLOT_LIMIT;
    }
}

function getSideIds(side) {
    return side === 'player' ? selectedPlayerIds : selectedEnemyIds;
}

function isPicked(charId) {
    return selectedPlayerIds.includes(charId) || selectedEnemyIds.includes(charId);
}

function getFilteredCandidates({ excludeIds = [] } = {}) {
    const excluded = new Set(excludeIds);
    return masterCharacters
        .filter(charData => activeRarityTab === 'all' || getCharacterRarity(charData) === Number(activeRarityTab))
        .filter(charData => activeSpeciesFilter === 'all' || charData.species === activeSpeciesFilter)
        .filter(charData => getSlotCost(charData) <= PARTY_SLOT_LIMIT)
        .filter(charData => !excluded.has(charData.id));
}

function maybeOfferCustomFusion(selectedIds) {
    const selectedCharacters = getSelectedCharacters(selectedIds);
    const rule = findFusionRuleForParty(selectedCharacters);
    if (!rule) return;
    if (isPicked(rule.resultId)) return;

    const replacement = buildFusionReplacement(selectedCharacters, rule);
    if (!replacement) return;
    if (!window.confirm(rule.message)) return;

    selectedIds.splice(0, selectedIds.length, ...replacement.remainingParty.map(char => char.id), rule.resultId);
    window.alert(`${replacement.removedCharacters.map(char => char.name).join(' + ')} が合体し、${replacement.resultData.name} が選択されました！`);
}

function createCustomCard(charData) {
    const card = createCharacterCard(charData, {
        extraClass: `custom-character-card ${isPicked(charData.id) ? 'picked' : ''}`,
        showName: false
    });
    const slotCost = getSlotCost(charData);

    card.addEventListener('click', () => {
        if (isPicked(charData.id)) return;

        const selectedIds = getSideIds(activePickSide);
        const occupiedSlots = getOccupiedSlots(getSelectedCharacters(selectedIds));
        if (occupiedSlots + slotCost > PARTY_SLOT_LIMIT) {
            alert(`${activePickSide === 'player' ? '味方' : '敵'}に編成できるのは${PARTY_SLOT_LIMIT}枠までです！`);
            return;
        }
        selectedIds.push(charData.id);
        maybeOfferCustomFusion(selectedIds);
        renderCustomScreen();
    });

    return card;
}

function createPickedCard(charData, side) {
    const card = createCharacterCard(charData, {
        extraClass: 'custom-character-card custom-picked-card',
        showName: false,
        title: `${charData.name}（クリックで外す）`
    });

    card.addEventListener('click', () => {
        const selectedIds = getSideIds(side);
        const index = selectedIds.indexOf(charData.id);
        if (index >= 0) selectedIds.splice(index, 1);
        renderCustomScreen();
    });

    return card;
}

function renderCharacterList() {
    const container = document.getElementById('custom-character-list');
    if (!container) return;

    container.innerHTML = '';
    const candidates = getFilteredCandidates();
    if (candidates.length === 0) {
        container.innerHTML = '<div class="custom-empty-state">この条件のキャラはいません</div>';
        return;
    }
    candidates.forEach(charData => {
        container.appendChild(createCustomCard(charData));
    });
}

function renderPickedList(containerId, side) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    getSideIds(side).forEach(id => {
        const charData = masterCharacters.find(char => char.id === id);
        if (charData) container.appendChild(createPickedCard(charData, side));
    });
}

function renderGradeTabs() {
    const container = document.getElementById('custom-character-tabs');
    if (!container) return;

    container.innerHTML = ['all', 1, 2, 3, 4, 5, 6].map(rarity => `
        <button type="button" class="${activeRarityTab === rarity ? 'active' : ''}" data-rarity="${rarity}">
            ${rarity === 'all' ? '全て' : `★${rarity}`}
        </button>
    `).join('');

    container.querySelectorAll('button').forEach(button => {
        button.onclick = () => {
            activeRarityTab = button.dataset.rarity === 'all' ? 'all' : Number(button.dataset.rarity);
            renderCustomScreen();
        };
    });
}

function renderSpeciesFilter() {
    const container = document.getElementById('custom-species-filter');
    if (!container) return;

    container.innerHTML = [
        ['all', 'すべて'],
        ...Object.entries(SPECIES_BONUSES).map(([species, bonus]) => [species, bonus.label])
    ].map(([species, label]) => `
        <button type="button" class="${activeSpeciesFilter === species ? 'active' : ''}" data-species="${species}">
            ${label}
        </button>
    `).join('');

    container.querySelectorAll('button').forEach(button => {
        button.onclick = () => {
            activeSpeciesFilter = button.dataset.species || 'all';
            renderCustomScreen();
        };
    });
}

function renderPickTargetButtons() {
    document.querySelectorAll('.custom-pick-target').forEach(button => {
        const isPlayer = button.id === 'custom-pick-player-btn';
        button.classList.toggle('active', activePickSide === (isPlayer ? 'player' : 'enemy'));
    });
}

function selectRandomParty(side) {
    const otherSideIds = side === 'player' ? selectedEnemyIds : selectedPlayerIds;
    const candidates = getFilteredCandidates({ excludeIds: otherSideIds });
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const picked = [];

    for (const charData of shuffled) {
        if (getOccupiedSlots(getSelectedCharacters(picked)) + getSlotCost(charData) > PARTY_SLOT_LIMIT) continue;
        picked.push(charData.id);
        if (getOccupiedSlots(getSelectedCharacters(picked)) === PARTY_SLOT_LIMIT) break;
    }

    if (getOccupiedSlots(getSelectedCharacters(picked)) !== PARTY_SLOT_LIMIT) {
        alert('現在のグレード/種族条件ではフル編成を作れません。条件を広げてください。');
        return;
    }

    if (side === 'player') {
        selectedPlayerIds = picked;
    } else {
        selectedEnemyIds = picked;
    }
    activePickSide = side;
    renderCustomScreen();
}

function renderCustomScreen() {
    renderGradeTabs();
    renderSpeciesFilter();
    renderPickTargetButtons();
    renderCharacterList();
    renderPickedList('custom-player-picks', 'player');
    renderPickedList('custom-enemy-picks', 'enemy');
    updateStartButton();
}

export function setupCustomBattleSelection(onStart) {
    selectedPlayerIds = [];
    selectedEnemyIds = [];
    activeRarityTab = 'all';
    activePickSide = 'player';
    activeSpeciesFilter = 'all';

    const playerPickBtn = document.getElementById('custom-pick-player-btn');
    if (playerPickBtn) playerPickBtn.onclick = () => {
        activePickSide = 'player';
        renderPickTargetButtons();
    };
    const enemyPickBtn = document.getElementById('custom-pick-enemy-btn');
    if (enemyPickBtn) enemyPickBtn.onclick = () => {
        activePickSide = 'enemy';
        renderPickTargetButtons();
    };

    const randomPlayerBtn = document.getElementById('custom-random-player-btn');
    if (randomPlayerBtn) randomPlayerBtn.onclick = () => selectRandomParty('player');

    const randomEnemyBtn = document.getElementById('custom-random-enemy-btn');
    if (randomEnemyBtn) randomEnemyBtn.onclick = () => selectRandomParty('enemy');

    const startBtn = document.getElementById('start-custom-battle-btn');
    if (startBtn) startBtn.onclick = onStart;

    renderCustomScreen();
}
