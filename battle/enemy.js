// battle/enemy.js
import { masterCharacters } from '../data/characters/index.js';
import { createCharacterFromData, getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';

export const ADVENTURE_MAX_FLOOR = 7;

// キャラクターのレアリティ（リール数）を計算する
export function getCharacterRarityInternal(charData) {
    if (!charData) return 1;
    if (charData.rarity) return charData.rarity;
    const cmds = charData.commands;
    if (typeof cmds === 'string') {
        return cmds.split(',').length;
    }
    if (Array.isArray(cmds)) {
        if (Array.isArray(cmds[0])) {
            return cmds.length;
        }
        return 1;
    }
    return 1;
}

export function getRarityById(id) {
    const data = masterCharacters.find(c => c.id === id);
    return getCharacterRarityInternal(data);
}

// ランダムな敵パーティを生成する
export function getFloorRarityRange(currentFloor) {
    if (currentFloor === 1) return { minRarity: 1, maxRarity: 1 };
    if (currentFloor === 2) return { minRarity: 1, maxRarity: 2 };
    if (currentFloor === 3) return { minRarity: 1, maxRarity: 3 };
    if (currentFloor === 4) return { minRarity: 2, maxRarity: 3 };
    if (currentFloor === 5) return { minRarity: 3, maxRarity: 4 };
    if (currentFloor === 6) return { minRarity: 4, maxRarity: 5 };
    return { minRarity: 5, maxRarity: 6 };
}

export function shouldIncludeSpecialEnemies(currentFloor) {
    return Number(currentFloor || 1) >= ADVENTURE_MAX_FLOOR;
}

function getFloorEnemyStatMultiplier(currentFloor) {
    const floor = Math.max(1, Number(currentFloor || 1));
    if (floor <= 1) return 0.85;
    if (floor === 2) return 0.9;
    if (floor === 3) return 0.95;
    if (floor === 4) return 1.0;
    if (floor === 5) return 1.05;
    if (floor === 6) return 1.12;
    return 1.25;
}

function applyFloorEnemyScaling(enemy, currentFloor) {
    if (!enemy) return enemy;
    const multiplier = getFloorEnemyStatMultiplier(currentFloor);
    ['maxHp', 'baseMaxHp', 'atk', 'baseAtk', 'int', 'baseInt', 'spd', 'baseSpd'].forEach(stat => {
        if (typeof enemy[stat] === 'number') {
            enemy[stat] = Math.max(1, Math.floor(enemy[stat] * multiplier));
        }
    });
    enemy.hp = enemy.maxHp;
    enemy.floorPowerMultiplier = multiplier;
    return enemy;
}

function chooseRandomCandidate(candidates, remainingSlots) {
    const fitCandidates = candidates.filter(char => getSlotCost(char) <= remainingSlots);
    if (fitCandidates.length === 0) return null;
    return fitCandidates[Math.floor(Math.random() * fitCandidates.length)];
}

const enemyPoolCache = new Map();

function getEnemyPool(minRarity, maxRarity, includeSpecialOnly) {
    const cacheKey = `${minRarity}:${maxRarity}:${includeSpecialOnly ? 1 : 0}`;
    if (!enemyPoolCache.has(cacheKey)) {
        enemyPoolCache.set(cacheKey, masterCharacters.filter(c => {
            const rarity = getCharacterRarityInternal(c);
            return rarity >= minRarity
                && rarity <= maxRarity
                && getSlotCost(c) <= PARTY_SLOT_LIMIT
                && (includeSpecialOnly || !c.isSpecialOnly);
        }));
    }
    return enemyPoolCache.get(cacheKey);
}

// ランダムな敵パーティを生成する
export function generateRandomEnemies(gameState, options = {}) {
    // 現在の階層を取得（未設定なら1階）
    const currentFloor = gameState.currentFloor || 1;
    const { minRarity, maxRarity } = options.rarityRange || getFloorRarityRange(currentFloor);
    const includeSpecialOnly = options.includeSpecialOnly ?? shouldIncludeSpecialEnemies(currentFloor);

    // masterCharacters からレアリティで候補を抽出する
    const availableEnemies = getEnemyPool(minRarity, maxRarity, includeSpecialOnly);

    const chosenEnemies = [];
    while (getOccupiedSlots(chosenEnemies) < PARTY_SLOT_LIMIT) {
        const remainingSlots = PARTY_SLOT_LIMIT - getOccupiedSlots(chosenEnemies);
        const candidate = chooseRandomCandidate(availableEnemies, remainingSlots);
        if (!candidate) break;
        chosenEnemies.push(candidate);
    }

    // 選択した敵IDからCharacterインスタンスを生成
    return chosenEnemies
        .map(createCharacterFromData)
        .filter(Boolean)
        .map(enemy => applyFloorEnemyScaling(enemy, currentFloor));
}
