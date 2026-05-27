// battle/stats.js

function createEmptyStats(char, side, index) {
    return {
        id: char.id,
        name: char.name,
        image: char.image,
        side,
        index,
        damageDealt: 0,
        damageResisted: 0,
        damageTaken: 0,
        healingDone: 0,
        shieldGranted: 0,
        damageMitigated: 0,
        shieldAbsorbed: 0,
        statusInflicted: 0,
        statReduced: 0,
        statIncreased: 0,
        statActiveGranted: 0,
        statActiveGrantedBy: { atk: 0, int: 0, spd: 0 }
    };
}

function createEmptySetStats(info = {}, side = 'p') {
    return {
        id: info.id || `${side}:${info.species || 'set'}:${info.tier || 0}`,
        name: info.name || info.label || 'セット効果',
        label: info.label || info.name || 'セット効果',
        species: info.species || 'set',
        tier: Number(info.tier || 0),
        side,
        damageDealt: 0,
        damageResisted: 0,
        damageTaken: 0,
        healingDone: 0,
        shieldGranted: 0,
        damageMitigated: 0,
        shieldAbsorbed: 0,
        statusInflicted: 0,
        statReduced: 0,
        statIncreased: 0,
        statActiveGranted: 0,
        statActiveGrantedBy: { atk: 0, int: 0, spd: 0 },
        statIncreasedBy: { atk: 0, int: 0, spd: 0 },
        breakdown: {}
    };
}

function getParty(gameState, side) {
    return side === 'p' ? gameState.players : gameState.enemies;
}

function getStats(gameState, side, index) {
    return gameState.battleStats?.[side]?.[index] || null;
}

function getSetInfoFromCharacter(gameState, side, index, setInfo = null) {
    if (setInfo?.species || setInfo?.name) return setInfo;
    const char = getParty(gameState, side)?.[index];
    return char?.activeSpeciesBonus || char?.activeSpeciesBonuses?.[0] || null;
}

function getSetStats(gameState, side, index, setInfo = null) {
    if (!gameState?.battleStats) return null;
    const info = getSetInfoFromCharacter(gameState, side, index, setInfo);
    if (!info) return null;
    if (!gameState.battleStats.set) gameState.battleStats.set = { p: {}, e: {} };
    if (!gameState.battleStats.set[side]) gameState.battleStats.set[side] = {};
    const species = info.species || 'set';
    const tier = Number(info.tier || 0);
    const key = `${species}:${tier}`;
    if (!gameState.battleStats.set[side][key]) {
        gameState.battleStats.set[side][key] = createEmptySetStats({ ...info, id: key }, side);
    }
    return gameState.battleStats.set[side][key];
}

function addSetMetric(gameState, side, index, metric, amount, options = {}) {
    const value = Math.max(0, Math.floor(Number(amount || 0)));
    if (value <= 0) return;
    const stats = getSetStats(gameState, side, index, options.setInfo);
    if (!stats) return;
    stats[metric] = (stats[metric] || 0) + value;
    if (metric === 'statIncreased') {
        addSetStatBreakdown(stats, options.statBreakdown);
    }
    const kind = options.sourceKind || 'directEffect';
    stats.breakdown[kind] = (stats.breakdown[kind] || 0) + value;
}

function addSetStatBreakdown(stats, statBreakdown = {}) {
    if (!stats) return;
    if (!stats.statIncreasedBy) stats.statIncreasedBy = { atk: 0, int: 0, spd: 0 };
    ['atk', 'int', 'spd'].forEach(stat => {
        const value = Math.max(0, Math.floor(Number(statBreakdown?.[stat] || 0)));
        if (value > 0) stats.statIncreasedBy[stat] = (stats.statIncreasedBy[stat] || 0) + value;
    });
}

function shouldRecordSet(options = {}) {
    return options.source === 'set' || options.statSource === 'set';
}

export function initBattleStats(gameState) {
    if (!gameState) return;
    gameState.battleStats = {
        p: (gameState.players || []).map((char, index) => createEmptyStats(char, 'p', index)),
        e: (gameState.enemies || []).map((char, index) => createEmptyStats(char, 'e', index)),
        set: { p: {}, e: {} }
    };
}

export function createBattleSnapshot(gameState) {
    const snapshotParty = (party) => party.map(char => ({
        hp: char.hp,
        shield: char.shield || 0,
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

export function recordActionStats(gameState, beforeSnapshot, actorSide, actorIndex, options = {}) {
    const actorStats = getStats(gameState, actorSide, actorIndex);
    const setSource = shouldRecordSet(options);
    const setStats = setSource ? getSetStats(gameState, actorSide, actorIndex, options.setInfo) : null;
    if ((!actorStats && !setStats) || !beforeSnapshot) return;

    ['p', 'e'].forEach(side => {
        const party = getParty(gameState, side);
        party.forEach((char, index) => {
            const before = beforeSnapshot[side]?.[index];
            const targetStats = getStats(gameState, side, index);
            if (!before || !targetStats) return;

            const hpDiff = before.hp - char.hp;
            if (hpDiff > 0) {
                if (setSource && side !== actorSide) {
                    setStats.damageDealt += hpDiff;
                    const kind = options.sourceKind || 'directEffect';
                    setStats.breakdown[kind] = (setStats.breakdown[kind] || 0) + hpDiff;
                } else if (!setSource) {
                    targetStats.damageTaken += hpDiff;
                }
                if (!setSource && side !== actorSide) {
                    actorStats.damageDealt += hpDiff;
                }
            } else if (hpDiff < 0 && side === actorSide && setSource) {
                setStats.healingDone += Math.abs(hpDiff);
            } else if (hpDiff < 0 && side === actorSide) {
                actorStats.healingDone += Math.abs(hpDiff);
            }

            const shieldDiff = Math.max(0, Math.floor(Number(char.shield || 0))) - Math.max(0, Math.floor(Number(before.shield || 0)));
            if (shieldDiff > 0 && side === actorSide && setSource) {
                setStats.shieldGranted += shieldDiff;
            } else if (shieldDiff > 0 && side === actorSide) {
                actorStats.shieldGranted += shieldDiff;
            }

            const statDiff = ['atk', 'int', 'spd'].reduce((totals, key) => {
                const beforeValue = typeof before[key] === 'number' ? before[key] : char[key];
                const currentValue = typeof char[key] === 'number' ? char[key] : beforeValue;
                const increased = Math.max(0, currentValue - beforeValue);
                const reduced = Math.max(0, beforeValue - currentValue);
                return {
                    increased: totals.increased + increased,
                    reduced: totals.reduced + reduced,
                    increasedBy: { ...totals.increasedBy, [key]: totals.increasedBy[key] + increased },
                    reducedBy: { ...totals.reducedBy, [key]: totals.reducedBy[key] + reduced }
                };
            }, { increased: 0, reduced: 0, increasedBy: { atk: 0, int: 0, spd: 0 }, reducedBy: { atk: 0, int: 0, spd: 0 } });

            if (side === actorSide && setSource) {
                setStats.statIncreased += statDiff.increased;
                addSetStatBreakdown(setStats, statDiff.increasedBy);
            } else if (side === actorSide) {
                actorStats.statIncreased += statDiff.increased;
            }

            if (side !== actorSide) {
                const beforeStatuses = before.status || [];
                const addedStatuses = (char.status || []).filter(status => !beforeStatuses.includes(status));
                if (setSource) {
                    setStats.statusInflicted += addedStatuses.length;
                } else {
                    actorStats.statusInflicted += addedStatuses.length;
                }
                if (addedStatuses.length > 0) {
                    if (!char.statusSources) char.statusSources = {};
                    addedStatuses.forEach(statusId => {
                        char.statusSources[statusId] = { side: actorSide, index: actorIndex };
                    });
                }

                if (setSource) {
                    setStats.statReduced += statDiff.reduced;
                } else {
                    actorStats.statReduced += statDiff.reduced;
                }
            }
        });
    });
}

export function recordDamageMitigated(gameState, side, index, amount, options = {}) {
    if (shouldRecordSet(options)) {
        addSetMetric(gameState, side, index, 'damageMitigated', amount, options);
        return;
    }
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.damageMitigated += amount;
}

export function recordShieldAbsorbed(gameState, side, index, amount) {
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.shieldAbsorbed = (stats.shieldAbsorbed || 0) + amount;
    stats.damageMitigated += amount;
}

export function recordDamageTaken(gameState, side, index, amount, options = {}) {
    if (shouldRecordSet(options)) {
        addSetMetric(gameState, side, index, 'damageTaken', amount, options);
        return;
    }
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.damageTaken += amount;
}

export function recordDamageDealt(gameState, side, index, amount, options = {}) {
    if (shouldRecordSet(options)) {
        addSetMetric(gameState, side, index, 'damageDealt', amount, options);
        return;
    }
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.damageDealt += amount;
}

export function recordDamageResisted(gameState, side, index, amount, options = {}) {
    if (shouldRecordSet(options)) {
        addSetMetric(gameState, side, index, 'damageResisted', amount, options);
        return;
    }
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.damageResisted = (stats.damageResisted || 0) + amount;
}

export function recordShieldGranted(gameState, side, index, amount, options = {}) {
    if (shouldRecordSet(options)) {
        addSetMetric(gameState, side, index, 'shieldGranted', amount, options);
        return;
    }
    const stats = getStats(gameState, side, index);
    if (!stats || amount <= 0) return;
    stats.shieldGranted = (stats.shieldGranted || 0) + amount;
}

export function recordSetHealingDone(gameState, side, index, amount, options = {}) {
    addSetMetric(gameState, side, index, 'healingDone', amount, { ...options, source: 'set' });
}

export function recordSetStatusInflicted(gameState, side, index, amount, options = {}) {
    addSetMetric(gameState, side, index, 'statusInflicted', amount, { ...options, source: 'set' });
}

export function recordSetStatReduced(gameState, side, index, amount, options = {}) {
    addSetMetric(gameState, side, index, 'statReduced', amount, { ...options, source: 'set' });
}

export function recordSetStatIncreased(gameState, side, index, amount, options = {}) {
    addSetMetric(gameState, side, index, 'statIncreased', amount, { ...options, source: 'set' });
}

export function recordSetActiveStatGranted(gameState, side, index, statBreakdown = {}, options = {}) {
    const stats = getSetStats(gameState, side, index, options.setInfo);
    if (!stats) return;
    if (!stats.statActiveGrantedBy) stats.statActiveGrantedBy = { atk: 0, int: 0, spd: 0 };

    ['atk', 'int', 'spd'].forEach(stat => {
        const value = Math.max(0, Math.floor(Number(statBreakdown?.[stat] || 0)));
        stats.statActiveGrantedBy[stat] = Math.max(stats.statActiveGrantedBy[stat] || 0, value);
    });

    stats.statActiveGranted = Object.values(stats.statActiveGrantedBy)
        .reduce((total, value) => total + Math.max(0, Math.floor(Number(value || 0))), 0);
}
