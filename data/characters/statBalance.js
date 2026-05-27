// data/characters/statBalance.js

// 簡易スコア = HP / 5 + ATK + INT + SPD
// 1枠キャラのGrade基準値。2枠/3枠は下の倍率を掛ける。
export const GRADE_SIMPLE_SCORE_TARGETS = Object.freeze({
    1: 50,
    2: 60,
    3: 71,
    4: 87,
    5: 101,
    6: 121
});

export const SLOT_SCORE_MULTIPLIERS = Object.freeze({
    1: 1,
    2: 1.2,
    3: 1.5,
    4: 1.5
});

export function getRarityFromCommands(commands) {
    if (typeof commands === 'string') return 1;
    if (!Array.isArray(commands)) return 1;
    return Array.isArray(commands[0]) ? commands.length : 1;
}

export function getCharacterGrade(char) {
    return Math.max(1, Math.min(6, Number(char?.rarity || getRarityFromCommands(char?.commands))));
}

export function getCharacterSlotCost(char) {
    return Math.max(1, Math.min(4, Number(char?.slotCost || 1)));
}

export function calculateSimpleStatScore(stats = {}) {
    return Number(stats.hp || 0) / 5
        + Number(stats.atk || 0)
        + Number(stats.int || 0)
        + Number(stats.spd || 0);
}

export function getTargetSimpleStatScore(char) {
    const grade = getCharacterGrade(char);
    const slotCost = getCharacterSlotCost(char);
    const baseTarget = GRADE_SIMPLE_SCORE_TARGETS[grade] || GRADE_SIMPLE_SCORE_TARGETS[5];
    const slotMultiplier = SLOT_SCORE_MULTIPLIERS[slotCost] || SLOT_SCORE_MULTIPLIERS[1];
    const profile = char?.statProfile || {};
    if (Number.isFinite(Number(profile.scoreTarget))) {
        return Math.max(1, Number(profile.scoreTarget));
    }
    return baseTarget * slotMultiplier * Math.max(0.1, Number(profile.scoreMultiplier || 1));
}

function getPrimaryStat(stats, profile = {}) {
    if (['hp', 'atk', 'int', 'spd'].includes(profile.primaryStat)) return profile.primaryStat;
    const entries = [
        ['hp', Number(stats.hp || 0) / 5],
        ['atk', Number(stats.atk || 0)],
        ['int', Number(stats.int || 0)],
        ['spd', Number(stats.spd || 0)]
    ];
    return entries.sort((a, b) => b[1] - a[1])[0]?.[0] || 'atk';
}

function applyStatProfileWeights(stats, profile = {}) {
    return {
        hp: Math.max(1, Number(stats.hp || 1) * Math.max(0.1, Number(profile.hpWeight || 1))),
        atk: Math.max(1, Number(stats.atk || 1) * Math.max(0.1, Number(profile.atkWeight || 1))),
        int: Math.max(1, Number(stats.int || 1) * Math.max(0.1, Number(profile.intWeight || 1))),
        spd: Math.max(1, Number(stats.spd || 1) * Math.max(0.1, Number(profile.spdWeight || 1)))
    };
}

function nudgeStatsTowardTarget(stats, targetScore, primaryStat) {
    const adjusted = { ...stats };
    const maxIterations = 80;
    for (let i = 0; i < maxIterations; i += 1) {
        const score = calculateSimpleStatScore(adjusted);
        const diff = targetScore - score;
        if (Math.abs(diff) < 0.5) break;

        if (primaryStat === 'hp') {
            const delta = diff > 0 ? 5 : -5;
            adjusted.hp = Math.max(1, adjusted.hp + delta);
        } else {
            adjusted[primaryStat] = Math.max(1, adjusted[primaryStat] + (diff > 0 ? 1 : -1));
        }
    }
    return adjusted;
}

export function normalizeCharacterStats(char) {
    const profile = char?.statProfile || {};
    const rawStats = {
        hp: Number(char?.hp ?? char?.maxHp ?? 100),
        atk: Number(char?.atk ?? 10),
        int: Number(char?.int ?? 10),
        spd: Number(char?.spd ?? 10)
    };
    if (profile.skipNormalization) {
        return {
            ...char,
            hp: Math.round(rawStats.hp),
            maxHp: Math.round(char?.maxHp ?? rawStats.hp),
            baseMaxHp: Math.round(char?.baseMaxHp ?? char?.maxHp ?? rawStats.hp),
            atk: Math.round(rawStats.atk),
            int: Math.round(rawStats.int),
            spd: Math.round(rawStats.spd)
        };
    }

    const weightedStats = applyStatProfileWeights(rawStats, profile);
    const currentScore = Math.max(1, calculateSimpleStatScore(weightedStats));
    const targetScore = getTargetSimpleStatScore(char);
    const scale = targetScore / currentScore;
    const primaryStat = getPrimaryStat(weightedStats, profile);
    const scaledStats = {
        hp: Math.max(1, Math.round(weightedStats.hp * scale)),
        atk: Math.max(1, Math.round(weightedStats.atk * scale)),
        int: Math.max(1, Math.round(weightedStats.int * scale)),
        spd: Math.max(1, Math.round(weightedStats.spd * scale))
    };
    const normalized = nudgeStatsTowardTarget(scaledStats, targetScore, primaryStat);
    const simpleStatScore = Number(calculateSimpleStatScore(normalized).toFixed(1));

    return {
        ...char,
        hp: normalized.hp,
        maxHp: normalized.hp,
        baseMaxHp: normalized.hp,
        atk: normalized.atk,
        int: normalized.int,
        spd: normalized.spd,
        baseAtk: normalized.atk,
        baseInt: normalized.int,
        baseSpd: normalized.spd,
        simpleStatScore,
        targetSimpleStatScore: Number(targetScore.toFixed(1))
    };
}
