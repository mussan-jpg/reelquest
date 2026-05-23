// commands/status.js

export const STATUS_EFFECT_RULES = {
    poison: {},
    paralysis: {},
    weak: {
        attackPowerFactor: 0.7
    },
    weakened: {
        damageTakenFactor: 1.2
    },
    hidden: {
        damageTakenFactor: 0.8
    },
    taunt: {
        damageTakenFactor: 0.6,
        defaultDuration: 2
    }
};

function getBaseStatKey(stat) {
    return stat === 'atk' ? 'baseAtk'
        : stat === 'int' ? 'baseInt'
            : stat === 'spd' ? 'baseSpd'
                : null;
}

function ensureStatBonuses(character) {
    if (!character || typeof character !== 'object') return {};
    if (!character.statBonuses) {
        character.statBonuses = { atk: 0, int: 0, spd: 0 };
    }
    ['atk', 'int', 'spd'].forEach(stat => {
        if (typeof character.statBonuses[stat] !== 'number') {
            character.statBonuses[stat] = 0;
        }
    });
    return character.statBonuses;
}

function refreshAdditiveStat(character, stat) {
    const baseKey = getBaseStatKey(stat);
    if (!character || !baseKey) return;
    if (character[baseKey] === undefined || character[baseKey] === null) {
        character[baseKey] = character[stat];
    }
    const bonuses = ensureStatBonuses(character);
    character[stat] = Math.max(1, character[baseKey] + bonuses[stat]);
}

export function addStatBonus(character, stat, amount) {
    const baseKey = getBaseStatKey(stat);
    if (!character || !baseKey || typeof amount !== 'number') return 0;
    if (character[baseKey] === undefined || character[baseKey] === null) {
        character[baseKey] = character[stat];
    }
    const bonuses = ensureStatBonuses(character);
    bonuses[stat] += amount;
    if (stat === 'atk') {
        refreshAttackPower(character);
    } else {
        refreshAdditiveStat(character, stat);
    }
    return amount;
}

export function refreshAttackPower(character) {
    if (!character || typeof character !== 'object') return;
    if (character.baseAtk === undefined || character.baseAtk === null) {
        character.baseAtk = character.atk;
    }
    const bonuses = ensureStatBonuses(character);
    const base = character.baseAtk + bonuses.atk;
    let atk = base;
    if (Array.isArray(character.attackPowerModifiers)) {
        character.attackPowerModifiers.forEach(mod => {
            if (typeof mod.factor === 'number') {
                atk = Math.max(1, Math.floor(atk * mod.factor));
            }
        });
    }
    character.atk = atk;
}

export function applyAttackModifier(character, source, factor) {
    if (!character || !source || typeof factor !== 'number') return;
    if (!Array.isArray(character.attackPowerModifiers)) character.attackPowerModifiers = [];
    if (source === 'weak' && character.attackPowerModifiers.some(mod => mod.source === 'weak')) return;
    character.attackPowerModifiers.push({ source, factor });
    refreshAttackPower(character);
}

export function removeAttackModifier(character, source) {
    if (!character || !source || !Array.isArray(character.attackPowerModifiers)) return;
    character.attackPowerModifiers = character.attackPowerModifiers.filter(mod => mod.source !== source);
    refreshAttackPower(character);
}

export function hasStatus(character, statusId) {
    return !!(character && Array.isArray(character.status) && character.status.includes(statusId));
}

export function addStatus(character, statusId, options = {}) {
    if (!character || !statusId) return false;
    if (!Array.isArray(character.status)) character.status = [];

    const alreadyHadStatus = character.status.includes(statusId);
    if (!alreadyHadStatus) {
        character.status.push(statusId);
    }

    const rule = STATUS_EFFECT_RULES[statusId];
    if (rule?.defaultDuration) {
        const duration = options.duration ?? rule.defaultDuration ?? 0;
        const durationKey = `${statusId}Duration`;
        if (alreadyHadStatus && options.extendDuration) {
            character[durationKey] = (character[durationKey] || 0) + duration;
        } else if (!alreadyHadStatus || !character[durationKey]) {
            character[durationKey] = duration;
        }
    }

    syncStatusEffects(character);
    return !alreadyHadStatus;
}

export function removeStatus(character, statusId) {
    if (!character || !statusId || !Array.isArray(character.status)) return;
    character.status = character.status.filter(status => status !== statusId);
    if (character.statusSources) {
        delete character.statusSources[statusId];
    }
    syncStatusEffects(character);
}

export function syncStatusEffects(character) {
    if (!character || typeof character !== 'object') return;
    if (!Array.isArray(character.status)) character.status = [];
    if (!Array.isArray(character.attackPowerModifiers)) character.attackPowerModifiers = [];

    Object.entries(STATUS_EFFECT_RULES).forEach(([statusId, rule]) => {
        if (typeof rule.attackPowerFactor !== 'number') return;

        const hasStatusEffect = character.status.includes(statusId);
        const hasModifier = character.attackPowerModifiers.some(mod => mod.source === statusId);

        if (hasStatusEffect && !hasModifier) {
            character.attackPowerModifiers.push({ source: statusId, factor: rule.attackPowerFactor });
        } else if (!hasStatusEffect && hasModifier) {
            character.attackPowerModifiers = character.attackPowerModifiers.filter(mod => mod.source !== statusId);
        }
    });

    Object.entries(STATUS_EFFECT_RULES).forEach(([statusId, rule]) => {
        if (!rule.defaultDuration) return;
        const durationKey = `${statusId}Duration`;
        if (!character.status.includes(statusId)) {
            character[durationKey] = 0;
        } else if (!character[durationKey]) {
            character[durationKey] = rule.defaultDuration;
        }
    });

    refreshAttackPower(character);
    refreshAdditiveStat(character, 'int');
    refreshAdditiveStat(character, 'spd');
}

export function syncAllStatusEffects(gameState) {
    if (!gameState) return;
    [...(gameState.players || []), ...(gameState.enemies || [])].forEach(syncStatusEffects);
}

export function resetBattleStats(character) {
    if (!character || typeof character !== 'object') return;
    if (character.baseAtk !== undefined) character.atk = character.baseAtk;
    if (character.baseInt !== undefined) character.int = character.baseInt;
    if (character.baseSpd !== undefined) character.spd = character.baseSpd;
    character.statBonuses = { atk: 0, int: 0, spd: 0 };
    character.attackPowerModifiers = [];
    character.status = [];
    character.statusSources = {};
    character.poisonedIndices = [];
    character.tauntDuration = 0;
}

export function getStatusDefenseMultiplier(character) {
    if (!character || !Array.isArray(character.status)) return 1;
    return character.status.reduce((multiplier, statusId) => {
        const factor = STATUS_EFFECT_RULES[statusId]?.damageTakenFactor;
        return typeof factor === 'number' ? multiplier * factor : multiplier;
    }, 1);
}

function calculateStatusAdjustedDamageWithMitigation(baseDamage, target) {
    const statuses = Array.isArray(target?.status) ? target.status : [];
    const factorEntries = statuses
        .map(statusId => ({ statusId, factor: STATUS_EFFECT_RULES[statusId]?.damageTakenFactor }))
        .filter(entry => typeof entry.factor === 'number');

    let damage = baseDamage;
    let mitigatedDamage = 0;
    let guardMitigatedDamage = 0;

    factorEntries.filter(entry => entry.factor > 1).forEach(({ factor }) => {
        damage = Math.max(0, Math.floor(damage * factor));
    });

    factorEntries.filter(entry => entry.factor < 1).forEach(({ statusId, factor }) => {
        const beforeReduction = damage;
        damage = Math.max(0, Math.floor(damage * factor));
        const reduced = Math.max(0, beforeReduction - damage);
        mitigatedDamage += reduced;
        if (statusId === 'taunt') {
            guardMitigatedDamage += reduced;
        }
    });

    const speciesDamageTakenFactor = target?.activeSpeciesBonus?.damageTakenFactor;
    if (typeof speciesDamageTakenFactor === 'number' && speciesDamageTakenFactor < 1) {
        const beforeReduction = damage;
        damage = Math.max(0, Math.floor(damage * speciesDamageTakenFactor));
        mitigatedDamage += Math.max(0, beforeReduction - damage);
    }

    return { damage, mitigatedDamage, guardMitigatedDamage };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function getSpeedEvasionChance(attacker, target) {
    if (!attacker || !target) return 0;
    const attackerSpeed = Math.max(1, attacker.spd || 0);
    const targetSpeed = Math.max(0, target.spd || 0);
    if (targetSpeed <= attackerSpeed) return 0;

    const relativeAdvantage = (targetSpeed - attackerSpeed) / attackerSpeed;
    const speciesBonus = target.activeSpeciesBonus?.evasionBonus || 0;
    return clamp(relativeAdvantage * 0.18 + speciesBonus, 0, 0.5);
}

export function calculateAdjustedDamageBreakdown(rawDamage, target, options = {}) {
    const tauntHits = options.isAreaAttack && hasStatus(target, 'taunt') ? 3 : 1;
    const baseDamage = Math.max(0, Math.floor(rawDamage * tauntHits));
    const statusAdjustment = calculateStatusAdjustedDamageWithMitigation(baseDamage, target);
    const statusAdjustedDamage = statusAdjustment.damage;

    const evasionChance = getSpeedEvasionChance(options.attacker, target);
    const evasionTriggered = statusAdjustedDamage > 0 && Math.random() < evasionChance;
    const finalDamage = evasionTriggered
        ? Math.max(0, Math.floor(statusAdjustedDamage * 0.5))
        : statusAdjustedDamage;
    const evasionMitigatedDamage = evasionTriggered
        ? Math.max(0, statusAdjustedDamage - finalDamage)
        : 0;

    return {
        baseDamage,
        statusAdjustedDamage,
        finalDamage,
        mitigatedDamage: statusAdjustment.mitigatedDamage + evasionMitigatedDamage,
        guardMitigatedDamage: statusAdjustment.guardMitigatedDamage,
        guardTriggered: statusAdjustment.guardMitigatedDamage > 0,
        evasionChance,
        evasionTriggered
    };
}

export function calculateAdjustedDamage(rawDamage, target, options = {}) {
    return calculateAdjustedDamageBreakdown(rawDamage, target, options).finalDamage;
}

export const statusCommands = {
    // =========================================================================
    // 🤢 状態異常・弱体化系
    // =========================================================================
    "atk04": {
        name: "毒攻撃",
        desc: "敵単体に小ダメージを与え、毒を付与する。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk04"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);

            let msg = `🤢 ${attacker.name}の「毒攻撃」！ ${target.name}に ${dmg} のダメージ！`;

            if (addStatus(target, "poison")) {
                msg += ` さらに ${target.name} を【毒状態】にした！`;
            }
            return msg;
        }
    },
    "atk_paralyze": {
        name: "マヒ攻撃",
        desc: "敵単体に小ダメージを与え、マヒを付与する。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.9),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_paralyze"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);

            let msg = `⚡ ${attacker.name}の「マヒ攻撃」！ ${target.name}に ${dmg} のダメージ！`;

            if (Math.random() < 1.0) {
                if (addStatus(target, "paralysis")) {
                    msg += ` さらに ${target.name} は身体が痺れて【マヒ状態】になった！`;
                }
            }
            return msg;
        }
    },
    "atk_weaken": {
        name: "弱体化攻撃",
        desc: "敵単体に小ダメージを与え、脱力を付与する。",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.0),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_weaken"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);

            let msg = `📉 ${attacker.name}の「弱体化攻撃」！ ${target.name}に ${dmg} のダメージ！`;

            if (addStatus(target, "weak")) {
                msg += ` さらに ${target.name} を【脱力状態】にした！`;
            }
            return msg;
        }
    },
    "atk_weakened": {
        name: "弱体呪詛",
        desc: "敵単体に小ダメージを与え、弱体を付与する。",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.2),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_weakened"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);

            let msg = `🛡️ ${attacker.name}の「弱体呪詛」！ ${target.name}に ${dmg} のダメージ！`;

            if (addStatus(target, "weakened")) {
                msg += ` さらに ${target.name} は防護が崩れて【弱体状態】になった！`;
            }
            return msg;
        }
    },
    "atk_guard_break": {
        name: "防御崩し",
        desc: "敵単体に中ダメージを与え、弱体を付与する。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.1),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_guard_break"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);

            let msg = `🛡️ ${attacker.name}の「防御崩し」！ ${target.name}に ${dmg} のダメージ！`;
            if (addStatus(target, "weakened")) {
                msg += ` ${target.name}の守りが崩れて【弱体状態】になった！`;
            }
            return msg;
        }
    },
    "atk_prank": {
        name: "いやがらせ",
        desc: "敵単体に小ダメージを与え、脱力と弱体を付与する。",
        calcDamage: (attacker) => Math.floor((attacker.int + attacker.atk) * 0.45),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_prank"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);

            let msg = `😈 ${attacker.name}の「いやがらせ」！ ${target.name}に ${dmg} のダメージ！`;
            const addedWeak = addStatus(target, "weak");
            const addedWeakened = addStatus(target, "weakened");
            if (addedWeak || addedWeakened) {
                msg += ` さらに調子を崩して${addedWeak ? '【脱力】' : ''}${addedWeakened ? '【弱体】' : ''}状態になった！`;
            }
            return msg;
        }
    }
};
