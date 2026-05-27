const CURE_PRIORITY = ['paralysis', 'poison', 'weakened', 'weak', 'taunt', 'hidden'];
const SELF_TARGET_COMMANDS = new Set([
    'cmd_cover',
    'cmd_barrier',
    'cmd_aegis_deploy',
    'cmd_aegis_fortress',
    'cmd_team_barrier'
]);
const SUPPORT_REEL_UP_COMMANDS = new Set(['misc_support_reel_up', 'misc_support_reel_up2']);

export function getParty(gameState, side) {
    return side === 'p' ? (gameState?.players || []) : (gameState?.enemies || []);
}

export function getEnemySide(side) {
    return side === 'p' ? 'e' : 'p';
}

export function getHpRatio(char) {
    return Math.max(0, Number(char?.hp || 0)) / Math.max(1, Number(char?.maxHp || 1));
}

export function getMissingHp(char) {
    return Math.max(0, Math.floor(Number(char?.maxHp || 0) - Number(char?.hp || 0)));
}

export function getShieldValue(char) {
    return Math.max(0, Math.floor(Number(char?.shield || 0)));
}

export function getLivingParty(gameState, side) {
    return getParty(gameState, side)
        .map((char, index) => ({ data: char, char, prefix: side, index }))
        .filter(item => item.data.hp > 0);
}

export function canReelUp(char) {
    const maxReelIndex = Array.isArray(char?.commands?.[0]) ? char.commands.length - 1 : 0;
    return (char?.currentReel || 0) < maxReelIndex;
}

export function getAttackTargetCandidates(enemies = []) {
    if (!Array.isArray(enemies) || enemies.length <= 1) return enemies;
    const visibleEnemies = enemies.filter(item => !item.data.status?.includes('hidden'));
    return visibleEnemies.length > 0 ? visibleEnemies : enemies;
}

export function sortByLowestEffectiveDurability(a, b) {
    const aDurability = a.data.hp + getShieldValue(a.data);
    const bDurability = b.data.hp + getShieldValue(b.data);
    if (aDurability !== bDurability) return aDurability - bDurability;
    return getHpRatio(a.data) - getHpRatio(b.data);
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)] || null;
}

function getCurePriority(char) {
    const statuses = Array.isArray(char?.status) ? char.status : [];
    const index = CURE_PRIORITY.findIndex(statusId => statuses.includes(statusId));
    return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function sortByHealingPriority(healAmount = 0) {
    return (a, b) => {
        const aMissing = getMissingHp(a.data);
        const bMissing = getMissingHp(b.data);
        const aEffectiveHeal = healAmount > 0 ? Math.min(aMissing, healAmount) : aMissing;
        const bEffectiveHeal = healAmount > 0 ? Math.min(bMissing, healAmount) : bMissing;
        if (bEffectiveHeal !== aEffectiveHeal) return bEffectiveHeal - aEffectiveHeal;

        const ratioDiff = getHpRatio(a.data) - getHpRatio(b.data);
        if (Math.abs(ratioDiff) > 0.001) return ratioDiff;
        return bMissing - aMissing;
    };
}

export function selectHealingTarget(commandId, actor, allies, options = {}) {
    if (!allies?.length) return null;

    if (commandId === 'heal_cure') {
        const afflicted = allies.filter(item => getCurePriority(item.data) !== Number.POSITIVE_INFINITY);
        const candidates = afflicted.length ? afflicted : allies;
        return [...candidates].sort((a, b) => {
            const priorityDiff = getCurePriority(a.data) - getCurePriority(b.data);
            if (priorityDiff !== 0) return priorityDiff;
            return getHpRatio(a.data) - getHpRatio(b.data);
        })[0];
    }

    const injured = allies.filter(item => getMissingHp(item.data) > 0);
    const candidates = injured.length ? injured : allies;
    const healAmount = Math.max(0, Math.floor(options.getHealAmount?.(commandId, actor) || 0));
    return [...candidates].sort(sortByHealingPriority(healAmount))[0];
}

export function determineTarget(commandId, attackerIdx, currentSide, gameState, options = {}) {
    const policy = options.policy || 'random';
    const myParty = getParty(gameState, currentSide);
    const enemySide = getEnemySide(currentSide);
    const actor = myParty[attackerIdx];
    if (!actor) return null;

    if (SUPPORT_REEL_UP_COMMANDS.has(commandId)) {
        const allies = myParty
            .map((char, index) => ({ data: char, char, prefix: currentSide, index }))
            .filter(item => item.data.hp > 0 && item.index !== attackerIdx && canReelUp(item.data));
        if (!allies.length) return { data: actor, char: actor, prefix: currentSide, index: attackerIdx };
        if (policy === 'heuristic') {
            return [...allies].sort((a, b) => {
                const bMaxReel = Array.isArray(b.data.commands?.[0]) ? b.data.commands.length : 1;
                const aMaxReel = Array.isArray(a.data.commands?.[0]) ? a.data.commands.length : 1;
                if (bMaxReel !== aMaxReel) return bMaxReel - aMaxReel;
                return (a.data.currentReel || 0) - (b.data.currentReel || 0);
            })[0];
        }
        return randomItem(allies);
    }

    if (commandId.startsWith('cmd_up')
        || commandId.startsWith('cmd_down')
        || commandId.startsWith('misc')
        || SELF_TARGET_COMMANDS.has(commandId)) {
        return { data: actor, char: actor, prefix: currentSide, index: attackerIdx };
    }

    if (commandId === 'cmd_shield') {
        const allies = getLivingParty(gameState, currentSide);
        if (!allies.length) return { data: actor, char: actor, prefix: currentSide, index: attackerIdx };
        return policy === 'heuristic'
            ? [...allies].sort(sortByLowestEffectiveDurability)[0]
            : randomItem(allies);
    }

    if (commandId.includes('heal')) {
        const allies = getLivingParty(gameState, currentSide);
        return allies.length
            ? selectHealingTarget(commandId, actor, allies, options)
            : { data: actor, char: actor, prefix: currentSide, index: attackerIdx };
    }

    const enemies = getAttackTargetCandidates(getLivingParty(gameState, enemySide));
    if (!enemies.length) return null;
    const tauntingEnemies = enemies.filter(item => item.data.status?.includes('taunt'));
    const candidates = tauntingEnemies.length ? tauntingEnemies : enemies;

    if (policy === 'heuristic') {
        const estimateDamage = options.estimateDamage || (() => 0);
        const damage = estimateDamage(commandId, actor, candidates[0]?.data);
        const killable = candidates
            .filter(item => item.data.hp + getShieldValue(item.data) <= damage)
            .sort(sortByLowestEffectiveDurability);
        if (killable.length) return killable[0];

        return [...candidates].sort((a, b) => {
            const hpDiff = getHpRatio(a.data) - getHpRatio(b.data);
            if (Math.abs(hpDiff) > 0.2) return hpDiff;
            const aThreat = (a.data.atk || 0) + (a.data.int || 0);
            const bThreat = (b.data.atk || 0) + (b.data.int || 0);
            return bThreat - aThreat;
        })[0];
    }

    return randomItem(candidates);
}
