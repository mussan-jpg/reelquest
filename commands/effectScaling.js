export const SLOT_EFFECT_MULTIPLIERS = Object.freeze({
    1: 1,
    2: 1.1,
    3: 1.2,
    4: 1.2
});

export function getSlotEffectMultiplier(actor) {
    const slotCost = Math.max(1, Math.min(4, Math.floor(Number(actor?.slotCost || 1))));
    return SLOT_EFFECT_MULTIPLIERS[slotCost] || 1;
}

export function getSlotScalingText(actor) {
    const multiplier = getSlotEffectMultiplier(actor);
    return multiplier > 1 ? `（枠数効果補正x${multiplier}）` : '';
}
