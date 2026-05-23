// battle/core.js
import { updateAllHPBars, render, updateOrderIcons } from '../ui/index.js';
import { execute } from './combat.js';
import { generateRandomEnemies } from './enemy.js';
import { removeStatus, resetBattleStats, syncAllStatusEffects } from '../commands/status.js';
import { initBattleStats, recordDamageDealt, recordDamageTaken } from './stats.js';
import { triggerSpecialRecruitmentEvent } from '../screens/specialEventScreen.js';
import { applySpeciesSetBonuses, applySpeciesTurnStartEffects } from './setBonuses.js';

export function alertLog(msg) {
    const htmlLine = `<div>${msg.replace(/\n/g, '<br>')}</div>`;
    const log = document.getElementById('log');
    if (log) {
        log.innerHTML += htmlLine;
        log.scrollTop = log.scrollHeight;
    }
    const fullLog = document.getElementById('full-log-content');
    if (fullLog) {
        fullLog.innerHTML += htmlLine;
        fullLog.scrollTop = fullLog.scrollHeight;
    }
}

export function getBattleSpeedMultiplier() {
    try {
        const el = document.getElementById('battle-speed');
        const activeButton = el?.querySelector?.('.battle-speed-btn.active');
        const speed = Number(activeButton?.dataset.speed || el?.dataset.speed || 1);
        return [1, 3, 10].includes(speed) ? speed : 1;
    } catch (e) { }
    return 1;
}

export function isQuickModeEnabled() {
    return getBattleSpeedMultiplier() > 1;
}

export function sleep(ms, options = {}) {
    if (options.force) return new Promise(r => setTimeout(r, ms));
    const selectedSpeed = getBattleSpeedMultiplier();
    if (selectedSpeed >= 10 || window.fastTurnMode) return Promise.resolve();
    const speedMultiplier = window.advanceToTurnEndRequested
        ? Math.max(selectedSpeed, 10)
        : selectedSpeed;
    return new Promise(r => setTimeout(r, Math.max(0, Math.round(ms / speedMultiplier))));
}

function requestAdvanceToTurnEnd() {
    window.advanceToTurnEndRequested = true;

    const btn = document.getElementById('end-turn-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "ターン終了まで進行中...";
    }

    if (typeof window.resolvePendingCommand === 'function') {
        window.resolvePendingCommand();
    }
}

function resetAdvanceToTurnEndButton() {
    window.advanceToTurnEndRequested = false;
    window.fastTurnMode = false;

    const btn = document.getElementById('end-turn-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "このターン終了まで進める";
    }
}

export function isDebugModeEnabled() {
    try {
        const el = document.getElementById('debug-mode');
        return !!(el && el.checked);
    } catch (e) {
        return false;
    }
}

export function updateDeathStates(gameState) {
    syncAllStatusEffects(gameState);

    gameState.players.forEach((p, idx) => {
        if (p.hp <= 0 && p.activeSpeciesBonus?.reviveOnce && !p.speciesReviveUsed) {
            p.speciesReviveUsed = true;
            p.hp = 1;
            alertLog(`${p.name}は【${p.activeSpeciesBonus.name}】でHP1で踏みとどまった！`);
        }
        const el = document.getElementById(`p-section-${idx}`);
        if (el) {
            if (p.hp <= 0) el.classList.add('is-dead');
            else el.classList.remove('is-dead');
            el.classList.toggle('is-paralyzed', p.hp > 0 && !!(p.status && p.status.includes('paralysis')));
        }
    });
    gameState.enemies.forEach((e, idx) => {
        if (e.hp <= 0 && e.activeSpeciesBonus?.reviveOnce && !e.speciesReviveUsed) {
            e.speciesReviveUsed = true;
            e.hp = 1;
            alertLog(`${e.name}は【${e.activeSpeciesBonus.name}】でHP1で踏みとどまった！`);
        }
        const el = document.getElementById(`e-section-${idx}`);
        if (el) {
            if (e.hp <= 0) el.classList.add('is-dead');
            else el.classList.remove('is-dead');
            el.classList.toggle('is-paralyzed', e.hp > 0 && !!(e.status && e.status.includes('paralysis')));
        }
    });
}

function tickDefensiveStatusDuration(actor, statusId, label) {
    const durationKey = `${statusId}Duration`;
    if (actor[durationKey] === undefined || actor[durationKey] <= 0) return false;

    actor[durationKey] -= 1;
    if (actor[durationKey] <= 0) {
        removeStatus(actor, statusId);
        alertLog(`${actor.name}の【${label}】効果が切れた。`);
        return true;
    }
    return false;
}

export async function runBattleRound(gameState) {
    const btn = document.getElementById('atk-btn');
    updateDeathStates(gameState);

    alertLog(`--- 新しいターン開始 ---`);
    applySpeciesTurnStartEffects(gameState, alertLog);
    updateAllHPBars(gameState);
    await sleep(600);

    let actionQueue = [];

    gameState.players.forEach((p, idx) => {
        if (p.hp > 0) actionQueue.push({ char: p, side: 'p', index: idx });
    });
    gameState.enemies.forEach((e, idx) => {
        if (e.hp > 0) actionQueue.push({ char: e, side: 'e', index: idx });
    });

    document.querySelectorAll('.character-section.active-actor').forEach(el => el.classList.remove('active-actor'));
    actionQueue.sort((a, b) => b.char.spd - a.char.spd);
    updateOrderIcons(actionQueue);

    const firstNextActor = getNextActor(gameState, actionQueue, -1);
    updateNextActionIcon(gameState, firstNextActor);

    for (let i = 0; i < actionQueue.length; i++) {
        const actor = actionQueue[i].char;
        const side = actionQueue[i].side;
        const actorIdx = actionQueue[i].index;

        if (actor.hp <= 0) continue;

        const defensiveStatusRemoved = tickDefensiveStatusDuration(actor, "taunt", "挑発");
        if (defensiveStatusRemoved) {
            updateAllHPBars(gameState);
            updateDeathStates(gameState);
            await sleep(450);
        }

        if (actor.status && actor.status.includes("paralysis")) {
            alertLog(`${actor.name}はマヒで行動できない！`);
            removeStatus(actor, "paralysis");
            updateAllHPBars(gameState);
            updateDeathStates(gameState);
            await sleep(450);

            if (actor.status.includes("poison")) {
                await sleep(800);
                const poisonDmg = Math.floor(actor.maxHp * 0.15);
                actor.hp = Math.max(0, actor.hp - poisonDmg);
                recordDamageTaken(gameState, side, actorIdx, poisonDmg);
                const poisonSource = actor.statusSources?.poison;
                if (poisonSource) {
                    recordDamageDealt(gameState, poisonSource.side, poisonSource.index, poisonDmg);
                }
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

        const actorEl = document.getElementById(`${side}-section-${actorIdx}`);
        if (actorEl && actor.hp > 0) {
            actorEl.classList.add('active-actor');
        }

        const maxActionCount = (actor.slotCost || 1) > 1 ? 2 : 1;
        let actionCount = 0;
        let keepActing = true;
        while (keepActing) {
            const liveP = gameState.players.some(p => p.hp > 0);
            const liveE = gameState.enemies.some(e => e.hp > 0);
            if (!liveP || !liveE || actor.hp <= 0 || actionCount >= maxActionCount) {
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
            const { determineTarget } = await import('./combat.js');
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
                actionCount += 1;
                if (actionCount < maxActionCount) {
                    await sleep(500);
                    alertLog(`${actor.name}は大型の力でさらに行動する！`);
                    await sleep(500);
                } else {
                    keepActing = false;
                }
            }
        }

        if (actorEl && actor.hp > 0) {
            actorEl.classList.remove('active-actor');
            const isParalyzed = actor.status && actor.status.includes('paralysis');
            actorEl.classList.toggle('is-paralyzed', !!isParalyzed);
        }

        if (actor.hp > 0 && actor.status && actor.status.includes("poison")) {
            await sleep(800);
            const poisonDmg = Math.floor(actor.maxHp * 0.15);
            actor.hp = Math.max(0, actor.hp - poisonDmg);
            recordDamageTaken(gameState, side, actorIdx, poisonDmg);
            const poisonSource = actor.statusSources?.poison;
            if (poisonSource) {
                recordDamageDealt(gameState, poisonSource.side, poisonSource.index, poisonDmg);
            }
            alertLog(`${actor.name}は毒ダメージを受けた！ (${poisonDmg})`);

            updateAllHPBars(gameState);
            updateDeathStates(gameState);

            if (actor.hp <= 0) {
                await sleep(800);
                alertLog(`${actor.name}は力尽きた！`);
            }
        }

        const nextActor = getNextActor(gameState, actionQueue, i);
        updateNextActionIcon(gameState, nextActor);
        await sleep(1000);
    }

    const allPlayersDead = gameState.players.every(p => p.hp <= 0);
    const allEnemiesDead = gameState.enemies.every(e => e.hp <= 0);

    if (allPlayersDead || allEnemiesDead) {
        await showBattleEndResult(gameState);
    }

    if (allPlayersDead) {
        alertLog("味方が全滅しました…ゲームオーバー。");
        replaceBattleButtonWithMenu(btn, "GAME OVER - メニューへ");
        return false;
    }

    if (allEnemiesDead) {
        if (gameState.isChainMode && gameState.currentFloor < gameState.maxFloor) {
            alertLog("敵を全滅させた！次の階に進みます。");

            const nextFloor = gameState.currentFloor + 1;
            gameState.nextEnemies = generateRandomEnemies(
                { ...gameState, currentFloor: nextFloor },
                { includeSpecialOnly: nextFloor >= 6 }
            );

            await triggerReplacementEvent(gameState);
            await triggerSpecialRecruitmentEvent(gameState, nextFloor);

            gameState.currentFloor = nextFloor;

            alertLog(`🏰 ${gameState.currentFloor}階へ進みます！`);

            gameState.players.forEach(p => {
                p.currentReel = 0;
                resetBattleStats(p);
            });

            gameState.enemies = gameState.nextEnemies || generateRandomEnemies(gameState, { includeSpecialOnly: gameState.currentFloor >= 6 });
            gameState.nextEnemies = null;
            gameState.turn = 0;
            applySpeciesSetBonuses(gameState, { healToFull: true }).forEach(alertLog);
            initBattleStats(gameState);

            const floorText = document.getElementById('floor-text');
            if (floorText) floorText.innerText = `${gameState.currentFloor} / ${gameState.maxFloor}`;

            render(gameState);
            await sleep(1500);
            window.pauseAfterFloorTransition = true;
            return true;
        } else {
            alertLog(`${gameState.maxFloor}階層の試練をすべて突破！完全クリア！！`);
            replaceBattleButtonWithMenu(btn, "COMPLETE - メニューへ");
            return false;
        }
    }

    await sleep(1000);
    return true;
}

export async function doRoulette(prefix, charIdx, commands) {
    if (getBattleSpeedMultiplier() >= 10 || window.advanceToTurnEndRequested) {
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

export function waitForCommand(prefix, charIdx) {
    return new Promise((resolve) => {
        const rouletteId = `${prefix}-roulette-${charIdx}`;
        const rouletteEl = document.getElementById(rouletteId);
        if (!rouletteEl) return resolve(0);
        let resolved = false;

        const resolveCommand = (idx) => {
            if (resolved) return;
            resolved = true;
            window.resolvePendingCommand = null;
            resolve(idx);
        };

        window.resolvePendingCommand = () => {
            resolveCommand(Math.floor(Math.random() * Math.max(1, rouletteEl.querySelectorAll('.cmd-item').length)));
        };

        if (window.advanceToTurnEndRequested) {
            window.resolvePendingCommand();
            return;
        }

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

                resolveCommand(idx);
            }, { once: true });
        });
    });
}

export function getNextActor(gameState, actionQueue, currentIndex) {
    for (let i = currentIndex + 1; i < actionQueue.length; i++) {
        if (actionQueue[i].char.hp > 0) {
            return actionQueue[i];
        }
    }
    return null;
}

export function updateNextActionIcon(gameState, nextActor) {
    const iconContainer = document.getElementById('next-action-icon');
    if (!iconContainer) return;

    const prev = iconContainer.querySelector('.order-icon.active');
    if (prev) prev.classList.remove('active');

    if (!nextActor) {
        iconContainer.querySelectorAll('.order-icon').forEach(el => el.classList.remove('active'));
        return;
    }

    const targetId = `order-${nextActor.side}-${nextActor.index}`;
    const el = document.getElementById(targetId);
    if (el) {
        el.classList.add('active');
    }
}

export async function triggerReplacementEvent(gameState) {
    if (typeof window.showReplacementSelection === 'function') {
        await window.showReplacementSelection(gameState);
    }
}

async function showBattleEndResult(gameState) {
    if (typeof window.showBattleResult === 'function') {
        await window.showBattleResult(gameState);
    }

    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen) battleScreen.classList.remove('hidden');
}

function replaceBattleButtonWithMenu(btn, label) {
    if (!btn) return;

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
        endTurnBtn.disabled = true;
    }

    btn.disabled = false;
    btn.innerText = label;

    const menuBtn = btn.cloneNode(true);
    menuBtn.addEventListener('click', () => {
        location.reload();
    });
    btn.parentNode.replaceChild(menuBtn, btn);
}

export function initBattleSystem(gameState) {
    window.fastTurnMode = false;
    window.advanceToTurnEndRequested = false;
    window.isBattleRoundRunning = false;
    window.resolvePendingCommand = null;
    window.pauseAfterFloorTransition = false;

    window.gameTurn = async function gameTurn() {
        const btn = document.getElementById('atk-btn');
        const endTurnBtn = document.getElementById('end-turn-btn');
        if (window.isBattleRoundRunning) {
            requestAdvanceToTurnEnd();
            return;
        }
        if (btn) {
            btn.disabled = true;
            btn.innerText = "行動中...";
        }
        if (endTurnBtn) endTurnBtn.disabled = false;

        let continueBattle = true;
        let stopAfterCurrentTurn = false;

        while (continueBattle) {
            window.isBattleRoundRunning = true;
            continueBattle = await runBattleRound(gameState);
            window.isBattleRoundRunning = false;
            stopAfterCurrentTurn = window.advanceToTurnEndRequested || window.pauseAfterFloorTransition;
            window.pauseAfterFloorTransition = false;
            resetAdvanceToTurnEndButton();

            if (!continueBattle || stopAfterCurrentTurn) break;
        }

        if (continueBattle && stopAfterCurrentTurn && btn) {
            btn.disabled = false;
            btn.innerText = "バトル開始！";
        }
    };

    window.advanceToTurnEnd = async function advanceToTurnEnd() {
        const btn = document.getElementById('atk-btn');
        const endTurnBtn = document.getElementById('end-turn-btn');

        requestAdvanceToTurnEnd();

        if (window.isBattleRoundRunning) {
            return;
        }

        if (btn) btn.disabled = true;
        if (endTurnBtn) endTurnBtn.disabled = false;

        window.isBattleRoundRunning = true;
        const continueBattle = await runBattleRound(gameState);
        window.isBattleRoundRunning = false;
        resetAdvanceToTurnEndButton();

        if (continueBattle && btn) {
            btn.disabled = false;
            btn.innerText = "バトル開始！";
        }
    };
}
