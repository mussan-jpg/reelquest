import { applyUndeadLastStand } from './lastStand.js';

export function getShield(character) {
    return Math.max(0, Math.floor(Number(character?.shield || 0)));
}

export function addShield(character, amount) {
    if (!character) return 0;
    const multiplier = typeof character.shieldMultiplier === 'number' ? character.shieldMultiplier : 1;
    const shieldAmount = Math.max(0, Math.floor(Number(amount || 0) * multiplier));
    if (shieldAmount <= 0) return 0;
    character.shield = getShield(character) + shieldAmount;
    return shieldAmount;
}

export function applyShieldedDamage(character, damage, options = {}) {
    if (!character) {
        return { damage: 0, absorbed: 0, hpDamage: 0, remainingShield: 0 };
    }

    const totalDamage = Math.max(0, Math.floor(Number(damage || 0)));
    const baseHp = typeof options.baseHp === 'number' ? options.baseHp : character.hp;
    const currentShield = getShield(character);
    const absorbed = Math.min(currentShield, totalDamage);
    const requestedHpDamage = Math.max(0, totalDamage - absorbed);

    character.shield = currentShield - absorbed;
    character.hp = Math.max(0, baseHp - requestedHpDamage);
    const lastStand = applyUndeadLastStand(character, baseHp, requestedHpDamage);

    return {
        damage: totalDamage,
        absorbed,
        hpDamage: lastStand.hpDamage,
        lastStandTriggered: lastStand.triggered,
        remainingShield: character.shield
    };
}

export function clearShield(character) {
    if (!character) return;
    character.shield = 0;
}
