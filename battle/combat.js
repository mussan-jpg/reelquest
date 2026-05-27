// battle/combat.js
import { commandEffects } from '../commands/index.js';
import { runCommandEffect } from '../commands/runner.js';
import { addStatus, getStatusDefenseMultiplier, removeStatus, syncAllStatusEffects } from '../commands/status.js';
import {
    createBattleSnapshot,
    recordActionStats,
    recordSetHealingDone,
    recordSetStatusInflicted,
    recordSetStatReduced
} from './stats.js';
import {
    applyFixedDamage,
    applyNormalDamage,
    applyShieldedDirectDamage,
    calculateDamageWithBreakdown as calculateResolvedDamageWithBreakdown,
    getStatusAttackMultiplier
} from './damageResolver.js';
import { applyRelicAfterAttack, applyRelicAfterCommand } from './relics.js';
import { buildCommandContext, clearActiveCommandContext, setActiveCommandContext } from './commandContext.js';
import { addAquaticTide, addBeastHuntStack, addConstructRecycleCore, addNatureBuds, addSlimeMucus, applyAllUndeadLastStandBonuses, consumeNatureBuds, consumeSlimeMucus, countNegativeStatuses, getSlimeMucus, notifySpeciesAllyDeaths } from './setBonuses.js';
import { determineTarget as resolveTarget, getHpRatio } from './targeting.js';
import { flashStatusBadges, playAttackEffect, playEvasionEffect, playGuardEffect, playHitEffect, playReelUpEffect, playSupportEffect, playTauntStatusEffect, showPopupEffect, showSetPopupBatch, showSetPopupEffect, showSetValueEvents, updateAllHPBars, updateCommandsUI, waitForSetPopupEffects } from '../ui/index.js';
import { alertLog, setBattleStatus, updateDeathStates, sleep } from './core.js';
import { grantExtraActions } from './actionCount.js';
import { playSetDamageSequence, playSetValueSequence, settleSetEffectApplication, waitSetEffectInterval } from './setEffectSequences.js';
import { buildSetStatValueEvent } from './setStatValueEvents.js';

function showActionGainPopup(prefix, index, amount = 1) {
    const gain = Math.max(1, Math.floor(Number(amount || 1)));
    showPopupEffect(prefix, index, `ACT+${gain}`, 'buff', '#14b8a6');
}

function collectCommandShieldGains(gameState, beforeSnapshot) {
    const gains = [];
    ['p', 'e'].forEach(prefix => {
        const party = prefix === 'p' ? gameState.players : gameState.enemies;
        (party || []).forEach((char, index) => {
            const previousShield = Math.max(0, Math.floor(Number(beforeSnapshot?.[prefix]?.[index]?.shield || 0)));
            const currentShield = Math.max(0, Math.floor(Number(char?.shield || 0)));
            if (currentShield > previousShield) {
                gains.push({ char, prefix, index, previousShield, currentShield, amount: currentShield - previousShield });
            }
        });
    });
    return gains;
}

function hideCommandShieldGains(shieldGains = []) {
    shieldGains.forEach(event => {
        if (event.char) event.char.shield = event.previousShield;
    });
}

function restoreCommandShieldGains(shieldGains = []) {
    shieldGains.forEach(event => {
        if (event.char) event.char.shield = event.currentShield;
    });
}

const COMMAND_STAT_KEYS = ['atk', 'int', 'spd'];

function collectCommandStatChanges(gameState, beforeSnapshot) {
    const changes = [];
    ['p', 'e'].forEach(prefix => {
        const party = prefix === 'p' ? gameState.players : gameState.enemies;
        (party || []).forEach((char, index) => {
            const before = beforeSnapshot?.[prefix]?.[index];
            if (!char || !before) return;
            const deltas = {};
            let hasDelta = false;
            COMMAND_STAT_KEYS.forEach(stat => {
                const beforeValue = Number(before[stat] || 0);
                const afterValue = Number(char[stat] || 0);
                if (afterValue !== beforeValue) {
                    deltas[stat] = afterValue - beforeValue;
                    hasDelta = true;
                }
            });
            if (hasDelta) {
                changes.push({ char, prefix, index, before, deltas });
            }
        });
    });
    return changes;
}

function hideCommandStatChanges(statChanges = []) {
    statChanges.forEach(event => {
        COMMAND_STAT_KEYS.forEach(stat => {
            if (Object.prototype.hasOwnProperty.call(event.deltas, stat)) {
                event.char[stat] = Number(event.before[stat] || 0);
            }
        });
    });
}

async function playCommandStatChangeSequence(gameState, statChanges = []) {
    const events = statChanges
        .map(event => {
            COMMAND_STAT_KEYS.forEach(stat => {
                if (Object.prototype.hasOwnProperty.call(event.deltas, stat)) {
                    event.char[stat] = Number(event.before[stat] || 0) + event.deltas[stat];
                }
            });
            return buildSetStatValueEvent(event.prefix, event.index, event.deltas, { char: event.char });
        })
        .filter(Boolean);
    if (events.length === 0) return;
    const totalDelta = statChanges.reduce((total, event) => (
        total + COMMAND_STAT_KEYS.reduce((sum, stat) => sum + Number(event.deltas[stat] || 0), 0)
    ), 0);
    showSetValueEvents(events, totalDelta >= 0 ? 'buff' : 'debuff', totalDelta >= 0 ? '#14b8a6' : '#94a3b8');
    await settleSetEffectApplication(gameState);
}

export function adjustStatusDamage(rawDamage, attacker, target) {
    const multiplier = getStatusAttackMultiplier(attacker) * getStatusDefenseMultiplier(target);
    return Math.max(0, Math.floor(rawDamage * multiplier));
}

export function calculateDamageWithBreakdown(rawDamage, attacker, target, options = {}) {
    return calculateResolvedDamageWithBreakdown(rawDamage, attacker, target, options);
}

function shouldExpandDamageToArea(attacker, effect) {
    const attackerRarity = attacker?.rarity
        ?? (Array.isArray(attacker?.commands?.[0]) ? attacker.commands.length : 1);

    return (attacker?.slotCost || 1) >= 3
        && attackerRarity < 5
        && !effect.isAreaAttack
        && typeof effect.calcDamage === 'function'
        && Math.max(0, Math.floor(effect.calcDamage(attacker))) > 0;
}

function getOpposingTargets(gameState, attackerPrefix) {
    const targetPrefix = attackerPrefix === 'p' ? 'e' : 'p';
    const party = targetPrefix === 'p' ? gameState.players : gameState.enemies;
    return {
        targetPrefix,
        targets: party
            .map((char, index) => ({ char, index }))
            .filter(item => item.char.hp > 0)
    };
}

function getActionStatOptions(attacker) {
    if (attacker?.isUndeadSoulFollowup) {
        return {
            source: 'set',
            setInfo: attacker.activeSpeciesBonus,
            sourceKind: 'followup'
        };
    }
    return {};
}

async function playUndeadLastStandBonusEvents(gameState, events = []) {
    if (!events.length) return;
    const setInfo = events.find(event => event.setInfo)?.setInfo;
    await playSetValueSequence(
        gameState,
        () => showSetPopupBatch(events, setInfo, '死線の執念', '#7c2d12'),
        events,
        'buff',
        '#7c2d12'
    );
}

function buildDamagePopupText(rawDamage, adjustedDamage, attacker, target, breakdown) {
    if (rawDamage === adjustedDamage) {
        return { value: String(adjustedDamage), formula: '' };
    }

    return {
        value: String(adjustedDamage),
        formula: `${adjustedDamage - rawDamage > 0 ? '+' : ''}${adjustedDamage - rawDamage}`
    };
}

function getDamageModifierBadgeIds(rawDamage, adjustedDamage, target, breakdown) {
    const status = Array.isArray(target?.status) ? target.status : [];
    const badges = [];

    if (adjustedDamage > rawDamage && status.includes('weakened')) {
        badges.push('weakened');
    }
    if (breakdown.guardTriggered && status.includes('taunt')) {
        badges.push('taunt');
    }

    return badges;
}

function getAttackerDamageModifierBadgeIds(attacker) {
    const status = Array.isArray(attacker?.status) ? attacker.status : [];
    return status.includes('weak') ? ['weak'] : [];
}

function consumeHiddenOnAttack(attacker, isDamageCommand) {
    if (!isDamageCommand || !attacker?.status?.includes('hidden')) return false;
    removeStatus(attacker, 'hidden');
    return true;
}

function getDamagePresentation(rawDamage, adjustedDamage, hpDamage, target, breakdown) {
    const maxHp = Math.max(1, Number(target?.maxHp || target?.hp || 1));
    const hpRatio = hpDamage / maxHp;
    const isAmplified = adjustedDamage > rawDamage;
    const impact = hpRatio >= 0.32 ? 'heavy' : hpRatio >= 0.12 ? 'light' : 'none';

    if (hpRatio >= 0.5) {
        return { color: '#dc2626', severity: 'devastating', impact: 'devastating', callout: '壊滅的!' };
    }

    if (hpRatio >= 0.32) {
        return { color: '#ef4444', severity: 'heavy', impact: 'heavy', callout: isAmplified ? '痛烈!' : '大ダメージ!' };
    }

    if (isAmplified) {
        return { color: '#f97316', severity: 'boosted', impact, callout: '' };
    }

    return { color: '#e74c3c', severity: 'normal', impact, callout: '' };
}

function buildDamageModifierTags(breakdown = {}) {
    const tags = [];
    const mitigatedDamage = Math.max(0, Math.floor(Number(breakdown.mitigatedDamage || 0)));
    if (breakdown.guardTriggered) {
        tags.push(mitigatedDamage > 0 ? `かばう-${mitigatedDamage}` : 'かばう');
        return tags;
    }
    if (breakdown.evasionTriggered) {
        tags.push(mitigatedDamage > 0 ? `回避-${mitigatedDamage}` : '回避軽減');
        return tags;
    }
    if (mitigatedDamage > 0) {
        tags.push(`軽減-${mitigatedDamage}`);
    }
    return tags;
}

function buildPresentedDamagePopup(rawDamage, adjustedDamage, hpDamage, attacker, target, breakdown) {
    const popup = buildDamagePopupText(rawDamage, hpDamage, attacker, target, breakdown);
    const presentation = getDamagePresentation(rawDamage, adjustedDamage, hpDamage, target, breakdown);
    const tags = buildDamageModifierTags(breakdown);
    return {
        text: {
            ...popup,
            severity: presentation.severity,
            callout: presentation.callout,
            tags
        },
        color: presentation.color,
        impact: presentation.impact
    };
}

function addShieldDamageTag(damagePresentation, absorbed) {
    const shieldDamage = Math.max(0, Math.floor(Number(absorbed || 0)));
    if (shieldDamage <= 0 || !damagePresentation?.text) return damagePresentation;
    damagePresentation.text.tags = [`SH-${shieldDamage}`, ...(damagePresentation.text.tags || [])];
    return damagePresentation;
}

function buildShieldDamagePopup(absorbed, target) {
    const shieldDamage = Math.max(0, Math.floor(Number(absorbed || 0)));
    const shieldRatio = shieldDamage / Math.max(1, Number(target?.maxHp || target?.hp || 1));
    return {
        text: {
            value: String(shieldDamage),
            formula: 'シールド',
            severity: 'normal'
        },
        color: '#e74c3c',
        impact: shieldRatio >= 0.18 ? 'light' : 'none'
    };
}

function showShieldDamagePopup(prefix, index, absorbed, target) {
    const shieldDamage = Math.max(0, Math.floor(Number(absorbed || 0)));
    if (shieldDamage <= 0) return;
    const presentation = buildShieldDamagePopup(shieldDamage, target);
    showPopupEffect(prefix, index, presentation.text, 'damage-detail', presentation.color);
    playGuardEffect(prefix, index, { showPopup: false });
    if (presentation.impact !== 'none') {
        playHitEffect(prefix, index, { impact: presentation.impact });
    }
}

function appendShieldLog(message, target, shieldResult) {
    if (!shieldResult?.absorbed) return message;
    return `${message}\n※ ${target.name}のシールドが ${shieldResult.absorbed} ダメージを受け止めた！`;
}

function recordConstructShieldAbsorption(gameState, defenderPrefix, defenderIdx, attackerPrefix, absorbed, options = {}) {
    if (!absorbed || defenderPrefix === attackerPrefix) return 0;
    const gain = addConstructRecycleCore(gameState, defenderPrefix, absorbed);
    if (gain > 0) {
        options.events?.push({
            prefix: defenderPrefix,
            index: defenderIdx,
            gain,
            setInfo: options.setInfo
        });
        if (options.showPopup !== false) {
            showPopupEffect(defenderPrefix, defenderIdx, `廃材+${gain}`, 'set', '#38bdf8');
        }
    }
    return gain;
}

function appendConstructCoreGainLog(message, gain) {
    if (!gain) return message;
    return `${message}\n※ 【廃材】シールド破片を回収し、廃材+${gain}！`;
}

async function playConstructCoreGainSequence(gameState, events = []) {
    const coreEvents = events.filter(event => event?.gain > 0);
    if (coreEvents.length === 0) return;
    showSetPopupBatch(
        coreEvents.map(event => ({ prefix: event.prefix, index: event.index, resultText: `廃材+${event.gain}` })),
        coreEvents[0].setInfo,
        '廃材',
        '#38bdf8'
    );
    await waitForSetPopupEffects();
    coreEvents.forEach(event => {
        showPopupEffect(event.prefix, event.index, `廃材+${event.gain}`, 'set', '#38bdf8');
    });
    await settleSetEffectApplication(gameState);
}

async function applyBeastEvasionCounter(gameState, context = {}) {
    const {
        defender,
        defenderPrefix,
        defenderIdx,
        attacker,
        attackerPrefix,
        attackerIdx,
        breakdown,
        beforeSnapshot
    } = context;
    if (defender?.species !== 'beast' || !breakdown?.evasionTriggered) return '';
    let message = '';
    if (defender?.activeSpeciesBonus?.beastHuntStackBonus) {
        const stacks = addBeastHuntStack(gameState, defenderPrefix, 1);
        if (stacks > 0) {
            message += `\n※ ${defender.name}は【狩猟スタック】を1獲得した！`;
        }
    }

    const factor = defender?.activeSpeciesBonus?.beastEvasionCounterFactor || 0;
    if (!factor || !attacker || attacker.hp <= 0) return message;
    if (defender.beastCounterTurn === gameState?.turn) return message;
    defender.beastCounterTurn = gameState?.turn;
    const counterDamage = Math.max(1, Math.floor(Number(defender.atk || 0) * factor));
    const fixedResult = applyFixedDamage(gameState, {
        target: attacker,
        targetPrefix: attackerPrefix,
        targetIdx: attackerIdx,
        attackerPrefix: defenderPrefix,
        attackerIdx: defenderIdx,
        damage: counterDamage,
        recordStats: true,
        statSource: 'set',
        setInfo: defender.activeSpeciesBonus,
        sourceKind: 'counter'
    });
    if (beforeSnapshot?.[attackerPrefix]?.[attackerIdx]) {
        beforeSnapshot[attackerPrefix][attackerIdx].hp = attacker.hp;
    }
    if (fixedResult.hpDamage <= 0) return message;
    await playSetDamageSequence(
        gameState,
        () => showSetPopupEffect(attackerPrefix, attackerIdx, defender.activeSpeciesBonus, '反撃', '#f59e0b'),
        [{ prefix: attackerPrefix, index: attackerIdx, damage: fixedResult.hpDamage }]
    );
    message += `\n※ ${defender.name}の【反射神経】で${attacker.name}へ固定${fixedResult.hpDamage}ダメージ！`;
    return message;
}

function hasHpLossSinceSnapshot(gameState, beforeSnapshot) {
    if (!gameState || !beforeSnapshot) return false;
    return ['p', 'e'].some(side => {
        const party = side === 'p' ? gameState.players : gameState.enemies;
        return (party || []).some((char, index) => {
            const beforeHp = beforeSnapshot?.[side]?.[index]?.hp;
            return typeof beforeHp === 'number' && char.hp < beforeHp;
        });
    });
}

function getLowestHpRatioAlly(party, sourceIndex, requireMissingHp = false) {
    const candidates = party
        .map((char, index) => ({ char, index }))
        .filter(item => item.char.hp > 0 && item.index !== sourceIndex)
        .filter(item => !requireMissingHp || item.char.hp < item.char.maxHp);

    if (candidates.length === 0) return null;

    return candidates.sort((a, b) => {
        const aRatio = Math.max(0, Number(a.char.hp || 0)) / Math.max(1, Number(a.char.maxHp || 1));
        const bRatio = Math.max(0, Number(b.char.hp || 0)) / Math.max(1, Number(b.char.maxHp || 1));
        if (Math.abs(aRatio - bRatio) > 0.001) return aRatio - bRatio;
        return (b.char.maxHp - b.char.hp) - (a.char.maxHp - a.char.hp);
    })[0];
}

function getPartySupportGain(party, beforeParty = []) {
    return party.reduce((total, char, index) => {
        const before = beforeParty[index];
        if (!char || !before || before.hp <= 0) return total;
        const hpGain = Math.max(0, Math.floor(Number(char.hp || 0) - Number(before.hp || 0)));
        const shieldGain = Math.max(0, Math.floor(Number(char.shield || 0) - Number(before.shield || 0)));
        return total + hpGain + shieldGain;
    }, 0);
}

function getPartySupportRecipients(party, beforeParty = []) {
    return party.reduce((recipients, char, index) => {
        const before = beforeParty[index];
        if (!char || !before || before.hp <= 0 || char.hp <= 0) return recipients;
        const hpGain = Math.max(0, Math.floor(Number(char.hp || 0) - Number(before.hp || 0)));
        const shieldGain = Math.max(0, Math.floor(Number(char.shield || 0) - Number(before.shield || 0)));
        const amount = hpGain + shieldGain;
        if (amount > 0) recipients.push({ char, index, amount });
        return recipients;
    }, []);
}

async function applySlimeShare(gameState, beforeSnapshot, sourcePrefix, commandContext, attacker, attackerIdx) {
    const party = sourcePrefix === 'p' ? gameState.players : gameState.enemies;
    const targetPrefix = sourcePrefix === 'p' ? 'e' : 'p';
    const targetParty = targetPrefix === 'p' ? gameState.players : gameState.enemies;
    const supportRecipients = getPartySupportRecipients(party, beforeSnapshot?.[sourcePrefix] || []);
    const supportGain = supportRecipients.reduce((total, recipient) => total + recipient.amount, 0);
    if (supportGain <= 0) return '';

    let message = '';

    const mucusFactor = Number(attacker?.activeSpeciesBonus?.slimeMucusGainFactor || 0);
    if (mucusFactor > 0) {
        const mucusGain = addSlimeMucus(gameState, sourcePrefix, Math.floor(supportGain * mucusFactor));
        if (mucusGain > 0) {
            message += `\n※ ${attacker.name}は【粘液蓄積】で粘液+${mucusGain}！`;
        }
    }

    if (
        attacker?.species === 'slime'
        && attacker?.activeSpeciesBonus?.slimeSupportExtraAction
        && (commandContext?.isHeal || commandContext?.isShield)
        && getSlimeMucus(gameState, sourcePrefix) >= Number(attacker.activeSpeciesBonus?.slimeMucusExtraActionThreshold || Infinity)
    ) {
        const extraActionEvents = [];
        const extraActionCandidates = supportRecipients.length > 0
            ? [supportRecipients[Math.floor(Math.random() * supportRecipients.length)]]
            : [];
        extraActionCandidates.forEach(({ char, index }) => {
            const chance = Number(attacker.activeSpeciesBonus?.slimeSupportExtraActionChance || 1);
            if (chance < 1 && Math.random() >= chance) return;
            const perTurn = Number(attacker.activeSpeciesBonus?.slimeSupportExtraActionPerTurn || 0);
            const currentTurn = Number(gameState.turn || 0);
            if (perTurn > 0 && char.slimeExtraActionTurn === currentTurn && Number(char.slimeExtraActionCount || 0) >= perTurn) return;
            extraActionEvents.push({ char, index, currentTurn });
        });
        if (extraActionEvents.length > 0) {
            const spent = consumeSlimeMucus(
                gameState,
                sourcePrefix,
                attacker.activeSpeciesBonus?.slimeMucusExtraActionCost || attacker.activeSpeciesBonus?.slimeMucusExtraActionThreshold || 0
            );
            showSetPopupBatch(
                extraActionEvents.map(event => ({ prefix: sourcePrefix, index: event.index, resultText: `ACT+1/${spent ? `粘液-${spent}` : '予約'}` })),
                attacker.activeSpeciesBonus,
                '分裂再行動',
                '#14b8a6'
            );
            await waitForSetPopupEffects();
            extraActionEvents.forEach(({ char, index, currentTurn }) => {
                grantExtraActions(char, 1);
                char.slimeExtraActionTurn = currentTurn;
                char.slimeExtraActionCount = Number(char.slimeExtraActionCount || 0) + 1;
                showActionGainPopup(sourcePrefix, index, 1);
                message += `\n※ ${attacker.name}は【分裂再行動】で粘液${spent}を消費し、${char.name}の追加行動を予約した！`;
            });
            await settleSetEffectApplication(gameState);
        }
    }

    return message;
}

async function applyNatureSupportBudGain(gameState, beforeSnapshot, sourcePrefix) {
    const party = sourcePrefix === 'p' ? gameState.players : gameState.enemies;
    const beforeParty = beforeSnapshot?.[sourcePrefix] || [];
    let message = '';

    for (const [index, char] of (party || []).entries()) {
        if (!char || char.hp <= 0 || !char.activeSpeciesBonus?.natureBudFromSupport) continue;
        const before = beforeParty[index];
        if (!before) continue;

        const hpGain = Math.max(0, Math.floor(Number(char.hp || 0) - Number(before.hp || 0)));
        const shieldGain = Math.max(0, Math.floor(Number(char.shield || 0) - Number(before.shield || 0)));
        const beforeStatuses = before.status || [];
        const removedNegativeStatuses = beforeStatuses.filter(statusId => !char.status?.includes(statusId) && countNegativeStatuses({ status: [statusId] }) > 0);
        if (hpGain <= 0 && shieldGain <= 0 && removedNegativeStatuses.length === 0) continue;

        if (char.activeSpeciesBonus?.natureBudFromSupport) {
            const budGain = addNatureBuds(gameState, sourcePrefix, 1);
            if (budGain > 0) {
                message += `\n※ ${char.name}は【芽吹き】で支援に反応し、芽吹き+${budGain}！`;
            }
        }

    }

    return message;
}

function getRelicStatusLabel(statusId) {
    const labels = {
        poison: '毒',
        paralysis: 'マヒ',
        weakened: '被ダメ120%',
        weak: 'ATK70%'
    };
    return labels[statusId] || '状態異常';
}

function applyPostAttackRelicEffects(gameState, attacker, target, isDamageCommand, isEnemyTarget, isAreaAttack) {
    if (!isDamageCommand || !isEnemyTarget || isAreaAttack || !target || target.hp <= 0) return '';

    const events = applyRelicAfterAttack(gameState, attacker, target);
    let message = '';
    events.forEach(event => {
        if (event.hook === 'attackBonusDamage') {
            showPopupEffect(event.targetSide, event.index, event.relic.name, 'relic', '#f97316');
            if (event.hpDamage > 0) {
                const damagePresentation = addShieldDamageTag(
                    buildPresentedDamagePopup(event.amount, event.amount, event.hpDamage, attacker, event.target, {}),
                    event.absorbed
                );
                showPopupEffect(event.targetSide, event.index, damagePresentation.text, 'damage-detail', '#f97316');
                playHitEffect(event.targetSide, event.index, { impact: damagePresentation.impact });
            } else if (event.absorbed > 0) {
                showShieldDamagePopup(event.targetSide, event.index, event.absorbed, event.target);
            }
            message += `\n※ ${event.relic.name}が追撃し、${event.target.name}に ${event.hpDamage} ダメージ！`;
            if (event.absorbed > 0) message += `（シールド${event.absorbed}）`;
        }

        if (event.hook === 'attackStatus') {
            const label = getRelicStatusLabel(event.statusId);
            message += `\n※ ${event.relic.name}により、${event.target.name}は【${label}】になった！`;
        }
    });

    return message;
}

async function applyAquaticShieldHitEffects(gameState, defender, attacker, defenderPrefix, defenderIdx, attackerPrefix, attackerIdx, shieldResult, breakdown = {}) {
    if (!defender || !attacker || defenderPrefix === attackerPrefix || shieldResult?.absorbed <= 0) return '';
    const active = defender.activeSpeciesBonus || {};
    let message = '';

    if (active.aquaticShieldHitHealPercent) {
        const party = defenderPrefix === 'p' ? gameState.players : gameState.enemies;
        let totalHeal = 0;
        const healEvents = [];
        (party || []).forEach((char, index) => {
            if (!char || char.hp <= 0) return;
            const before = char.hp;
            const heal = Math.max(1, Math.floor(Number(char.maxHp || 1) * active.aquaticShieldHitHealPercent));
            char.hp = Math.min(char.maxHp, char.hp + heal);
            const healed = Math.max(0, char.hp - before);
            if (healed > 0) {
                char.suppressNextHpPopup = true;
                healEvents.push({ prefix: defenderPrefix, index, resultText: `HP+${healed}`, amount: healed });
                totalHeal += healed;
            }
        });
        recordSetHealingDone(gameState, defenderPrefix, defenderIdx, totalHeal, {
            setInfo: active,
            sourceKind: 'counter'
        });
        await playSetValueSequence(
            gameState,
            () => showSetPopupBatch(healEvents, active, '返り血', '#0ea5e9'),
            healEvents,
            'heal',
            '#2ecc71',
            { skipHpPopup: false }
        );
        message += `\n※ ${defender.name}の【返り血】で味方全体を合計${totalHeal}回復！`;
    }

    if (active.aquaticShieldHitDebuff) {
        const statusId = attacker.status?.includes('weak') ? 'poison' : 'weak';
        const added = addStatus(attacker, statusId);
        if (statusId === 'poison' && added) {
            if (!attacker.statusSources) attacker.statusSources = {};
            attacker.statusSources.poison = { side: defenderPrefix, index: defenderIdx };
        }
        if (added) {
            recordSetStatusInflicted(gameState, defenderPrefix, defenderIdx, 1, {
                setInfo: active,
                sourceKind: 'counter'
            });
            if (statusId === 'weak') {
                recordSetStatReduced(gameState, defenderPrefix, defenderIdx, Math.max(1, Math.floor((attacker.baseAtk || attacker.atk || 0) * 0.3)), {
                    setInfo: active,
                    sourceKind: 'counter'
                });
            }
            showSetPopupBatch([{ prefix: attackerPrefix, index: attackerIdx, resultText: statusId === 'poison' ? '毒' : '脱力' }], active, '潮蝕', '#0ea5e9');
            await waitSetEffectInterval();
            message += `\n※ ${defender.name}の【潮蝕】で${attacker.name}に${statusId === 'poison' ? '毒' : '脱力'}！`;
        }
    }

    const tideGain = Number(shieldResult?.absorbed || 0) + Number(breakdown.aquaticCut || 0);
    if (active.aquaticTideReflectFactor && tideGain > 0) {
        const gained = addAquaticTide(gameState, defenderPrefix, tideGain);
        if (gained > 0) {
            message += `\n※ ${defender.name}は【潮流】で反射量+${gained}を蓄積した！`;
        }
    }

    return message;
}

async function applyNatureMagicBloomDamage(gameState, beforeSnapshot, attacker, target, attackerPrefix, attackerIdx, targetPrefix, targetIdx, commandContext) {
    const active = attacker?.activeSpeciesBonus || {};
    if (!active.natureMagicBloomFixedDamage || commandContext.category !== '魔法' || !target || target.hp <= 0) return '';
    const budCount = Math.max(0, Number(gameState?.natureBudState?.[attackerPrefix]?.buds || 0));
    if (budCount <= 0) return '';
    const consumed = Math.max(1, consumeNatureBuds(gameState, attackerPrefix, budCount));
    const damage = Math.max(1, Math.floor((attacker.int || 1) * consumed * Number(active.natureMagicBloomDamageFactor || 1)));
    const fixedResult = applyFixedDamage(gameState, {
        target,
        targetPrefix,
        targetIdx,
        attackerPrefix,
        attackerIdx,
        damage,
        recordStats: true,
        statSource: 'set',
        setInfo: active,
        sourceKind: 'magicBloom'
    });
    if (beforeSnapshot?.[targetPrefix]?.[targetIdx]) {
        beforeSnapshot[targetPrefix][targetIdx].hp = target.hp;
    }
    await playSetDamageSequence(
        gameState,
        () => showSetPopupEffect(targetPrefix, targetIdx, active, '魔法開花', '#22c55e'),
        [{ prefix: targetPrefix, index: targetIdx, damage: fixedResult.hpDamage }]
    );
    return `\n※ ${attacker.name}の【魔法開花】で芽吹き${consumed}を消費し、${target.name}に固定${fixedResult.hpDamage}ダメージ！`;
}

async function playAreaAttackDamageEffects(gameState, beforeSnapshot, attacker, attackerPrefix, attackerIdx, effect) {
    const rawDamage = typeof effect.calcDamage === 'function'
        ? Math.max(0, Math.floor(effect.calcDamage(attacker)))
        : 0;
    if (rawDamage <= 0) return;

    const targetPrefix = attackerPrefix === 'p' ? 'e' : 'p';
    const party = targetPrefix === 'p' ? gameState.players : gameState.enemies;
    const pendingAquaticEffects = [];
    const pendingConstructCoreEvents = [];
    party.forEach((target, index) => {
        const before = beforeSnapshot?.[targetPrefix]?.[index];
        if (!before || before.hp <= 0) return;

        const hpDamage = Math.max(0, Math.floor(before.hp - target.hp));
        const absorbed = Math.max(0, Math.floor((before.shield || 0) - (target.shield || 0)));
        const totalDamage = hpDamage + absorbed;
        if (totalDamage <= 0) return;

        const presentationDamage = totalDamage > rawDamage ? totalDamage : rawDamage;
        const breakdown = {
            mitigatedDamage: target.hp > 0 ? Math.max(0, rawDamage - totalDamage) : 0,
            guardTriggered: target.status?.includes('taunt') && totalDamage < rawDamage,
            evasionTriggered: target.hp > 0 && totalDamage < rawDamage && !target.status?.includes('taunt')
        };

        if (absorbed > 0) {
            recordConstructShieldAbsorption(gameState, targetPrefix, index, attackerPrefix, absorbed, {
                showPopup: false,
                events: pendingConstructCoreEvents,
                setInfo: target.activeSpeciesBonus
            });
            const cutPerDebuff = target.activeSpeciesBonus?.shieldedDebuffDamageCut || 0;
            const aquaticCut = cutPerDebuff && before.shield > 0
                ? Math.floor(rawDamage * Math.min(
                    target.activeSpeciesBonus?.shieldedDebuffDamageCutMax || cutPerDebuff * 3,
                    countNegativeStatuses(attacker) * cutPerDebuff
                ))
                : 0;
            pendingAquaticEffects.push({ defender: target, defenderIdx: index, shieldResult: { absorbed }, breakdown: { aquaticCut } });
        }

        if (hpDamage > 0) {
            const damagePresentation = addShieldDamageTag(
                buildPresentedDamagePopup(rawDamage, presentationDamage, hpDamage, attacker, target, breakdown),
                absorbed
            );
            showPopupEffect(targetPrefix, index, damagePresentation.text, 'damage-detail', damagePresentation.color);
            flashStatusBadges(attackerPrefix, attackerIdx, getAttackerDamageModifierBadgeIds(attacker));
            flashStatusBadges(targetPrefix, index, getDamageModifierBadgeIds(rawDamage, totalDamage, target, breakdown));
            playHitEffect(targetPrefix, index, { impact: damagePresentation.impact });
            return;
        }

        showShieldDamagePopup(targetPrefix, index, absorbed, target);
    });
    if (pendingConstructCoreEvents.length > 0) {
        updateAllHPBars(gameState, { skipHpPopup: true });
        await waitSetEffectInterval();
        await playConstructCoreGainSequence(gameState, pendingConstructCoreEvents);
    }
    for (const event of pendingAquaticEffects) {
        await applyAquaticShieldHitEffects(gameState, event.defender, attacker, targetPrefix, event.defenderIdx, attackerPrefix, attackerIdx, event.shieldResult, event.breakdown);
    }
}

function getCommandOpeningMotion(effect, attacker) {
    const damage = typeof effect.calcDamage === 'function'
        ? Math.max(0, Math.floor(effect.calcDamage(attacker)))
        : 0;
    return damage > 0 ? 'attack' : 'support';
}

function playOpeningMotion(effect, attacker, target, attackerPrefix, attackerIdx, targetPrefix, targetIdx) {
    if (getCommandOpeningMotion(effect, attacker) === 'attack') {
        playAttackEffect(attackerPrefix, attackerIdx);
        return;
    }

    playSupportEffect(attackerPrefix, attackerIdx, 'cast');

    const hasDistinctAllyTarget = target
        && targetPrefix === attackerPrefix
        && targetIdx !== attackerIdx;
    if (hasDistinctAllyTarget) {
        playSupportEffect(targetPrefix, targetIdx, 'receive');
    }
}

export function determineTarget(commandId, attackerIdx, currentSide, gameState) {
    return resolveTarget(commandId, attackerIdx, currentSide, gameState, {
        policy: 'random',
        getHealAmount: (id, actor) => commandEffects[id]?.calcHeal?.(actor)
    });
}

export async function execute(attacker, target, commandId, gameState, attackerPrefix, attackerIdx, targetPrefix, targetIdx) {
    const effect = commandEffects[commandId];
    if (!effect) return;
    if (!attacker?.isMimicAction && !attacker?.isUndeadSoulFollowup) attacker.lastCommandId = commandId;

    syncAllStatusEffects(gameState);
    const beforeSnapshot = createBattleSnapshot(gameState);
    const beforeAttackerReel = attacker?.currentReel || 0;
    const beforeTargetReel = target?.currentReel || 0;
    const initialTargetHp = target ? target.hp : 0;
    const isEnemyTarget = target && targetPrefix !== attackerPrefix;
    const isDamageCommand = typeof effect.calcDamage === 'function' && Math.max(0, Math.floor(effect.calcDamage(attacker))) > 0;
    const isTauntDrawingAttack = isEnemyTarget && isDamageCommand && target.status?.includes('taunt');
    const commandContext = buildCommandContext({ gameState, actor: attacker, target, commandId, effect });
    setActiveCommandContext(attacker, commandContext);
    const targetLabel = target && target !== attacker ? ` → ${target.name}` : '';
    setBattleStatus(`${attacker.name}「${effect.name}」${targetLabel}`, attackerPrefix === 'p' ? 'ally' : 'enemy');
    if (isTauntDrawingAttack) {
        playTauntStatusEffect(targetPrefix, targetIdx, '挑発中');
        await sleep(620);
    }
    showPopupEffect(attackerPrefix, attackerIdx, effect.name, 'system', '#34495e');
    playOpeningMotion(effect, attacker, target, attackerPrefix, attackerIdx, targetPrefix, targetIdx);
    await sleep(520);

    if (shouldExpandDamageToArea(attacker, effect) || commandContext.targetMode === 'all' || commandContext.targetMode === 'random2') {
        const consumedHidden = consumeHiddenOnAttack(attacker, true);
        const { targetPrefix: areaTargetPrefix, targets: allTargets } = getOpposingTargets(gameState, attackerPrefix);
        const targets = commandContext.targetMode === 'random2'
            ? [...allTargets].sort(() => Math.random() - 0.5).slice(0, 2)
            : allTargets;
        let message = commandContext.targetMode === 'random2'
            ? `🌐 ${attacker.name}の「${effect.name}」！ 【${attacker.activeSpeciesBonus?.name || '効果'}】で対象が2体へ広がる！`
            : `🌐 ${attacker.name}の「${effect.name}」！ 敵全体へ広がる！`;
        const pendingConstructCoreEvents = [];
        if (commandContext.messages.length > 0) {
            message += `\n※ ${commandContext.messages.join('\n※ ')}`;
        }
        if (consumedHidden) {
            message += `\n※ ${attacker.name}は攻撃して隠密が解除された！`;
        }

        const pendingAquaticEffects = [];
        const pendingBeastCounters = [];
        const pendingMagicBloomEffects = [];
        targets.forEach(({ char: areaTarget, index }) => {
            const initialHp = areaTarget.hp;
            const { message: targetMessage } = runCommandEffect({
                commandId,
                effect,
                actor: attacker,
                target: areaTarget,
                gameState,
                commandEffects
            });
            syncAllStatusEffects(gameState);

            const hpLoss = Math.max(0, initialHp - areaTarget.hp);
            const rawDamage = typeof effect.calcDamage === 'function'
                ? Math.max(0, Math.floor(effect.calcDamage(attacker))) + (commandContext.extraFixedDamage || 0)
                : hpLoss;
            const damageResult = applyNormalDamage(gameState, {
                target: areaTarget,
                targetPrefix: areaTargetPrefix,
                targetIdx: index,
                attackerPrefix,
                attackerIdx,
                rawDamage,
                attacker,
                isAreaAttack: true,
                baseHp: initialHp
            });
            const { shieldResult, breakdown } = damageResult;
            const adjustedDamage = damageResult.adjustedDamage;
            const mitigatedDamage = breakdown.mitigatedDamage;
            const increasedDamage = Math.max(0, adjustedDamage - rawDamage);

            if (shieldResult.absorbed > 0) {
                message = appendConstructCoreGainLog(message, recordConstructShieldAbsorption(gameState, areaTargetPrefix, index, attackerPrefix, shieldResult.absorbed, {
                    showPopup: false,
                    events: pendingConstructCoreEvents,
                    setInfo: areaTarget.activeSpeciesBonus
                }));
                pendingAquaticEffects.push({ defender: areaTarget, defenderIdx: index, shieldResult, breakdown });
            }

            if (shieldResult.hpDamage > 0) {
                const damagePresentation = addShieldDamageTag(
                    buildPresentedDamagePopup(rawDamage, adjustedDamage, shieldResult.hpDamage, attacker, areaTarget, breakdown),
                    shieldResult.absorbed
                );
                showPopupEffect(areaTargetPrefix, index, damagePresentation.text, 'damage-detail', damagePresentation.color);
                flashStatusBadges(attackerPrefix, attackerIdx, getAttackerDamageModifierBadgeIds(attacker));
                flashStatusBadges(areaTargetPrefix, index, getDamageModifierBadgeIds(rawDamage, adjustedDamage, areaTarget, breakdown));
                playHitEffect(areaTargetPrefix, index, { impact: damagePresentation.impact });
            } else if (shieldResult.absorbed > 0) {
                showShieldDamagePopup(areaTargetPrefix, index, shieldResult.absorbed, areaTarget);
            }

            message += `\n${targetMessage}`;
            if (adjustedDamage !== rawDamage) {
                const changeText = mitigatedDamage > 0
                    ? `軽減${mitigatedDamage}`
                    : `増加${increasedDamage}`;
                message += `\n※ ${areaTarget.name}へのダメージ補正: ${rawDamage} → ${adjustedDamage}（${changeText}）`;
            }
            message = appendShieldLog(message, areaTarget, shieldResult);
            if (breakdown.evasionTriggered) {
                playEvasionEffect(areaTargetPrefix, index, { showPopup: false });
                message += `\n※ ${areaTarget.name}は素早さを活かしてダメージを半分に受け流した！`;
                pendingBeastCounters.push({
                    defender: areaTarget,
                    defenderPrefix: areaTargetPrefix,
                    defenderIdx: index,
                    attacker,
                    attackerPrefix,
                    attackerIdx,
                    breakdown,
                    beforeSnapshot
                });
            }
            if (breakdown.guardTriggered) {
                playGuardEffect(areaTargetPrefix, index, { showPopup: false });
                message += `\n※ ${areaTarget.name}はかばう構えでダメージを受け止めた！`;
            }
            pendingMagicBloomEffects.push({ target: areaTarget, index });
        });

        if (pendingConstructCoreEvents.length > 0) {
            updateAllHPBars(gameState, { skipHpPopup: true });
            await waitSetEffectInterval();
            await playConstructCoreGainSequence(gameState, pendingConstructCoreEvents);
        }

        for (const counterContext of pendingBeastCounters) {
            message += await applyBeastEvasionCounter(gameState, counterContext);
        }

        for (const event of pendingMagicBloomEffects) {
            message += await applyNatureMagicBloomDamage(gameState, beforeSnapshot, attacker, event.target, attackerPrefix, attackerIdx, areaTargetPrefix, event.index, commandContext);
        }

        for (const event of pendingAquaticEffects) {
            message += await applyAquaticShieldHitEffects(gameState, event.defender, attacker, areaTargetPrefix, event.defenderIdx, attackerPrefix, attackerIdx, event.shieldResult, event.breakdown);
        }

        recordActionStats(gameState, beforeSnapshot, attackerPrefix, attackerIdx, getActionStatOptions(attacker));
        applyRelicAfterCommand(gameState, attacker, commandContext).forEach(event => {
            message += `\n※ ${event.relic.name}の効果が発動した！（${event.atkGain || event.intGain ? `ATK+${event.atkGain}/INT+${event.intGain}` : `累積${Number(event.amount || 0).toFixed(1)}`}）`;
        });
        notifySpeciesAllyDeaths(gameState, beforeSnapshot, alertLog);
        const undeadBonusEvents = applyAllUndeadLastStandBonuses(gameState);
        if (hasHpLossSinceSnapshot(gameState, beforeSnapshot)) {
            await playUndeadLastStandBonusEvents(gameState, undeadBonusEvents);
        }
        alertLog(message);
        updateAllHPBars(gameState, { skipHpPopup: true });
        updateDeathStates(gameState);

        await sleep(400);
        if (attacker.hp <= 0 && !attacker.isUndeadSoulFollowup && !attacker.pendingUndeadLastStand) alertLog(`${attacker.name}は力尽きた！`);
        targets.forEach(({ char }) => {
            if (char.hp <= 0 && !char.pendingUndeadLastStand) alertLog(`${char.name}は力尽きた！`);
        });
        updateDeathStates(gameState);
        clearActiveCommandContext(attacker);
        return;
    }

    const commandResult = runCommandEffect({
        commandId,
        effect,
        actor: attacker,
        target,
        gameState,
        commandEffects
    });
    let message = commandResult.message;
    if (commandContext.messages.length > 0) {
        message += `\n※ ${commandContext.messages.join('\n※ ')}`;
    }
    if ((commandContext.isHeal || commandContext.isShield) && !isDamageCommand && !effect.isAreaAttack) {
        updateAllHPBars(gameState);
        await sleep(620);
    }
    const consumedHidden = consumeHiddenOnAttack(attacker, isEnemyTarget && isDamageCommand);
    if (effect.isAreaAttack) {
        await playAreaAttackDamageEffects(gameState, beforeSnapshot, attacker, attackerPrefix, attackerIdx, effect);
    }

    const commandStatChanges = isDamageCommand && target && !effect.isAreaAttack
        ? collectCommandStatChanges(gameState, beforeSnapshot)
        : [];
    if (commandStatChanges.length > 0) {
        hideCommandStatChanges(commandStatChanges);
    }
    const hpLoss = target ? Math.max(0, initialTargetHp - target.hp) : 0;
    const eventDamage = Math.max(0, Math.floor(Number(commandResult.event?.damage || 0)));
    const calculatedDamage = eventDamage > 0
        ? eventDamage + (commandContext.extraFixedDamage || 0)
        : typeof effect.calcDamage === 'function'
            ? Math.max(0, Math.floor(effect.calcDamage(attacker))) + (commandContext.extraFixedDamage || 0)
            : 0;
    const rawDamage = calculatedDamage > 0 ? calculatedDamage : hpLoss;
    const commandShieldGains = rawDamage > 0 && !effect.isAreaAttack
        ? collectCommandShieldGains(gameState, beforeSnapshot)
        : [];
    if (commandShieldGains.length > 0) {
        hideCommandShieldGains(commandShieldGains);
    }
    let pendingAquaticEffect = null;
    const pendingConstructCoreEvents = [];

    if (rawDamage > 0 && target && !effect.isAreaAttack) {
        const damageResult = applyNormalDamage(gameState, {
            target,
            targetPrefix,
            targetIdx,
            attackerPrefix,
            attackerIdx,
            rawDamage,
            attacker,
            baseHp: initialTargetHp
        });
        const { shieldResult, breakdown } = damageResult;
        const adjustedDamage = damageResult.adjustedDamage;
        const mitigatedDamage = breakdown.mitigatedDamage;
        const increasedDamage = Math.max(0, adjustedDamage - rawDamage);

        // ダメージポップアップを表示（修正後のダメージ）
        if (shieldResult.absorbed > 0) {
            message = appendConstructCoreGainLog(message, recordConstructShieldAbsorption(gameState, targetPrefix, targetIdx, attackerPrefix, shieldResult.absorbed, {
                showPopup: false,
                events: pendingConstructCoreEvents,
                setInfo: target.activeSpeciesBonus
            }));
            pendingAquaticEffect = { shieldResult, breakdown };
        }
        if (shieldResult.hpDamage > 0) {
            const damagePresentation = addShieldDamageTag(
                buildPresentedDamagePopup(rawDamage, adjustedDamage, shieldResult.hpDamage, attacker, target, breakdown),
                shieldResult.absorbed
            );
            showPopupEffect(targetPrefix, targetIdx, damagePresentation.text, 'damage-detail', damagePresentation.color);
            flashStatusBadges(attackerPrefix, attackerIdx, getAttackerDamageModifierBadgeIds(attacker));
            flashStatusBadges(targetPrefix, targetIdx, getDamageModifierBadgeIds(rawDamage, adjustedDamage, target, breakdown));
            playHitEffect(targetPrefix, targetIdx, { impact: damagePresentation.impact });
        } else if (shieldResult.absorbed > 0) {
            showShieldDamagePopup(targetPrefix, targetIdx, shieldResult.absorbed, target);
        }

        if (adjustedDamage !== rawDamage) {
            const changeText = mitigatedDamage > 0
                ? `軽減${mitigatedDamage}`
                : `増加${increasedDamage}`;
            message += `\n※ ${target.name}へのダメージ補正: ${rawDamage} → ${adjustedDamage}（${changeText}）`;
        } else if (mitigatedDamage > 0) {
            message += `\n※ ${target.name}は防御効果で ${mitigatedDamage} ダメージを抑えた！`;
        }
        message = appendShieldLog(message, target, shieldResult);
        if (breakdown.evasionTriggered) {
            playEvasionEffect(targetPrefix, targetIdx, { showPopup: false });
            message += `\n※ ${target.name}は素早さを活かしてダメージを半分に受け流した！`;
            message += await applyBeastEvasionCounter(gameState, {
                defender: target,
                defenderPrefix: targetPrefix,
                defenderIdx: targetIdx,
                attacker,
                attackerPrefix,
                attackerIdx,
                breakdown,
                beforeSnapshot
            });
        }
        if (breakdown.guardTriggered) {
            playGuardEffect(targetPrefix, targetIdx, { showPopup: false });
            message += `\n※ ${target.name}はかばう構えでダメージを受け止めた！`;
        }
    }
    if (rawDamage > 0 && target && !effect.isAreaAttack) {
        updateAllHPBars(gameState, { skipHpPopup: true });
        await sleep(420);
        if (commandStatChanges.length > 0) {
            await playCommandStatChangeSequence(gameState, commandStatChanges);
        }
        if (commandShieldGains.length > 0) {
            restoreCommandShieldGains(commandShieldGains);
            updateAllHPBars(gameState);
            await sleep(680);
        }
        if (pendingConstructCoreEvents.length > 0) {
            await playConstructCoreGainSequence(gameState, pendingConstructCoreEvents);
        }
        if (pendingAquaticEffect) {
            message += await applyAquaticShieldHitEffects(gameState, target, attacker, targetPrefix, targetIdx, attackerPrefix, attackerIdx, pendingAquaticEffect.shieldResult, pendingAquaticEffect.breakdown);
        }
    }
    syncAllStatusEffects(gameState);
    message += await applyNatureSupportBudGain(gameState, beforeSnapshot, attackerPrefix);
    message += await applySlimeShare(gameState, beforeSnapshot, attackerPrefix, commandContext, attacker, attackerIdx);
    message += await applyNatureMagicBloomDamage(gameState, beforeSnapshot, attacker, target, attackerPrefix, attackerIdx, targetPrefix, targetIdx, commandContext);
    message += applyPostAttackRelicEffects(gameState, attacker, target, isDamageCommand, isEnemyTarget, !!effect.isAreaAttack);
    applyRelicAfterCommand(gameState, attacker, commandContext).forEach(event => {
        message += `\n※ ${event.relic.name}の効果が発動した！（${event.atkGain || event.intGain ? `ATK+${event.atkGain}/INT+${event.intGain}` : `累積${Number(event.amount || 0).toFixed(1)}`}）`;
    });
    if (consumedHidden) {
        message += `\n※ ${attacker.name}は攻撃して隠密が解除された！`;
    }

    recordActionStats(gameState, beforeSnapshot, attackerPrefix, attackerIdx, getActionStatOptions(attacker));
    notifySpeciesAllyDeaths(gameState, beforeSnapshot, alertLog);
    const undeadBonusEvents = applyAllUndeadLastStandBonuses(gameState);
    if (hasHpLossSinceSnapshot(gameState, beforeSnapshot)) {
        await playUndeadLastStandBonusEvents(gameState, undeadBonusEvents);
    }
    alertLog(message);

    const isReelUp = commandId.startsWith('cmd_up');
    const isReelDown = commandId.startsWith('cmd_down');
    const isMisc = commandId.startsWith('misc');
    const isSupportReelUp = commandId === 'misc_support_reel_up' || commandId === 'misc_support_reel_up2';
    const attackerReelDelta = Math.max(0, (attacker?.currentReel || 0) - beforeAttackerReel);
    const targetReelDelta = Math.max(0, (target?.currentReel || 0) - beforeTargetReel);

    updateAllHPBars(gameState, { skipHpPopup: rawDamage > 0 || hasHpLossSinceSnapshot(gameState, beforeSnapshot) });
    updateDeathStates(gameState);

    // リール操作系コマンドならコマンドUIを更新
    if (isReelUp || isReelDown) {
        const nextReelIdx = attacker.currentReel !== undefined ? attacker.currentReel : 0;
        const nextCmds = (attacker.commands && Array.isArray(attacker.commands[0])) ? attacker.commands[nextReelIdx] : attacker.commands;
        updateCommandsUI(attackerPrefix, attackerIdx, nextCmds, nextReelIdx, attacker);
        if (attackerReelDelta > 0) {
            playReelUpEffect(attackerPrefix, attackerIdx, attackerReelDelta);
        }
    }
    if (isSupportReelUp && target) {
        const nextReelIdx = target.currentReel !== undefined ? target.currentReel : 0;
        const nextCmds = (target.commands && Array.isArray(target.commands[0])) ? target.commands[nextReelIdx] : target.commands;
        updateCommandsUI(targetPrefix, targetIdx, nextCmds, nextReelIdx, target);
        if (targetReelDelta > 0) {
            playReelUpEffect(targetPrefix, targetIdx, targetReelDelta, '支援');
        }
    }

    await sleep(400);

    if (attacker.hp <= 0 && !attacker.isUndeadSoulFollowup && !attacker.pendingUndeadLastStand) alertLog(`${attacker.name}は力尽きた！`);
    if (target.hp <= 0 && !target.pendingUndeadLastStand) alertLog(`${target.name}は力尽きた！`);
    updateDeathStates(gameState);
    clearActiveCommandContext(attacker);
}
