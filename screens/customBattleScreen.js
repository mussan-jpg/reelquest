// screens/customBattleScreen.js
import { masterCharacters } from '../data/characters/index.js';
import { formatCharacterTypeLabel, formatSpeciesLabel, getCharacterRarity, getCharacterRarityClass, getCharacterType, getSpeciesTooltip, showCharacterDetail } from './shared.js';
import { getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';

let selectedPlayerIds = [];
let selectedEnemyIds = [];
let activeRarityTab = 1;
let activePickSide = 'player';

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

function createCustomCard(charData) {
    const card = document.createElement('div');
    const slotCost = getSlotCost(charData);
    const characterType = getCharacterType(charData);

    card.className = `candidate-card custom-character-card ${getCharacterRarityClass(charData)} ${isPicked(charData.id) ? 'picked' : ''}`;
    card.dataset.characterId = charData.id;
    card.title = charData.name;
    card.innerHTML = `
        <div class="candidate-img" style="cursor: pointer;" data-tooltip="右クリックで詳細表示">
            <img src="${charData.image}" alt="${charData.name}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        <div class="library-card-species party-select-card-species" data-tooltip="${getSpeciesTooltip(charData)}">${formatSpeciesLabel(charData)}</div>
        <div class="library-card-type party-select-card-type ${characterType.className}">${formatCharacterTypeLabel(characterType)}</div>
        ${slotCost > 1 ? `<div class="slot-cost-badge">${slotCost}枠</div>` : ''}
    `;

    const imgArea = card.querySelector('.candidate-img');
    imgArea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCharacterDetail(charData.id);
    });

    card.addEventListener('click', () => {
        if (isPicked(charData.id)) return;

        const selectedIds = getSideIds(activePickSide);
        const occupiedSlots = getOccupiedSlots(getSelectedCharacters(selectedIds));
        if (occupiedSlots + slotCost > PARTY_SLOT_LIMIT) {
            alert(`${activePickSide === 'player' ? '味方' : '敵'}に編成できるのは${PARTY_SLOT_LIMIT}枠までです！`);
            return;
        }
        selectedIds.push(charData.id);
        renderCustomScreen();
    });

    return card;
}

function createPickedCard(charData, side) {
    const card = document.createElement('div');
    const slotCost = getSlotCost(charData);
    const characterType = getCharacterType(charData);

    card.className = `candidate-card custom-character-card custom-picked-card ${getCharacterRarityClass(charData)}`;
    card.dataset.characterId = charData.id;
    card.title = `${charData.name}（クリックで外す）`;
    card.innerHTML = `
        <div class="candidate-img" style="cursor: pointer;" data-tooltip="右クリックで詳細表示">
            <img src="${charData.image}" alt="${charData.name}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        <div class="library-card-species party-select-card-species" data-tooltip="${getSpeciesTooltip(charData)}">${formatSpeciesLabel(charData)}</div>
        <div class="library-card-type party-select-card-type ${characterType.className}">${formatCharacterTypeLabel(characterType)}</div>
        ${slotCost > 1 ? `<div class="slot-cost-badge">${slotCost}枠</div>` : ''}
    `;

    const imgArea = card.querySelector('.candidate-img');
    imgArea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCharacterDetail(charData.id);
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
    masterCharacters.filter(charData => getCharacterRarity(charData) === activeRarityTab).forEach(charData => {
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

    container.innerHTML = [1, 2, 3, 4, 5, 6].map(rarity => `
        <button type="button" class="${activeRarityTab === rarity ? 'active' : ''}" data-rarity="${rarity}">
            ★${rarity}
        </button>
    `).join('');

    container.querySelectorAll('button').forEach(button => {
        button.onclick = () => {
            activeRarityTab = Number(button.dataset.rarity);
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

function selectRandomEnemies() {
    const candidates = masterCharacters
        .filter(charData => getCharacterRarity(charData) === activeRarityTab)
        .filter(charData => !selectedPlayerIds.includes(charData.id));
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const picked = [];

    for (const charData of shuffled) {
        if (getOccupiedSlots(getSelectedCharacters(picked)) + getSlotCost(charData) > PARTY_SLOT_LIMIT) continue;
        picked.push(charData.id);
        if (getOccupiedSlots(getSelectedCharacters(picked)) === PARTY_SLOT_LIMIT) break;
    }

    selectedEnemyIds = picked;
    renderCustomScreen();
}

function renderCustomScreen() {
    renderGradeTabs();
    renderPickTargetButtons();
    renderCharacterList();
    renderPickedList('custom-player-picks', 'player');
    renderPickedList('custom-enemy-picks', 'enemy');
    updateStartButton();
}

export function setupCustomBattleSelection(onStart) {
    selectedPlayerIds = [];
    selectedEnemyIds = [];
    activeRarityTab = 1;
    activePickSide = 'player';

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

    const randomEnemyBtn = document.getElementById('custom-random-enemy-btn');
    if (randomEnemyBtn) randomEnemyBtn.onclick = selectRandomEnemies;

    const startBtn = document.getElementById('start-custom-battle-btn');
    if (startBtn) startBtn.onclick = onStart;

    renderCustomScreen();
}
