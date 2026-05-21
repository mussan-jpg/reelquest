// main.js
import { masterCharacters } from './characterData.js';
import { Character } from './gameData.js';
import { render } from './ui.js';
import { initBattleSystem } from './battle.js';
import { commandEffects } from './commands.js';
import { generateRandomEnemies } from './battle.js';

// 全画面でブラウザの右クリックメニューを無効化する
// （右クリックでのキャラクター詳細表示などは独自処理で動作します）
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, false);

// 💡 修正1：コメントアウトを解除して、gameState オブジェクトを有効化します
let gameState = {
    players: [],
    enemies: [],
    floor: 1,
    currentFloor: 1,
    maxFloor: 5,
    isChainMode: true,
    turn: 0
};

// 味方・敵の区別なく、全データから「★2以下（リール数が2段階以下）」のキャラIDを自動で抽出する
const allPlayerIds = masterCharacters
    .filter(char => {
        if (Array.isArray(char.commands)) {
            if (Array.isArray(char.commands[0])) {
                return char.commands.length <= 2;
            }
            return true;
        }
        return false;
    })
    .map(char => char.id);

// 敵候補ID
const allEnemyIds = ["char_slime", "char_skeleton", "char_imp", "char_dragon", "char_thunderbird", "char_ghost"];

let selectedPlayerIds = []; // プレイヤーが選んだ3体のIDを記憶

// パーティ作成ヘルパー関数
function createParty(idList) {
    if (!idList || idList.length === 0) return [];
    return idList.map(id => {
        const data = masterCharacters.find(char => char.id === id);
        if (!data) return null;
        const charData = JSON.parse(JSON.stringify(data));

        if (typeof charData.commands === 'string') {
            charData.commands = charData.commands.split(',').map(c => [c]);
        } else if (Array.isArray(charData.commands) && !Array.isArray(charData.commands[0])) {
            charData.commands = [charData.commands];
        }

        const character = new Character(charData);
        character.currentReel = 0;
        character.poisonedIndices = [];
        character.status = [];
        return character;
    }).filter(char => char !== null);
}

// 🌐 画面遷移：モード選択ボタンを押した時
window.selectMode = function (mode) {
    if (mode === 'rush') {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('char-select-screen').classList.remove('hidden');
        setupCharacterSelection(); // キャラクター選択画面をビルド
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

function getCharacterRarity(char) {
    return normalizeCommandReels(char.commands).length;
}

function getCharacterRarityClass(char) {
    const rarity = Math.max(1, Math.min(4, getCharacterRarity(char)));
    return `rarity-${rarity}`;
}

function normalizeCommandReels(commands) {
    if (typeof commands === 'string') {
        return [commands.split(',').map(command => command.trim()).filter(Boolean)];
    }

    if (!Array.isArray(commands)) {
        return [[]];
    }

    return Array.isArray(commands[0]) ? commands : [commands];
}

function buildCommandTooltip(cmd, charData) {
    if (!cmd) return '効果: 詳細なし';

    let tooltip = `${cmd.name}\n効果: ${cmd.desc || '詳細なし'}`;
    if (typeof cmd.calcDamage === 'function') {
        const calculatedDmg = cmd.calcDamage(charData);
        if (calculatedDmg > 0) {
            tooltip += `\n予測ダメージ: ${calculatedDmg}`;
        }
    }

    return tooltip;
}

function getRarityMeta(rarity) {
    const normalizedRarity = Math.max(1, Math.min(4, rarity));
    const meta = {
        1: {
            label: '★1 ノーマル',
            cardClass: 'rarity-1',
            description: '基本性能が扱いやすいキャラクター'
        },
        2: {
            label: '★★ レア',
            cardClass: 'rarity-2',
            description: 'リールが増えて戦術が広がるキャラクター'
        },
        3: {
            label: '★★★ スーパーレア',
            cardClass: 'rarity-3',
            description: '高い能力や強力なコマンドを持つキャラクター'
        },
        4: {
            label: '★★★★ レジェンド',
            cardClass: 'rarity-4',
            description: '最上位のリールと個性を持つキャラクター'
        }
    };

    return meta[normalizedRarity];
}

function setupLibraryScreen() {
    const list = document.getElementById('library-list');
    if (!list) return;
    list.innerHTML = '';

    const groupedCharacters = [1, 2, 3, 4].map(rarity => ({
        rarity,
        characters: masterCharacters
            .filter(char => Math.max(1, Math.min(4, getCharacterRarity(char))) === rarity)
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    }));

    groupedCharacters.forEach(group => {
        if (group.characters.length === 0) return;

        const rarityMeta = getRarityMeta(group.rarity);
        const section = document.createElement('section');
        section.className = `library-section ${rarityMeta.cardClass}`;

        const header = document.createElement('div');
        header.className = 'library-section-header';

        const title = document.createElement('h2');
        title.innerText = rarityMeta.label;

        const count = document.createElement('span');
        count.innerText = `${group.characters.length}体`;

        const description = document.createElement('p');
        description.innerText = rarityMeta.description;

        header.appendChild(title);
        header.appendChild(count);
        section.appendChild(header);
        section.appendChild(description);

        const grid = document.createElement('div');
        grid.className = 'library-grid';

        group.characters.forEach(char => {
            const stars = '★'.repeat(group.rarity);
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `library-card ${rarityMeta.cardClass}`;

            const image = document.createElement('img');
            image.src = char.image;
            image.alt = char.name;
            image.className = 'library-card-image';

            const name = document.createElement('div');
            name.className = 'library-card-name';
            name.innerText = char.name;

            const rarityLabel = document.createElement('div');
            rarityLabel.className = 'library-card-rarity';
            rarityLabel.innerText = stars;

            const stats = document.createElement('div');
            stats.className = 'library-card-stats';
            stats.innerText = `HP ${char.maxHp} / ATK ${char.atk} / INT ${char.int} / SPD ${char.spd}`;

            const commands = document.createElement('div');
            commands.className = 'library-card-commands';
            const firstReel = normalizeCommandReels(char.commands)[0];
            const cmdNames = firstReel.map(cmdId => commandEffects[cmdId] ? commandEffects[cmdId].name : cmdId);
            commands.innerText = cmdNames.join(' / ');

            card.appendChild(image);
            card.appendChild(name);
            card.appendChild(rarityLabel);
            card.appendChild(stats);
            card.appendChild(commands);

            card.addEventListener('click', () => window.showCharacterDetail(char.id));
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                window.showCharacterDetail(char.id);
            });

            grid.appendChild(card);
        });

        section.appendChild(grid);
        list.appendChild(section);
    });
}

// 👥 キャラクター選択画面を生成するロジック
function setupCharacterSelection() {
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
        const stars = '★'.repeat(Math.max(1, Math.min(4, rarity)));

        card.innerHTML = `
                <div class="candidate-img" style="cursor: pointer;" data-tooltip="右クリックで詳細表示">
                    <img src="${charData.image}" alt="${charData.name}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
            <div class="candidate-name party-select-card-name">${charData.name}</div>
            <div class="party-select-card-stars">${stars}</div>
        `;

        const imgArea = card.querySelector('.candidate-img');
        imgArea.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.showCharacterDetail(id);
        });

        card.addEventListener('click', () => {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                selectedPlayerIds = selectedPlayerIds.filter(pid => pid !== id);
                // 🛠️ 選択解除：通常のシャドウに戻す
                card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
            } else {
                if (selectedPlayerIds.length >= 3) {
                    alert("パーティに編成できるのは3体までです！");
                    return;
                }
                card.classList.add('selected');
                selectedPlayerIds.push(id);
                // 🛠️ 選択中：最大グレードの色を活かしつつ、選択されたことがハッキリわかる強めの緑発光を上書き
                card.style.boxShadow = '0 0 12px #2ecc71, inset 0 0 8px rgba(46, 204, 113, 0.3)';
            }

            const startBtn = document.getElementById('start-adventure-btn');
            if (startBtn) startBtn.disabled = (selectedPlayerIds.length !== 3);
        });

        container.appendChild(card);
    });

    document.getElementById('start-adventure-btn').onclick = startAdventureBattle;
}

// =========================================================================
// 💡 全画面共通のキャラクター詳細ポップアップ表示ロジック
// =========================================================================
window.showCharacterDetail = function (charId) {
    const charData = masterCharacters.find(c => c.id === charId);
    if (!charData) return;

    const modal = document.getElementById('detail-modal');
    const infoContainer = document.getElementById('modal-char-info');
    if (!modal || !infoContainer) return;

    const getCmdName = (id) => commandEffects[id] ? commandEffects[id].name : id;
    const escapeHtml = (text = '') => String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // 💡 グレード判定（★4にアニメーションと背景サイズの設定を追加）
    const getReelStyle = (idx) => {
        switch (idx) {
            case 0: return "background: linear-gradient(135deg, #a05a2c, #d08a5c); border: 1px solid #703a1c;";
            case 1: return "background: linear-gradient(135deg, #bdc3c7, #ecf0f1); border: 1px solid #95a5a6;";
            case 2: return "background: linear-gradient(135deg, #f1c40f, #f39c12); border: 1px solid #962d00;";

            // 💡 修正：★4（case 3）に虹グラデーション・サイズ・アニメーションを適用
            // ※ animation の名称（下記の例では rainbow-bg）は、style.css や ui.js で定義したものに合わせてください
            case 3:
                return "background: linear-gradient(135deg, #ff7e5f, #feb47b, #86e3ce, #d6e4f0); background-size: 400% 400% !important; animation: rainbow-bg 5s ease infinite !important; border: 1px solid #bdc3c7;";

            default: return "background: #7f8c8d; border: 1px solid #333;";
        }
    };

    let reelsHtml = '';
    if (Array.isArray(charData.commands)) {
        const reels = Array.isArray(charData.commands[0]) ? charData.commands : [charData.commands];

        reels.forEach((reel, idx) => {
            const style = getReelStyle(idx);

            // 💡 コマンドを横一列に並べる（ここを修正）
            const cmdItems = reel.map(cmdId => {
                const cmd = commandEffects[cmdId];
                const cmdName = cmd ? cmd.name : cmdId;
                const tooltip = buildCommandTooltip(cmd, charData);

                return `
        <div data-tooltip="${escapeHtml(tooltip)}" style="flex: 1; padding: 5px; background: rgba(255,255,255,0.7); border: 1px solid #ccc; font-size: 0.8em; text-align: center; border-radius: 3px; cursor: help;">
            ${cmdName}
        </div>
    `;
            }).join('');

            reelsHtml += `
                <div style="flex: 1; display: flex; gap: 4px; margin-bottom: 6px; padding: 4px; border-radius: 4px; ${style}">
                    ${cmdItems}
                </div>
            `;
        });
    }

    infoContainer.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px;">
            <div style="width: 60px; height: 60px; border: 2px solid #333; border-radius: 6px; overflow: hidden;">
                <img src="${charData.image}" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <h2 style="margin: 0; color: #2c3e50;">${charData.name}</h2>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 15px; font-size: 0.9em;">
            <div>HP: ${charData.maxHp || charData.hp}</div>
            <div>ATK: ${charData.atk}</div>
            <div>INT: ${charData.int}</div>
            <div>SPD: ${charData.spd}</div>
        </div>

        <div>
            ${reelsHtml}
        </div>
    `;

    modal.classList.remove('hidden');
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
});

window.showReplacementSelection = function (gameState) {
    return new Promise((resolve) => {
        const replacementScreen = document.getElementById('replacement-screen');
        const battleScreen = document.getElementById('battle-screen');
        const description = document.getElementById('replacement-description');
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
        let maxRarity = 5;
        if (floor === 1) { maxRarity = 2; }
        else if (floor === 2) { maxRarity = 3; }
        else if (floor === 3) { minRarity = 2; maxRarity = 4; }
        else if (floor === 4) { minRarity = 3; maxRarity = 4; }

        description.innerText = `次の階へ進む前に、★${minRarity}〜★${maxRarity}の新しい仲間候補から1体を選び、現在のパーティから1体を入れ替えてください。`;

        const currentIds = gameState.players.map(p => p.id);
        const pool = allPlayerIds.filter(id => {
            const data = masterCharacters.find(char => char.id === id);
            if (!data) return false;
            const rarity = getCharacterRarity(data);
            return rarity >= minRarity && rarity <= maxRarity && !currentIds.includes(id);
        });

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const displayIds = shuffled.slice(0, 4);

        let selectedCandidateId = null;
        let selectedPartyIdx = null;
        const candidateCards = [];
        const partyCards = [];

        const updateButtons = () => {
            const canReplace = selectedCandidateId && selectedPartyIdx !== null;
            confirmBtn.disabled = !canReplace;
            confirmBtn.style.background = canReplace ? '#2ecc71' : '#bdc3c7';
            confirmBtn.style.color = canReplace ? '#fff' : '#7f8c8d';
        };

        const createCard = (char) => {
            const card = document.createElement('div');
            card.className = `candidate-card ${getCharacterRarityClass(char)}`;
            card.style.cursor = 'pointer';
            // レア度（コマンド配列の段数）を算出して★表記を作る
            const rarity = getCharacterRarity(char);
            const stars = '★'.repeat(Math.max(1, Math.min(4, rarity)));

            card.innerHTML = `
                <div class="candidate-img" style="height: 80px;">
                    <img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="candidate-name replacement-card-name">${char.name}</div>
                <div class="replacement-card-stars">${stars}</div>
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
            // 右クリックでキャラクター詳細を表示。auxclick/dblclick をフォールバックで追加
            card.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); window.showCharacterDetail(id); });
            card.addEventListener('auxclick', (e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); window.showCharacterDetail(id); } });
            card.addEventListener('dblclick', () => { window.showCharacterDetail(id); });
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
            // 右クリックでキャラクター詳細を表示（入れ替え時のパーティ側）。auxclick/dblclick をフォールバックで追加
            card.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); window.showCharacterDetail(player.id); });
            card.addEventListener('auxclick', (e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); window.showCharacterDetail(player.id); } });
            card.addEventListener('dblclick', () => { window.showCharacterDetail(player.id); });
            card.oncontextmenu = () => false;
            partyCards.push(card);
            partyList.appendChild(card);
        });

        confirmBtn.onclick = () => {
            if (!selectedCandidateId || selectedPartyIdx === null) return;
            const data = masterCharacters.find(char => char.id === selectedCandidateId);
            if (!data) return;

            const charData = JSON.parse(JSON.stringify(data));
            if (typeof charData.commands === 'string') {
                charData.commands = charData.commands.split(',').map(c => [c]);
            } else if (Array.isArray(charData.commands) && !Array.isArray(charData.commands[0])) {
                charData.commands = [charData.commands];
            }

            const newChar = new Character(charData);
            newChar.id = charData.id;
            newChar.currentReel = 0;
            newChar.poisonedIndices = [];
            newChar.status = [];

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
};

// ⚔️ バトル本番の開始
function startAdventureBattle() {
    document.getElementById('char-select-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');

    gameState.floor = 1;
    gameState.currentFloor = 1;
    gameState.maxFloor = 5;
    gameState.isChainMode = true;

    gameState.players = createParty(selectedPlayerIds);

    // 💡 修正：引数に gameState を渡す
    gameState.enemies = generateRandomEnemies(gameState);

    gameState.turn = 0;
    document.getElementById('floor-badge').innerText = `🏰 現在の階層: 1 / 5 F`;

    initBattleSystem(gameState);
    render(gameState);
}
