// battle/setBonuses.js
import { getSpeciesPoints } from '../partySlots.js';
import { addStatBonus, getStatusStackCount, removeStatus } from '../commands/status.js';
import { addShield } from './shield.js';
import { applyFixedDamage } from './damageResolver.js';
import { recordSetActiveStatGranted, recordSetHealingDone, recordSetStatIncreased, recordShieldGranted } from './stats.js';
import { showSetPopupBatch, showSetValueEvents } from '../ui/effects.js';
import { buildSetStatValueEvent, formatSetStatChange } from './setStatValueEvents.js';
import { showSetDamagePopup } from './setEffectSequences.js';

export const NEGATIVE_STATUS_IDS = ['paralysis', 'poison', 'weak', 'weakened', 'taunt', 'hidden'];

function addPercentStatBonus(char, stat, percent) {
    if (!char || !percent) return 0;
    const baseKey = stat === 'atk' ? 'baseAtk' : stat === 'int' ? 'baseInt' : 'baseSpd';
    const base = Math.max(1, Number(char[baseKey] || char[stat] || 1));
    const amount = Math.max(1, Math.floor(base * percent));
    addStatBonus(char, stat, amount);
    return amount;
}

function setTrackedStatBonus(char, stat, key, nextAmount) {
    if (!char) return 0;
    const previous = Number(char[key] || 0);
    const next = Math.max(0, Math.floor(Number(nextAmount || 0)));
    const delta = next - previous;
    if (delta !== 0) {
        addStatBonus(char, stat, delta);
    }
    char[key] = next;
    return delta;
}

function getReelStage(char) {
    const maxStage = getMaxReelIndex(char) + 1;
    return Math.max(1, Math.min(maxStage, Number(char?.currentReel || 0) + 1));
}

export function syncDragonReelStatBonus(char) {
    const active = char?.activeSpeciesBonus || {};
    const percent = Number(active.reelAtkIntPerLevel || 0);
    const shouldApply = !!(char && char.hp > 0 && char.species === 'dragon' && percent > 0);
    const stage = shouldApply ? getReelStage(char) : 0;
    const atkBase = Math.max(1, Number(char?.baseAtk || char?.atk || 1));
    const intBase = Math.max(1, Number(char?.baseInt || char?.int || 1));
    const atkGain = stage > 0 ? Math.max(1, Math.floor(atkBase * stage * percent)) : 0;
    const intGain = stage > 0 ? Math.max(1, Math.floor(intBase * stage * percent)) : 0;
    const atkDelta = setTrackedStatBonus(char, 'atk', 'dragonReelAtkBonus', atkGain);
    const intDelta = setTrackedStatBonus(char, 'int', 'dragonReelIntBonus', intGain);
    char.dragonReelStage = stage;
    return { stage, percent, atkGain, intGain, atkDelta, intDelta };
}

export function countNegativeStatuses(char) {
    return NEGATIVE_STATUS_IDS.reduce((total, statusId) => total + getStatusStackCount(char, statusId), 0);
}

function getMaxReelIndex(char) {
    return Array.isArray(char?.commands?.[0]) ? char.commands.length - 1 : 0;
}

function getDoomState(gameState, side) {
    if (!gameState) return null;
    if (!gameState.demonDoomState) {
        gameState.demonDoomState = {
            p: { count: 0, missTransformed: false, awakened: false },
            e: { count: 0, missTransformed: false, awakened: false }
        };
    }
    if (!gameState.demonDoomState[side]) {
        gameState.demonDoomState[side] = { count: 0, missTransformed: false, awakened: false };
    }
    return gameState.demonDoomState[side];
}

function getPartyForSide(gameState, side) {
    return side === 'e' ? (gameState?.enemies || []) : (gameState?.players || []);
}

function hasDemonDoomBonus(party, key) {
    return (party || []).some(char => char?.activeSpeciesBonus?.[key]);
}

function hasDemonDoomMechanic(party) {
    return hasDemonDoomBonus(party, 'demonDoomAtkIntPerCount')
        || hasDemonDoomBonus(party, 'demonDoomStatThreshold')
        || hasDemonDoomBonus(party, 'demonAwakenCount')
        || hasDemonDoomBonus(party, 'demonMissTransformCount');
}

function hasUndeadBonus(party, key) {
    return (party || []).some(char => char?.activeSpeciesBonus?.[key]);
}

function getCharacterHpLimit(char) {
    const baseHp = Number(char?.baseMaxHp ?? 0);
    const setHpBonus = Number(char?.activeSpeciesBonus?.hpBonus || 0);
    const derivedFromBase = baseHp > 0 ? baseHp + setHpBonus : 0;
    return Math.max(1, Math.floor(derivedFromBase || Number(char?.maxHp ?? char?.hp ?? 1)));
}

function getUndeadState(gameState, side) {
    if (!gameState) return null;
    if (!gameState.undeadState) {
        gameState.undeadState = {
            p: { fixedMissingHp: 0 },
            e: { fixedMissingHp: 0 }
        };
    }
    if (!gameState.undeadState[side]) {
        gameState.undeadState[side] = { fixedMissingHp: 0 };
    }
    return gameState.undeadState[side];
}

function getHumanState(gameState, side) {
    if (!gameState) return null;
    if (!gameState.humanSetState) {
        gameState.humanSetState = {
            p: { points: 0, turnActions: 0, multiplierActive: false, multiplierAnnounced: false },
            e: { points: 0, turnActions: 0, multiplierActive: false, multiplierAnnounced: false }
        };
    }
    if (!gameState.humanSetState[side]) {
        gameState.humanSetState[side] = { points: 0, turnActions: 0, multiplierActive: false, multiplierAnnounced: false };
    }
    return gameState.humanSetState[side];
}

function ensureSideState(gameState, key, side, defaults = {}) {
    if (!gameState) return null;
    if (!gameState[key]) {
        gameState[key] = {
            p: { ...defaults },
            e: { ...defaults }
        };
    }
    if (!gameState[key][side]) {
        gameState[key][side] = { ...defaults };
    }
    return gameState[key][side];
}

function getSlimeMucusState(gameState, side) {
    return ensureSideState(gameState, 'slimeMucusState', side, { mucus: 0 });
}

function getNatureBudState(gameState, side) {
    return ensureSideState(gameState, 'natureBudState', side, { buds: 0 });
}

function getAquaticTideState(gameState, side) {
    return ensureSideState(gameState, 'aquaticTideState', side, { tide: 0 });
}

function getBeastHuntState(gameState, side) {
    return ensureSideState(gameState, 'beastHuntState', side, { stacks: 0, counterTurn: null });
}

export function addSlimeMucus(gameState, side, amount = 0) {
    const state = getSlimeMucusState(gameState, side);
    const gain = Math.max(0, Math.floor(Number(amount || 0)));
    if (!state || gain <= 0) return 0;
    state.mucus = Math.max(0, Number(state.mucus || 0) + gain);
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.slimeMucus = state.mucus;
    });
    return gain;
}

export function getSlimeMucus(gameState, side) {
    return Math.max(0, Math.floor(Number(getSlimeMucusState(gameState, side)?.mucus || 0)));
}

export function consumeSlimeMucus(gameState, side, amount = 0) {
    const state = getSlimeMucusState(gameState, side);
    const current = getSlimeMucus(gameState, side);
    const consumed = Math.min(current, Math.max(0, Math.floor(Number(amount || 0))));
    if (!state || consumed <= 0) return 0;
    state.mucus = Math.max(0, current - consumed);
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.slimeMucus = state.mucus;
    });
    return consumed;
}

export function addNatureBuds(gameState, side, amount = 0) {
    const state = getNatureBudState(gameState, side);
    const gain = Math.max(0, Math.floor(Number(amount || 0)));
    if (!state || gain <= 0) return 0;
    state.buds = Math.max(0, Number(state.buds || 0) + gain);
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.natureBuds = state.buds;
    });
    return gain;
}

export function consumeNatureBuds(gameState, side, amount = 0) {
    const state = getNatureBudState(gameState, side);
    const current = Math.max(0, Math.floor(Number(state?.buds || 0)));
    const consumed = Math.min(current, Math.max(0, Math.floor(Number(amount || 0))));
    if (!state || consumed <= 0) return 0;
    state.buds = Math.max(0, current - consumed);
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.natureBuds = state.buds;
    });
    return consumed;
}

export function addAquaticTide(gameState, side, amount = 0) {
    const state = getAquaticTideState(gameState, side);
    const gain = Math.max(0, Math.floor(Number(amount || 0)));
    if (!state || gain <= 0) return 0;
    state.tide = Math.max(0, Number(state.tide || 0) + gain);
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.aquaticTide = state.tide;
    });
    return gain;
}

export function addBeastHuntStack(gameState, side, amount = 1) {
    const state = getBeastHuntState(gameState, side);
    const gain = Math.max(0, Math.floor(Number(amount || 0)));
    if (!state || gain <= 0) return 0;
    state.stacks = Math.max(0, Number(state.stacks || 0) + gain);
    syncBeastHuntStacks(gameState, side);
    return gain;
}

function syncBeastHuntStacks(gameState, side) {
    const state = getBeastHuntState(gameState, side);
    const stacks = Math.max(0, Math.floor(Number(state?.stacks || 0)));
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.beastHuntStacks = stacks;
    });
}

function restoreDemonCommands(char) {
    if (!char?.demonOriginalCommands) return;
    char.commands = JSON.parse(JSON.stringify(char.demonOriginalCommands));
    delete char.demonOriginalCommands;
}

function replaceMissCommandsWithDemonWhisper(char) {
    if (!char || !Array.isArray(char.commands)) return false;
    if (!char.demonOriginalCommands) {
        char.demonOriginalCommands = JSON.parse(JSON.stringify(char.commands));
    }
    let replaced = false;
    const reels = Array.isArray(char.commands?.[0]) ? char.commands : [char.commands];
    reels.forEach(reel => {
        reel.forEach((commandId, index) => {
            if (commandId !== 'misc03') return;
            reel[index] = 'cmd_demon_whisper';
            replaced = true;
        });
    });
    return replaced;
}

export function applyDemonDoomStatBonuses(gameState, side) {
    const party = getPartyForSide(gameState, side);
    const state = getDoomState(gameState, side);
    if (!state || !hasDemonDoomMechanic(party)) return [];

    const perCount = Math.max(0, ...party.map(char => Number(char?.activeSpeciesBonus?.demonDoomAtkIntPerCount || 0)));
    const midThreshold = Math.min(...party
        .map(char => Number(char?.activeSpeciesBonus?.demonDoomMidStatThreshold || Infinity))
        .filter(Number.isFinite));
    const midPercent = Math.max(0, ...party.map(char => Number(char?.activeSpeciesBonus?.demonDoomMidAtkIntPercent || 0)));
    const threshold = Math.min(...party
        .map(char => Number(char?.activeSpeciesBonus?.demonDoomStatThreshold || Infinity))
        .filter(Number.isFinite));
    const thresholdPercent = Math.max(0, ...party.map(char => Number(char?.activeSpeciesBonus?.demonDoomAtkIntPercent || 0)));
    const effectiveCount = Math.max(0, Number(state.count || 0));
    const activeRate = Math.max(
        perCount,
        Number.isFinite(midThreshold) && effectiveCount >= midThreshold ? midPercent : 0,
        Number.isFinite(threshold) && effectiveCount >= threshold ? thresholdPercent : 0
    );
    const percent = Math.max(0, effectiveCount * activeRate);
    const targets = [];

    party.forEach((char, index) => {
        if (!char || char.hp <= 0) return;
        char.demonDoomCount = effectiveCount;
        const beforeAtk = Number(char.demonDoomAtkBonus || 0);
        const beforeInt = Number(char.demonDoomIntBonus || 0);
        if (percent <= 0) {
            setTrackedStatBonus(char, 'atk', 'demonDoomAtkBonus', 0);
            setTrackedStatBonus(char, 'int', 'demonDoomIntBonus', 0);
            return;
        }
        const atkGain = Math.max(1, Math.floor((char.baseAtk || char.atk || 1) * percent));
        const intGain = Math.max(1, Math.floor((char.baseInt || char.int || 1) * percent));
        setTrackedStatBonus(char, 'atk', 'demonDoomAtkBonus', atkGain);
        setTrackedStatBonus(char, 'int', 'demonDoomIntBonus', intGain);
        const atkDelta = atkGain - beforeAtk;
        const intDelta = intGain - beforeInt;
        if (atkDelta !== 0 || intDelta !== 0) {
            char.suppressNextStatPopup = true;
            targets.push({
                char,
                index,
                setInfo: char.activeSpeciesBonus,
                atkDelta,
                intDelta,
                percent,
                count: effectiveCount
            });
        }
    });
    return targets;
}

export function buildDemonDoomMilestoneEvents(gameState, side) {
    const party = getPartyForSide(gameState, side);
    const state = getDoomState(gameState, side);
    if (!state || !hasDemonDoomMechanic(party)) return [];
    const events = [];
    const lv3Threshold = Math.min(...party
        .map(char => Number(char?.activeSpeciesBonus?.demonMissTransformCount || Infinity))
        .filter(Number.isFinite));
    if (!state.missTransformed && Number.isFinite(lv3Threshold) && state.count >= lv3Threshold) {
        state.missTransformed = true;
        if (transformDemonMisses(gameState, side)) {
            events.push({ hook: 'demonMissTransform', side, count: state.count });
        }
    }

    const lv4Threshold = Math.min(...party
        .map(char => Number(char?.activeSpeciesBonus?.demonAwakenCount || Infinity))
        .filter(Number.isFinite));
    if (!state.awakened && Number.isFinite(lv4Threshold) && state.count >= lv4Threshold) {
        state.awakened = true;
        if (awakenDemonParty(gameState, side)) {
            events.push({ hook: 'demonAwaken', side, count: state.count });
        }
    }
    return events;
}

function transformDemonMisses(gameState, side) {
    const party = getPartyForSide(gameState, side);
    let changed = false;
    party.forEach(char => {
        if (replaceMissCommandsWithDemonWhisper(char)) {
            changed = true;
        }
    });
    return changed;
}

function awakenDemonParty(gameState, side) {
    const party = getPartyForSide(gameState, side);
    const commandPowerMultiplier = Math.max(1, ...party.map(char => Number(char?.activeSpeciesBonus?.demonAwakenCommandPowerMultiplier || 1)));
    let awakened = false;
    party.forEach(char => {
        if (!char) return;
        char.demonAwakened = true;
        char.demonCommandPowerMultiplier = Math.max(Number(char.demonCommandPowerMultiplier || 1), commandPowerMultiplier);
        if (Array.isArray(char.commands?.[0])) {
            char.currentReel = char.commands.length - 1;
            char.demonFinalReelLocked = true;
        }
        awakened = true;
    });
    return awakened;
}

export function advanceDemonDoomCount(gameState, side, amount = 1) {
    const party = getPartyForSide(gameState, side);
    if (!hasDemonDoomMechanic(party)) return [];

    const state = getDoomState(gameState, side);
    const before = Number(state.count || 0);
    state.count = Math.max(0, before + Math.max(0, Number(amount || 0)));
    return [];
}

export function applyUndeadLastStandBonuses(gameState, side) {
    const party = getPartyForSide(gameState, side);
    const state = getUndeadState(gameState, side);
    if (!state || !hasUndeadBonus(party, 'lowHpAtkIntMaxBonus')) return [];

    const activeTotals = { atk: 0, int: 0 };
    let statSourceIndex = -1;
    const events = [];

    party.forEach((char, index) => {
        if (!char) return;
        const beforeAtk = Number(char.undeadLastStandAtkBonus || 0);
        const beforeInt = Number(char.undeadLastStandIntBonus || 0);
        const maxBonus = Number(char.activeSpeciesBonus?.lowHpAtkIntMaxBonus || 0);
        let nextAtk = 0;
        let nextInt = 0;
        let percent = 0;
        if (char.hp <= 0 || !maxBonus) {
            percent = 0;
        } else {
            const hpLimit = getCharacterHpLimit(char);
            const missingRatio = Math.min(1, Math.max(0, (hpLimit - Math.max(0, Number(char.hp || 0))) / hpLimit));
            percent = Math.min(maxBonus, missingRatio * maxBonus);
            if (percent > 0) {
                nextAtk = Math.max(1, Math.floor((char.baseAtk || char.atk || 1) * percent));
                nextInt = Math.max(1, Math.floor((char.baseInt || char.int || 1) * percent));
            }
        }
        setTrackedStatBonus(char, 'atk', 'undeadLastStandAtkBonus', nextAtk);
        setTrackedStatBonus(char, 'int', 'undeadLastStandIntBonus', nextInt);
        char.undeadLastStandPercent = percent;

        const atkDelta = nextAtk - beforeAtk;
        const intDelta = nextInt - beforeInt;
        if (atkDelta !== 0 || intDelta !== 0) {
            char.suppressNextStatPopup = true;
            events.push({
                prefix: side,
                index,
                setInfo: char.activeSpeciesBonus,
                effectName: '死線の執念',
                resultText: formatSetStatChange({ atk: atkDelta, int: intDelta }, { signed: true }),
                type: atkDelta + intDelta >= 0 ? 'buff' : 'debuff',
                color: atkDelta + intDelta >= 0 ? '#7c2d12' : '#94a3b8',
                atkDelta,
                intDelta,
                percent
            });
        }

        activeTotals.atk += nextAtk;
        activeTotals.int += nextInt;
        if ((nextAtk > 0 || nextInt > 0) && statSourceIndex < 0) statSourceIndex = index;
    });
    if (statSourceIndex >= 0) {
        recordSetActiveStatGranted(gameState, side, statSourceIndex, activeTotals, {
            setInfo: party[statSourceIndex]?.activeSpeciesBonus
        });
    }
    return events;
}

export function applyAllUndeadLastStandBonuses(gameState) {
    return [
        ...applyUndeadLastStandBonuses(gameState, 'p'),
        ...applyUndeadLastStandBonuses(gameState, 'e')
    ];
}

function getConstructRecycleState(gameState) {
    if (!gameState) return null;
    if (!gameState.constructRecycleCore) {
        gameState.constructRecycleCore = { p: 0, e: 0 };
    }
    return gameState.constructRecycleCore;
}

export function getConstructRecycleCore(gameState, side) {
    return Math.max(0, Math.floor(Number(getConstructRecycleState(gameState)?.[side] || 0)));
}

export function addConstructRecycleCore(gameState, side, absorbedShield = 0) {
    const party = getPartyForSide(gameState, side);
    const factor = Math.max(0, ...party.map(char => Number(char?.activeSpeciesBonus?.constructRecycleCoreFactor || 0)));
    const gain = Math.max(0, Math.floor(Number(absorbedShield || 0) * factor));
    if (gain <= 0) return 0;
    const state = getConstructRecycleState(gameState);
    state[side] = getConstructRecycleCore(gameState, side) + gain;
    party.forEach(char => {
        if (char) char.constructRecycleCore = state[side];
    });
    return gain;
}

export function consumeConstructRecycleCore(gameState, side, ratio = 0) {
    const state = getConstructRecycleState(gameState);
    const current = getConstructRecycleCore(gameState, side);
    const consumed = Math.max(0, Math.floor(current * Math.max(0, Number(ratio || 0))));
    if (consumed <= 0) return 0;
    state[side] = Math.max(0, current - consumed);
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.constructRecycleCore = state[side];
    });
    return consumed;
}

export function consumeConstructRecycleCoreAmount(gameState, side, amount = 0) {
    const state = getConstructRecycleState(gameState);
    const current = getConstructRecycleCore(gameState, side);
    const consumed = Math.min(current, Math.max(0, Math.floor(Number(amount || 0))));
    if (consumed <= 0) return 0;
    state[side] = Math.max(0, current - consumed);
    getPartyForSide(gameState, side).forEach(char => {
        if (char) char.constructRecycleCore = state[side];
    });
    return consumed;
}

export const SPECIES_BONUSES = {
    slime: {
        label: 'スライム族',
        tiers: {
            1: { slimeMucusGainFactor: 1.35, slimeMucusHealFactor: 0.45 },
            2: { slimeMucusGainFactor: 1.35, slimeMucusHealFactor: 0.45, slimeSupportExtraAction: true, slimeMucusExtraActionThreshold: 50, slimeMucusExtraActionCost: 35 },
            3: { slimeMucusGainFactor: 1.35, slimeMucusHealFactor: 0.45, slimeSupportExtraAction: true, slimeMucusExtraActionThreshold: 50, slimeMucusExtraActionCost: 35, slimeMucusDamageFactor: 1.5 }
        },
        description: '支援後：粘液を蓄積。ターン終了：T1は最低HP味方を回復、T2は粘液が多い時に支援対象へ追加行動+1、T3は残った粘液で単体追撃。'
    },
    human: {
        label: '人間族',
        tiers: {
            1: { humanPointOnAction: 1, humanPointStatPercent: 0.035 },
            2: { humanPointOnAction: 1, humanPointStatPercent: 0.045, humanLinkActionThreshold: 2, humanLinkReelUpTargets: 1 },
            3: { humanPointOnAction: 1, humanPointStatPercent: 0.055, humanLinkActionThreshold: 2, humanLinkReelUpTargets: 1, humanFinalPointStatMultiplier: 2.35 }
        },
        description: '行動後：人間族の行動で士気+1。ターン終了：T1は士気で全体ATK/INT上昇、T2は2回以上行動で最低リール味方+1、T3は全員最終リール時に士気効率上昇。'
    },
    beast: {
        label: '獣族',
        tiers: {
            1: { fastestTurnAtkBonus: 0.12, beastTurnStartTeamSpdPercent: 0.12 },
            2: { fastestTurnAtkBonus: 0.15, beastTurnStartTeamSpdPercent: 0.15, beastEvasionChanceBonus: 0.22, beastHuntStackBonus: 0.022 },
            3: { fastestTurnAtkBonus: 0.16, beastTurnStartTeamSpdPercent: 0.16, beastEvasionChanceBonus: 0.25, beastHuntStackBonus: 0.022, beastEvasionCounterFactor: 0.66 }
        },
        description: 'ターン開始：群れの号令で最速が獣族なら全体ATK上昇、獣族がいれば全体SPD上昇。蓄積した狩猟は群れの号令のATK/SPD上昇に加算。被攻撃時：T2は回避率上昇と狩猟を上限なしで蓄積、T3はターン中最初の回避で単体反撃。'
    },
    nature: {
        label: '自然族',
        tiers: {
            1: { turnStartCleanse: true, natureBudFromSupport: true, natureBudHealPercent: 0.08, natureBudShieldPercent: 0.08 },
            2: { turnStartCleanse: true, natureBudFromSupport: true, natureBudHealPercent: 0.09, natureBudShieldPercent: 0.09, natureBudIntBonus: 22 },
            3: { turnStartCleanse: true, natureBudFromSupport: true, natureBudHealPercent: 0.1, natureBudShieldPercent: 0.1, natureBudIntBonus: 30, natureMagicBloomFixedDamage: true, natureMagicBloomDamageFactor: 0.94 }
        },
        description: '支援/浄化時：芽吹きを蓄積。ターン終了：T1は芽吹き1消費で最低HP味方を回復+シールド、T2は消費時INT上昇追加、T3は残った芽吹きを自然族の魔法攻撃で固定追撃へ変換。'
    },
    aquatic: {
        label: '水棲族',
        tiers: {
            1: { aquaticShieldHitHealPercent: 0.14 },
            2: { aquaticShieldHitHealPercent: 0.18, aquaticShieldHitDebuff: true },
            3: { aquaticShieldHitHealPercent: 0.26, aquaticShieldHitDebuff: true, shieldedDebuffDamageCut: 0.31, shieldedDebuffDamageCutMax: 0.76, aquaticTideReflectFactor: 2.18 }
        },
        description: '味方シールド被弾時：T1は全体回復、T2は攻撃者へ脱力/毒、T3は攻撃者のデバフ数で軽減し潮流を蓄積。ターン終了：潮流で単体反射。'
    },
    undead: {
        label: '不死族',
        tiers: {
            1: { lowHpAtkIntMaxBonus: 0.8 },
            2: { lowHpAtkIntMaxBonus: 1.6, undeadLastStand: true },
            3: { lowHpAtkIntMaxBonus: 1.6, undeadLastStand: true, reviveToMaxReel: true }
        },
        description: '常時：T1は減少HP率に応じてATK/INT上昇。致死時：T2は敵行動後にHP1復帰、T3は復帰後の次回行動が最終リール化。'
    },
    demon: {
        label: '魔族',
        tiers: {
            1: { demonDoomAtkIntPerCount: 0.02 },
            2: { demonDoomAtkIntPerCount: 0.04, demonDoomStatThreshold: 10, demonDoomAtkIntPercent: 0.1, demonMissTransformCount: 10 },
            3: { demonDoomAtkIntPerCount: 0.04, demonDoomMidStatThreshold: 5, demonDoomMidAtkIntPercent: 0.05, demonDoomStatThreshold: 10, demonDoomAtkIntPercent: 0.1, demonMissTransformCount: 6, demonAwakenCount: 10, demonAwakenCommandPowerMultiplier: 1.22 }
        },
        description: '味方行動後：破滅カウント+1。T1/T2/T3でカウントに応じたATK/INT上昇が強化され、T2以降はミス変化、T3は魔神覚醒でコマンド威力上昇。'
    },
    dragon: {
        label: '竜族',
        tiers: {
            1: { reelAtkIntPerLevel: 0.18 },
            2: { reelAtkIntPerLevel: 0.18, reelUpBonusLevels: 1 },
            3: { reelAtkIntPerLevel: 0.15, reelUpBonusLevels: 1, finalReelEnemyMaxHpFixedDamage: 0.17 }
        },
        description: 'リール中：T1は現在リール段数でATK/INT上昇。リールアップ時：T2は追加リール上昇。最終リール到達時：T3は敵全体へ竜の終撃。'
    },
    construct: {
        label: '無機族',
        tiers: {
            1: { constructRecycleCoreFactor: 0.55, constructEndTurnSingleShieldFactor: 0.5 },
            2: { constructRecycleCoreFactor: 0.75, constructEndTurnTeamShieldFactor: 0.2 },
            3: { constructRecycleCoreFactor: 1.05, constructEndTurnTeamShieldFactor: 0.2, constructRecycleCoreEndTurnDamage: true, constructRecycleCoreEndTurnDamageFactor: 1.55, constructRecycleCoreEndTurnConsumePercent: 0.5 }
        },
        description: 'シールド破壊時：廃材を蓄積。ターン終了：T1は単体修復、T2は全体装甲、T3は装甲後に残った廃材で単体廃材放出。'
    }
};

export function describeSpeciesTier(tierBonus = {}) {
    const parts = [];
    const percent = value => `${Math.round(Number(value || 0) * 100)}%`;
    if (tierBonus.hpBonus) parts.push(`最大HP+${tierBonus.hpBonus}`);
    if (tierBonus.atkBonus) parts.push(`ATK+${tierBonus.atkBonus}`);
    if (tierBonus.intBonus) parts.push(`INT+${tierBonus.intBonus}`);
    if (tierBonus.spdBonus) parts.push(`SPD+${tierBonus.spdBonus}`);
    if (tierBonus.slimeMucusGainFactor) parts.push(`【粘液】支援後、支援量×${percent(tierBonus.slimeMucusGainFactor)}を蓄積`);
    if (tierBonus.slimeMucusHealFactor) parts.push(`【粘液再生】ターン終了時、粘液×${percent(tierBonus.slimeMucusHealFactor)}で最低HP味方を回復`);
    if (tierBonus.slimeSupportExtraAction) parts.push(`【分裂再行動】粘液${tierBonus.slimeMucusExtraActionThreshold}以上で支援対象ACT+1、粘液${tierBonus.slimeMucusExtraActionCost}消費`);
    if (tierBonus.slimeMucusDamageFactor) parts.push(`【分裂追撃】ターン終了時、残り粘液×${percent(tierBonus.slimeMucusDamageFactor)}を単体固定ダメージ`);
    if (tierBonus.humanPointOnAction) parts.push(`【士気】人間族の行動ごと士気+${tierBonus.humanPointOnAction}`);
    if (tierBonus.humanPointStatPercent) parts.push(`【士気高揚】ターン終了時、士気×${percent(tierBonus.humanPointStatPercent)}で味方全体ATK/INT上昇`);
    if (tierBonus.humanLinkActionThreshold) parts.push(`【連携】同一ターン${tierBonus.humanLinkActionThreshold}回以上行動で最低リール味方${tierBonus.humanLinkReelUpTargets || 1}体+1`);
    if (tierBonus.humanFinalPointStatMultiplier) parts.push(`【士気解放】全員最終リール時、士気による能力上昇${tierBonus.humanFinalPointStatMultiplier}倍`);
    if (tierBonus.fastestTurnAtkBonus || tierBonus.beastTurnStartTeamSpdPercent) {
        const effects = [
            tierBonus.fastestTurnAtkBonus ? `最速が獣族なら味方全体ATK+${percent(tierBonus.fastestTurnAtkBonus)}` : '',
            tierBonus.beastTurnStartTeamSpdPercent ? `獣族がいれば味方全体SPD+${percent(tierBonus.beastTurnStartTeamSpdPercent)}` : ''
        ].filter(Boolean).join(' / ');
        const huntText = tierBonus.beastHuntStackBonus
            ? ` / 狩猟1ごとにATK/SPD上昇+${percent(tierBonus.beastHuntStackBonus)}を上乗せ`
            : '';
        parts.push(`【群れの号令】ターン開始時、${effects}${huntText}`);
    }
    if (tierBonus.beastEvasionChanceBonus) parts.push(`【野生回避】回避率+${percent(tierBonus.beastEvasionChanceBonus)}`);
    if (tierBonus.beastHuntStackBonus) parts.push(`【狩猟】回避時に上限なしで蓄積、群れの号令のATK/SPD上昇+${percent(tierBonus.beastHuntStackBonus)}`);
    if (tierBonus.beastEvasionCounterFactor) parts.push(`【反射神経】ターン中初回回避時、攻撃者へATK×${percent(tierBonus.beastEvasionCounterFactor)}固定反撃`);
    if (tierBonus.turnStartCleanse) parts.push('【浄化】ターン開始時に状態異常を持つ味方の状態異常を全解除');
    if (tierBonus.natureBudFromSupport) parts.push('【芽吹き】支援/浄化時に芽吹きを蓄積');
    if (tierBonus.natureBudHealPercent) parts.push(`【芽吹き再生】ターン終了時、芽吹き1消費で最低HP味方を最大HP${percent(tierBonus.natureBudHealPercent)}回復`);
    if (tierBonus.natureBudShieldPercent) parts.push(`【芽吹き守護】芽吹き消費時、最大HP${percent(tierBonus.natureBudShieldPercent)}シールド`);
    if (tierBonus.natureBudIntBonus) parts.push(`【芽吹き成長】芽吹き消費時、INT+${tierBonus.natureBudIntBonus}`);
    if (tierBonus.natureMagicBloomFixedDamage) parts.push(`【魔法開花】自然族の魔法攻撃時、芽吹き×${percent(tierBonus.natureMagicBloomDamageFactor)}を固定追撃`);
    if (tierBonus.aquaticShieldHitHealPercent) parts.push(`【返り血】味方シールド被弾時、味方全体を最大HP${percent(tierBonus.aquaticShieldHitHealPercent)}回復`);
    if (tierBonus.aquaticShieldHitDebuff) parts.push('【冷水付着】味方シールド被弾時、攻撃者へ脱力/毒');
    if (tierBonus.shieldedDebuffDamageCut) parts.push(`【冷水防壁】シールド所持中、攻撃者デバフ数×${percent(tierBonus.shieldedDebuffDamageCut)}軽減（最大${percent(tierBonus.shieldedDebuffDamageCutMax)}）`);
    if (tierBonus.aquaticTideReflectFactor) parts.push(`【潮流反射】ターン終了時、蓄積潮流×${percent(tierBonus.aquaticTideReflectFactor)}を単体固定ダメージ`);
    if (tierBonus.lowHpAtkIntMaxBonus) parts.push(`【死者の執念】各キャラの減少HP率に応じてATK/INT最大+${percent(tierBonus.lowHpAtkIntMaxBonus)}`);
    if (tierBonus.undeadLastStand) parts.push('【不屈】HP2以上なら致死ダメージ後、敵行動完了時にHP1復帰');
    if (tierBonus.reviveToMaxReel) parts.push('【執念行動】HP1復帰後、次回行動が最終リール化');
    if (tierBonus.demonDoomAtkIntPerCount) parts.push(`【破滅カウント】味方行動ごと破滅+1、ATK/INT+${percent(tierBonus.demonDoomAtkIntPerCount)}`);
    if (tierBonus.demonDoomMidStatThreshold) parts.push(`【破滅高揚】破滅${tierBonus.demonDoomMidStatThreshold}以降、ATK/INT+${percent(tierBonus.demonDoomMidAtkIntPercent)}`);
    if (tierBonus.demonDoomStatThreshold) parts.push(`【破滅高揚】破滅${tierBonus.demonDoomStatThreshold}以降、ATK/INT+${percent(tierBonus.demonDoomAtkIntPercent)}`);
    if (tierBonus.demonMissTransformCount) parts.push(`破滅カウント${tierBonus.demonMissTransformCount}でミスが魔王の囁きに変化`);
    if (tierBonus.demonAwakenCount) parts.push(`【魔神覚醒】破滅${tierBonus.demonAwakenCount}でコマンド威力×${tierBonus.demonAwakenCommandPowerMultiplier}`);
    if (tierBonus.reelAtkIntPerLevel) parts.push(`【竜脈】現在リール段数×基礎ATK/INT${percent(tierBonus.reelAtkIntPerLevel)}を付与`);
    if (tierBonus.reelUpBonusLevels) parts.push(`リールアップ時さらに${tierBonus.reelUpBonusLevels}段階上昇`);
    if (tierBonus.finalReelEnemyMaxHpFixedDamage) parts.push(`【竜の終撃】最終リール初到達時、敵全体へ最大HP${percent(tierBonus.finalReelEnemyMaxHpFixedDamage)}固定ダメージ`);
    if (tierBonus.constructRecycleCoreFactor) parts.push(`【廃材】味方シールド破壊量×${percent(tierBonus.constructRecycleCoreFactor)}を蓄積`);
    if (tierBonus.constructEndTurnSingleShieldFactor) parts.push(`【廃材修復】ターン終了時、廃材×${percent(tierBonus.constructEndTurnSingleShieldFactor)}を単体シールド化`);
    if (tierBonus.constructEndTurnTeamShieldFactor) parts.push(`【廃材装甲】ターン終了時、廃材×${percent(tierBonus.constructEndTurnTeamShieldFactor)}を全体シールド化`);
    if (tierBonus.constructRecycleCoreEndTurnDamage) parts.push(`【廃材放出】ターン終了時、残り廃材×${percent(tierBonus.constructRecycleCoreEndTurnDamageFactor)}を単体固定ダメージ、廃材${percent(tierBonus.constructRecycleCoreEndTurnConsumePercent)}消費`);
    return parts.join(' / ') || '効果なし';
}

export function describeSpeciesTierUnlock(speciesBonus, tier) {
    const tiers = speciesBonus?.tiers || {};
    const current = tiers?.[tier] || tiers?.[String(tier)];
    if (!current) return '効果なし';

    const previousTier = Math.max(
        0,
        ...Object.keys(tiers)
            .map(Number)
            .filter(level => level < Number(tier))
    );
    const previous = previousTier ? tiers[previousTier] : {};
    const unlock = {};

    Object.entries(current).forEach(([key, value]) => {
        if (key === 'tier') return;
        if (typeof value === 'number') {
            if (value !== 0 && value !== (previous[key] || 0)) unlock[key] = value;
            return;
        }
        if (typeof value === 'boolean') {
            if (value && !previous[key]) unlock[key] = value;
        }
    });

    return describeSpeciesTier(unlock).replace('効果なし', '前TIER効果を継続');
}

export function getSpeciesTierBonus(bonus, slots) {
    const tiers = bonus?.tiers || {};
    const tier = Math.max(0, ...Object.keys(tiers).map(Number).filter(level => level + 1 <= slots));
    if (!tier) return null;
    return { tier, ...tiers[tier] };
}

function resetSpeciesBonuses(char) {
    if (!char) return;
    restoreDemonCommands(char);
    if (typeof char.baseMaxHp !== 'number') char.baseMaxHp = char.maxHp;
    char.maxHp = char.baseMaxHp;
    char.hp = Math.min(char.hp, char.maxHp);

    const activeBonus = char.activeSpeciesBonus || {};
    ['atk', 'int', 'spd'].forEach(stat => {
        const amount = activeBonus[`${stat}Bonus`] || 0;
        if (!amount) return;
        const baseKey = stat === 'atk' ? 'baseAtk' : stat === 'int' ? 'baseInt' : 'baseSpd';
        char[stat] = Math.max(1, char[stat] - amount);
        if (typeof char[baseKey] === 'number') {
            char[baseKey] = Math.max(1, char[baseKey] - amount);
        }
    });
    if (char.statBonuses) {
        ['atk', 'int', 'spd'].forEach(stat => {
            if (typeof char.statBonuses[stat] !== 'number') char.statBonuses[stat] = 0;
        });
    }
    char.activeSpeciesBonus = null;
    char.activeSpeciesBonuses = [];
    setTrackedStatBonus(char, 'atk', 'humanPointAtkBonus', 0);
    setTrackedStatBonus(char, 'int', 'humanPointIntBonus', 0);
    setTrackedStatBonus(char, 'atk', 'demonDoomAtkBonus', 0);
    setTrackedStatBonus(char, 'int', 'demonDoomIntBonus', 0);
    setTrackedStatBonus(char, 'atk', 'dragonReelAtkBonus', 0);
    setTrackedStatBonus(char, 'int', 'dragonReelIntBonus', 0);
    char.dragonReelStage = 0;
    char.demonAwakened = false;
    char.demonCommandPowerMultiplier = 1;
    char.demonFinalReelLocked = false;
    setTrackedStatBonus(char, 'atk', 'undeadLastStandAtkBonus', 0);
    setTrackedStatBonus(char, 'int', 'undeadLastStandIntBonus', 0);
    char.undeadLastStandPercent = 0;
    char.undeadFinalReelLocked = false;
    delete char.pendingUndeadLastStand;
    char.pendingUndeadReviveAction = false;
    char.undeadDeathFixedRegistered = false;
}

export function countSpeciesPoints(party) {
    return (party || []).reduce((counts, char) => {
        if (!char?.species || char.species === 'none') return counts;
        counts[char.species] = (counts[char.species] || 0) + getSpeciesPoints(char);
        return counts;
    }, {});
}

function applyBonusToParty(party, sideLabel, options = {}) {
    const messages = [];
    (party || []).forEach(resetSpeciesBonuses);

    const speciesCounts = countSpeciesPoints(party);
    Object.entries(speciesCounts).forEach(([species, points]) => {
        const bonus = SPECIES_BONUSES[species];
        const tierBonus = getSpeciesTierBonus(bonus, points);
        if (!bonus || !tierBonus) return;

        (party || []).forEach(char => {
                char.maxHp += tierBonus.hpBonus || 0;
                if (options.healToFull) {
                    char.hp = char.maxHp;
                } else {
                    char.hp = Math.min(char.maxHp, char.hp + (tierBonus.hpBonus || 0));
                }
                if (tierBonus.intBonus) {
                    char.int += tierBonus.intBonus;
                    if (typeof char.baseInt === 'number') {
                        char.baseInt += tierBonus.intBonus;
                    }
                }
                if (tierBonus.atkBonus) {
                    char.atk += tierBonus.atkBonus;
                    if (typeof char.baseAtk === 'number') {
                        char.baseAtk += tierBonus.atkBonus;
                    }
                }
                if (tierBonus.spdBonus) {
                    char.spd += tierBonus.spdBonus;
                    if (typeof char.baseSpd === 'number') {
                        char.baseSpd += tierBonus.spdBonus;
                    }
                }
                const activeBonus = {
                    species,
                    name: `${bonus.label} TIER${tierBonus.tier}`,
                    tier: tierBonus.tier,
                    ...tierBonus,
                    hpBonus: tierBonus.hpBonus || 0,
                    atkBonus: tierBonus.atkBonus || 0,
                    intBonus: tierBonus.intBonus || 0,
                    spdBonus: tierBonus.spdBonus || 0,
                    slimeSupportExtraAction: !!tierBonus.slimeSupportExtraAction,
                    slimeMucusGainFactor: tierBonus.slimeMucusGainFactor || 0,
                    slimeMucusHealFactor: tierBonus.slimeMucusHealFactor || 0,
                    slimeMucusExtraActionThreshold: tierBonus.slimeMucusExtraActionThreshold || 0,
                    slimeMucusExtraActionCost: tierBonus.slimeMucusExtraActionCost || 0,
                    slimeMucusDamageFactor: tierBonus.slimeMucusDamageFactor || 0,
                    constructRecycleCoreFactor: tierBonus.constructRecycleCoreFactor || 0,
                    constructRecycleCoreEndTurnDamage: !!tierBonus.constructRecycleCoreEndTurnDamage,
                    constructRecycleCoreEndTurnDamageFactor: tierBonus.constructRecycleCoreEndTurnDamageFactor || 0,
                    constructRecycleCoreEndTurnConsumePercent: tierBonus.constructRecycleCoreEndTurnConsumePercent || 0,
                    constructEndTurnSingleShieldFactor: tierBonus.constructEndTurnSingleShieldFactor || 0,
                    constructEndTurnTeamShieldFactor: tierBonus.constructEndTurnTeamShieldFactor || 0,
                    undeadLastStand: !!tierBonus.undeadLastStand,
                    reviveToMaxReel: !!tierBonus.reviveToMaxReel,
                    points,
                    humanPointOnAction: tierBonus.humanPointOnAction || 0,
                    humanPointStatPercent: tierBonus.humanPointStatPercent || 0,
                    humanFinalPointStatMultiplier: tierBonus.humanFinalPointStatMultiplier || 0,
                    humanLinkActionThreshold: tierBonus.humanLinkActionThreshold || 0,
                    humanLinkReelUpTargets: tierBonus.humanLinkReelUpTargets || 0,
                    fastestTurnAtkBonus: tierBonus.fastestTurnAtkBonus || 0,
                    beastTurnStartTeamSpdPercent: tierBonus.beastTurnStartTeamSpdPercent || 0,
                    beastEvasionChanceBonus: tierBonus.beastEvasionChanceBonus || 0,
                    beastEvasionCounterFactor: tierBonus.beastEvasionCounterFactor || 0,
                    beastHuntStackBonus: tierBonus.beastHuntStackBonus || 0,
                    turnStartCleanse: !!tierBonus.turnStartCleanse,
                    natureBudFromSupport: !!tierBonus.natureBudFromSupport,
                    natureBudHealPercent: tierBonus.natureBudHealPercent || 0,
                    natureBudShieldPercent: tierBonus.natureBudShieldPercent || 0,
                    natureBudIntBonus: tierBonus.natureBudIntBonus || 0,
                    natureMagicBloomFixedDamage: !!tierBonus.natureMagicBloomFixedDamage,
                    natureMagicBloomDamageFactor: tierBonus.natureMagicBloomDamageFactor || 0,
                    aquaticShieldHitHealPercent: tierBonus.aquaticShieldHitHealPercent || 0,
                    aquaticShieldHitDebuff: !!tierBonus.aquaticShieldHitDebuff,
                    shieldedDebuffDamageCut: tierBonus.shieldedDebuffDamageCut || 0,
                    shieldedDebuffDamageCutMax: tierBonus.shieldedDebuffDamageCutMax || 0,
                    aquaticTideReflectFactor: tierBonus.aquaticTideReflectFactor || 0,
                    lowHpAtkIntMaxBonus: tierBonus.lowHpAtkIntMaxBonus || 0,
                    demonDoomAtkIntPerCount: tierBonus.demonDoomAtkIntPerCount || 0,
                    demonDoomMidStatThreshold: tierBonus.demonDoomMidStatThreshold || 0,
                    demonDoomMidAtkIntPercent: tierBonus.demonDoomMidAtkIntPercent || 0,
                    demonDoomStatThreshold: tierBonus.demonDoomStatThreshold || 0,
                    demonDoomAtkIntPercent: tierBonus.demonDoomAtkIntPercent || 0,
                    demonMissTransformCount: tierBonus.demonMissTransformCount || 0,
                    demonAwakenCount: tierBonus.demonAwakenCount || 0,
                    demonAwakenCommandPowerMultiplier: tierBonus.demonAwakenCommandPowerMultiplier || 0,
                    reelAtkIntPerLevel: tierBonus.reelAtkIntPerLevel || 0,
                    reelUpBonusLevels: tierBonus.reelUpBonusLevels || 0,
                    finalReelEnemyMaxHpFixedDamage: tierBonus.finalReelEnemyMaxHpFixedDamage || 0,
                    description: `${bonus.label} TIER${tierBonus.tier}: ${describeSpeciesTier(tierBonus)}`
                };
                char.activeSpeciesBonuses = [...(char.activeSpeciesBonuses || []), activeBonus];
                char.activeSpeciesBonus = combineActiveBonuses(char.activeSpeciesBonuses);
                syncDragonReelStatBonus(char);
            });

        messages.push(`${sideLabel}: ${bonus.label} TIER${tierBonus.tier}（${points}pt）発動！ ${describeSpeciesTier(tierBonus)}`);
    });

    if (options.healToFull) {
        (party || []).forEach(char => {
            if (char && typeof char.maxHp === 'number') {
                char.hp = char.maxHp;
            }
        });
    }

    return messages;
}

export function buildActiveSpeciesSetBonuses(party = []) {
    const speciesCounts = countSpeciesPoints(party);
    return Object.entries(speciesCounts).flatMap(([species, points]) => {
        const bonus = SPECIES_BONUSES[species];
        const tierBonus = getSpeciesTierBonus(bonus, points);
        if (!bonus || !tierBonus) return [];
        return [{
            species,
            tier: tierBonus.tier,
            slots: points,
            points,
            label: bonus.label,
            name: `${bonus.label} TIER${tierBonus.tier}`
        }];
    });
}

export function buildSpeciesSetVisualEvents(gameState) {
    if (!gameState) return [];
    const sides = [
        { prefix: 'p', party: gameState.players || [] },
        { prefix: 'e', party: gameState.enemies || [] }
    ];
    const events = [];

    sides.forEach(({ prefix, party }) => {
        const grouped = new Map();
        party.forEach((char, index) => {
            (char.activeSpeciesBonuses || []).forEach(bonus => {
                if (!bonus?.species) return;
                const key = `${prefix}:${bonus.species}:${bonus.tier}`;
                const existing = grouped.get(key) || {
                    prefix,
                    species: bonus.species,
                    name: bonus.name,
                    description: bonus.description,
                    targets: []
                };
                existing.targets.push({ index, char });
                grouped.set(key, existing);
            });
        });
        events.push(...grouped.values());
    });

    return events;
}

function combineActiveBonuses(activeBonuses) {
    return (activeBonuses || []).reduce((combined, bonus) => ({
        species: bonus.species,
        name: combined.name ? `${combined.name}+${bonus.name}` : bonus.name,
        tier: Math.max(combined.tier || 0, bonus.tier || 0),
        hpBonus: combined.hpBonus + (bonus.hpBonus || 0),
        atkBonus: combined.atkBonus + (bonus.atkBonus || 0),
        intBonus: combined.intBonus + (bonus.intBonus || 0),
        spdBonus: combined.spdBonus + (bonus.spdBonus || 0),
        slimeSupportExtraAction: combined.slimeSupportExtraAction || !!bonus.slimeSupportExtraAction,
        slimeMucusGainFactor: Math.max(combined.slimeMucusGainFactor, bonus.slimeMucusGainFactor || 0),
        slimeMucusHealFactor: Math.max(combined.slimeMucusHealFactor, bonus.slimeMucusHealFactor || 0),
        slimeMucusExtraActionThreshold: Math.max(combined.slimeMucusExtraActionThreshold, bonus.slimeMucusExtraActionThreshold || 0),
        slimeMucusExtraActionCost: Math.max(combined.slimeMucusExtraActionCost, bonus.slimeMucusExtraActionCost || 0),
        slimeMucusDamageFactor: Math.max(combined.slimeMucusDamageFactor, bonus.slimeMucusDamageFactor || 0),
        constructRecycleCoreFactor: Math.max(combined.constructRecycleCoreFactor, bonus.constructRecycleCoreFactor || 0),
        constructRecycleCoreEndTurnDamage: combined.constructRecycleCoreEndTurnDamage || !!bonus.constructRecycleCoreEndTurnDamage,
        constructRecycleCoreEndTurnDamageFactor: Math.max(combined.constructRecycleCoreEndTurnDamageFactor, bonus.constructRecycleCoreEndTurnDamageFactor || 0),
        constructRecycleCoreEndTurnConsumePercent: Math.max(combined.constructRecycleCoreEndTurnConsumePercent, bonus.constructRecycleCoreEndTurnConsumePercent || 0),
        constructEndTurnSingleShieldFactor: Math.max(combined.constructEndTurnSingleShieldFactor, bonus.constructEndTurnSingleShieldFactor || 0),
        constructEndTurnTeamShieldFactor: Math.max(combined.constructEndTurnTeamShieldFactor, bonus.constructEndTurnTeamShieldFactor || 0),
        undeadLastStand: combined.undeadLastStand || !!bonus.undeadLastStand,
        reviveToMaxReel: combined.reviveToMaxReel || !!bonus.reviveToMaxReel,
        points: Math.max(combined.points, bonus.points || 0),
        humanPointOnAction: Math.max(combined.humanPointOnAction, bonus.humanPointOnAction || 0),
        humanPointStatPercent: Math.max(combined.humanPointStatPercent, bonus.humanPointStatPercent || 0),
        humanFinalPointStatMultiplier: Math.max(combined.humanFinalPointStatMultiplier, bonus.humanFinalPointStatMultiplier || 0),
        humanLinkActionThreshold: Math.max(combined.humanLinkActionThreshold, bonus.humanLinkActionThreshold || 0),
        humanLinkReelUpTargets: Math.max(combined.humanLinkReelUpTargets, bonus.humanLinkReelUpTargets || 0),
        fastestTurnAtkBonus: Math.max(combined.fastestTurnAtkBonus, bonus.fastestTurnAtkBonus || 0),
        beastTurnStartTeamSpdPercent: Math.max(combined.beastTurnStartTeamSpdPercent, bonus.beastTurnStartTeamSpdPercent || 0),
        beastEvasionChanceBonus: Math.max(combined.beastEvasionChanceBonus, bonus.beastEvasionChanceBonus || 0),
        beastEvasionCounterFactor: Math.max(combined.beastEvasionCounterFactor, bonus.beastEvasionCounterFactor || 0),
        beastHuntStackBonus: Math.max(combined.beastHuntStackBonus, bonus.beastHuntStackBonus || 0),
        turnStartCleanse: combined.turnStartCleanse || !!bonus.turnStartCleanse,
        natureBudFromSupport: combined.natureBudFromSupport || !!bonus.natureBudFromSupport,
        natureBudHealPercent: Math.max(combined.natureBudHealPercent, bonus.natureBudHealPercent || 0),
        natureBudShieldPercent: Math.max(combined.natureBudShieldPercent, bonus.natureBudShieldPercent || 0),
        natureBudIntBonus: Math.max(combined.natureBudIntBonus, bonus.natureBudIntBonus || 0),
        natureMagicBloomFixedDamage: combined.natureMagicBloomFixedDamage || !!bonus.natureMagicBloomFixedDamage,
        natureMagicBloomDamageFactor: Math.max(combined.natureMagicBloomDamageFactor, bonus.natureMagicBloomDamageFactor || 0),
        aquaticShieldHitHealPercent: Math.max(combined.aquaticShieldHitHealPercent, bonus.aquaticShieldHitHealPercent || 0),
        aquaticShieldHitDebuff: combined.aquaticShieldHitDebuff || !!bonus.aquaticShieldHitDebuff,
        shieldedDebuffDamageCut: Math.max(combined.shieldedDebuffDamageCut, bonus.shieldedDebuffDamageCut || 0),
        shieldedDebuffDamageCutMax: Math.max(combined.shieldedDebuffDamageCutMax, bonus.shieldedDebuffDamageCutMax || 0),
        aquaticTideReflectFactor: Math.max(combined.aquaticTideReflectFactor, bonus.aquaticTideReflectFactor || 0),
        lowHpAtkIntMaxBonus: Math.max(combined.lowHpAtkIntMaxBonus, bonus.lowHpAtkIntMaxBonus || 0),
        demonDoomAtkIntPerCount: Math.max(combined.demonDoomAtkIntPerCount, bonus.demonDoomAtkIntPerCount || 0),
        demonDoomMidStatThreshold: Math.max(combined.demonDoomMidStatThreshold, bonus.demonDoomMidStatThreshold || 0),
        demonDoomMidAtkIntPercent: Math.max(combined.demonDoomMidAtkIntPercent, bonus.demonDoomMidAtkIntPercent || 0),
        demonDoomStatThreshold: Math.max(combined.demonDoomStatThreshold, bonus.demonDoomStatThreshold || 0),
        demonDoomAtkIntPercent: Math.max(combined.demonDoomAtkIntPercent, bonus.demonDoomAtkIntPercent || 0),
        demonMissTransformCount: Math.max(combined.demonMissTransformCount, bonus.demonMissTransformCount || 0),
        demonAwakenCount: Math.max(combined.demonAwakenCount, bonus.demonAwakenCount || 0),
        demonAwakenCommandPowerMultiplier: Math.max(combined.demonAwakenCommandPowerMultiplier, bonus.demonAwakenCommandPowerMultiplier || 0),
        reelAtkIntPerLevel: Math.max(combined.reelAtkIntPerLevel, bonus.reelAtkIntPerLevel || 0),
        reelUpBonusLevels: Math.max(combined.reelUpBonusLevels, bonus.reelUpBonusLevels || 0),
        finalReelEnemyMaxHpFixedDamage: Math.max(combined.finalReelEnemyMaxHpFixedDamage, bonus.finalReelEnemyMaxHpFixedDamage || 0)
    }), {
        species: null,
        name: '',
        tier: 0,
        hpBonus: 0,
        atkBonus: 0,
        intBonus: 0,
        spdBonus: 0,
        slimeSupportExtraAction: false,
        slimeMucusGainFactor: 0,
        slimeMucusHealFactor: 0,
        slimeMucusExtraActionThreshold: 0,
        slimeMucusExtraActionCost: 0,
        slimeMucusDamageFactor: 0,
        constructRecycleCoreFactor: 0,
        constructRecycleCoreEndTurnDamage: false,
        constructRecycleCoreEndTurnDamageFactor: 0,
        constructRecycleCoreEndTurnConsumePercent: 0,
        constructEndTurnSingleShieldFactor: 0,
        constructEndTurnTeamShieldFactor: 0,
        undeadLastStand: false,
        reviveToMaxReel: false,
        points: 0,
        humanPointOnAction: 0,
        humanPointStatPercent: 0,
        humanFinalPointStatMultiplier: 0,
        humanLinkActionThreshold: 0,
        humanLinkReelUpTargets: 0,
        fastestTurnAtkBonus: 0,
        beastTurnStartTeamSpdPercent: 0,
        beastEvasionChanceBonus: 0,
        beastEvasionCounterFactor: 0,
        beastHuntStackBonus: 0,
        turnStartCleanse: false,
        natureBudFromSupport: false,
        natureBudHealPercent: 0,
        natureBudShieldPercent: 0,
        natureBudIntBonus: 0,
        natureMagicBloomFixedDamage: false,
        natureMagicBloomDamageFactor: 0,
        aquaticShieldHitHealPercent: 0,
        aquaticShieldHitDebuff: false,
        shieldedDebuffDamageCut: 0,
        shieldedDebuffDamageCutMax: 0,
        aquaticTideReflectFactor: 0,
        lowHpAtkIntMaxBonus: 0,
        demonDoomAtkIntPerCount: 0,
        demonDoomMidStatThreshold: 0,
        demonDoomMidAtkIntPercent: 0,
        demonDoomStatThreshold: 0,
        demonDoomAtkIntPercent: 0,
        demonMissTransformCount: 0,
        demonAwakenCount: 0,
        demonAwakenCommandPowerMultiplier: 0,
        reelAtkIntPerLevel: 0,
        reelUpBonusLevels: 0,
        finalReelEnemyMaxHpFixedDamage: 0
    });
}

export function applySpeciesSetBonuses(gameState, options = {}) {
    if (!gameState) return [];
    const messages = [
        ...applyBonusToParty(gameState.players, '味方', options),
        ...applyBonusToParty(gameState.enemies, '敵', options)
    ];
    applySpeciesBattleStartRuntime(gameState);
    return messages;
}

export function applySpeciesTurnStartEffects(gameState, alertLog = () => {}, options = {}) {
    if (!gameState) return 0;
    let visualEventCount = 0;
    const sides = [
        { prefix: 'p', party: gameState.players || [], enemies: gameState.enemies || [] },
        { prefix: 'e', party: gameState.enemies || [], enemies: gameState.players || [] }
    ];

    const firstActor = options.firstActor
        || options.actionQueue?.find(item => item.char?.hp > 0)?.char
        || [
            ...(gameState.players || []).map((char, index) => ({ char, side: 'p', index })),
            ...(gameState.enemies || []).map((char, index) => ({ char, side: 'e', index }))
        ]
            .filter(item => item.char.hp > 0)
            .sort((a, b) => (b.char.spd || 0) - (a.char.spd || 0))[0]?.char;

    sides.forEach(({ prefix, party, enemies }) => {
        const beastAtkSource = (
            firstActor
            && party.includes(firstActor)
            && firstActor.species === 'beast'
            && firstActor.activeSpeciesBonus?.fastestTurnAtkBonus
        )
            ? firstActor
            : null;
        const beastSpdSourceIndex = party.findIndex(char => (
            char?.hp > 0
            && char.species === 'beast'
            && char.activeSpeciesBonus?.beastTurnStartTeamSpdPercent
        ));
        const beastSpdSource = beastSpdSourceIndex >= 0 ? party[beastSpdSourceIndex] : null;
        if (beastAtkSource || beastSpdSource) {
            const setInfo = beastAtkSource?.activeSpeciesBonus || beastSpdSource.activeSpeciesBonus;
            const huntStacks = Math.max(0, Number(getBeastHuntState(gameState, prefix)?.stacks || 0));
            const huntBonus = huntStacks * Number(setInfo.beastHuntStackBonus || 0);
            let totalAtkGain = 0;
            let totalSpdGain = 0;
            let affectedCount = 0;
            const popupEntries = [];
            party.forEach((ally, index) => {
                if (!ally || ally.hp <= 0) return;
                const atkGain = beastAtkSource
                    ? addPercentStatBonus(ally, 'atk', Number(beastAtkSource.activeSpeciesBonus.fastestTurnAtkBonus || 0) + huntBonus)
                    : 0;
                const spdGain = beastSpdSource
                    ? addPercentStatBonus(ally, 'spd', Number(beastSpdSource.activeSpeciesBonus.beastTurnStartTeamSpdPercent || 0) + huntBonus)
                    : 0;
                totalAtkGain += atkGain;
                totalSpdGain += spdGain;
                affectedCount += 1;
                recordSetStatIncreased(gameState, prefix, index, atkGain + spdGain, {
                    setInfo,
                    sourceKind: 'turnStart',
                    statBreakdown: { atk: atkGain, spd: spdGain }
                });
                const entry = buildSetStatValueEvent(prefix, index, { atk: atkGain, spd: spdGain }, { char: ally });
                if (entry) popupEntries.push(entry);
            });
            if (affectedCount > 0) {
                showSetPopupBatch(popupEntries, setInfo, '群れの号令', '#f59e0b');
                showSetValueEvents(popupEntries, 'buff', '#f59e0b');
                visualEventCount += 1;
                const gainParts = [
                    beastAtkSource ? `ATK合計+${totalAtkGain}` : '',
                    beastSpdSource ? `SPD合計+${totalSpdGain}` : ''
                ].filter(Boolean).join(' / ');
                alertLog(`${(beastAtkSource || beastSpdSource).name}の【群れの号令】で味方全体の${gainParts}${huntStacks ? `（狩猟${huntStacks}）` : ''}！`);
            }
        }

    });

    const cleanseEntries = [];
    let cleanseSetInfo = null;
    let natureBudGainTotal = 0;
    [
        ...(gameState.players || []).map((char, index) => ({ char, side: 'p', index })),
        ...(gameState.enemies || []).map((char, index) => ({ char, side: 'e', index }))
    ].forEach(({ char, side, index }) => {
        if (!char.activeSpeciesBonus?.turnStartCleanse || char.hp <= 0) return;
        const activeStatuses = NEGATIVE_STATUS_IDS.filter(statusId => char.status?.includes(statusId));
        if (activeStatuses.length === 0) return;
        activeStatuses.forEach(statusId => removeStatus(char, statusId));
        char.poisonedIndices = [];
        const budGain = char.activeSpeciesBonus?.natureBudFromSupport
            ? addNatureBuds(gameState, side, activeStatuses.length)
            : 0;
        natureBudGainTotal += budGain;
        const resultParts = [];
        if (activeStatuses.length > 0) resultParts.push('全解除');
        if (budGain > 0) resultParts.push(`芽吹き+${budGain}`);
        if (resultParts.length === 0) return;
        const entry = {
            prefix: side,
            index,
            resultText: resultParts.join('/') || '芽吹き',
            char
        };
        cleanseSetInfo = cleanseSetInfo || char.activeSpeciesBonus;
        if (entry) cleanseEntries.push(entry);
    });
    if (cleanseEntries.length > 0) {
        showSetPopupBatch(cleanseEntries, cleanseSetInfo, '浄化', '#22c55e');
        showSetValueEvents(cleanseEntries, 'buff', '#22c55e');
        visualEventCount += 1;
        alertLog(`【浄化】状態異常を解除し、芽吹き+${natureBudGainTotal}！`);
    }
    return visualEventCount;
}

function getWeakestLivingMember(party) {
    return (party || [])
        .map((char, index) => ({ char, index }))
        .filter(item => item.char?.hp > 0)
        .sort((a, b) => (a.char.hp / Math.max(1, a.char.maxHp || 1)) - (b.char.hp / Math.max(1, b.char.maxHp || 1)))[0] || null;
}

function getRandomLivingMember(party) {
    const living = (party || [])
        .map((char, index) => ({ char, index }))
        .filter(item => item.char?.hp > 0);
    return living.length > 0 ? living[Math.floor(Math.random() * living.length)] : null;
}

export function applySpeciesEndTurnEffects(gameState, alertLog = () => {}) {
    if (!gameState) return 0;
    let visualEventCount = 0;
    ['p', 'e'].forEach(side => {
        const party = getPartyForSide(gameState, side);
        const enemySide = side === 'p' ? 'e' : 'p';
        const enemies = getPartyForSide(gameState, enemySide);

        const slimeSource = party.find(char => char?.hp > 0 && char.species === 'slime' && char.activeSpeciesBonus?.slimeMucusGainFactor);
        if (slimeSource) {
            const mucusBefore = getSlimeMucus(gameState, side);
            const healFactor = Number(slimeSource.activeSpeciesBonus?.slimeMucusHealFactor || 0);
            const damageFactor = Number(slimeSource.activeSpeciesBonus?.slimeMucusDamageFactor || 0);
            const healTarget = getWeakestLivingMember(party);
            if (mucusBefore > 0 && healFactor > 0 && healTarget) {
                const heal = Math.max(1, Math.floor(mucusBefore * healFactor));
                const beforeHp = healTarget.char.hp;
                healTarget.char.hp = Math.min(healTarget.char.maxHp, healTarget.char.hp + heal);
                const healed = Math.max(0, healTarget.char.hp - beforeHp);
                const consumed = consumeSlimeMucus(gameState, side, healed);
                if (healed > 0) {
                    healTarget.char.suppressNextHpPopup = true;
                    const entries = [{ prefix: side, index: healTarget.index, resultText: `HP+${healed}` }];
                    showSetPopupBatch(entries, slimeSource.activeSpeciesBonus, '粘液再生', '#14b8a6');
                    showSetValueEvents(entries, 'heal', '#2ecc71');
                    visualEventCount += 1;
                    alertLog(`【粘液再生】${healTarget.char.name}を${healed}回復（粘液${consumed}消費）`);
                }
            }
            const remainingMucus = getSlimeMucus(gameState, side);
            const damageTarget = getRandomLivingMember(enemies);
            if (remainingMucus > 0 && damageFactor > 0 && damageTarget) {
                const damage = Math.max(1, Math.floor(remainingMucus * damageFactor));
                const sourceIndex = party.indexOf(slimeSource);
                const result = applyFixedDamage(gameState, {
                    target: damageTarget.char,
                    targetPrefix: enemySide,
                    targetIdx: damageTarget.index,
                    attackerPrefix: side,
                    attackerIdx: sourceIndex,
                    damage,
                    recordStats: true,
                    statSource: 'set',
                    setInfo: slimeSource.activeSpeciesBonus,
                    sourceKind: 'endTurnMucus'
                });
                const consumed = consumeSlimeMucus(gameState, side, remainingMucus);
                if (result.hpDamage > 0) {
                    const entries = [{ prefix: enemySide, index: damageTarget.index, resultText: '追撃' }];
                    showSetPopupBatch(entries, slimeSource.activeSpeciesBonus, '分裂追撃', '#14b8a6');
                    showSetDamagePopup(enemySide, damageTarget.index, result.hpDamage, { formula: '固定', target: damageTarget.char });
                    visualEventCount += 1;
                    alertLog(`【分裂追撃】${damageTarget.char.name}へ固定${result.hpDamage}ダメージ（粘液${consumed}消費）`);
                }
            }
        }

        const natureSource = party.find(char => char?.hp > 0 && char.species === 'nature' && char.activeSpeciesBonus?.natureBudHealPercent);
        const natureBudCount = Math.max(0, Math.floor(Number(getNatureBudState(gameState, side)?.buds || 0)));
        const natureTarget = getWeakestLivingMember(party);
        if (natureSource && natureBudCount > 0 && natureTarget) {
            const consumed = consumeNatureBuds(gameState, side, 1);
            const healPercent = Number(natureSource.activeSpeciesBonus?.natureBudHealPercent || 0);
            const shieldPercent = Number(natureSource.activeSpeciesBonus?.natureBudShieldPercent || 0);
            const intAmount = Math.max(0, Math.floor(Number(natureSource.activeSpeciesBonus?.natureBudIntBonus || 0)));
            const beforeHp = natureTarget.char.hp;
            const heal = Math.max(1, Math.floor(Number(natureTarget.char.maxHp || 1) * healPercent));
            natureTarget.char.hp = Math.min(natureTarget.char.maxHp, natureTarget.char.hp + heal);
            const healed = Math.max(0, natureTarget.char.hp - beforeHp);
            const shieldGain = shieldPercent > 0
                ? addShield(natureTarget.char, Math.max(1, Math.floor(Number(natureTarget.char.maxHp || 1) * shieldPercent)))
                : 0;
            const intGain = intAmount > 0 ? addStatBonus(natureTarget.char, 'int', intAmount) : 0;
            const sourceIndex = party.indexOf(natureSource);
            const resultParts = [`芽吹き-${consumed}`];
            if (healed > 0) {
                natureTarget.char.suppressNextHpPopup = true;
                resultParts.push(`HP+${healed}`);
                recordSetHealingDone(gameState, side, sourceIndex, healed, {
                    setInfo: natureSource.activeSpeciesBonus,
                    sourceKind: 'endTurnBud'
                });
            }
            if (shieldGain > 0) {
                natureTarget.char.suppressNextShieldPopup = true;
                resultParts.push(`SH+${shieldGain}`);
                recordShieldGranted(gameState, side, sourceIndex, shieldGain, {
                    source: 'set',
                    setInfo: natureSource.activeSpeciesBonus,
                    sourceKind: 'endTurnBud'
                });
            }
            if (intGain > 0) {
                resultParts.push(`INT+${intGain}`);
                recordSetStatIncreased(gameState, side, natureTarget.index, intGain, {
                    setInfo: natureSource.activeSpeciesBonus,
                    sourceKind: 'endTurnBud',
                    statBreakdown: { int: intGain }
                });
            }
            const entries = [{ prefix: side, index: natureTarget.index, resultText: resultParts.join('/'), char: natureTarget.char }];
            showSetPopupBatch(entries, natureSource.activeSpeciesBonus, intGain > 0 ? '芽吹き成長' : '芽吹き再生', '#22c55e');
            showSetValueEvents(entries, 'buff', '#22c55e');
            visualEventCount += 1;
            alertLog(`【芽吹き循環】${natureTarget.char.name}に${resultParts.join('/')}！`);
        }

        const humanSource = party.find(char => char?.hp > 0 && char.species === 'human' && char.activeSpeciesBonus?.humanPointStatPercent);
        if (humanSource) {
            const state = getHumanState(gameState, side);
            const bonusResult = applyHumanPointBonuses(gameState, side);
            const popupEntries = [];
            bonusResult.targets.forEach(target => {
                const entry = buildSetStatValueEvent(side, target.index, { atk: target.atkDelta, int: target.intDelta }, { char: target.char });
                if (entry) popupEntries.push(entry);
            });
            if (popupEntries.length > 0) {
                showSetPopupBatch(popupEntries, humanSource.activeSpeciesBonus, bonusResult.multiplierActive ? '士気解放' : '士気高揚', '#f59e0b');
                showSetValueEvents(popupEntries, 'buff', '#f59e0b');
                visualEventCount += 1;
            }
            const threshold = Number(humanSource.activeSpeciesBonus?.humanLinkActionThreshold || 0);
            if (threshold > 0 && Number(state?.turnActions || 0) >= threshold) {
                const targetCount = Number(humanSource.activeSpeciesBonus?.humanLinkReelUpTargets || 1);
                const linked = applyHumanSyncDrive(party, targetCount);
                if (linked.length > 0) {
                    const entries = linked.map(result => ({ prefix: side, index: result.target.index, resultText: 'リール+1' }));
                    showSetPopupBatch(entries, humanSource.activeSpeciesBonus, '連携', '#f59e0b');
                    showSetValueEvents(entries, 'set', '#f59e0b');
                    visualEventCount += 1;
                    alertLog(`【連携】人間族が同一ターン${state.turnActions}回行動し、味方${linked.length}体のリールを上げた！`);
                }
            }
        }

        const demonTargets = applyDemonDoomStatBonuses(gameState, side);
        if (demonTargets.length > 0) {
            const entries = demonTargets.map(target => buildSetStatValueEvent(side, target.index, { atk: target.atkDelta, int: target.intDelta }, { char: target.char })).filter(Boolean);
            if (entries.length > 0) {
                showSetPopupBatch(entries, demonTargets[0].setInfo, '破滅進行', '#a855f7');
                showSetValueEvents(entries, 'buff', '#a855f7');
                visualEventCount += 1;
                alertLog(`【破滅進行】破滅カウントに応じて魔族側の能力が変化した！`);
            }
        }
        buildDemonDoomMilestoneEvents(gameState, side).forEach(event => {
            const partySource = party.find(char => char?.hp > 0 && char.species === 'demon');
            if (event.hook === 'demonMissTransform') {
                const entries = party.map((char, index) => ({ prefix: side, index, resultText: 'ミス変化' })).filter(entry => party[entry.index]?.hp > 0);
                showSetPopupBatch(entries, partySource?.activeSpeciesBonus, '魔王の囁き', '#a855f7');
                visualEventCount += 1;
                alertLog(`【魔王の囁き】破滅カウント${event.count}でミスが変化した！`);
            }
            if (event.hook === 'demonAwaken') {
                const entries = party.map((char, index) => ({ prefix: side, index, resultText: '覚醒' })).filter(entry => party[entry.index]?.hp > 0);
                showSetPopupBatch(entries, partySource?.activeSpeciesBonus, '魔神覚醒', '#a855f7');
                visualEventCount += 1;
                alertLog(`【魔神覚醒】破滅カウント${event.count}で魔族が覚醒した！`);
            }
        });

        const aquaticSource = party.find(char => char?.hp > 0 && char.species === 'aquatic' && char.activeSpeciesBonus?.aquaticTideReflectFactor);
        const tideState = getAquaticTideState(gameState, side);
        const tide = Math.max(0, Math.floor(Number(tideState?.tide || 0)));
        const tideTarget = getRandomLivingMember(enemies);
        if (aquaticSource && tide > 0 && tideTarget) {
            const damage = Math.max(1, Math.floor(tide * Number(aquaticSource.activeSpeciesBonus.aquaticTideReflectFactor || 0)));
            const sourceIndex = party.indexOf(aquaticSource);
            const result = applyFixedDamage(gameState, {
                target: tideTarget.char,
                targetPrefix: enemySide,
                targetIdx: tideTarget.index,
                attackerPrefix: side,
                attackerIdx: sourceIndex,
                damage,
                recordStats: true,
                statSource: 'set',
                setInfo: aquaticSource.activeSpeciesBonus,
                sourceKind: 'tideReflect'
            });
            tideState.tide = 0;
            party.forEach(char => {
                if (char) char.aquaticTide = 0;
            });
            if (result.hpDamage > 0) {
                const entries = [{ prefix: enemySide, index: tideTarget.index, resultText: '反射' }];
                showSetPopupBatch(entries, aquaticSource.activeSpeciesBonus, '潮流反射', '#0ea5e9');
                showSetDamagePopup(enemySide, tideTarget.index, result.hpDamage, { formula: '固定', target: tideTarget.char });
                visualEventCount += 1;
                alertLog(`【潮流反射】蓄積した潮流${tide}で${tideTarget.char.name}へ${result.hpDamage}ダメージ！`);
            }
        }

        const humanTurnState = getHumanState(gameState, side);
        if (humanTurnState) humanTurnState.turnActions = 0;
    });
    return visualEventCount;
}

export function notifySpeciesAllyDeaths(gameState, beforeSnapshot, alertLog = () => {}) {
    if (!gameState || !beforeSnapshot) return [];
    const events = [];
    ['p', 'e'].forEach(prefix => {
        const party = prefix === 'p' ? gameState.players : gameState.enemies;
        const beforeParty = beforeSnapshot[prefix] || [];
        const state = getUndeadState(gameState, prefix);
        const hasLastStand = hasUndeadBonus(party, 'lowHpAtkIntMaxBonus');
        const deaths = party
            .map((char, index) => ({ char, index, before: beforeParty[index] }))
            .filter(item => (
                item.before?.hp > 0
                && item.char.hp <= 0
                && !item.char.pendingUndeadLastStand
            ));
        if (deaths.length === 0) return;
        deaths.forEach(({ char, index }) => {
            if (hasLastStand && !char.undeadDeathFixedRegistered) {
                char.undeadDeathFixedRegistered = true;
                state.fixedMissingHp = Math.max(0, Number(state.fixedMissingHp || 0) + Math.max(1, Number(char.maxHp || 1)));
                events.push({ hook: 'undeadFixedMissingHp', prefix, index, char });
                alertLog(`${char.name}の死が不死族の執念を高めた！`);
            }
        });
        applyUndeadLastStandBonuses(gameState, prefix);
    });
    return events;
}

export function applySpeciesBattleStartRuntime(gameState) {
    if (!gameState) return;
    gameState.natureSupportChainCounts = { p: 0, e: 0 };
    gameState.slimeMucusState = { p: { mucus: 0 }, e: { mucus: 0 } };
    gameState.natureBudState = { p: { buds: 0 }, e: { buds: 0 } };
    gameState.aquaticTideState = { p: { tide: 0 }, e: { tide: 0 } };
    gameState.beastHuntState = { p: { stacks: 0, counterTurn: null }, e: { stacks: 0, counterTurn: null } };
    gameState.humanSetState = {
        p: { points: 0, turnActions: 0, multiplierActive: false, multiplierAnnounced: false },
        e: { points: 0, turnActions: 0, multiplierActive: false, multiplierAnnounced: false }
    };
    gameState.demonDoomState = {
        p: { count: 0, missTransformed: false, awakened: false },
        e: { count: 0, missTransformed: false, awakened: false }
    };
    gameState.undeadState = {
        p: { fixedMissingHp: 0 },
        e: { fixedMissingHp: 0 }
    };
    gameState.constructRecycleCore = { p: 0, e: 0 };
    [...(gameState.players || []), ...(gameState.enemies || [])].forEach(char => {
        char.pendingFixedDamage = 0;
        char.pendingExtraActions = 0;
        char.remainingActions = 0;
        char.slimeStatRampStacks = 0;
        char.slimeMucus = 0;
        char.natureBuds = 0;
        char.aquaticTide = 0;
        char.beastHuntStacks = 0;
        char.humanCommandPowerMultiplier = 1;
        char.humanPointAtkBonus = 0;
        char.humanPointIntBonus = 0;
        char.humanSetPoints = 0;
        char.demonDoomCount = 0;
        char.constructRecycleCore = 0;
        setTrackedStatBonus(char, 'atk', 'demonDoomAtkBonus', 0);
        setTrackedStatBonus(char, 'int', 'demonDoomIntBonus', 0);
        syncDragonReelStatBonus(char);
        char.demonAwakened = false;
        char.demonCommandPowerMultiplier = 1;
        char.demonFinalReelLocked = false;
        setTrackedStatBonus(char, 'atk', 'undeadLastStandAtkBonus', 0);
        setTrackedStatBonus(char, 'int', 'undeadLastStandIntBonus', 0);
        char.undeadLastStandPercent = 0;
        char.undeadFinalReelLocked = false;
        delete char.pendingUndeadLastStand;
        char.pendingUndeadReviveAction = false;
        char.undeadDeathFixedRegistered = false;
        char.dragonFinalDamageUsed = false;
    });
    applyAllUndeadLastStandBonuses(gameState);
}

export function hasAnyReelUpCommand(char) {
    const reels = Array.isArray(char?.commands?.[0]) ? char.commands : [char?.commands || []];
    return reels.flat().some(commandId => typeof commandId === 'string' && (
        commandId.startsWith('cmd_up') || commandId === 'misc_support_reel_up' || commandId === 'misc_support_reel_up2'
    ));
}

function hasHumanPointBonus(party) {
    return (party || []).some(char => char?.activeSpeciesBonus?.humanPointStatPercent);
}

function isHumanFinalPointMultiplierActive(party, multiplier) {
    if (!(multiplier > 1)) return false;
    const living = (party || []).filter(char => char?.hp > 0);
    return living.length > 0 && living.every(char => (char.currentReel || 0) >= getMaxReelIndex(char));
}

function applyHumanPointBonuses(gameState, side) {
    const party = getPartyForSide(gameState, side);
    const state = getHumanState(gameState, side);
    if (!state || !hasHumanPointBonus(party)) return { targets: [], points: 0, percent: 0, multiplierActive: false };

    const pointPercent = Math.max(0, ...party.map(char => Number(char?.activeSpeciesBonus?.humanPointStatPercent || 0)));
    const finalMultiplier = Math.max(1, ...party.map(char => Number(char?.activeSpeciesBonus?.humanFinalPointStatMultiplier || 0)));
    const multiplierActive = isHumanFinalPointMultiplierActive(party, finalMultiplier);
    const percent = Math.max(0, Number(state.points || 0) * pointPercent * (multiplierActive ? finalMultiplier : 1));
    const targets = [];

    party.forEach((char, index) => {
        if (char) char.humanSetPoints = Number(state.points || 0);
        if (!char || char.hp <= 0) {
            setTrackedStatBonus(char, 'atk', 'humanPointAtkBonus', 0);
            setTrackedStatBonus(char, 'int', 'humanPointIntBonus', 0);
            return;
        }
        const atkGain = percent > 0 ? Math.max(1, Math.floor((char.baseAtk || char.atk || 1) * percent)) : 0;
        const intGain = percent > 0 ? Math.max(1, Math.floor((char.baseInt || char.int || 1) * percent)) : 0;
        const atkDelta = setTrackedStatBonus(char, 'atk', 'humanPointAtkBonus', atkGain);
        const intDelta = setTrackedStatBonus(char, 'int', 'humanPointIntBonus', intGain);
        targets.push({ char, index, atkGain, intGain, atkDelta, intDelta });
    });

    state.multiplierActive = multiplierActive;
    if (!multiplierActive) state.multiplierAnnounced = false;
    return { targets, points: Number(state.points || 0), percent, multiplierActive };
}

function addHumanPoints(gameState, side, amount) {
    const state = getHumanState(gameState, side);
    if (!state || amount <= 0) return 0;
    state.points = Math.max(0, Number(state.points || 0) + amount);
    return Number(state.points || 0);
}

export function resetHumanTurnActions(gameState) {
    ['p', 'e'].forEach(side => {
        const state = getHumanState(gameState, side);
        if (state) state.turnActions = 0;
    });
}

export function recordHumanAction(gameState, actor, side) {
    if (!gameState || !actor || actor.hp <= 0 || actor.species !== 'human') return null;
    const pointGain = Math.max(0, Math.floor(Number(actor.activeSpeciesBonus?.humanPointOnAction || 0)));
    if (pointGain <= 0) return null;
    const state = getHumanState(gameState, side);
    if (!state) return null;
    state.turnActions = Math.max(0, Number(state.turnActions || 0) + 1);
    const totalPoints = addHumanPoints(gameState, side, pointGain);
    return {
        hook: 'humanActionRecorded',
        char: actor,
        side,
        pointsAdded: pointGain,
        totalPoints,
        turnActions: state.turnActions
    };
}

function applyHumanSyncDrive(party, targetCount = 1) {
    const living = (party || [])
        .map((char, index) => ({ char, index }))
        .filter(item => item.char?.hp > 0);
    const candidates = living
        .filter(item => (item.char.currentReel || 0) < getMaxReelIndex(item.char))
        .sort((a, b) => {
            const reelDiff = (a.char.currentReel || 0) - (b.char.currentReel || 0);
            return reelDiff || a.index - b.index;
        });

    return candidates.slice(0, Math.max(1, Math.floor(targetCount || 1))).map(target => {
        const before = target.char.currentReel || 0;
        target.char.currentReel = Math.min(getMaxReelIndex(target.char), before + 1);
        return { type: 'reelUp', target, amount: target.char.currentReel - before };
    }).filter(result => result.amount > 0);
}

export function getCommandPowerMultiplier(actor) {
    return Math.max(1, Number(actor?.humanCommandPowerMultiplier || 1))
        * Math.max(1, Number(actor?.demonCommandPowerMultiplier || 1));
}

export function applySpeciesReelUpEffects(gameState, actor, side = 'p') {
    if (!gameState || !actor || actor.hp <= 0) return [];
    const active = actor.activeSpeciesBonus || {};
    const events = [];

    if (actor.species === 'dragon' && active.reelUpBonusLevels) {
        const maxReel = Array.isArray(actor.commands?.[0]) ? actor.commands.length - 1 : 0;
        const before = actor.currentReel || 0;
        actor.currentReel = Math.min(maxReel, before + active.reelUpBonusLevels);
        if (actor.currentReel > before) {
            events.push({ hook: 'dragonReelUpBonusLevels', char: actor, amount: actor.currentReel - before });
        }
        syncDragonReelStatBonus(actor);
        if (active.finalReelEnemyMaxHpFixedDamage && actor.currentReel >= maxReel && !actor.dragonFinalDamageUsed) {
            actor.dragonFinalDamageUsed = true;
            events.push({ hook: 'dragonFinalReelDamageReady', char: actor, amount: active.finalReelEnemyMaxHpFixedDamage });
        }
    }

    return events;
}
