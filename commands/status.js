// commands/status.js

export const STATUS_EFFECT_RULES = {
    poison: {},
    paralysis: {},
    weak: {
        stackable: true,
        maxStacks: 3,
        attackPowerFactorPerStack: 0.8
    },
    weakened: {
        damageTakenDelta: 0.2
    },
    hidden: {},
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

function ensureStatusStacks(character) {
    if (!character || typeof character !== 'object') return {};
    if (!character.statusStacks || typeof character.statusStacks !== 'object') {
        character.statusStacks = {};
    }
    return character.statusStacks;
}

export function getStatusStackCount(character, statusId) {
    const rule = STATUS_EFFECT_RULES[statusId];
    if (!rule?.stackable) return hasStatus(character, statusId) ? 1 : 0;
    if (!hasStatus(character, statusId)) return 0;
    const stacks = Number(character?.statusStacks?.[statusId] || 0);
    return Math.max(1, Math.floor(stacks));
}

export function addStatus(character, statusId, options = {}) {
    if (!character || !statusId) return false;
    if (!Array.isArray(character.status)) character.status = [];

    const alreadyHadStatus = character.status.includes(statusId);
    if (!alreadyHadStatus) {
        character.status.push(statusId);
    }

    const rule = STATUS_EFFECT_RULES[statusId];
    if (rule?.stackable) {
        const stacks = ensureStatusStacks(character);
        const currentStacks = Math.max(0, Number(stacks[statusId] || 0));
        const maxStacks = Number.isFinite(rule.maxStacks) ? Math.max(1, Math.floor(rule.maxStacks)) : Infinity;
        if (currentStacks >= maxStacks) {
            syncStatusEffects(character);
            return false;
        }
        stacks[statusId] = Math.min(maxStacks, currentStacks + 1);
    }

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
    return rule?.stackable ? true : !alreadyHadStatus;
}

export function removeStatus(character, statusId) {
    if (!character || !statusId || !Array.isArray(character.status)) return;
    character.status = character.status.filter(status => status !== statusId);
    if (character.statusStacks) {
        delete character.statusStacks[statusId];
    }
    if (character.statusSources) {
        delete character.statusSources[statusId];
    }
    syncStatusEffects(character);
}

export function syncStatusEffects(character) {
    if (!character || typeof character !== 'object') return;
    if (!Array.isArray(character.status)) character.status = [];
    if (!Array.isArray(character.attackPowerModifiers)) character.attackPowerModifiers = [];
    ensureStatusStacks(character);

    Object.entries(STATUS_EFFECT_RULES).forEach(([statusId, rule]) => {
        const hasStatusEffect = character.status.includes(statusId);
        if (rule.stackable && !hasStatusEffect) {
            delete character.statusStacks[statusId];
        }
        if (
            typeof rule.attackPowerFactor !== 'number'
            && typeof rule.attackPowerDelta !== 'number'
            && typeof rule.attackPowerFactorPerStack !== 'number'
        ) return;

        const modifierIndex = character.attackPowerModifiers.findIndex(mod => mod.source === statusId);
        const hasModifier = modifierIndex >= 0;

        if (hasStatusEffect) {
            const stacks = getStatusStackCount(character, statusId);
            const factor = typeof rule.attackPowerFactorPerStack === 'number'
                ? Math.max(0, rule.attackPowerFactorPerStack ** stacks)
                : typeof rule.attackPowerDelta === 'number'
                    ? Math.max(0, 1 + rule.attackPowerDelta * stacks)
                    : rule.attackPowerFactor;
            if (hasModifier) {
                character.attackPowerModifiers[modifierIndex].factor = factor;
            } else {
                character.attackPowerModifiers.push({ source: statusId, factor });
            }
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
    character.statusStacks = {};
    character.statusSources = {};
    character.poisonedIndices = [];
    character.tauntDuration = 0;
    character.pendingUndeadLastStand = null;
    character.pendingUndeadReviveAction = false;
}

function getDamageTakenFactorEntries(character) {
    const statuses = Array.isArray(character?.status) ? character.status : [];
    return statuses
        .map(statusId => {
            const rule = STATUS_EFFECT_RULES[statusId];
            if (!rule) return null;
            if (typeof rule.damageTakenDelta === 'number') {
                return {
                    statusId,
                    factor: Math.max(0, 1 + rule.damageTakenDelta * getStatusStackCount(character, statusId))
                };
            }
            return typeof rule.damageTakenFactor === 'number'
                ? { statusId, factor: rule.damageTakenFactor }
                : null;
        })
        .filter(Boolean);
}

export function getStatusDefenseMultiplier(character) {
    return getDamageTakenFactorEntries(character).reduce((multiplier, entry) => multiplier * entry.factor, 1);
}

function calculateStatusAdjustedDamageWithMitigation(baseDamage, target) {
    const factorEntries = getDamageTakenFactorEntries(target);

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
    const setBonusEvasion = target?.species === 'beast'
        ? Number(target?.activeSpeciesBonus?.beastEvasionChanceBonus || 0)
        : 0;
    return clamp(relativeAdvantage * 0.35 + setBonusEvasion, 0, 0.7);
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

function applyStatusAttack(commandId, statusId, actor, target, commandEffects) {
    const damage = commandEffects[commandId].calcDamage(actor);
    target.hp = Math.max(0, target.hp - damage);
    const addedStatus = addStatus(target, statusId);
    return { type: 'damageStatus', damage, status: statusId, addedStatus };
}

function formatStatusAttackLog(event, commandName, statusLabel) {
    let message = `⚔️ ${event.actor.name}の「${commandName}」！ ${event.target.name}に ${event.damage} のダメージ！`;
    if (event.addedStatus) message += ` さらに ${event.target.name}を【${statusLabel}】にした！`;
    return message;
}

export const statusCommands = {
    // =========================================================================
    // 🤢 状態異常・弱体化系
    // =========================================================================
    "atk04": {
        name: "毒攻撃",
        desc: "単体 / 物理 ATK0.8x + 毒",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8),
        apply: ({ actor, target, commandEffects }) => applyStatusAttack("atk04", "poison", actor, target, commandEffects),
        formatLog: (event) => formatStatusAttackLog(event, "毒攻撃", "毒")
    },
    "atk_paralyze": {
        name: "マヒ攻撃",
        desc: "単体 / 物理 ATK0.9x + マヒ",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.9),
        apply: ({ actor, target, commandEffects }) => applyStatusAttack("atk_paralyze", "paralysis", actor, target, commandEffects),
        formatLog: (event) => formatStatusAttackLog(event, "マヒ攻撃", "マヒ")
    },
    "atk_weaken": {
        name: "弱体化攻撃",
        desc: "単体 / 魔法 INT1.0x + 脱力(ATK-30%、加算)",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.0),
        apply: ({ actor, target, commandEffects }) => applyStatusAttack("atk_weaken", "weak", actor, target, commandEffects),
        formatLog: (event) => formatStatusAttackLog(event, "弱体化攻撃", "脱力:ATK-30%")
    },
    "atk_weakened": {
        name: "弱体呪詛",
        desc: "単体 / 魔法 INT1.2x + 弱体(被ダメ+20%、加算)",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.2),
        apply: ({ actor, target, commandEffects }) => applyStatusAttack("atk_weakened", "weakened", actor, target, commandEffects),
        formatLog: (event) => formatStatusAttackLog(event, "弱体呪詛", "弱体:被ダメ+20%")
    },
    "atk_guard_break": {
        name: "防御崩し",
        desc: "単体 / 物理 ATK1.1x + 弱体(被ダメ+20%、加算)",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.1),
        apply: ({ actor, target, commandEffects }) => applyStatusAttack("atk_guard_break", "weakened", actor, target, commandEffects),
        formatLog: (event) => formatStatusAttackLog(event, "防御崩し", "弱体:被ダメ+20%")
    },
    "atk_prank": {
        name: "いやがらせ",
        desc: "単体 / 混合 (ATK+INT)0.45x + 脱力(ATK-30%、加算) + 弱体(被ダメ+20%、加算)",
        calcDamage: (attacker) => Math.floor((attacker.int + attacker.atk) * 0.45),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["atk_prank"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const addedWeak = addStatus(target, "weak");
            const addedWeakened = addStatus(target, "weakened");
            return { type: 'damageStatus', damage, status: 'weak,weakened', addedWeak, addedWeakened };
        },
        formatLog: (event) => {
            let message = `😈 ${event.actor.name}の「いやがらせ」！ ${event.target.name}に ${event.damage} のダメージ！`;
            if (event.addedWeak || event.addedWeakened) {
                message += ` さらに${event.addedWeak ? '【脱力:ATK-30%】' : ''}${event.addedWeakened ? '【弱体:被ダメ+20%】' : ''}状態にした！`;
            }
            return message;
        }
    }
};
