// data/characters/index.js

import { grade1Characters } from './grade1.js';
import { grade2Characters } from './grade2.js';
import { grade3Characters } from './grade3.js';
import { grade4Characters } from './grade4.js';
import { grade5Characters } from './grade5.js';
import { grade6Characters } from './grade6.js';
import { characterDescriptions } from './descriptions.js';
import { getCharacterGrade, getCharacterSlotCost, normalizeCharacterStats } from './statBalance.js';

const rawCharacters = [
    ...grade1Characters,
    ...grade2Characters,
    ...grade3Characters,
    ...grade4Characters,
    ...grade5Characters,
    ...grade6Characters
];

export const masterCharacters = rawCharacters.map(char => {
    const rarity = getCharacterGrade(char);
    return normalizeCharacterStats({
        ...char,
        rarity,
        slotCost: getCharacterSlotCost(char),
        unitTier: Math.max(1, Math.min(3, Number(char.unitTier || char.unit_tier || 1))),
        originalRarity: char.originalRarity || rarity,
        isSpecialOnly: !!char.isSpecialOnly,
        species: char.species || 'none',
        description: char.description || characterDescriptions[char.id] || '詳細不明。本人もまだ自己紹介を考え中。'
    });
});
