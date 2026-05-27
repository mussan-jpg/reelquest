// screens/replacementScreen.js
import { masterCharacters } from '../data/characters/index.js';
import { getFloorRarityRange } from '../battle/enemy.js';
import { bindCharacterDetailTrigger, createCharacterCard, getCharacterRarity, getCharacterRarityClass, showCharacterDetail } from './shared.js';
import { createCharacterFromData, getLimitBreakDisplayText, getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';

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
        const resultBackBtn = document.getElementById('replacement-result-back-btn');

        if (!replacementScreen || !description || !candidateList || !partyList || !confirmBtn || !skipBtn) {
            resolve();
            return;
        }

        const floor = gameState.currentFloor;
        const { minRarity, maxRarity } = getFloorRarityRange(floor + 1);

        description.innerHTML = `
            <strong>${gameState.currentFloor}階クリア</strong>
            <span>次の敵を見て、合計${PARTY_SLOT_LIMIT}枠ぶんの次階層パーティを組み直してください。</span>
        `;

        const currentIds = gameState.players.map(p => p.id);
        const sourcePoolIds = [...new Set(gameState.players.flatMap(player => (
            Array.isArray(player.sourceIds) && player.sourceIds.length ? player.sourceIds : [player.id]
        )))];
        const pool = masterCharacters
            .filter(char => {
                const rarity = getCharacterRarity(char);
                return rarity >= minRarity
                    && rarity <= maxRarity
                    && getSlotCost(char) <= PARTY_SLOT_LIMIT
                    && !currentIds.includes(char.id)
                    && !sourcePoolIds.includes(char.id)
                    && !char.isSpecialOnly;
            })
            .map(char => char.id);

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const displayIds = shuffled.slice(0, 5);
        const rebuildPoolIds = [...sourcePoolIds, ...displayIds];

        const selectedIds = [];

        const updateButtons = () => {
            const selectedCharacters = selectedIds
                .map(id => masterCharacters.find(char => char.id === id))
                .filter(Boolean);
            const slots = getOccupiedSlots(selectedCharacters);
            const complete = slots === PARTY_SLOT_LIMIT;
            confirmBtn.disabled = !complete;
            confirmBtn.style.background = complete ? '#2ecc71' : '#bdc3c7';
            confirmBtn.style.color = complete ? '#fff' : '#7f8c8d';
            description.innerHTML = `
                <strong>${gameState.currentFloor}階クリア</strong>
                <span>次の敵を見て、合計${PARTY_SLOT_LIMIT}枠ぶんの次階層パーティを組み直してください。</span>
                <em class="${complete ? 'is-complete' : ''}">現在 ${slots} / ${PARTY_SLOT_LIMIT}枠</em>
            `;
        };

        const getCandidateSourceMeta = (id) => {
            if (displayIds.includes(id)) {
                return { label: '新候補', className: 'replacement-source-badge--new' };
            }
            if (currentIds.includes(id)) {
                return { label: '継続候補', className: 'replacement-source-badge--current' };
            }
            return { label: '素材に戻る', className: 'replacement-source-badge--source' };
        };

        const createCard = (char, extraClass = '', options = {}) => {
            const card = createCharacterCard(char, {
                extraClass,
                cursor: 'pointer',
                imageStyle: 'height: 80px;',
                nameClass: 'replacement-card-name',
                speciesClass: 'replacement-card-species',
                typeClass: 'replacement-card-type',
                sourceMeta: options.sourceMeta
            });
            return card;
        };

        const createCurrentSummaryCard = (char) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = `replacement-current-card ${getCharacterRarityClass(char)}`;
            const slotCost = getSlotCost(char);
            const sourceCount = Array.isArray(char.sourceIds) ? char.sourceIds.length : 0;
            const growthText = getLimitBreakDisplayText(char);
            item.innerHTML = `
                <span class="replacement-current-img"><img src="${char.image}" alt="${char.name}"></span>
                <span class="replacement-current-main">
                    <strong>${char.name}</strong>
                    <small>${slotCost}枠 / ${growthText}${sourceCount ? ` / 合成素材${sourceCount}体に戻ります` : ''}</small>
                </span>
            `;
            item.addEventListener('click', () => showCharacterDetail(char.id));
            bindCharacterDetailTrigger(item, char.id, null);
            return item;
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
                previewList.appendChild(card);
            });
            nextEnemyPreview.appendChild(previewTitle);
            nextEnemyPreview.appendChild(previewList);
        }

        rebuildPoolIds.forEach(id => {
            const charData = masterCharacters.find(c => c.id === id);
            if (!charData) return;
            const card = createCard(charData, '', { sourceMeta: getCandidateSourceMeta(id) });
            card.addEventListener('click', () => {
                const existingIndex = selectedIds.indexOf(id);
                if (existingIndex >= 0) {
                    selectedIds.splice(existingIndex, 1);
                    card.classList.remove('selected');
                    updateButtons();
                    return;
                }
                const nextCharacters = [...selectedIds, id]
                    .map(selectedId => masterCharacters.find(char => char.id === selectedId))
                    .filter(Boolean);
                if (getOccupiedSlots(nextCharacters) > PARTY_SLOT_LIMIT) {
                    window.alert(`${PARTY_SLOT_LIMIT}枠を超える編成は選べません。`);
                    return;
                }
                selectedIds.push(id);
                card.classList.add('selected');
                updateButtons();
            });
            bindCharacterDetailTrigger(card, id, null);
            card.addEventListener('auxclick', (e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); showCharacterDetail(id); } });
            card.addEventListener('dblclick', () => { showCharacterDetail(id); });
            card.oncontextmenu = () => false;
            candidateList.appendChild(card);
        });

        gameState.players.forEach((player, idx) => {
            const card = createCurrentSummaryCard(player);
            partyList.appendChild(card);
        });

        confirmBtn.onclick = () => {
            const selectedCharacters = selectedIds
                .map(id => masterCharacters.find(char => char.id === id))
                .filter(Boolean);
            if (getOccupiedSlots(selectedCharacters) !== PARTY_SLOT_LIMIT) return;
            gameState.players = selectedCharacters.map(data => createCharacterFromData(data, { gameState })).filter(Boolean);
            replacementScreen.classList.add('hidden');
            battleScreen.classList.remove('hidden');
            resolve();
        };

        skipBtn.onclick = () => {
            replacementScreen.classList.add('hidden');
            battleScreen.classList.remove('hidden');
            resolve();
        };

        if (resultBackBtn) {
            resultBackBtn.onclick = async () => {
                if (typeof window.showBattleResult !== 'function') return;
                resultBackBtn.disabled = true;
                replacementScreen.classList.add('hidden');
                await window.showBattleResult(gameState);
                battleScreen?.classList.add('hidden');
                replacementScreen.classList.remove('hidden');
                resultBackBtn.disabled = false;
            };
        }

        battleScreen.classList.add('hidden');
        replacementScreen.classList.remove('hidden');
        updateButtons();
    });
}
