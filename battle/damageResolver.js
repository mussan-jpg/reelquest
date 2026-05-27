import { applyShieldedDamage } from './shield.js';
import { recordDamageMitigated, recordDamageResisted, recordDamageTaken, recordDamageDealt, recordShieldAbsorbed } from './stats.js';
import { calculateAdjustedDamageBreakdown, getStatusDefenseMultiplier } from '../commands/status.js';
import { applyUndeadLastStand } from './lastStand.js';

export function getStatusAttackMultiplier(attacker) {
    return 1; // 脱力は攻撃力の直接変更で表現されるため、ここでは追加の倍率を適用しません。
}

function getAquaticShieldDamageCut(attacker, target, damage) {
    const cutPerDebuff = target?.activeSpeciesBonus?.shieldedDebuffDamageCut || 0;
    if (!cutPerDebuff || !target?.shield || damage <= 0 || !attacker) return 0;
    const debuffIds = new Set(['weak', 'weakened', 'poison', 'paralysis', 'taunt']);
    const debuffCount = (attacker.status || []).filter(statusId => debuffIds.has(statusId)).length;
    if (debuffCount <= 0) return 0;
    const maxCut = target.activeSpeciesBonus.shieldedDebuffDamageCutMax || cutPerDebuff * 3;
    const cutRate = Math.min(maxCut, debuffCount * cutPerDebuff);
    return Math.floor(damage * cutRate);
}

export function calculateDamageWithBreakdown(rawDamage, attacker, target, options = {}) {
    const attackMultiplier = getStatusAttackMultiplier(attacker);
    const attackAdjustedDamage = Math.max(0, Math.floor(rawDamage * attackMultiplier));
    const adjustedBreakdown = calculateAdjustedDamageBreakdown(attackAdjustedDamage, target, {
        attacker,
        isAreaAttack: !!options.isAreaAttack
    });

    const aquaticCut = getAquaticShieldDamageCut(attacker, target, adjustedBreakdown.finalDamage);
    const finalDamage = Math.max(0, adjustedBreakdown.finalDamage - aquaticCut);
    return {
        base: rawDamage,
        attackMultiplier,
        defenseMultiplier: getStatusDefenseMultiplier(target),
        finalDamage,
        delta: finalDamage - rawDamage,
        mitigatedDamage: adjustedBreakdown.mitigatedDamage + aquaticCut,
        guardTriggered: adjustedBreakdown.guardTriggered,
        guardMitigatedDamage: adjustedBreakdown.guardMitigatedDamage,
        evasionTriggered: adjustedBreakdown.evasionTriggered,
        aquaticCut
    };
}

export function applyResolvedDamage(gameState, context = {}) {
    const {
        target,
        targetPrefix,
        targetIdx,
        attackerPrefix,
        attackerIdx,
        damage,
        baseHp,
        breakdown = {},
        recordDirectDamage = false,
        statSource = 'character',
        setInfo = null,
        sourceKind = 'directEffect'
    } = context;
    const statOptions = { source: statSource, setInfo, sourceKind };

    const shieldResult = applyShieldedDamage(target, damage, { baseHp });

    if (shieldResult.absorbed > 0) {
        recordShieldAbsorbed(gameState, targetPrefix, targetIdx, shieldResult.absorbed);
        recordDamageResisted(gameState, attackerPrefix, attackerIdx, shieldResult.absorbed, statOptions);
    }

    if (breakdown.mitigatedDamage > 0) {
        recordDamageMitigated(gameState, targetPrefix, targetIdx, breakdown.mitigatedDamage);
        recordDamageResisted(gameState, attackerPrefix, attackerIdx, breakdown.mitigatedDamage, statOptions);
    }

    if (recordDirectDamage && shieldResult.hpDamage > 0) {
        if (statSource !== 'set') {
            recordDamageTaken(gameState, targetPrefix, targetIdx, shieldResult.hpDamage);
        }
        recordDamageDealt(gameState, attackerPrefix, attackerIdx, shieldResult.hpDamage, statOptions);
    }

    return {
        shieldResult,
        absorbed: shieldResult.absorbed,
        hpDamage: shieldResult.hpDamage,
        mitigatedDamage: breakdown.mitigatedDamage || 0
    };
}

export function applyShieldedDirectDamage(gameState, context = {}) {
    return applyResolvedDamage(gameState, {
        ...context,
        breakdown: context.breakdown || {}
    });
}

export function applyNormalDamage(gameState, context = {}) {
    const {
        rawDamage,
        attacker,
        target,
        isAreaAttack = false,
        baseHp = target?.hp
    } = context;
    const breakdown = calculateDamageWithBreakdown(rawDamage, attacker, target, { isAreaAttack });
    const resolved = applyResolvedDamage(gameState, {
        ...context,
        damage: breakdown.finalDamage,
        baseHp,
        breakdown
    });

    return {
        ...resolved,
        rawDamage,
        adjustedDamage: breakdown.finalDamage,
        breakdown
    };
}

export function applyFixedDamage(gameState, context = {}) {
    const {
        target,
        targetPrefix,
        targetIdx,
        attackerPrefix,
        attackerIdx,
        damage,
        recordStats = false,
        statSource = 'character',
        setInfo = null,
        sourceKind = 'directEffect'
    } = context;

    const fixedDamage = Math.max(0, Math.floor(Number(damage || 0)));
    if (!target || fixedDamage <= 0 || target.hp <= 0) {
        return { hpDamage: 0 };
    }

    const beforeHp = target.hp;
    target.hp = Math.max(0, target.hp - fixedDamage);
    const lastStand = applyUndeadLastStand(target, beforeHp, fixedDamage);
    const hpDamage = lastStand.triggered ? lastStand.hpDamage : Math.max(0, beforeHp - target.hp);

    if (recordStats && hpDamage > 0) {
        if (statSource !== 'set') {
            recordDamageTaken(gameState, targetPrefix, targetIdx, hpDamage);
        }
        recordDamageDealt(gameState, attackerPrefix, attackerIdx, hpDamage, { source: statSource, setInfo, sourceKind });
    }

    return { hpDamage, lastStandTriggered: lastStand.triggered };
}

export function applyDirectHpLoss(gameState, context = {}) {
    const {
        target,
        targetPrefix,
        targetIdx,
        sourcePrefix,
        sourceIdx,
        damage,
        recordStats = true,
        statSource = 'character',
        setInfo = null,
        sourceKind = 'directEffect'
    } = context;

    const directDamage = Math.max(0, Math.floor(Number(damage || 0)));
    if (!target || directDamage <= 0 || target.hp <= 0) {
        return { hpDamage: 0 };
    }

    const beforeHp = target.hp;
    target.hp = Math.max(0, target.hp - directDamage);
    const lastStand = applyUndeadLastStand(target, beforeHp, directDamage);
    const hpDamage = lastStand.triggered ? lastStand.hpDamage : Math.max(0, beforeHp - target.hp);

    if (recordStats && hpDamage > 0) {
        if (statSource !== 'set') {
            recordDamageTaken(gameState, targetPrefix, targetIdx, hpDamage);
        }
        if (sourcePrefix) {
            recordDamageDealt(gameState, sourcePrefix, sourceIdx, hpDamage, { source: statSource, setInfo, sourceKind });
        }
    }

    return { hpDamage, lastStandTriggered: lastStand.triggered };
}
