import { masterCharacters } from './data/characters/index.js';
import { Character } from './gameData.js';

export const PARTY_SLOT_LIMIT = 3;

export function getSlotCost(charOrData) {
    return Math.max(1, Math.min(PARTY_SLOT_LIMIT, charOrData?.slotCost || 1));
}

export function getOccupiedSlots(party = []) {
    return party.reduce((total, char) => total + getSlotCost(char), 0);
}

export function canFitInParty(party = [], candidate, removedCharacters = []) {
    const occupied = getOccupiedSlots(party) - getOccupiedSlots(removedCharacters);
    return occupied + getSlotCost(candidate) <= PARTY_SLOT_LIMIT;
}

export function createCharacterFromData(data) {
    if (!data) return null;
    const charData = JSON.parse(JSON.stringify(data));

    if (typeof charData.commands === 'string') {
        charData.commands = charData.commands.split(',').map(c => [c]);
    } else if (Array.isArray(charData.commands) && !Array.isArray(charData.commands[0])) {
        charData.commands = [charData.commands];
    }

    const character = new Character(charData);
    character.currentReel = 0;
    character.poisonedIndices = [];
    character.status = [];
    return character;
}

export function createCharacterById(id) {
    return createCharacterFromData(masterCharacters.find(char => char.id === id));
}
