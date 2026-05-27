import { masterCharacters } from './data/characters/index.js';
import { Character } from './gameData.js';

export const DEFAULT_PARTY_SLOT_LIMIT = 4; // Change to 3 for 3v3, or 4 for 4v4.
const configuredPartySlotLimit = globalThis?.REELQUEST_PARTY_SLOT_LIMIT
    ?? globalThis?.process?.env?.REELQUEST_PARTY_SLOT_LIMIT
    ?? DEFAULT_PARTY_SLOT_LIMIT;
export const PARTY_SLOT_LIMIT = Math.max(3, Math.min(4, Number(configuredPartySlotLimit || DEFAULT_PARTY_SLOT_LIMIT)));
export const MAX_UNIT_TIER = 3;
export const UNIT_TIER_STAT_MULTIPLIERS = { 1: 1, 2: 1, 3: 1 };
export const UNIT_TIER_SPECIES_POINT_BONUS = { 1: 0, 2: 0, 3: 0 };
export const LIMIT_BREAK_REQUIRED_BATTLES = 3;
export const LIMIT_BREAK_MAX_LEVEL = 2;
export const LIMIT_BREAK_TOTAL_REQUIRED_BATTLES = LIMIT_BREAK_REQUIRED_BATTLES * LIMIT_BREAK_MAX_LEVEL;
export const LIMIT_BREAK_STAT_MULTIPLIER = 1.2;
export const LIMIT_BREAK_SPECIES_POINTS_BY_LEVEL = { 1: 2, 2: 3 };
export const LIMIT_BREAK_SPECIES_POINTS = LIMIT_BREAK_SPECIES_POINTS_BY_LEVEL[1];

export function getPartySlotLimit(config = {}) {
    return Math.max(3, Math.min(4, Number(config.partySlotLimit || config.party_slot_limit || PARTY_SLOT_LIMIT)));
}

export function getSlotCost(charOrData) {
    return Math.max(1, Number(charOrData?.slotCost || 1));
}

export function getUnitTier(charOrData) {
    return 1;
}

export function getUnitTierSpeciesPointBonus(charOrData) {
    return UNIT_TIER_SPECIES_POINT_BONUS[getUnitTier(charOrData)] || 0;
}

export function getSpeciesPoints(charOrData) {
    const limitBreakLevel = getLimitBreakLevel(charOrData);
    return limitBreakLevel > 0
        ? LIMIT_BREAK_SPECIES_POINTS_BY_LEVEL[Math.min(LIMIT_BREAK_MAX_LEVEL, limitBreakLevel)] || LIMIT_BREAK_SPECIES_POINTS
        : getSlotCost(charOrData) + getUnitTierSpeciesPointBonus(charOrData);
}

export function getOccupiedSlots(party = []) {
    return party.reduce((total, char) => total + getSlotCost(char), 0);
}

export function getPartySpeciesPoints(party = []) {
    return party.reduce((total, char) => total + getSpeciesPoints(char), 0);
}

export function canFitInParty(party = [], candidate, removedCharacters = [], config = {}) {
    const occupied = getOccupiedSlots(party) - getOccupiedSlots(removedCharacters);
    return occupied + getSlotCost(candidate) <= getPartySlotLimit(config);
}

function ensureRunCharacterProgress(gameState) {
    if (!gameState || typeof gameState !== 'object') return null;
    if (!gameState.runCharacterProgress || typeof gameState.runCharacterProgress !== 'object') {
        gameState.runCharacterProgress = {};
    }
    return gameState.runCharacterProgress;
}

function getProgressEntry(gameState, characterId) {
    const progress = ensureRunCharacterProgress(gameState);
    if (!progress || !characterId) return null;
    if (!progress[characterId]) {
        progress[characterId] = { battles: 0, limitBreakLevel: 0 };
    } else if (progress[characterId].limitBreakLevel === undefined) {
        progress[characterId].limitBreakLevel = progress[characterId].limitBroken ? 1 : 0;
    }
    return progress[characterId];
}

function scalePermanentStat(char, stat, baseKey, activeBonusKey) {
    const activeBonus = Number(char?.activeSpeciesBonus?.[activeBonusKey] || 0);
    const currentBase = Math.max(1, Number(char?.[baseKey] ?? char?.[stat] ?? 1));
    const permanentBase = Math.max(1, currentBase - activeBonus);
    const scaledBase = Math.max(1, Math.floor(permanentBase * LIMIT_BREAK_STAT_MULTIPLIER));
    const delta = scaledBase - permanentBase;

    char[baseKey] = scaledBase + activeBonus;
    char[stat] = Math.max(1, Number(char[stat] || 1) + delta);
}

export function isLimitBroken(charOrData) {
    return getLimitBreakLevel(charOrData) > 0;
}

export function getLimitBreakLevel(charOrData) {
    if (!charOrData) return 0;
    const rawLevel = Number(charOrData.limitBreakLevel ?? charOrData.limit_break_level ?? 0);
    if (rawLevel > 0) return Math.max(0, Math.min(LIMIT_BREAK_MAX_LEVEL, Math.floor(rawLevel)));
    return (charOrData.isLimitBroken || charOrData.limitBroken || charOrData.limit_broken) ? 1 : 0;
}

export function getCharacterLevel(charOrData) {
    return Math.min(LIMIT_BREAK_MAX_LEVEL + 1, getLimitBreakLevel(charOrData) + 1);
}

export function getLimitBreakRequiredBattlesForLevel(level) {
    return LIMIT_BREAK_REQUIRED_BATTLES * Math.max(1, Math.min(LIMIT_BREAK_MAX_LEVEL, Number(level || 1)));
}

export function getLimitBreakDisplayText(charOrData) {
    const level = getLimitBreakLevel(charOrData);
    const characterLevel = getCharacterLevel(charOrData);
    const battles = Math.min(LIMIT_BREAK_TOTAL_REQUIRED_BATTLES, Math.max(0, Number(charOrData?.limitBreakExp || charOrData?.limit_break_exp || 0)));
    if (level >= LIMIT_BREAK_MAX_LEVEL) return `現在Lv${characterLevel}`;
    if (level > 0) return `現在Lv${characterLevel} EXP ${battles}/${LIMIT_BREAK_TOTAL_REQUIRED_BATTLES}`;
    return `現在Lv1 EXP ${battles}/${getLimitBreakRequiredBattlesForLevel(1)}`;
}

export function applyLimitBreakToCharacter(char, targetLevel = getLimitBreakLevel(char)) {
    if (!char) return false;
    const desiredLevel = Math.max(0, Math.min(LIMIT_BREAK_MAX_LEVEL, Number(targetLevel || 0)));
    let appliedLevel = Math.max(0, Math.min(LIMIT_BREAK_MAX_LEVEL, Number(
        typeof char.limitBreakApplied === 'number'
            ? char.limitBreakApplied
            : char.limitBreakApplied
                ? 1
                : 0
    )));
    if (desiredLevel <= appliedLevel) return false;

    const wasDefeated = Number(char.hp || 0) <= 0;
    while (appliedLevel < desiredLevel) {
        const activeHpBonus = Number(char?.activeSpeciesBonus?.hpBonus || 0);
        const currentBaseMaxHp = Math.max(1, Number(char.baseMaxHp ?? (char.maxHp - activeHpBonus) ?? char.maxHp ?? 1));
        const scaledBaseMaxHp = Math.max(1, Math.floor(currentBaseMaxHp * LIMIT_BREAK_STAT_MULTIPLIER));
        const hpDelta = scaledBaseMaxHp - currentBaseMaxHp;

        char.baseMaxHp = scaledBaseMaxHp;
        char.maxHp = Math.max(1, Number(char.maxHp || 1) + hpDelta);
        char.hp = wasDefeated ? 0 : Math.max(1, Number(char.hp || 1) + hpDelta);

        scalePermanentStat(char, 'atk', 'baseAtk', 'atkBonus');
        scalePermanentStat(char, 'int', 'baseInt', 'intBonus');
        scalePermanentStat(char, 'spd', 'baseSpd', 'spdBonus');
        appliedLevel += 1;
    }

    char.limitBreakLevel = desiredLevel;
    char.isLimitBroken = desiredLevel > 0;
    char.limitBreakApplied = desiredLevel;
    char.limitBreakStatMultiplier = LIMIT_BREAK_STAT_MULTIPLIER;
    return true;
}

export function applyRunProgressToCharacter(gameState, character) {
    if (!character) return character;
    const entry = getProgressEntry(gameState, character.id);
    if (!entry) return character;

    const level = Math.max(getLimitBreakLevel(entry), Math.min(LIMIT_BREAK_MAX_LEVEL, Math.floor(Number(entry.battles || 0) / LIMIT_BREAK_REQUIRED_BATTLES)));
    entry.limitBreakLevel = level;
    entry.limitBroken = level > 0;
    character.limitBreakExp = Math.min(LIMIT_BREAK_TOTAL_REQUIRED_BATTLES, Math.max(0, Number(entry.battles || 0)));
    character.limitBreakLevel = level;
    character.isLimitBroken = level > 0;
    if (level > 0) {
        applyLimitBreakToCharacter(character, level);
    }
    return character;
}

export function recordBattleParticipation(gameState, party = gameState?.players || []) {
    const progress = ensureRunCharacterProgress(gameState);
    if (!progress) return [];

    return (party || []).filter(Boolean).map(char => {
        const entry = getProgressEntry(gameState, char.id);
        const beforeLevel = getLimitBreakLevel(entry);
        if (beforeLevel < LIMIT_BREAK_MAX_LEVEL) {
            entry.battles = Math.min(LIMIT_BREAK_TOTAL_REQUIRED_BATTLES, Number(entry.battles || 0) + 1);
        }
        const afterLevel = Math.min(LIMIT_BREAK_MAX_LEVEL, Math.floor(Number(entry.battles || 0) / LIMIT_BREAK_REQUIRED_BATTLES));
        entry.limitBreakLevel = Math.max(beforeLevel, afterLevel);
        entry.limitBroken = entry.limitBreakLevel > 0;
        if (entry.limitBreakLevel > beforeLevel) {
            applyLimitBreakToCharacter(char, entry.limitBreakLevel);
        }
        char.limitBreakExp = Math.min(LIMIT_BREAK_TOTAL_REQUIRED_BATTLES, Number(entry.battles || 0));
        char.limitBreakLevel = entry.limitBreakLevel;
        char.isLimitBroken = entry.limitBreakLevel > 0;
        return {
            char,
            battles: char.limitBreakExp,
            limitBroken: char.isLimitBroken,
            limitBreakLevel: char.limitBreakLevel,
            newlyLimitBroken: entry.limitBreakLevel > beforeLevel,
            newlyLimitBrokenLevel: entry.limitBreakLevel > beforeLevel ? entry.limitBreakLevel : 0
        };
    });
}

export function resetRunCharacterProgress(gameState) {
    if (!gameState || typeof gameState !== 'object') return;
    gameState.runCharacterProgress = {};
    gameState.lastBattleProgressEvents = [];
}

export function createCharacterFromData(data, options = {}) {
    if (!data) return null;
    const charData = JSON.parse(JSON.stringify(data));

    if (typeof charData.commands === 'string') {
        charData.commands = charData.commands.split(',').map(c => [c]);
    } else if (Array.isArray(charData.commands) && !Array.isArray(charData.commands[0])) {
        charData.commands = [charData.commands];
    }

    charData.unitTier = getUnitTier(charData);
    charData.originalRarity = charData.originalRarity || charData.rarity;
    const tierMultiplier = UNIT_TIER_STAT_MULTIPLIERS[charData.unitTier] || 1;
    if (tierMultiplier !== 1) {
        ['hp', 'maxHp', 'baseMaxHp', 'atk', 'int', 'spd', 'baseAtk', 'baseInt', 'baseSpd'].forEach(key => {
            if (typeof charData[key] === 'number') {
                charData[key] = Math.max(1, Math.floor(charData[key] * tierMultiplier));
            }
        });
    }

    const character = new Character(charData);
    character.currentReel = 0;
    character.shield = 0;
    character.poisonedIndices = [];
    character.status = [];
    applyRunProgressToCharacter(options.gameState, character);
    return character;
}

export function createCharacterById(id) {
    return createCharacterFromData(masterCharacters.find(char => char.id === id));
}
