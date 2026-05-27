// battle/core.js
import { clearBattleEffects, playParalysisStunEffect, playPoisonDamageEffect, playRelicEffect, playSetBonusEffect, showPopupEffect, showSetPopupBatch, showSetPopupEffect, showSetValueEvents, updateAllHPBars, render, updateBattleHeader, updateOrderIcons, updateCommandsUI, waitForSetPopupEffects } from '../ui/index.js';
import { execute } from './combat.js';
import { generateRandomEnemies, shouldIncludeSpecialEnemies } from './enemy.js';
import { removeStatus, resetBattleStats, syncAllStatusEffects } from '../commands/status.js';
import { initBattleStats, recordSetStatIncreased, recordShieldGranted } from './stats.js';
import { applyDirectHpLoss, applyFixedDamage } from './damageResolver.js';
import { addShield } from './shield.js';
import { triggerSpecialRecruitmentEvent } from '../screens/specialEventScreen.js';
import { advanceDemonDoomCount, applyAllUndeadLastStandBonuses, applySpeciesEndTurnEffects, applySpeciesReelUpEffects, applySpeciesSetBonuses, applySpeciesTurnStartEffects, buildSpeciesSetVisualEvents, consumeConstructRecycleCore, consumeConstructRecycleCoreAmount, getConstructRecycleCore, recordHumanAction, resetHumanTurnActions, syncDragonReelStatBonus } from './setBonuses.js';
import { applyRelicBattleStart, applyRelicLowHpBarrier, applyRelicReelUp } from './relics.js';
import { getNextActionIconContainer, getOrderIconElement } from '../ui/battleDom.js';
import { LIMIT_BREAK_MAX_LEVEL, getLimitBreakRequiredBattlesForLevel, recordBattleParticipation } from '../partySlots.js';
import { absorbPendingExtraActions, clearRemainingActions, consumeAction, getAdditionalActionLabel, getBaseActionCount, getRemainingActionCount, grantExtraActions, grantTurnActions } from './actionCount.js';
import { resolvePendingUndeadLastStand } from './lastStand.js';
import { playSetDamageSequence, playSetValueSequence, settleSetEffectApplication } from './setEffectSequences.js';
import { buildSetStatValueEvent } from './setStatValueEvents.js';

export function clearFullLog() {
    const fullLog = document.getElementById('full-log-content');
    if (fullLog) fullLog.innerHTML = '';
}

function cleanLogText(line) {
    return String(line || '')
        .replace(/[💚✨🔷🛡️⚔️🔮🔥🌐※🏰📘🌟🩸🔼🔽💤🟢👟💪👤🌧️🌋🌠💥🦴🐾📢🦑🤢⚡📉]/g, '')
        .replace(/[「」！、]/g, '')
        .replace(/ティア/g, 'TIER')
        .replace(/\s+/g, ' ')
        .trim();
}

function getDebugStatLabel(japaneseStat) {
    const labels = {
        攻撃: 'ATK',
        魔力: 'INT',
        素早さ: 'SPD'
    };
    return labels[japaneseStat] || japaneseStat;
}

function formatLogValue(value) {
    return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function formatDebugLogLine(line) {
    const text = cleanLogText(String(line || '').trim().replace(/^→\s*/, ''));
    if (!text) return '';

    let match = text.match(/^--- TURN (\d+) 開始 ---$/);
    if (match) return `TURN current=${match[1]} event=start`;

    match = text.match(/^--- 新しいターン開始 ---$/);
    if (match) return 'TURN event=start';

    match = text.match(/^(\d+)階へ進みます/);
    if (match) return `FLOOR current=${match[1]} event=start`;

    match = text.match(/^種族ボーナス一括発動/);
    if (match) return 'SET_BULK event=activate';

    match = text.match(/^(.+?) TIER(\d+):\s*(.+)$/);
    if (match) return `SET_DEF species=${formatLogValue(match[1])} tier=${match[2]} note=${formatLogValue(match[3])}`;

    match = text.match(/^(.+?)の【(.+?)】(.+?)で士気\+(\d+)（合計(\d+)）.*ATK\/INTが(\d+)%上昇/);
    if (match) return `SET actor=${match[1]} species=${match[2]} trigger=${match[3]} pointGain=${match[4]} total=${match[5]} atkIntPercent=${match[6]}`;

    match = text.match(/^(.+?)の【(.+?)】で(.+)$/);
    if (match) return `SET actor=${formatLogValue(match[1])} effect=${formatLogValue(match[2])} note=${formatLogValue(match[3])}`;

    match = text.match(/^【(.+?)】(.+)$/);
    if (match) return `SET effect=${formatLogValue(match[1])} note=${formatLogValue(match[2])}`;

    match = text.match(/^(.+?)は【(.+?) TIER(\d+)】でこのターンATK\+(\d+)/);
    if (match) return `SET target=${match[1]} species=${match[2]} tier=${match[3]} atk=${match[4]}`;

    match = text.match(/^(.+?)のリール支援 (.+?)のリールが(\d+)段階上がった/);
    if (match) return `REEL actor=${match[1]} cmd=リール支援 target=${match[2]} delta=${match[3]}`;

    match = text.match(/^(.+?)のリール支援 しかし (.+?) はこれ以上リールを上げられない/);
    if (match) return `REEL actor=${match[1]} cmd=リール支援 target=${match[2]} result=max`;

    match = text.match(/^(.+?)の状態異常解除 (.+?)の【(.+)】が解除された/);
    if (match) return `STATUS_CLEAR actor=${match[1]} target=${match[2]} statuses=${match[3].replace(/\s*\/\s*/g, ',')}`;

    match = text.match(/^(.+?)はかばう構えをとった .*残り(\d+)ターン/);
    if (match) return `STATUS actor=${match[1]} status=taunt duration=${match[2]}`;

    match = text.match(/^(.+?)はかばう構えでダメージを受け止めた/);
    if (match) return `GUARD actor=${match[1]} result=blocked`;

    match = text.match(/^(.+?)の【(.+)】効果が切れた/);
    if (match) return `STATUS actor=${match[1]} status=${match[2]} event=expired`;

    match = text.match(/^(.+?)が経験値を獲得（EXP (\d+)\/(\d+)）/);
    if (match) return `PROGRESS actor=${match[1]} exp=${match[2]}/${match[3]}`;

    match = text.match(/^(.+?)が経験値を獲得.*現在Lv(\d+) EXP (\d+)\/(\d+)/);
    if (match) return `PROGRESS actor=${match[1]} level=${match[2]} exp=${match[3]}/${match[4]}`;

    match = text.match(/^(.+?)は(.+?)を展開 自分にシールド(\d+)/);
    if (match) return `ACTION actor=${match[1]} cmd=${match[2]} target=self shield=${match[3]}`;

    match = text.match(/^(.+?)の(.+?) (.+?)のHPを(\d+) .*回復/);
    if (match) return `ACTION actor=${match[1]} cmd=${match[2]} target=${match[3]} heal=${match[4]}`;

    match = text.match(/^(.+?)は(.+?) (攻撃|魔力|素早さ)が(\d+) から (\d+) に上昇/);
    if (match) {
        const before = Number(match[4]);
        const after = Number(match[5]);
        return `STAT actor=${match[1]} cmd=${match[2]} stat=${getDebugStatLabel(match[3])} before=${before} after=${after} delta=${after - before}`;
    }

    match = text.match(/^(.+?)の(.+?)で(攻撃|魔力|素早さ)が(\d+) から (\d+) に上昇/);
    if (match) {
        const before = Number(match[4]);
        const after = Number(match[5]);
        return `STAT actor=${match[1]} source=${match[2]} stat=${getDebugStatLabel(match[3])} before=${before} after=${after} delta=${after - before}`;
    }

    match = text.match(/^(.+?)は(.+?) (.+?)が(\d+) から (\d+) に上昇/);
    if (match) {
        const before = Number(match[4]);
        const after = Number(match[5]);
        return `STAT actor=${match[1]} cmd=${match[2]} stat=${match[3]} before=${before} after=${after} delta=${after - before}`;
    }

    match = text.match(/^(.+?)にシールド(\d+)/);
    if (match) return `SHIELD target=${match[1]} amount=${match[2]}`;

    match = text.match(/^(.+?)の(.+?) (.+?)にシールド(\d+)/);
    if (match) return `ACTION actor=${match[1]} cmd=${match[2]} target=${match[3]} shield=${match[4]}`;

    match = text.match(/^(.+?)の(.+?) (.+?)に (\d+) の.*ダメージ/);
    if (match) return `ACTION actor=${match[1]} cmd=${match[2]} target=${match[3]} damage=${match[4]}`;

    match = text.match(/^(.+?)に (\d+) の.*ダメージ/);
    if (match) return `DAMAGE target=${match[1]} amount=${match[2]}`;

    match = text.match(/^(.+?)のシールドが (\d+) ダメージを受け止めた/);
    if (match) return `SHIELD_HIT target=${match[1]} absorbed=${match[2]}`;

    match = text.match(/^(.+?)へのダメージ補正: (\d+) → (\d+)（(.+)）/);
    if (match) {
        const delta = Math.abs(Number(match[3]) - Number(match[2]));
        const type = match[4].includes('軽減') ? 'reduced' : match[4].includes('増加') ? 'increased' : 'changed';
        return `DAMAGE_MOD target=${match[1]} raw=${match[2]} adjusted=${match[3]} type=${type} delta=${delta}`;
    }

    match = text.match(/^(.+?)は力尽きた$/);
    if (match) return `DEATH target=${match[1]}`;

    match = text.match(/^(.+?)の行動.*何も起きなかった.*ミス/);
    if (match) return `MISS actor=${match[1]}`;

    match = text.match(/^(.+?)は【(.+?)】でミスを再抽選し別コマンドへ切り替えた/);
    if (match) return `SET target=${match[1]} species=${match[2]} event=missReroll`;

    match = text.match(/^(.+?)は【(.+?)】で(.+)$/);
    if (match) return `SET target=${formatLogValue(match[1])} effect=${formatLogValue(match[2])} note=${formatLogValue(match[3])}`;

    return `NOTE text=${formatLogValue(text)}`;
}

function formatDebugLogMessage(msg) {
    return String(msg || '')
        .split('\n')
        .map(formatDebugLogLine)
        .filter(Boolean)
        .join('\n');
}

export function alertLog(msg) {
    const debugMessage = formatDebugLogMessage(msg) || cleanLogText(msg);
    const htmlLine = `<div>${debugMessage.replace(/\n/g, '<br>')}</div>`;
    const fullLog = document.getElementById('full-log-content');
    if (fullLog) {
        const distanceFromBottom = fullLog.scrollHeight - fullLog.scrollTop - fullLog.clientHeight;
        const shouldFollowLatest = distanceFromBottom < 24;
        const previousScrollTop = fullLog.scrollTop;

        fullLog.insertAdjacentHTML('beforeend', htmlLine);
        fullLog.scrollTop = shouldFollowLatest ? fullLog.scrollHeight : previousScrollTop;
    }
}

export function setBattleStatus(msg, tone = 'system') {
    const log = document.getElementById('log');
    if (!log) return;
    log.innerHTML = `<div class="battle-status-line battle-status-line--${tone}">${String(msg || '').replace(/\n/g, ' / ')}</div>`;
}

function showTurnBanner(turnNumber) {
    const banner = document.getElementById('turn-banner');
    if (!banner) return;

    banner.innerHTML = `
        <div class="turn-banner-card">
            <span class="turn-banner-slash"></span>
            <span class="turn-banner-kicker">TURN ${Number(turnNumber || 1)}</span>
            <strong>ターン開始！</strong>
        </div>
    `;
    banner.classList.remove('is-visible');
    banner.setAttribute('aria-hidden', 'false');
    banner.offsetHeight;
    banner.classList.add('is-visible');

    window.clearTimeout(window.turnBannerTimer);
    window.turnBannerTimer = window.setTimeout(() => {
        banner.classList.remove('is-visible');
        banner.setAttribute('aria-hidden', 'true');
    }, 900);
}

function hideTurnBanner() {
    const banner = document.getElementById('turn-banner');
    window.clearTimeout(window.turnBannerTimer);
    if (!banner) return;
    banner.classList.remove('is-visible');
    banner.setAttribute('aria-hidden', 'true');
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

function getRelicEventLabel(event, target) {
    const amount = Number(target?.amount || 0);
    if (event?.hook === 'battleStartEnemyStatus') return `${event.relic?.name || 'レリック'} 状態異常`;
    if (event?.hook === 'startLowestRarityReelUp') return `${event.relic?.name || 'レリック'} リール+${amount}`;
    if (event?.hook === 'battleStartEnemyReelDown') return `${event.relic?.name || 'レリック'} リール-${amount || 1}`;
    if (event?.hook === 'shieldOnReelUp') return `${event.relic?.name || 'レリック'} +SH${amount}`;
    if (event?.hook === 'lowHpBarrier') return `${event.relic?.name || 'レリック'} +SH${amount}`;
    if (event?.hook === 'reelUpTriggeredTeamShield') return `${event.relic?.name || 'レリック'} +SH${amount}`;
    if (event?.hook === 'atkIntMultiplier') return `${event.relic?.name || 'レリック'} ATK/INT強化`;
    if (event?.hook === 'highlanderAtkIntMultiplier') return `${event.relic?.name || 'レリック'} 多種族強化`;
    if (event?.hook === 'positionAtkIntMultiplier') return `${event.relic?.name || 'レリック'} 配置補正`;
    if (event?.hook === 'lowestRarityAtkIntTradeoff') {
        const atk = Number(target?.atkGain || 0);
        const int = Number(target?.intGain || 0);
        const sign = atk >= 0 ? '+' : '';
        return `${event.relic?.name || 'レリック'} ${target?.isLowestRarityTarget ? '最低★強化' : '代償弱化'} ATK${sign}${atk}/INT${sign}${int}`;
    }
    if (event?.hook === 'maxHpMultiplier') return `${event.relic?.name || 'レリック'} HP半減`;
    return `${event?.relic?.name || 'レリック'} +SH${amount}`;
}

function summarizeSpeciesSetEvents(setEvents = []) {
    const uniqueEvents = new Map();
    setEvents.forEach(event => {
        if (!event?.name) return;
        const key = `${event.prefix}:${event.name}`;
        if (!uniqueEvents.has(key)) uniqueEvents.set(key, event);
    });

    return [...uniqueEvents.values()].map(event => {
        const description = String(event.description || '')
            .replace(`${event.name}: `, '')
            .replace(/^.+?(?:Lv|TIER)\d+:\s*/, '')
            .split(' / ')
            .slice(0, 2)
            .join(' / ');
        return description ? `${event.name}: ${description}` : event.name;
    });
}

export async function playBattleStartVisualEffects(gameState, relicEvents = []) {
    const setEvents = buildSpeciesSetVisualEvents(gameState);
    if (setEvents.length === 0 && (!Array.isArray(relicEvents) || relicEvents.length === 0)) return;

    await sleep(220, { force: true });

    if (setEvents.length > 0) {
        const summaries = summarizeSpeciesSetEvents(setEvents);
        const statusNames = summaries
            .map(summary => summary.split(':')[0])
            .slice(0, 3)
            .join(' / ');
        const extraCount = Math.max(0, summaries.length - 3);
        setBattleStatus(`種族ボーナス一括発動 ${statusNames}${extraCount ? ` ほか${extraCount}件` : ''}`, 'status');
        alertLog(`✨ 種族ボーナス一括発動！\n※ ${summaries.join('\n※ ')}`);

        setEvents.forEach(event => {
            event.targets.forEach(target => {
                playSetBonusEffect(event.prefix, target.index, event.name, '#14b8a6');
            });
        });
        await sleep(780, { force: true });
    }

    for (const event of relicEvents || []) {
        setBattleStatus(`${event.relic?.name || 'レリック'} 発動`, 'status');
        alertLog(`🔷 ${event.relic?.name || 'レリック'} 発動！`);
        const targetSide = event.targetSide || event.side;
        for (const target of event.targets || []) {
            playRelicEffect(targetSide, target.index, getRelicEventLabel(event, target), '#60a5fa');
            await sleep(260);
        }
        updateAllHPBars(gameState);
        await sleep(360);
    }
}

function requestAdvanceToTurnEnd() {
    if (window.isBattleEnded) {
        lockEndTurnButtonForBattleEnd();
        return;
    }

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
        if (window.isBattleEnded) {
            lockEndTurnButtonForBattleEnd();
            return;
        }
        btn.disabled = false;
        btn.innerText = "このターン終了まで進める";
    }
}

function updateRandomDebugCommandButton(isWaiting = false) {
    const button = document.getElementById('debug-random-command-btn');
    if (!button) return;
    const debugMode = document.getElementById('debug-mode');
    const enabled = !!(debugMode?.checked && isWaiting && typeof window.resolvePendingCommand === 'function');
    button.disabled = !enabled;
    button.classList.toggle('is-ready', enabled);
    button.innerText = enabled ? 'ランダム実行' : '待機中のみ実行';
}

function isLocalDebugAvailable() {
    const host = window.location.hostname;
    return ['localhost', '127.0.0.1', '::1'].includes(host);
}

function resumeAutoCommandSelectionIfDebugOff() {
    const debugMode = document.getElementById('debug-mode');
    if (debugMode?.checked) {
        updateRandomDebugCommandButton(typeof window.resolvePendingCommand === 'function');
        return;
    }

    if (typeof window.resolvePendingCommand === 'function') {
        alertLog('【デバッグ】手動選択を解除しました。自動でコマンドを選択します。');
        window.resolvePendingCommand();
        return;
    }

    updateRandomDebugCommandButton(false);
}

function setupDebugModeControls() {
    const debugMode = document.getElementById('debug-mode');
    if (!debugMode || debugMode.dataset.boundAutoResume === 'true') return;

    debugMode.dataset.boundAutoResume = 'true';
    debugMode.addEventListener('change', resumeAutoCommandSelectionIfDebugOff);
    updateRandomDebugCommandButton(false);
}

function createDebugCommandResolver(commandElements, resolveCommand) {
    const cleanups = [];

    commandElements.forEach((el, idx) => {
        el.style.cursor = 'pointer';

        const enterHandler = () => { el.style.backgroundColor = '#ffeaa7'; };
        const leaveHandler = () => { el.style.backgroundColor = ''; };
        const clickHandler = () => resolveCommand(idx);

        el.addEventListener('mouseenter', enterHandler);
        el.addEventListener('mouseleave', leaveHandler);
        el.addEventListener('click', clickHandler);
        cleanups.push(() => {
            el.removeEventListener('mouseenter', enterHandler);
            el.removeEventListener('mouseleave', leaveHandler);
            el.removeEventListener('click', clickHandler);
        });
    });

    return () => {
        cleanups.splice(0).forEach(cleanup => cleanup());
        commandElements.forEach(el => {
            el.style.cursor = '';
            el.style.backgroundColor = '';
        });
    };
}

function setSelectedDebugCommand(commandElements, selectedIndex) {
    commandElements.forEach(el => el.classList.remove('active'));
    const selectedEl = commandElements[selectedIndex];
    if (!selectedEl) return;
    selectedEl.classList.add('active');
    selectedEl.style.cursor = 'default';
}

function getRandomCommandIndex(commandElements) {
    return Math.floor(Math.random() * commandElements.length);
}

function lockEndTurnButtonForBattleEnd(gameState = window.latestBattleResultState) {
    const btn = document.getElementById('end-turn-btn');
    if (!btn) return;

    const resultBtn = btn.cloneNode(true);
    resultBtn.removeAttribute('onclick');
    resultBtn.disabled = false;
    resultBtn.classList.add('battle-result-return-btn');
    resultBtn.innerText = "リザルトを見る";
    resultBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const state = gameState || window.latestBattleResultState;
        if (state && typeof window.showBattleResult === 'function') {
            await window.showBattleResult(state);
            const battleScreen = document.getElementById('battle-screen');
            if (battleScreen) battleScreen.classList.remove('hidden');
        }
    });
    btn.parentNode.replaceChild(resultBtn, btn);
}

function restoreEndTurnButtonForBattle() {
    const btn = document.getElementById('end-turn-btn');
    if (!btn) return;

    const turnBtn = btn.cloneNode(true);
    turnBtn.classList.remove('battle-result-return-btn');
    turnBtn.disabled = false;
    turnBtn.innerText = "このターン終了まで進める";
    turnBtn.addEventListener('click', () => {
        if (typeof window.advanceToTurnEnd === 'function') {
            window.advanceToTurnEnd();
        }
    });
    btn.parentNode.replaceChild(turnBtn, btn);
}

export function isDebugModeEnabled() {
    try {
        if (!isLocalDebugAvailable()) return false;
        const el = document.getElementById('debug-mode');
        return !!(el && el.checked);
    } catch (e) {
        return false;
    }
}

export function updateDeathStates(gameState) {
    syncAllStatusEffects(gameState);

    gameState.players.forEach((p, idx) => {
        const el = document.getElementById(`p-section-${idx}`);
        if (el) {
            if (p.hp <= 0 && !p.isUndeadSoulFollowup) el.classList.add('is-dead');
            else el.classList.remove('is-dead');
            el.classList.toggle('is-paralyzed', p.hp > 0 && !!(p.status && p.status.includes('paralysis')));
        }
    });
    gameState.enemies.forEach((e, idx) => {
        const el = document.getElementById(`e-section-${idx}`);
        if (el) {
            if (e.hp <= 0 && !e.isUndeadSoulFollowup) el.classList.add('is-dead');
            else el.classList.remove('is-dead');
            el.classList.toggle('is-paralyzed', e.hp > 0 && !!(e.status && e.status.includes('paralysis')));
        }
    });
    applyAllUndeadLastStandBonuses(gameState);
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

async function applyPoisonTurnDamage(gameState, actor, side, actorIdx) {
    if (!actor?.status?.includes("poison") || actor.hp <= 0) return;
    showPopupEffect(side, actorIdx, '毒', 'status', '#22c55e');
    await sleep(620);
    const poisonDmg = Math.floor(actor.maxHp * 0.15);
    const poisonSource = actor.statusSources?.poison;
    const poisonResult = applyDirectHpLoss(gameState, {
        target: actor,
        targetPrefix: side,
        targetIdx: actorIdx,
        sourcePrefix: poisonSource?.side,
        sourceIdx: poisonSource?.index,
        damage: poisonDmg
    });
    playPoisonDamageEffect(side, actorIdx, poisonResult.hpDamage);
    alertLog(`${actor.name}は毒ダメージを受けた！ (${poisonResult.hpDamage})`);
    updateAllHPBars(gameState, { skipHpPopup: true });
    updateDeathStates(gameState);
    await runPendingUndeadReviveActions(gameState);
}

function healPartyToFull(party) {
    (party || []).forEach(char => {
        if (!char || typeof char.maxHp !== 'number') return;
        char.hp = char.maxHp;
    });
}

function refreshCharacterCommands(prefix, index, char) {
    if (!char || !Array.isArray(char.commands?.[0])) return;
    const reelIndex = char.currentReel || 0;
    updateCommandsUI(prefix, index, char.commands[reelIndex], reelIndex, char);
}

function enforceFinalReelLock(char) {
    if (!(char?.demonFinalReelLocked || char?.undeadFinalReelLocked) || !Array.isArray(char.commands?.[0])) return false;
    const maxReel = char.commands.length - 1;
    const changed = (char.currentReel || 0) !== maxReel;
    char.currentReel = maxReel;
    return changed;
}

function resolveUndeadReelOverdrive(actor, commandId, currentCommands = []) {
    if (!actor?.undeadFinalReelLocked || !String(commandId).startsWith('cmd_down')) {
        return { commandId, overdrive: false };
    }
    const candidates = (currentCommands || []).filter(id => id && !String(id).startsWith('cmd_down'));
    if (candidates.length === 0) return { commandId, overdrive: false };
    return {
        commandId: candidates[Math.floor(Math.random() * candidates.length)],
        overdrive: true
    };
}

async function rollUndeadFinalCommand(side, actorIdx, actor, commands, options = {}) {
    const commandPool = (commands || []).filter(Boolean);
    if (commandPool.length === 0) return null;
    const preferredIndexes = options.preferDamage
        ? commandPool
            .map((commandId, index) => {
            const effect = options.commandEffects?.[commandId];
                return typeof effect?.calcDamage === 'function' && Math.max(0, Math.floor(effect.calcDamage(actor))) > 0
                    ? index
                    : null;
            })
            .filter(index => index !== null)
        : [];
    const targetIndex = preferredIndexes.length > 0
        ? preferredIndexes[Math.floor(Math.random() * preferredIndexes.length)]
        : Math.floor(Math.random() * commandPool.length);
    updateCommandsUI(side, actorIdx, commandPool, actor.currentReel || 0, actor);
    await settleSetEffectApplication(null, { refreshHpBars: false });
    const commandIndex = await doRoulette(side, actorIdx, commandPool, { targetIdx: targetIndex });
    await settleSetEffectApplication(null, { refreshHpBars: false });
    return commandPool[commandIndex] || commandPool[targetIndex] || commandPool[Math.floor(Math.random() * commandPool.length)];
}

function refreshPartyCommands(gameState, side) {
    const party = side === 'p' ? gameState.players : gameState.enemies;
    (party || []).forEach((char, index) => refreshCharacterCommands(side, index, char));
}

async function handleDemonDoomEvents(gameState, events, side) {
    if (!events?.length) return;
    for (const event of events) {
        if (event.hook === 'demonDoomStatChanged') {
            const popupEntries = [];
            let setInfo = null;
            event.targets.forEach(target => {
                const entry = buildSetStatValueEvent(side, target.index, { atk: target.atkDelta, int: target.intDelta }, { char: target.char });
                if (!entry) return;
                setInfo = setInfo || target.setInfo || target.char?.activeSpeciesBonus;
                popupEntries.push(entry);
            });
            await playSetValueSequence(
                gameState,
                () => showSetPopupBatch(popupEntries, setInfo, '破滅カウント', '#00b894'),
                popupEntries,
                'buff',
                '#00b894'
            );
            alertLog(`🌋 【破滅カウント】count=${event.count} event=statIncrease`);
            continue;
        }
        if (event.hook === 'demonMissTransform') {
            refreshPartyCommands(gameState, side);
            alertLog(`🌋 【破滅カウント】count=${event.count} event=missTransform`);
            continue;
        }
        if (event.hook === 'demonAwaken') {
            refreshPartyCommands(gameState, side);
            (side === 'p' ? gameState.players : gameState.enemies).forEach((char, index) => {
                if (char.hp > 0) showPopupEffect(side, index, '魔神覚醒', 'set', '#7c2d12');
            });
            alertLog(`🌋 【魔神覚醒】count=${event.count} event=awaken`);
        }
    }
}

async function runUndeadReviveAction(gameState, side, actor, actorIdx) {
    if (!gameState || !actor || actor.hp <= 0 || !actor.pendingUndeadReviveAction || actor.isUndeadReviveAction) return;
    actor.pendingUndeadReviveAction = false;
    actor.isUndeadReviveAction = true;

    const finalReelIndex = Array.isArray(actor.commands?.[0]) ? actor.commands.length - 1 : 0;
    actor.currentReel = finalReelIndex;
    actor.undeadFinalReelLocked = true;
    refreshCharacterCommands(side, actorIdx, actor);
    showSetPopupEffect(side, actorIdx, actor.activeSpeciesBonus, '最終リールで即時行動', '#7c2d12');
    alertLog(`${actor.name}は【執念行動】で最終リールに移動し、1回行動を行う！`);
    await waitForSetPopupEffects();
    await settleSetEffectApplication(gameState);

    const { determineTarget } = await import('./combat.js');
    const currentCommands = Array.isArray(actor.commands?.[0]) ? actor.commands[finalReelIndex] : actor.commands;
    const usableCommands = (currentCommands || []).filter(Boolean);
    if (usableCommands.length === 0) {
        actor.isUndeadReviveAction = false;
        return;
    }

    let commandId = await rollUndeadFinalCommand(side, actorIdx, actor, usableCommands);
    if (!commandId) {
        actor.isUndeadReviveAction = false;
        return;
    }
    commandId = resolveUndeadReelOverdrive(actor, commandId, usableCommands).commandId;
    const targetInfo = determineTarget(commandId, actorIdx, side, gameState);
    if (!targetInfo) {
        actor.isUndeadReviveAction = false;
        return;
    }

    await execute(actor, targetInfo.data, commandId, gameState, side, actorIdx, targetInfo.prefix, targetInfo.index);
    await waitForSetPopupEffects();
    actor.isUndeadReviveAction = false;
    updateDeathStates(gameState);
    await sleep(250);
}

async function runPendingUndeadReviveActions(gameState) {
    for (const side of ['p', 'e']) {
        const party = side === 'p' ? gameState.players : gameState.enemies;
        for (let index = 0; index < party.length; index += 1) {
            const actor = party[index];
            if (resolvePendingUndeadLastStand(actor)) {
                actor.suppressNextHpPopup = true;
                showPopupEffect(side, index, 'HP+1', 'heal', '#2ecc71');
                updateAllHPBars(gameState);
                updateDeathStates(gameState);
                alertLog(`${actor.name}は【執念行動】でHP1に踏みとどまった！`);
                await sleep(520);
            }
            if (actor?.pendingUndeadReviveAction) {
                await runUndeadReviveAction(gameState, side, actor, index);
            }
        }
    }
}

async function handleSpeciesReelEvents(gameState, events, sourcePrefix, sourceIdx) {
    for (const event of (events || [])) {
        if (event.hook === 'dragonFinalReelDamageReady') {
            const enemyParty = sourcePrefix === 'p' ? gameState.enemies : gameState.players;
            const enemyPrefix = sourcePrefix === 'p' ? 'e' : 'p';
            const popupEntries = [];
            const damageEvents = [];
            enemyParty.forEach((enemy, enemyIdx) => {
                if (enemy.hp <= 0) return;
                const damage = Math.max(1, Math.floor(enemy.maxHp * event.amount));
                const fixedResult = applyFixedDamage(gameState, {
                    target: enemy,
                    targetPrefix: enemyPrefix,
                    targetIdx: enemyIdx,
                    attackerPrefix: sourcePrefix,
                    attackerIdx: sourceIdx,
                    damage,
                    recordStats: true,
                    statSource: 'set',
                    setInfo: event.char?.activeSpeciesBonus,
                    sourceKind: 'finalReel'
                });
                if (fixedResult.hpDamage > 0) {
                    popupEntries.push({ prefix: enemyPrefix, index: enemyIdx, resultText: '終撃' });
                    damageEvents.push({ prefix: enemyPrefix, index: enemyIdx, damage: fixedResult.hpDamage });
                }
            });
            await playSetDamageSequence(
                gameState,
                () => showSetPopupBatch(popupEntries, event.char?.activeSpeciesBonus, '竜の終撃', '#7c3aed'),
                damageEvents
            );
            alertLog(`✨ ${event.char.name}の【竜の終撃】で敵全体へ固定ダメージ！`);
            updateDeathStates(gameState);
            continue;
        }

        alertLog(`✨ ${event.char.name}の種族効果がリールアップに反応した！（${event.amount}）`);
    }
}

async function handleConstructEndTurnCoreRelease(gameState) {
    for (const side of ['p', 'e']) {
        const party = side === 'p' ? gameState.players : gameState.enemies;
        const sourceIndex = party.findIndex(char => (
            char?.hp > 0
            && char.species === 'construct'
            && (
                char.activeSpeciesBonus?.constructEndTurnSingleShieldFactor
                || char.activeSpeciesBonus?.constructEndTurnTeamShieldFactor
                || char.activeSpeciesBonus?.constructRecycleCoreEndTurnDamage
            )
        ));
        if (sourceIndex < 0) continue;

        const source = party[sourceIndex];
        const currentCore = getConstructRecycleCore(gameState, side);
        if (currentCore <= 0) continue;
        const shieldFactor = Number(source.activeSpeciesBonus?.constructEndTurnTeamShieldFactor || source.activeSpeciesBonus?.constructEndTurnSingleShieldFactor || 0);
        if (shieldFactor > 0) {
            const shieldAmount = Math.max(1, Math.floor(currentCore * shieldFactor));
            const targets = source.activeSpeciesBonus?.constructEndTurnTeamShieldFactor
                ? party.map((char, index) => ({ char, index })).filter(item => item.char?.hp > 0)
                : [party.map((char, index) => ({ char, index })).filter(item => item.char?.hp > 0).sort((a, b) => (a.char.shield || 0) - (b.char.shield || 0))[0]].filter(Boolean);
            const expectedShieldCore = Math.min(currentCore, shieldAmount * targets.length);
            const consumedShieldCore = consumeConstructRecycleCoreAmount(gameState, side, expectedShieldCore);
            const coreEvents = consumedShieldCore > 0
                ? [{ prefix: side, index: sourceIndex, resultText: `廃材-${consumedShieldCore}` }]
                : [];
            if (coreEvents.length > 0) {
                showSetPopupBatch(coreEvents, source.activeSpeciesBonus, source.activeSpeciesBonus?.constructEndTurnTeamShieldFactor ? '廃材装甲' : '廃材修復', '#38bdf8');
                await waitForSetPopupEffects();
                showSetValueEvents(coreEvents, 'set', '#38bdf8');
                await settleSetEffectApplication(gameState);
            }
            const shieldEvents = [];
            let totalShield = 0;
            targets.forEach(({ char, index }) => {
                const gained = addShield(char, shieldAmount);
                if (gained <= 0) return;
                char.suppressNextShieldPopup = true;
                totalShield += gained;
                shieldEvents.push({ prefix: side, index, resultText: `SH+${gained}` });
            });
            if (shieldEvents.length > 0) {
                if (coreEvents.length === 0) {
                    showSetPopupBatch(shieldEvents, source.activeSpeciesBonus, source.activeSpeciesBonus?.constructEndTurnTeamShieldFactor ? '廃材装甲' : '廃材修復', '#38bdf8');
                    await waitForSetPopupEffects();
                }
                showSetValueEvents(shieldEvents, 'shield', '#38bdf8');
                await settleSetEffectApplication(gameState);
                recordShieldGranted(gameState, side, sourceIndex, totalShield, {
                    source: 'set',
                    setInfo: source.activeSpeciesBonus,
                    sourceKind: 'endTurnCoreShield'
                });
                alertLog(`🔷 ${source.name}の【廃材装甲】でシールド合計${totalShield}！（廃材${consumedShieldCore}消費）`);
            }
        }

        const releaseFactor = Number(source.activeSpeciesBonus?.constructRecycleCoreEndTurnDamageFactor || 0);
        const coreDamage = Math.max(0, Math.floor(getConstructRecycleCore(gameState, side) * releaseFactor));
        if (coreDamage <= 0) continue;

        const consumePercent = Number(source.activeSpeciesBonus?.constructRecycleCoreEndTurnConsumePercent || 0);
        const targetPrefix = side === 'p' ? 'e' : 'p';
        const targets = (targetPrefix === 'p' ? gameState.players : gameState.enemies)
            .map((target, targetIdx) => ({ target, targetIdx }))
            .filter(item => item.target?.hp > 0);
        const selected = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : null;
        if (!selected) continue;
        const consumedCore = consumeConstructRecycleCore(gameState, side, consumePercent);
        let totalDamage = 0;

        const popupEntries = [];
        const damageEvents = [];
        const fixedResult = applyFixedDamage(gameState, {
            target: selected.target,
            targetPrefix,
            targetIdx: selected.targetIdx,
            attackerPrefix: side,
            attackerIdx: sourceIndex,
            damage: coreDamage,
            recordStats: true,
            statSource: 'set',
            setInfo: source.activeSpeciesBonus,
            sourceKind: 'endTurnCore'
        });
        if (fixedResult.hpDamage > 0) {
            totalDamage += fixedResult.hpDamage;
            popupEntries.push({ prefix: targetPrefix, index: selected.targetIdx, resultText: '放出' });
            damageEvents.push({ prefix: targetPrefix, index: selected.targetIdx, damage: fixedResult.hpDamage });
        }

        if (totalDamage > 0) {
            const coreEvents = consumedCore > 0
                ? [{ prefix: side, index: sourceIndex, resultText: `廃材-${consumedCore}` }]
                : [];
            showSetPopupBatch(coreEvents.length > 0 ? coreEvents : popupEntries, source.activeSpeciesBonus, '廃材放出', '#38bdf8');
            await waitForSetPopupEffects();
            if (coreEvents.length > 0) {
                showSetValueEvents(coreEvents, 'set', '#38bdf8');
                await settleSetEffectApplication(gameState);
            }
            await playSetDamageSequence(gameState, () => {}, damageEvents);
            const consumeText = consumedCore > 0 ? `（廃材${consumedCore}消費）` : '';
            alertLog(`🔷 ${source.name}の【廃材放出】で${selected.target.name}へ${totalDamage}ダメージ！${consumeText}`);
            updateAllHPBars(gameState, { skipHpPopup: true });
            updateDeathStates(gameState);
            await waitForSetPopupEffects();
            await runPendingUndeadReviveActions(gameState);
            await sleep(360);
        }
    }
}

function awardPlayerBattleExperience(gameState) {
    const events = recordBattleParticipation(gameState);
    if (events.length === 0) return;

    gameState.lastBattleProgressEvents = events.map(event => ({
        id: event.char.id,
        name: event.char.name,
        battles: event.battles,
        limitBroken: event.limitBroken,
        limitBreakLevel: event.limitBreakLevel,
        newlyLimitBroken: event.newlyLimitBroken,
        newlyLimitBrokenLevel: event.newlyLimitBrokenLevel
    }));

    events.forEach(event => {
        if (event.newlyLimitBroken) {
            const speciesPoints = event.limitBreakLevel + 1;
            alertLog(`🌟 ${event.char.name}が現在Lv${event.limitBreakLevel + 1}にレベルアップ！ 性能1.2倍・種族${speciesPoints}pt扱いになった！`);
        } else if (event.limitBreakLevel < LIMIT_BREAK_MAX_LEVEL) {
            alertLog(`📘 ${event.char.name}が経験値を獲得！現在Lv${event.limitBreakLevel + 1} EXP ${event.battles}/${getLimitBreakRequiredBattlesForLevel(event.limitBreakLevel + 1)}`);
        }
    });

    if (events.some(event => event.newlyLimitBroken)) {
        const defeatedPlayers = new Set((gameState.players || [])
            .map((char, index) => char.hp <= 0 ? index : null)
            .filter(index => index !== null));
        applySpeciesSetBonuses(gameState, { healToFull: false }).forEach(alertLog);
        defeatedPlayers.forEach(index => {
            if (gameState.players[index]) gameState.players[index].hp = 0;
        });
        render(gameState);
        updateAllHPBars(gameState, { skipHpPopup: true });
    }
}

export async function runBattleRound(gameState) {
    if (window.isBattleEnded) {
        hideTurnBanner();
        return false;
    }
    const btn = document.getElementById('atk-btn');
    updateDeathStates(gameState);

    gameState.turn = (gameState.turn || 0) + 1;
    updateBattleHeader(gameState);
    gameState.turnRuntime = { p: { nextActorAtkIntBonus: 0 }, e: { nextActorAtkIntBonus: 0 } };
    resetHumanTurnActions(gameState);
    [...gameState.players, ...gameState.enemies].forEach(char => {
        grantTurnActions(char);
    });
    let actionQueue = [];
    gameState.players.forEach((p, idx) => {
        if (p.hp > 0) actionQueue.push({ char: p, side: 'p', index: idx });
    });
    gameState.enemies.forEach((e, idx) => {
        if (e.hp > 0) actionQueue.push({ char: e, side: 'e', index: idx });
    });
    actionQueue.sort((a, b) => b.char.spd - a.char.spd);

    setBattleStatus(`TURN ${gameState.turn} 開始`, 'turn');
    showTurnBanner(gameState.turn);
    alertLog(`--- TURN ${gameState.turn} 開始 ---`);
    await sleep(1040);
    const turnStartSetVisuals = applySpeciesTurnStartEffects(gameState, alertLog, { actionQueue });
    updateAllHPBars(gameState);
    if (turnStartSetVisuals > 0) {
        await waitForSetPopupEffects();
    }

    document.querySelectorAll('.character-section.active-actor').forEach(el => el.classList.remove('active-actor'));
    updateOrderIcons(actionQueue);

    const firstNextActor = getNextActor(gameState, actionQueue, -1);
    updateNextActionIcon(gameState, firstNextActor);

    for (let i = 0; i < actionQueue.length; i++) {
        const actor = actionQueue[i].char;
        const side = actionQueue[i].side;
        const actorIdx = actionQueue[i].index;
        const chainBonus = gameState.turnRuntime?.[side]?.nextActorAtkIntBonus || 0;
        let chainStatBonus = null;
        if (chainBonus > 0) {
            const atkGain = Math.max(1, Math.floor((actor.baseAtk || actor.atk || 1) * chainBonus));
            const intGain = Math.max(1, Math.floor((actor.baseInt || actor.int || 1) * chainBonus));
            actor.atk += atkGain;
            actor.int += intGain;
            chainStatBonus = { atkGain, intGain };
            alertLog(`${actor.name}は【加速する時計】でATK+${atkGain}/INT+${intGain}！`);
        }

        if (actor.hp <= 0) continue;
        setBattleStatus(`次の行動: ${actor.name}`, side === 'p' ? 'ally' : 'enemy');

        const defensiveStatusRemoved = tickDefensiveStatusDuration(actor, "taunt", "挑発");
        if (defensiveStatusRemoved) {
            updateAllHPBars(gameState);
            updateDeathStates(gameState);
            await sleep(450);
        }

        if (actor.status && actor.status.includes("paralysis")) {
            setBattleStatus(`${actor.name}はマヒで行動不能`, 'status');
            alertLog(`${actor.name}はマヒで行動できない！`);
            playParalysisStunEffect(side, actorIdx);
            actor.suppressParalysisReleaseEffect = true;
            removeStatus(actor, "paralysis");
            clearRemainingActions(actor);
            updateAllHPBars(gameState);
            updateDeathStates(gameState);
            await sleep(640);

            await applyPoisonTurnDamage(gameState, actor, side, actorIdx);
            if (actor.hp <= 0) alertLog(`${actor.name}は力尽きた！`);

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

        let keepActing = true;
        while (keepActing) {
            absorbPendingExtraActions(actor);
            const liveP = gameState.players.some(p => p.hp > 0);
            const liveE = gameState.enemies.some(e => e.hp > 0);
            if (!liveP || !liveE || actor.hp <= 0 || getRemainingActionCount(actor) <= 0) {
                keepActing = false;
                break;
            }

            if (enforceFinalReelLock(actor)) {
                refreshCharacterCommands(side, actorIdx, actor);
            }
            const activeReelIdx = actor.currentReel !== undefined ? actor.currentReel : 0;
            const currentCmds = (actor.commands && Array.isArray(actor.commands[0]))
                ? actor.commands[activeReelIdx]
                : actor.commands;

            let cmdIdx;
            const debugMode = document.getElementById('debug-mode');

            if (debugMode && debugMode.checked && isLocalDebugAvailable()) {
                setBattleStatus(`操作待機: ${actor.name}のコマンドを選択`, 'input');
                alertLog(`【操作】${actor.name}のコマンドを選択してください...`);
                updateRandomDebugCommandButton(true);
                cmdIdx = await waitForCommand(side, actorIdx);
                updateRandomDebugCommandButton(false);
            } else {
                cmdIdx = await doRoulette(side, actorIdx, currentCmds);
            }

            let commandId = currentCmds[cmdIdx];
            actor.isMimicAction = false;
            const overdrive = resolveUndeadReelOverdrive(actor, commandId, currentCmds);
            if (overdrive.overdrive) {
                commandId = overdrive.commandId;
                showPopupEffect(side, actorIdx, 'オーバードライブ', 'set', '#7c2d12');
                alertLog(`${actor.name}は【リール・オーバードライブ】でリールダウンを踏み倒し、即座に再抽選した！`);
            }
            const { determineTarget } = await import('./combat.js');
            const targetInfo = determineTarget(commandId, actorIdx, side, gameState);
            if (!targetInfo) {
                keepActing = false;
                break;
            }

            const beforeActorReel = actor.currentReel || 0;
            const beforeTargetReel = targetInfo.data?.currentReel || 0;
            await execute(actor, targetInfo.data, commandId, gameState, side, actorIdx, targetInfo.prefix, targetInfo.index);
            await waitForSetPopupEffects();
            await runPendingUndeadReviveActions(gameState);
            const humanActionEvent = recordHumanAction(gameState, actor, side);
            if (humanActionEvent) {
                alertLog(`✨ ${actor.name}の【士気蓄積】actionPoint=${humanActionEvent.pointsAdded} total=${humanActionEvent.totalPoints} turnActions=${humanActionEvent.turnActions}`);
            }
            if (enforceFinalReelLock(actor)) {
                refreshCharacterCommands(side, actorIdx, actor);
            }
            const targetReelIncreased = (targetInfo.data?.currentReel || 0) > beforeTargetReel;
            const actorReelIncreased = (actor.currentReel || 0) > beforeActorReel;
            const actorReelChanged = (actor.currentReel || 0) !== beforeActorReel;
            const targetReelChanged = (targetInfo.data?.currentReel || 0) !== beforeTargetReel;
            if (actorReelChanged) syncDragonReelStatBonus(actor);
            if (targetReelChanged && targetInfo.data !== actor) syncDragonReelStatBonus(targetInfo.data);
            if (actorReelIncreased || targetReelIncreased) {
                const relicTarget = targetReelIncreased ? targetInfo.data : actor;
                const relicTargetPrefix = targetReelIncreased ? targetInfo.prefix : side;
                const relicTargetIdx = targetReelIncreased ? targetInfo.index : actorIdx;
                await handleSpeciesReelEvents(gameState, applySpeciesReelUpEffects(gameState, relicTarget, relicTargetPrefix), relicTargetPrefix, relicTargetIdx);
                await waitForSetPopupEffects();
                const reelEvents = applyRelicReelUp(gameState, relicTarget);
                if (reelEvents.shield > 0 || reelEvents.events.length > 0) {
                    syncDragonReelStatBonus(relicTarget);
                    const summary = reelEvents.shield > 0
                        ? `シールド${reelEvents.shield}が付与された！`
                        : 'リールアップ連動効果が発動した！';
                    alertLog(`🔷 レリックの効果で${relicTarget.name}に${summary}`);
                    playRelicEffect(relicTargetPrefix, relicTargetIdx, `レリック`, '#60a5fa');
                    updateAllHPBars(gameState);
                    await sleep(350);
                }
            }
            const doomEvents = advanceDemonDoomCount(gameState, side, 1);
            await handleDemonDoomEvents(gameState, doomEvents, side);
            await waitForSetPopupEffects();
            const lowHpBarrier = applyRelicLowHpBarrier(gameState);
            if (lowHpBarrier) {
                alertLog(`🔷 ${lowHpBarrier.relic.name}が反応！ ${lowHpBarrier.target.name}にシールド${lowHpBarrier.amount}が付与された！`);
                playRelicEffect(lowHpBarrier.side, lowHpBarrier.index, `${lowHpBarrier.relic.name} +SH${lowHpBarrier.amount}`, '#60a5fa');
                updateAllHPBars(gameState);
                await sleep(350);
            }

            if (commandId.startsWith('cmd_up') || commandId.startsWith('cmd_down')) {
                await sleep(800);
                setBattleStatus(`${actor.name}はリール変動で連続行動`, 'chain');
                alertLog(`${actor.name}は連続行動できる！`);
                await sleep(800);
            } else {
                const beforeRemaining = getRemainingActionCount(actor);
                consumeAction(actor);
                absorbPendingExtraActions(actor);
                updateAllHPBars(gameState, { skipHpPopup: true });
                if (getRemainingActionCount(actor) > 0) {
                    await sleep(500);
                    const extraLabel = beforeRemaining > 1 ? '残り行動' : getAdditionalActionLabel(actor, getBaseActionCount(actor));
                    setBattleStatus(`${actor.name}は${extraLabel}で追加行動`, 'chain');
                    alertLog(`${actor.name}は${extraLabel}でさらに行動する！`);
                    await sleep(500);
                } else {
                    keepActing = false;
                }
            }
        }
        if (chainStatBonus) {
            actor.atk = Math.max(1, actor.atk - chainStatBonus.atkGain);
            actor.int = Math.max(1, actor.int - chainStatBonus.intGain);
        }

        if (actorEl && actor.hp > 0) {
            actorEl.classList.remove('active-actor');
            const isParalyzed = actor.status && actor.status.includes('paralysis');
            actorEl.classList.toggle('is-paralyzed', !!isParalyzed);
        }

        if (actor.hp > 0 && actor.status && actor.status.includes("poison")) {
            await applyPoisonTurnDamage(gameState, actor, side, actorIdx);

            if (actor.hp <= 0) {
                await sleep(800);
                alertLog(`${actor.name}は力尽きた！`);
            }
        }

        const nextActor = getNextActor(gameState, actionQueue, i);
        updateNextActionIcon(gameState, nextActor);
        if (nextActor) {
            setBattleStatus(`次: ${nextActor.char.name}`, nextActor.side === 'p' ? 'ally' : 'enemy');
        }
        await sleep(1000);
    }

    const endTurnSetVisuals = applySpeciesEndTurnEffects(gameState, alertLog);
    updateAllHPBars(gameState, { skipHpPopup: true });
    refreshPartyCommands(gameState, 'p');
    refreshPartyCommands(gameState, 'e');
    if (endTurnSetVisuals > 0) {
        await waitForSetPopupEffects();
        updateDeathStates(gameState);
    }

    await handleConstructEndTurnCoreRelease(gameState);
    await waitForSetPopupEffects();

    const allPlayersDead = gameState.players.every(p => p.hp <= 0);
    const allEnemiesDead = gameState.enemies.every(e => e.hp <= 0);

    if (allPlayersDead || allEnemiesDead) {
        awardPlayerBattleExperience(gameState);
        window.isBattleEnded = true;
        window.latestBattleResultState = gameState;
        hideTurnBanner();
        await showBattleEndResult(gameState);
    }

    if (allPlayersDead) {
        setBattleStatus('GAME OVER - 味方が全滅', 'danger');
        alertLog("味方が全滅しました…ゲームオーバー。");
        replaceBattleButtonWithMenu(btn, "GAME OVER - メニューへ");
        return false;
    }

    if (allEnemiesDead) {
        if (gameState.isChainMode && gameState.currentFloor < gameState.maxFloor) {
            setBattleStatus('敵を全滅 - 次の階へ', 'clear');
            alertLog("敵を全滅させた！ 次の階に進みます。");

            const clearedFloor = gameState.currentFloor;
            const nextFloor = gameState.currentFloor + 1;
            gameState.nextEnemies = generateRandomEnemies(
                { ...gameState, currentFloor: nextFloor },
                { includeSpecialOnly: shouldIncludeSpecialEnemies(nextFloor) }
            );

            await triggerRelicRewardEvent(gameState, clearedFloor);
            await triggerReplacementEvent(gameState);
            await triggerSpecialRecruitmentEvent(gameState, nextFloor);

            gameState.currentFloor = nextFloor;

            clearFullLog();
            alertLog(`🏰 ${gameState.currentFloor}階へ進みます！`);
            setBattleStatus(`${gameState.currentFloor}階へ進行`, 'turn');

            gameState.players.forEach(p => {
                p.currentReel = 0;
                resetBattleStats(p);
            });

            gameState.enemies = gameState.nextEnemies || generateRandomEnemies(gameState, { includeSpecialOnly: shouldIncludeSpecialEnemies(gameState.currentFloor) });
            gameState.nextEnemies = null;
            gameState.turn = 0;
            updateBattleHeader(gameState);
            gameState.statsSubmitted = false;
            window.isBattleEnded = false;
            window.latestBattleResultState = null;
            restoreEndTurnButtonForBattle();
            applySpeciesSetBonuses(gameState, { healToFull: true }).forEach(alertLog);
            healPartyToFull(gameState.players);
            healPartyToFull(gameState.enemies);
            const relicStartEvents = applyRelicBattleStart(gameState);
            initBattleStats(gameState);
            clearBattleEffects();

            render(gameState);
            updateAllHPBars(gameState, { skipHpPopup: true });
            await playBattleStartVisualEffects(gameState, relicStartEvents);
            await sleep(500);
            window.pauseAfterFloorTransition = true;
            return true;
        } else {
            setBattleStatus('COMPLETE - 全階層突破', 'clear');
            alertLog(`${gameState.maxFloor}階層の試練をすべて突破！ 完全クリア！`);
            replaceBattleButtonWithMenu(btn, "COMPLETE - メニューへ");
            return false;
        }
    }

    await sleep(1000);
    return true;
}

export async function doRoulette(prefix, charIdx, commands, options = {}) {
    if (getBattleSpeedMultiplier() >= 10 || window.advanceToTurnEndRequested) {
        return Number.isInteger(options.targetIdx)
            ? Math.max(0, Math.min(commands.length - 1, options.targetIdx))
            : Math.floor(Math.random() * commands.length);
    }

    const targetIdx = Number.isInteger(options.targetIdx)
        ? Math.max(0, Math.min(commands.length - 1, options.targetIdx))
        : Math.floor(Math.random() * commands.length);
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
        const cmdElements = [...rouletteEl.querySelectorAll('.cmd-item')];

        if (cmdElements.length === 0) {
            resolve(0);
            return;
        }
        let cleanupCommandListeners = () => {};

        const resolveCommand = (idx) => {
            if (resolved) return;
            resolved = true;
            cleanupCommandListeners();
            setSelectedDebugCommand(cmdElements, idx);
            window.resolvePendingCommand = null;
            updateRandomDebugCommandButton(false);
            resolve(idx);
        };

        window.resolvePendingCommand = () => {
            resolveCommand(getRandomCommandIndex(cmdElements));
        };
        updateRandomDebugCommandButton(true);

        if (window.advanceToTurnEndRequested) {
            window.resolvePendingCommand();
            return;
        }

        cmdElements.forEach(el => el.classList.remove('active'));
        cleanupCommandListeners = createDebugCommandResolver(cmdElements, resolveCommand);
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
    const iconContainer = getNextActionIconContainer();
    if (!iconContainer) return;

    const prev = iconContainer.querySelector('.order-icon.active');
    if (prev) prev.classList.remove('active');

    if (!nextActor) {
        iconContainer.querySelectorAll('.order-icon').forEach(el => el.classList.remove('active'));
        return;
    }

    const el = getOrderIconElement(nextActor.side, nextActor.index);
    if (el) {
        el.classList.add('active');
    }
}

export async function triggerReplacementEvent(gameState) {
    if (typeof window.showReplacementSelection === 'function') {
        await window.showReplacementSelection(gameState);
    }
}

export async function triggerRelicRewardEvent(gameState, clearedFloor) {
    if (gameState?.mode !== 'adventure') return;
    if (![1, 3, 5].includes(Number(clearedFloor))) return;
    if (typeof window.showRelicSelection === 'function') {
        const relic = await window.showRelicSelection(gameState, clearedFloor);
        if (relic) alertLog(`🔷 レリック「${relic.name}」を獲得した！`);
    }
}

async function showBattleEndResult(gameState) {
    if (typeof window.showBattleResult === 'function') {
        await window.showBattleResult(gameState);
    }

    hideTurnBanner();
    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen) battleScreen.classList.remove('hidden');
}

function replaceBattleButtonWithMenu(btn, label) {
    if (!btn) return;

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
        lockEndTurnButtonForBattleEnd();
    }

    btn.disabled = false;
    btn.innerText = label;

    const menuBtn = btn.cloneNode(true);
    menuBtn.addEventListener('click', () => {
        window.isBattleEnded = true;
        window.advanceToTurnEndRequested = false;
        window.pauseAfterFloorTransition = false;
        hideTurnBanner();
        clearBattleEffects();
        location.reload();
    });
    btn.parentNode.replaceChild(menuBtn, btn);
}

export function initBattleSystem(gameState) {
    window.fastTurnMode = false;
    window.advanceToTurnEndRequested = false;
    window.isBattleRoundRunning = false;
    window.resolvePendingCommand = null;
    window.executeRandomDebugCommand = function executeRandomDebugCommand() {
        if (!isLocalDebugAvailable()) return;
        if (typeof window.resolvePendingCommand !== 'function') {
            alertLog('【デバッグ】コマンド選択待機中のみランダム実行できます。');
            updateRandomDebugCommandButton(false);
            return;
        }
        window.resolvePendingCommand();
        updateRandomDebugCommandButton(false);
    };
    window.pauseAfterFloorTransition = false;
    window.isBattleEnded = false;
    setupDebugModeControls();

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
        if (endTurnBtn && !window.isBattleEnded) endTurnBtn.disabled = false;

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

        if (window.isBattleEnded) {
            lockEndTurnButtonForBattleEnd();
            return;
        }

        requestAdvanceToTurnEnd();

        if (window.isBattleRoundRunning) {
            return;
        }

        if (btn) btn.disabled = true;
        if (endTurnBtn && !window.isBattleEnded) endTurnBtn.disabled = false;

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
