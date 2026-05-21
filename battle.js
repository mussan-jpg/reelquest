
// battle.js
// 戦闘関連の処理をまとめたモジュール
import { updateAllHPBars, render, updateCommandsUI } from './ui.js';
import { commandEffects } from './commands.js';
import { masterCharacters } from './characterData.js';
import { Character } from './gameData.js';

// 敵キャラクターIDの基本セット
const baseEnemyIds = ["char_slime", "char_skeleton", "char_imp", "char_dragon", "char_thunderbird", "char_ghost"];

// 画面で使用する敵ID一覧
const allEnemyIds = baseEnemyIds;

// プレイヤー側キャラクターID一覧（敵IDは除外）
const allPlayerIds = masterCharacters
    .filter(char => !baseEnemyIds.includes(char.id))
    .map(char => char.id);

// 戦闘ログを画面に追加する関数
function alertLog(msg) {
    const log = document.getElementById('log');
    if (log) {
        log.innerHTML += `<div>${msg}</div>`;
        log.scrollTop = log.scrollHeight;
    }
}

// 高速モード判定とスリープヘルパー
function isQuickModeEnabled() {
    try {
        const el = document.getElementById('quick-mode');
        if (el && el.checked !== undefined) return !!el.checked;
    } catch (e) { }
    return false;
}

function sleep(ms) {
    if (isQuickModeEnabled()) return Promise.resolve();
    return new Promise(r => setTimeout(r, ms));
}

// ランダムな敵パーティを生成する
export function generateRandomEnemies(gameState) {
    // 現在の階層を取得（未設定なら1階）
    const currentFloor = gameState.floor || 1;
    
    // 階層に応じたレアリティ範囲で敵候補を抽出する
    let minRarity = 1;
    let maxRarity = 1;
    if (currentFloor === 1) {
        minRarity = 1;
        maxRarity = 1;
    } else if (currentFloor === 2) {
        minRarity = 1;
        maxRarity = 2;
    } else if (currentFloor === 3) {
        minRarity = 2;
        maxRarity = 3;
    } else if (currentFloor === 4) {
        minRarity = 3;
        maxRarity = 4;
    } else {
        minRarity = 4;
        maxRarity = 4;
    }

    // masterCharacters からレアリティで候補を抽出する
    const availableEnemies = masterCharacters
        .filter(c => {
            const rarity = getCharacterRarityInternal(c);
            return rarity >= minRarity && rarity <= maxRarity;
        })
        .map(c => c.id);

    // 3体の敵をランダムに選択
    const chosenEnemies = [];
    for (let i = 0; i < 3; i++) {
        const randIdx = Math.floor(Math.random() * availableEnemies.length);
        chosenEnemies.push(availableEnemies[randIdx]);
    }

    // 選択した敵IDからCharacterインスタンスを生成
    return chosenEnemies.map(id => {
        const data = masterCharacters.find(char => char.id === id);
        const charData = JSON.parse(JSON.stringify(data));
        
        if (typeof charData.commands === 'string') {
            charData.commands = charData.commands.split(',').map(c => [c]);
        } else if (Array.isArray(charData.commands) && !Array.isArray(charData.commands[0])) {
            charData.commands = [charData.commands];
        }

        const enemyChar = new Character(charData);
        enemyChar.id = charData.id;
        enemyChar.currentReel = 0;
        enemyChar.poisonedIndices = [];
        enemyChar.status = [];
        return enemyChar;
    });
}

// キャラクターの死亡状態を画面に反映する
function updateDeathStates(gameState) {
    gameState.players.forEach((p, idx) => {
        const el = document.getElementById(`p-section-${idx}`);
        if (el) {
            if (p.hp <= 0) el.classList.add('is-dead');
            else el.classList.remove('is-dead');
        }
    });
    gameState.enemies.forEach((e, idx) => {
        const el = document.getElementById(`e-section-${idx}`);
        if (el) {
            if (e.hp <= 0) el.classList.add('is-dead');
            else el.classList.remove('is-dead');
        }
    });
}

// ルーレット演出を行い、最終的なコマンド選択番号を返す
async function doRoulette(prefix, charIdx, commands) {
    // 高速モードなら演出をスキップして即時決定
    if (isQuickModeEnabled()) {
        return Math.floor(Math.random() * commands.length);
    }

    const targetIdx = Math.floor(Math.random() * commands.length);
    const totalSteps = 18 + targetIdx;
    const rouletteId = `${prefix}-roulette-${charIdx}`;

    for (let i = 0; i <= totalSteps; i++) {
        let currentIdx = i % commands.length;
        document.querySelectorAll(`#${rouletteId} .cmd-item`).forEach(el => el.classList.remove('active'));

        const currentEl = document.getElementById(`${prefix}-${charIdx}-c${currentIdx}`);
        if (currentEl) currentEl.classList.add('active');

        let speed = (i > totalSteps - 4) ? 100 : 20;
        await sleep(speed);
    }
    return targetIdx;
}

// 手動選択モードでコマンドクリックを待機する
function waitForCommand(prefix, charIdx) {
    return new Promise((resolve) => {
        const rouletteId = `${prefix}-roulette-${charIdx}`;
        const rouletteEl = document.getElementById(rouletteId);
        if (!rouletteEl) return resolve(0);

        const cmdElements = rouletteEl.querySelectorAll('.cmd-item');
        cmdElements.forEach(el => el.classList.remove('active'));

        cmdElements.forEach((el, idx) => {
            el.style.cursor = 'pointer';
            
            const enterHandler = () => { el.style.backgroundColor = '#ffeaa7'; };
            const leaveHandler = () => { el.style.backgroundColor = ''; };
            
            el.addEventListener('mouseenter', enterHandler);
            el.addEventListener('mouseleave', leaveHandler);

            el.addEventListener('click', () => {
                const clonedRoulette = rouletteEl.cloneNode(true);
                rouletteEl.parentNode.replaceChild(clonedRoulette, rouletteEl);

                const selectedEl = clonedRoulette.children[idx];
                if (selectedEl) {
                    selectedEl.classList.add('active');
                    selectedEl.style.backgroundColor = '';
                    selectedEl.style.cursor = 'default';
                }

                resolve(idx);
            }, { once: true });
        });
    });
}

function getStatusAttackMultiplier(attacker) {
    if (!attacker || !attacker.status) return 1;
    return attacker.status.includes("weak") ? 0.5 : 1;
}

function getStatusDefenseMultiplier(target) {
    if (!target || !target.status) return 1;
    return target.status.includes("weakened") ? 1.5 : 1;
}

function adjustStatusDamage(rawDamage, attacker, target) {
    const multiplier = getStatusAttackMultiplier(attacker) * getStatusDefenseMultiplier(target);
    return Math.max(0, Math.floor(rawDamage * multiplier));
}

// コマンド実行処理：効果を適用し、UIを更新する
async function execute(attacker, target, commandId, gameState, attackerPrefix, attackerIdx, targetPrefix, targetIdx) {
    const effect = commandEffects[commandId];
    if (!effect) return;

    const initialTargetHp = target ? target.hp : 0;
    let message = effect.action(attacker, target);

    const rawDamage = target ? Math.max(0, initialTargetHp - target.hp) : 0;
    const adjustedDamage = adjustStatusDamage(rawDamage, attacker, target);
    if (rawDamage > 0 && adjustedDamage !== rawDamage) {
        const delta = adjustedDamage - rawDamage;
        target.hp = Math.max(0, target.hp - delta);
        message += `\n※ 状態異常の影響でダメージが ${rawDamage} → ${adjustedDamage} に${delta > 0 ? '増加' : '減少'}した！`;
    }

    alertLog(message);

    const isReelUp = commandId.startsWith('cmd_up');
    const isReelDown = commandId.startsWith('cmd_down');
    const isMisc = commandId.startsWith('misc');

    const targetEl = document.getElementById(`${targetPrefix}-section-${targetIdx}`);
    
    if (targetEl && !isReelUp && !isReelDown && !isMisc) {
        const isHeal = commandId.includes('heal'); 
        const flashColor = isHeal ? 'rgba(46, 204, 113, 0.6)' : 'rgba(231, 76, 60, 0.6)';
        targetEl.style.backgroundColor = flashColor;
        targetEl.style.transition = 'background-color 0.1s';
    }

    updateAllHPBars(gameState);
    updateDeathStates(gameState); 
    
    // 攻撃者の枠線を強調表示
    const attackerEl = document.getElementById(`${attackerPrefix}-section-${attackerIdx}`);
    if (attackerEl && attacker.hp > 0) {
        attackerEl.style.setProperty('border', '3px solid #f1c40f', 'important');
    }
    
    // リール操作系コマンドならコマンドUIを更新
    if (isReelUp || isReelDown) {
        const nextReelIdx = attacker.currentReel !== undefined ? attacker.currentReel : 0;
        const nextCmds = (attacker.commands && Array.isArray(attacker.commands[0])) ? attacker.commands[nextReelIdx] : attacker.commands;
        updateCommandsUI(attackerPrefix, attackerIdx, nextCmds, nextReelIdx);
    }

    await sleep(400);
    
    if (targetEl && !isReelUp && !isReelDown && !isMisc) {
        targetEl.style.backgroundColor = ''; 
        targetEl.style.transition = 'background-color 0.3s ease-out';
    }

    if (attacker.hp <= 0) alertLog(`${attacker.name}は力尽きた！`);
    if (target.hp <= 0) alertLog(`${target.name}は力尽きた！`);
    updateDeathStates(gameState); 
}

// コマンドに応じて攻撃対象を決定する
function determineTarget(commandId, attackerIdx, currentSide, gameState) {
    const myParty = currentSide === 'p' ? gameState.players : gameState.enemies;
    const enemyParty = currentSide === 'p' ? gameState.enemies : gameState.players;
    const myPrefix = currentSide;
    const enemyPrefix = currentSide === 'p' ? 'e' : 'p';

    const supportReelUpCommands = ['misc_support_reel_up', 'misc_support_reel_up2'];
    if (supportReelUpCommands.includes(commandId)) {
        const aliveAllies = myParty
            .map((char, idx) => ({ data: char, prefix: myPrefix, index: idx }))
            .filter(item => item.data.hp > 0 && item.index !== attackerIdx);

        if (aliveAllies.length > 0) {
            return aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
        }

        return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
    }

    if (commandId.startsWith('cmd_up') || commandId.startsWith('cmd_down') || commandId.startsWith('misc')) {
        return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
    }

    if (commandId.includes('heal')) {
        const aliveFriends = myParty
            .map((char, idx) => ({ data: char, prefix: myPrefix, index: idx }))
            .filter(item => item.data.hp > 0);

        if (aliveFriends.length === 0) {
            return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
        }
        return aliveFriends[Math.floor(Math.random() * aliveFriends.length)];
    }

    const aliveEnemies = enemyParty
        .map((char, idx) => ({ data: char, prefix: enemyPrefix, index: idx }))
        .filter(item => item.data.hp > 0);

    if (aliveEnemies.length === 0) return null;
    return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
}

/**
 * 戦闘システムの初期化とターン処理を設定する
 */
export function initBattleSystem(gameState) {
    window.gameTurn = async function gameTurn() {
        const btn = document.getElementById('atk-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "行動中...";
        }

        while (true) {
            updateDeathStates(gameState);

            alertLog(`--- 新しいターン開始 ---`);
            await sleep(600);

            let actionQueue = [];

            gameState.players.forEach((p, idx) => {
                if (p.hp > 0) actionQueue.push({ char: p, side: 'p', index: idx });
            });
            gameState.enemies.forEach((e, idx) => {
                if (e.hp > 0) actionQueue.push({ char: e, side: 'e', index: idx });
            });

            actionQueue.sort((a, b) => b.char.spd - a.char.spd);

            for (let i = 0; i < actionQueue.length; i++) {
                const actor = actionQueue[i].char;
                const side = actionQueue[i].side;
                const actorIdx = actionQueue[i].index;

                if (actor.hp <= 0) continue;

                // 麻痺なら行動できず、状態異常を解除する
                    if (actor.status && actor.status.includes("paralysis")) {
                    alertLog(`${actor.name}はマヒで行動できない！`);
                    actor.status = actor.status.filter(s => s !== "paralysis");
                    
                    if (actor.status.includes("poison")) {
                        await sleep(800);
                        const poisonDmg = Math.floor(actor.maxHp * 0.15); 
                        actor.hp = Math.max(0, actor.hp - poisonDmg);
                        alertLog(`${actor.name}は毒ダメージを受けた！ (${poisonDmg})`);
                        updateAllHPBars(gameState);
                        updateDeathStates(gameState); 
                        if (actor.hp <= 0) alertLog(`${actor.name}は力尽きた！`);
                    }
                    
                    await sleep(1000);
                    continue;
                }

                const hasAlivePlayers = gameState.players.some(p => p.hp > 0);
                const hasAliveEnemies = gameState.enemies.some(e => e.hp > 0);
                if (!hasAlivePlayers || !hasAliveEnemies) break;

                // 行動中のキャラクターを枠線で強調表示
                const actorEl = document.getElementById(`${side}-section-${actorIdx}`);
                if (actorEl && actor.hp > 0) {
                    actorEl.style.setProperty('border', '3px solid #f1c40f', 'important'); 
                }

                let keepActing = true;
                while (keepActing) {
                    const liveP = gameState.players.some(p => p.hp > 0);
                    const liveE = gameState.enemies.some(e => e.hp > 0);
                    if (!liveP || !liveE || actor.hp <= 0) {
                        keepActing = false;
                        break;
                    }

                    const activeReelIdx = actor.currentReel !== undefined ? actor.currentReel : 0;
                    const currentCmds = (actor.commands && Array.isArray(actor.commands[0]))
                        ? actor.commands[activeReelIdx]
                        : actor.commands;

                    let cmdIdx;
                    const debugMode = document.getElementById('debug-mode');
                    
                    if (debugMode && debugMode.checked) {
                        alertLog(`【操作】${actor.name}のコマンドを選択してください...`);
                        cmdIdx = await waitForCommand(side, actorIdx);
                    } else {
                        cmdIdx = await doRoulette(side, actorIdx, currentCmds);
                    }
                    
                    const commandId = currentCmds[cmdIdx];

                    const targetInfo = determineTarget(commandId, actorIdx, side, gameState);
                    if (!targetInfo) {
                        keepActing = false;
                        break;
                    }

                    await execute(actor, targetInfo.data, commandId, gameState, side, actorIdx, targetInfo.prefix, targetInfo.index);

                    if (commandId.startsWith('cmd_up') || commandId.startsWith('cmd_down')) {
                        await sleep(800);
                        alertLog(`${actor.name}は連続行動できる！`);
                        await sleep(800);
                    } else {
                        keepActing = false; 
                    }
                }

                // 行動が終わったキャラクターの枠線表示を戻す
                if (actorEl && actor.hp > 0) {
                    const isParalyzed = actor.status && actor.status.includes("paralysis");
                    if (isParalyzed) {
                        actorEl.style.setProperty('border', '3px solid #f1c40f', 'important');
                    } else {
                        actorEl.style.setProperty('border', '3px solid transparent', 'important');
                    }
                }

                // 毒による継続ダメージを処理する
                if (actor.hp > 0 && actor.status && actor.status.includes("poison")) {
                    await sleep(800);
                    const poisonDmg = Math.floor(actor.maxHp * 0.15); 
                    actor.hp = Math.max(0, actor.hp - poisonDmg);
                    alertLog(`${actor.name}は毒ダメージを受けた！ (${poisonDmg})`);
                    
                    updateAllHPBars(gameState);
                    updateDeathStates(gameState); 

                    if (actor.hp <= 0) {
                        await sleep(800);
                        alertLog(`${actor.name}は力尽きた！`);
                    }
                    await sleep(1000);
                }

                await sleep(1000);
            }

            // 戦闘終了判定
            const allPlayersDead = gameState.players.every(p => p.hp <= 0);
            const allEnemiesDead = gameState.enemies.every(e => e.hp <= 0);

            if (allPlayersDead) {
                alertLog("味方が全滅しました…ゲームオーバー。");
                if (btn) {
                    btn.disabled = false; 
                    btn.innerText = "💀 GAME OVER (メニューに戻る)";
                    
                    const menuBtn = btn.cloneNode(true);
                    menuBtn.addEventListener('click', () => {
                        location.reload(); 
                    });
                    btn.parentNode.replaceChild(menuBtn, btn);
                }
                return; 
            }

            if (allEnemiesDead) {
                if (gameState.isChainMode && gameState.currentFloor < gameState.maxFloor) {
                    alertLog("敵を全滅させた！次の階に進みます。");
                    
                    // 階クリア後のメンバー入れ替え画面を表示
                    await triggerReplacementEvent(gameState);

                    gameState.currentFloor++; 
                    alertLog(`🏰 ${gameState.currentFloor}階へ進みます！`);
                    
                    // 階層クリア後に味方のHPと状態をリセット
                    gameState.players.forEach(p => {
                        p.hp = p.maxHp;           // HPを最大まで回復
                        p.currentReel = 0;        // リール状態を初期化
                        p.status = [];            // 全ての状態異常を解除
                        p.poisonedIndices = [];   // 毒の蓄積をリセット
                    });
                    
                    gameState.enemies = generateRandomEnemies(gameState);
                    gameState.turn = 0; 
                    
                    document.getElementById('floor-badge').innerText = `🏰 現在の階層: ${gameState.currentFloor} / ${gameState.maxFloor} F`;
                    
                    render(gameState);
                    
                    await sleep(1500);
                    continue;
                } else {
                    alertLog("5階層の試練をすべて突破！完全クリア！！");
                    if (btn) {
                        btn.disabled = false;
                        btn.innerText = "🏆 COMPLETE!! (メニューに戻る)";
                        
                        const menuBtn = btn.cloneNode(true);
                        menuBtn.addEventListener('click', () => {
                            location.reload();
                        });
                        btn.parentNode.replaceChild(menuBtn, btn);
                    }
                    return; 
                }
            }

            await sleep(1000);
        }
    };
}

// キャラクターのレアリティ（リール数）を計算する
function getCharacterRarityInternal(charData) {
    if (!charData) return 1;
    const cmds = charData.commands;
    if (typeof cmds === 'string') {
        return cmds.split(',').length;
    }
    if (Array.isArray(cmds)) {
        if (Array.isArray(cmds[0])) {
            return cmds.length;
        }
        return 1;
    }
    return 1;
}

function getRarityById(id) {
    const data = masterCharacters.find(c => c.id === id);
    return getCharacterRarityInternal(data);
}

// 階層クリア時のメンバー入れ替えイベント
async function triggerReplacementEvent(gameState) {
    if (typeof window.showReplacementSelection === 'function') {
        await window.showReplacementSelection(gameState);
    }
}

