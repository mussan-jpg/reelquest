export function applyUndeadLastStand(character, beforeHp, requestedHpDamage) {
    const hpBeforeDamage = Math.floor(Number(beforeHp || 0));
    const hpDamage = Math.max(0, Math.floor(Number(requestedHpDamage || 0)));
    if (
        !character?.activeSpeciesBonus?.undeadLastStand
        || hpBeforeDamage <= 1
        || hpDamage < hpBeforeDamage
    ) {
        return { triggered: false, hpDamage };
    }

    character.hp = 0;
    character.pendingUndeadLastStand = {
        reviveToMaxReel: !!character.activeSpeciesBonus?.reviveToMaxReel,
        commandCount: Array.isArray(character.commands?.[0]) ? character.commands.length : 0
    };

    return {
        triggered: true,
        hpDamage: hpBeforeDamage
    };
}

export function resolvePendingUndeadLastStand(character) {
    if (!character?.pendingUndeadLastStand) return false;
    const pending = character.pendingUndeadLastStand;
    delete character.pendingUndeadLastStand;

    character.hp = Math.max(1, Math.floor(Number(character.hp || 0)) + 1);
    if (pending.reviveToMaxReel && Array.isArray(character.commands?.[0])) {
        character.currentReel = Math.max(0, Number(pending.commandCount || character.commands.length) - 1);
        character.undeadFinalReelLocked = true;
        character.pendingUndeadReviveAction = !!character.activeSpeciesBonus?.undeadImmediateReviveAction;
    }
    return true;
}
