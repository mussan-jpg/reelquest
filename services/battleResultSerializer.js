import { buildActiveSpeciesSetBonuses } from '../battle/setBonuses.js';
import { getSlotCost, getSpeciesPoints, getUnitTier } from '../partySlots.js';
import { getCharacterType } from '../screens/shared.js';
import { APP_VERSION, BALANCE_VERSION } from '../version.js';

export function makeId(prefix = '') {
    const id = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}${id}`;
}

export function getBattleWinner(gameState) {
    const playersAlive = (gameState?.players || []).some(char => char.hp > 0);
    const enemiesAlive = (gameState?.enemies || []).some(char => char.hp > 0);
    if (playersAlive && !enemiesAlive) return 'player';
    if (!playersAlive && enemiesAlive) return 'enemy';
    return 'draw';
}

export function buildPartySlots(party = []) {
    return party.map(char => {
        const characterType = getCharacterType(char);
        return {
            character_id: char.id,
            slot_cost: getSlotCost(char),
            unit_tier: getUnitTier(char),
            species_points: getSpeciesPoints(char),
            limit_break_exp: char.limitBreakExp || 0,
            limit_break_level: char.limitBreakLevel || 0,
            limit_broken: !!char.isLimitBroken,
            source_ids: Array.isArray(char.sourceIds) ? [...char.sourceIds] : [],
            species: char.species || 'none',
            type: characterType?.label || '不明'
        };
    });
}

export function buildBattleResult(gameState, options = {}) {
    const players = gameState?.players || [];
    const enemies = gameState?.enemies || [];
    const createdAt = options.createdAt instanceof Date
        ? options.createdAt.toISOString()
        : options.createdAt || new Date().toISOString();

    return {
        id: options.id || makeId(options.idPrefix || ''),
        mode: options.mode || gameState?.mode || (gameState?.isChainMode ? 'adventure' : 'custom'),
        floor: options.floor || gameState?.currentFloor || gameState?.floor || 1,
        winner: options.winner || getBattleWinner(gameState),
        player_party_ids: players.map(char => char.id),
        enemy_party_ids: enemies.map(char => char.id),
        player_party_slots: buildPartySlots(players),
        enemy_party_slots: buildPartySlots(enemies),
        player_set_bonuses: buildActiveSpeciesSetBonuses(players),
        enemy_set_bonuses: buildActiveSpeciesSetBonuses(enemies),
        player_relics: Array.isArray(gameState?.relics) ? [...gameState.relics] : [],
        enemy_relics: Array.isArray(gameState?.enemyRelics) ? [...gameState.enemyRelics] : [],
        battle_stats: gameState?.battleStats || {},
        game_version: options.gameVersion || APP_VERSION,
        balance_version: options.balanceVersion || BALANCE_VERSION,
        ranked: options.ranked ?? gameState?.rankedMatch ?? null,
        created_at: createdAt
    };
}
