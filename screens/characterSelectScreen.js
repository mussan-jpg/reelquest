// screens/characterSelectScreen.js
import { masterCharacters } from '../data/characters/index.js';
import { formatCharacterTypeLabel, formatSpeciesLabel, getCharacterRarity, getCharacterRarityClass, getCharacterType, getSpeciesTooltip, showCharacterDetail } from './shared.js';
import { getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';

let selectedPlayerIds = [];

// 味方・敵の区別なく、全データから「★2以下（リール数が2段階以下）」のキャラIDを自動で抽出する
export const allPlayerIds = masterCharacters
    .filter(char => {
        if (char.isSpecialOnly) return false;
        if (getSlotCost(char) > 1) return false;
        if (Array.isArray(char.commands)) {
            if (Array.isArray(char.commands[0])) {
                return char.commands.length <= 2;
            }
            return true;
        }
        return false;
    })
    .map(char => char.id);

export function getSelectedPlayerIds() {
    return selectedPlayerIds;
}

export function setupCharacterSelection(onStart) {
    const container = document.getElementById('candidate-list');
    if (!container) return;
    container.innerHTML = '';
    selectedPlayerIds = [];

    const shuffled = [...allPlayerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const displayCount = Math.min(5, shuffled.length);
    const displayCandidates = shuffled.slice(0, displayCount);

    displayCandidates.forEach(id => {
        const charData = masterCharacters.find(c => c.id === id);
        if (!charData) return;

        const card = document.createElement('div');
        card.className = `candidate-card ${getCharacterRarityClass(charData)}`;
        card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        card.style.transition = 'all 0.2s ease';
        const rarity = getCharacterRarity(charData);
        const stars = '★'.repeat(Math.max(1, Math.min(6, rarity)));
        const slotCost = getSlotCost(charData);
        const characterType = getCharacterType(charData);

        card.innerHTML = `
            <div class="candidate-img" style="cursor: pointer;" data-tooltip="右クリックで詳細表示">
                <img src="${charData.image}" alt="${charData.name}" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div class="candidate-name party-select-card-name">${charData.name}</div>
            <div class="party-select-card-stars">${stars}</div>
            <div class="library-card-species party-select-card-species" data-tooltip="${getSpeciesTooltip(charData)}">${formatSpeciesLabel(charData)}</div>
            <div class="library-card-type party-select-card-type ${characterType.className}">${formatCharacterTypeLabel(characterType)}</div>
            ${slotCost > 1 ? `<div class="slot-cost-badge">${slotCost}枠</div>` : ''}
        `;

        const imgArea = card.querySelector('.candidate-img');
        imgArea.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showCharacterDetail(id);
        });

        card.addEventListener('click', () => {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                selectedPlayerIds = selectedPlayerIds.filter(pid => pid !== id);
                card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
            } else {
                const selectedCharacters = selectedPlayerIds
                    .map(pid => masterCharacters.find(c => c.id === pid))
                    .filter(Boolean);
                const occupiedSlots = getOccupiedSlots(selectedCharacters);
                if (occupiedSlots + slotCost > PARTY_SLOT_LIMIT) {
                    alert(`パーティに編成できるのは${PARTY_SLOT_LIMIT}枠までです！`);
                    return;
                }
                card.classList.add('selected');
                selectedPlayerIds.push(id);
                card.style.boxShadow = '0 0 12px #2ecc71, inset 0 0 8px rgba(46, 204, 113, 0.3)';
            }

            const startBtn = document.getElementById('start-adventure-btn');
            if (startBtn) {
                const selectedCharacters = selectedPlayerIds
                    .map(pid => masterCharacters.find(c => c.id === pid))
                    .filter(Boolean);
                startBtn.disabled = (getOccupiedSlots(selectedCharacters) !== PARTY_SLOT_LIMIT);
            }
        });

        container.appendChild(card);
    });

    const startBtn = document.getElementById('start-adventure-btn');
    if (startBtn) {
        startBtn.onclick = onStart;
    }
}
