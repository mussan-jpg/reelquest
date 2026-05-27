import { masterCharacters } from '../data/characters/index.js';
import { getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';
import { createCharacterCard, getCharacterRarity } from './shared.js';
import { getRankedOpponent, getRankedProfile, submitRankedParty } from '../services/onlineApi.js';

let selectedRankedIds = [];
let activeRarityTab = 1;
let currentOpponent = null;

function getSelectedCharacters(ids) {
    return ids.map(id => masterCharacters.find(char => char.id === id)).filter(Boolean);
}

export function getRankedMatchSelection() {
    return {
        playerIds: [...selectedRankedIds],
        opponent: currentOpponent
    };
}

function createRankedCard(charData, picked = false) {
    return createCharacterCard(charData, {
        extraClass: `custom-character-card ${picked ? 'picked' : ''}`,
        showName: false
    });
}

function renderRankedProfile() {
    const profile = getRankedProfile();
    const profileEl = document.getElementById('ranked-profile');
    if (!profileEl) return;
    profileEl.innerHTML = `
        <div><strong>${profile.rank.toUpperCase()}</strong></div>
        <div>Rating ${profile.rating}</div>
        <div>${profile.wins}勝 / ${profile.losses}敗</div>
    `;
}

function updateRankedStartButton() {
    const slots = getOccupiedSlots(getSelectedCharacters(selectedRankedIds));
    const slotsEl = document.getElementById('ranked-player-slots');
    const startBtn = document.getElementById('start-ranked-battle-btn');
    if (slotsEl) slotsEl.textContent = `${slots} / ${PARTY_SLOT_LIMIT}`;
    if (startBtn) startBtn.disabled = slots !== PARTY_SLOT_LIMIT;
}

function renderPickedList() {
    const container = document.getElementById('ranked-player-picks');
    if (!container) return;
    container.innerHTML = '';
    selectedRankedIds.forEach(id => {
        const charData = masterCharacters.find(char => char.id === id);
        if (!charData) return;
        const card = createRankedCard(charData);
        card.addEventListener('click', () => {
            const index = selectedRankedIds.indexOf(id);
            if (index >= 0) selectedRankedIds.splice(index, 1);
            renderRankedScreen();
        });
        container.appendChild(card);
    });
}

function renderCharacterList() {
    const container = document.getElementById('ranked-character-list');
    if (!container) return;
    container.innerHTML = '';
    masterCharacters
        .filter(charData => getCharacterRarity(charData) === activeRarityTab)
        .filter(charData => getSlotCost(charData) <= PARTY_SLOT_LIMIT)
        .forEach(charData => {
            const picked = selectedRankedIds.includes(charData.id);
            const card = createRankedCard(charData, picked);
            card.addEventListener('click', () => {
                if (picked) return;
                if (getOccupiedSlots(getSelectedCharacters(selectedRankedIds)) + getSlotCost(charData) > PARTY_SLOT_LIMIT) {
                    alert(`${PARTY_SLOT_LIMIT}枠までです！`);
                    return;
                }
                selectedRankedIds.push(charData.id);
                renderRankedScreen();
            });
            container.appendChild(card);
        });
}

function renderGradeTabs() {
    const container = document.getElementById('ranked-character-tabs');
    if (!container) return;
    container.innerHTML = [1, 2, 3, 4, 5, 6].map(rarity => `
        <button type="button" class="${activeRarityTab === rarity ? 'active' : ''}" data-rarity="${rarity}">★${rarity}</button>
    `).join('');
    container.querySelectorAll('button').forEach(button => {
        button.onclick = () => {
            activeRarityTab = Number(button.dataset.rarity);
            renderRankedScreen();
        };
    });
}

function renderRankedScreen() {
    renderRankedProfile();
    renderGradeTabs();
    renderCharacterList();
    renderPickedList();
    updateRankedStartButton();
}

export function setupRankedMatchScreen(onStart) {
    selectedRankedIds = [];
    activeRarityTab = 1;
    currentOpponent = null;

    const submitBtn = document.getElementById('submit-ranked-party-btn');
    if (submitBtn) {
        submitBtn.onclick = () => {
            if (getOccupiedSlots(getSelectedCharacters(selectedRankedIds)) !== PARTY_SLOT_LIMIT) return;
            submitRankedParty(selectedRankedIds);
            alert('ランクマッチ用の編成を登録しました！');
            renderRankedProfile();
        };
    }

    const startBtn = document.getElementById('start-ranked-battle-btn');
    if (startBtn) {
        startBtn.onclick = async () => {
            if (getOccupiedSlots(getSelectedCharacters(selectedRankedIds)) !== PARTY_SLOT_LIMIT) return;
            startBtn.disabled = true;
            startBtn.textContent = '相手検索中...';
            submitRankedParty(selectedRankedIds);
            currentOpponent = await getRankedOpponent();
            onStart();
        };
    }

    renderRankedScreen();
}
