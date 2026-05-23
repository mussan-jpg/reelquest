// screens/replacementScreen.js
import { masterCharacters } from '../data/characters/index.js';
import { formatCharacterTypeLabel, formatSpeciesLabel, getCharacterRarity, getCharacterRarityClass, getCharacterType, getSpeciesTooltip, showCharacterDetail } from './shared.js';
import { canFitInParty, createCharacterFromData, getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';

export function showReplacementSelection(gameState) {
    return new Promise((resolve) => {
        const replacementScreen = document.getElementById('replacement-screen');
        const battleScreen = document.getElementById('battle-screen');
        const description = document.getElementById('replacement-description');
        const nextEnemyPreview = document.getElementById('next-enemy-preview');
        const candidateList = document.getElementById('replacement-candidate-list');
        const partyList = document.getElementById('replacement-party-list');
        const confirmBtn = document.getElementById('replacement-confirm-btn');
        const skipBtn = document.getElementById('replacement-skip-btn');

        if (!replacementScreen || !description || !candidateList || !partyList || !confirmBtn || !skipBtn) {
            resolve();
            return;
        }

        const floor = gameState.currentFloor;
        let minRarity = 1;
        let maxRarity = 6;
        if (floor === 1) { maxRarity = 2; }
        else if (floor === 2) { maxRarity = 3; }
        else if (floor === 3) { minRarity = 2; maxRarity = 4; }
        else if (floor === 4) { minRarity = 3; maxRarity = 5; }
        else if (floor >= 5) { minRarity = 4; maxRarity = 6; }

        description.innerText = `次の階へ進む前に、★${minRarity}〜★${maxRarity}の新しい仲間候補から1体を選び、現在のパーティから枠が収まるように1体を入れ替えてください。現在 ${getOccupiedSlots(gameState.players)} / ${PARTY_SLOT_LIMIT}枠。`;

        const currentIds = gameState.players.map(p => p.id);
        const pool = masterCharacters
            .filter(char => {
                const rarity = getCharacterRarity(char);
                return rarity >= minRarity && rarity <= maxRarity && !currentIds.includes(char.id) && !char.isSpecialOnly;
            })
            .map(char => char.id);

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const displayIds = shuffled.slice(0, 4);

        let selectedCandidateId = null;
        let selectedPartyIdx = null;
        const candidateCards = [];
        const partyCards = [];

        const updateButtons = () => {
            const canReplace = selectedCandidateId && selectedPartyIdx !== null;
            const candidate = masterCharacters.find(char => char.id === selectedCandidateId);
            const removed = selectedPartyIdx !== null ? [gameState.players[selectedPartyIdx]] : [];
            const fits = canReplace && candidate && canFitInParty(gameState.players, candidate, removed);
            confirmBtn.disabled = !fits;
            confirmBtn.style.background = fits ? '#2ecc71' : '#bdc3c7';
            confirmBtn.style.color = fits ? '#fff' : '#7f8c8d';
        };

        const createCard = (char, extraClass = '') => {
            const card = document.createElement('div');
            card.className = `candidate-card ${getCharacterRarityClass(char)} ${extraClass}`.trim();
            card.style.cursor = 'pointer';
            const slotCost = getSlotCost(char);
            const characterType = getCharacterType(char);

            card.innerHTML = `
                <div class="candidate-img" style="height: 80px;">
                    <img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="candidate-name replacement-card-name">${char.name}</div>
                <div class="library-card-species party-select-card-species replacement-card-species" data-tooltip="${getSpeciesTooltip(char)}">${formatSpeciesLabel(char)}</div>
                <div class="library-card-type party-select-card-type replacement-card-type ${characterType.className}">${formatCharacterTypeLabel(characterType)}</div>
                ${slotCost > 1 ? `<div class="slot-cost-badge">${slotCost}枠</div>` : ''}
            `;
            return card;
        };

        const clearCandidateSelection = () => {
            candidateCards.forEach(card => card.classList.remove('selected'));
        };

        const clearPartySelection = () => {
            partyCards.forEach(card => card.classList.remove('selected'));
        };

        candidateList.innerHTML = '';
        partyList.innerHTML = '';
        if (nextEnemyPreview) {
            nextEnemyPreview.innerHTML = '';
            const previewTitle = document.createElement('div');
            previewTitle.className = 'next-enemy-preview-title';
            previewTitle.innerText = `${gameState.currentFloor + 1}階の敵`;
            const previewList = document.createElement('div');
            previewList.className = 'next-enemy-preview-list';
            (gameState.nextEnemies || []).forEach(enemy => {
                const card = createCard(enemy, 'next-enemy-card');
                card.addEventListener('click', () => showCharacterDetail(enemy.id));
                card.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showCharacterDetail(enemy.id); });
                previewList.appendChild(card);
            });
            nextEnemyPreview.appendChild(previewTitle);
            nextEnemyPreview.appendChild(previewList);
        }

        displayIds.forEach(id => {
            const charData = masterCharacters.find(c => c.id === id);
            if (!charData) return;
            const card = createCard(charData);
            card.addEventListener('click', () => {
                selectedCandidateId = id;
                clearCandidateSelection();
                card.classList.add('selected');
                updateButtons();
            });
            card.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showCharacterDetail(id); });
            card.addEventListener('auxclick', (e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); showCharacterDetail(id); } });
            card.addEventListener('dblclick', () => { showCharacterDetail(id); });
            card.oncontextmenu = () => false;
            candidateCards.push(card);
            candidateList.appendChild(card);
        });

        gameState.players.forEach((player, idx) => {
            const card = createCard(player);
            card.addEventListener('click', () => {
                selectedPartyIdx = idx;
                clearPartySelection();
                card.classList.add('selected');
                updateButtons();
            });
            card.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showCharacterDetail(player.id); });
            card.addEventListener('auxclick', (e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); showCharacterDetail(player.id); } });
            card.addEventListener('dblclick', () => { showCharacterDetail(player.id); });
            card.oncontextmenu = () => false;
            partyCards.push(card);
            partyList.appendChild(card);
        });

        confirmBtn.onclick = () => {
            if (!selectedCandidateId || selectedPartyIdx === null) return;
            const data = masterCharacters.find(char => char.id === selectedCandidateId);
            if (!data) return;
            if (!canFitInParty(gameState.players, data, [gameState.players[selectedPartyIdx]])) return;

            const newChar = createCharacterFromData(data);
            gameState.players[selectedPartyIdx] = newChar;
            replacementScreen.classList.add('hidden');
            battleScreen.classList.remove('hidden');
            resolve();
        };

        skipBtn.onclick = () => {
            replacementScreen.classList.add('hidden');
            battleScreen.classList.remove('hidden');
            resolve();
        };

        battleScreen.classList.add('hidden');
        replacementScreen.classList.remove('hidden');
        updateButtons();
    });
}
