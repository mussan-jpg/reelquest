// battle/stats.js

function createEmptyStats(char, side, index) {
    return {
        id: char.id,
        name: char.name,
        image: char.image,
        side,
        index,
        damageDealt: 0,
        damageTaken: 0,
        healingDone: 0,
        damageMitigated: 0,
        statusInflicted: 0,
        statReduced: 0,
        statIncreased: 0
    };
}

function getParty(gameState, side) {
    return side === 'p' ? gameState.players : gameState.enemies;
}

function getStats(gameState, side, index) {
    return gameState.battleStats?.[side]?.[index] || null;
}

export function initBattleStats(gameState) {
    if (!gameState) return;
    gameState.battleStats = {
        p: (gameState.players || []).map((char, index) => createEmptyStats(char, 'p', index)),
        e: (gameState.enemies || []).map((char, index) => createEmptyStats(char, 'e', index))
    };
}

export function createBattleSnapshot(gameState) {
    const snapshotParty = (party) => party.map(char => ({
        hp: char.hp,
        status: [...(char.status || [])],
        atk: char.atk,
        int: char.int,
        spd: char.spd
    }));

    return {
        p: snapshotParty(gameState.players || []),
        e: snapshotParty(gameState.enemies || [])
    };
}

export function recordActionStats(gameState, beforeSnapshot, actorSide, actorIndex) {
    const actorStats = getStats(gameState, actorSide, actorIndex);
    if (!actorStats || !beforeSnapshot) return;

    ['p', 'e'].forEach(side => {
        const party = getParty(gameState, side);
        party.forEach((char, index) => {
            const before = beforeSnapshot[side]?.[index];
            const targetStats = getStats(gameState, side, index);
            if (!before || !targetStats) return;

            const hpDiff = before.hp - char.hp;
            if (hpDiff > 0) {
                targetStats.damageTaken += hpDiff;
                if (side !== actorSide) {
                    actorStats.damageDealt += hpDiff;
                }
            } else if (hpDiff < 0 && side === actorSide) {
                actorStats.healingDone += Math.abs(hpDiff);
            }

            const statDiff = ['atk', 'int', 'spd'].reduce((totals, key) => {
                const beforeValue = typeof before[key] === 'number' ? before[key] : char[key];
                const currentValue = typeof char[key] === 'number' ? char[key] : beforeValue;
                return {
                    increased: totals.increased + Math.max(0, currentValue - beforeValue),
                    reduced: totals.reduced + Math.max(0, beforeValue - currentValue)
                };
            }, { increased: 0, reduced: 0 });

            if (side === actorSide) {
                actorStats.statIncreased += statDiff.increased;
            }

            if (side !== actorSide) {
                const beforeStatuses = before.status || [];
                const addedStatuses = (char.status || []).filter(status => !beforeStatuses.includes(status));
                actorStats.statusInflicted += addedStatuses.length;
                if (addedStatuses.length > 0) {
                    if (!char.statusSources) char.statusSources = {};
                    addedStatuses.forEach(statusId => {
                        char.statusSources[statusId] = { side: actorSide, index: actorIndex };
                    });
                }

                actorStats.statReduced += statDiff.reduced;
            }
        });
    });
}

export function recordDamageMitigated(gameState, side, index, amount) {
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.damageMitigated += amount;
}

export function recordDamageTaken(gameState, side, index, amount) {
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.damageTaken += amount;
}

export function recordDamageDealt(gameState, side, index, amount) {
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.damageDealt += amount;
}
