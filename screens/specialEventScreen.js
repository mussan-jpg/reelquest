import { masterCharacters } from '../data/characters/index.js';
import { createCharacterById, getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';

export const FUSION_RULES = [
    {
        resultId: 'char_chimera',
        sourceIds: ['char_red_dragon', 'char_thunderbird'],
        message: 'レッドドラゴンの炎とサンダーバードの翼が荒々しく共鳴している。2体を合体させてキメラにしますか？'
    },
    {
        resultId: 'char_arc_dragon',
        sourceIds: ['char_dragon', 'char_phoenix'],
        message: 'ドラゴンとフェニックスの力が共鳴している。2体を合体させてアークドラゴンにしますか？'
    },
    {
        resultId: 'char_ancient_golem',
        sourceIds: ['char_gargoyle', 'char_iron_knight', 'char_treant'],
        message: 'ガーゴイルの石、アイアンナイトの装甲、トレントの古木が古代の巨兵へ組み上がる。古代ゴーレムに合体させますか？'
    },
    {
        resultId: 'char_slime_emperor',
        sourceSpecies: 'slime',
        requiredSlots: 3,
        message: 'スライム族が揃い、王冠の形にぷるぷる震えている。スライムエンペラーに合体させますか？'
    }
];

const FLOOR_EVENT_RULES = [
    {
        minNextFloor: 7,
        resultId: 'char_ancient_golem',
        message: '古代の祭壇が現れた。パーティ全員を古代ゴーレムに再編成しますか？'
    },
    {
        minNextFloor: 8,
        resultId: 'char_celestial_dragon',
        message: '星空から巨大な影が降りてきた。パーティ全員を星天竜に再編成しますか？'
    }
];

function hasAllSources(party, sourceIds) {
    return sourceIds.every(id => party.some(char => char.id === id));
}

function hasSpeciesSources(party, rule) {
    const requiredSlots = rule.requiredSlots || PARTY_SLOT_LIMIT;
    const slots = party
        .filter(char => char.species === rule.sourceSpecies && char.id !== rule.resultId)
        .reduce((total, char) => total + getSlotCost(char), 0);
    return slots >= requiredSlots;
}

function removeSources(party, sourceIds) {
    const remainingSources = [...sourceIds];
    return party.filter(char => {
        const sourceIndex = remainingSources.indexOf(char.id);
        if (sourceIndex === -1) return true;
        remainingSources.splice(sourceIndex, 1);
        return false;
    });
}

function removeSpeciesSources(party, rule) {
    let removedSlots = 0;
    const removedCharacters = [];
    const requiredSlots = rule.requiredSlots || PARTY_SLOT_LIMIT;
    const remainingParty = party.filter(char => {
        if (char.species !== rule.sourceSpecies || char.id === rule.resultId || removedSlots >= requiredSlots) return true;
        removedSlots += getSlotCost(char);
        removedCharacters.push(char);
        return false;
    });
    return { remainingParty, removedCharacters };
}

function getCharacterName(id) {
    return masterCharacters.find(char => char.id === id)?.name || id;
}

export function findFusionRuleForParty(party) {
    return FUSION_RULES.find(item => item.sourceSpecies
        ? hasSpeciesSources(party, item)
        : hasAllSources(party, item.sourceIds));
}

export function buildFusionReplacement(party, rule) {
    if (!rule) return null;
    const resultData = masterCharacters.find(char => char.id === rule.resultId);
    if (!resultData) return null;

    const fusionSources = rule.sourceSpecies
        ? removeSpeciesSources(party, rule)
        : { remainingParty: removeSources(party, rule.sourceIds), removedCharacters: rule.sourceIds.map(id => ({ name: getCharacterName(id) })) };
    const remainingParty = fusionSources.remainingParty;
    if (getOccupiedSlots(remainingParty) + getSlotCost(resultData) > PARTY_SLOT_LIMIT) return null;

    return {
        resultData,
        remainingParty,
        removedCharacters: fusionSources.removedCharacters
    };
}

function offerFusion(gameState) {
    const rule = findFusionRuleForParty(gameState.players);
    if (!rule) return false;

    const replacement = buildFusionReplacement(gameState.players, rule);
    if (!replacement) return false;
    if (!window.confirm(rule.message)) return false;

    const result = createCharacterById(rule.resultId);
    if (!result) return false;

    gameState.players = [...replacement.remainingParty, result];
    window.alert(`${replacement.removedCharacters.map(char => char.name).join(' + ')} が合体し、${result.name} が仲間になった！`);
    return true;
}

function offerFloorEvent(gameState, nextFloor) {
    const rule = [...FLOOR_EVENT_RULES]
        .sort((a, b) => b.minNextFloor - a.minNextFloor)
        .find(item => nextFloor >= item.minNextFloor);
    if (!rule) return false;

    const result = createCharacterById(rule.resultId);
    if (!result) return false;
    if (!window.confirm(rule.message)) return false;

    gameState.players = [result];
    window.alert(`${result.name} がパーティに加わった！`);
    return true;
}

export async function triggerSpecialRecruitmentEvent(gameState, nextFloor) {
    if (!gameState?.players) return false;
    if (offerFusion(gameState)) return true;
    return offerFloorEvent(gameState, nextFloor);
}
