import { masterCharacters } from '../data/characters/index.js';
import { getCharacterRarity } from '../screens/shared.js';
import { getOccupiedSlots, getSlotCost, PARTY_SLOT_LIMIT } from '../partySlots.js';
import { APP_VERSION, BALANCE_VERSION } from '../version.js';
import { insertRow, selectRows, updateRows } from './supabaseClient.js';

const PLAYER_ID_KEY = 'reelquest:player_id:v1';
const RANKED_PARTIES_KEY = 'reelquest:ranked_parties:v1';
const RANKED_PROFILE_KEY = 'reelquest:ranked_profile:v1';

function makeId(prefix = '') {
    const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now());
    return `${prefix}${id}`;
}

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || '') || fallback;
    } catch (e) {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getPlayerId() {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
        id = makeId('anon_');
        localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
}

export function getRankedProfile() {
    return readJson(RANKED_PROFILE_KEY, {
        player_id: getPlayerId(),
        rating: 1000,
        rank: 'bronze',
        wins: 0,
        losses: 0
    });
}

function saveRankedProfile(profile) {
    writeJson(RANKED_PROFILE_KEY, profile);
}

export function getRankFromRating(rating) {
    if (rating >= 1600) return 'diamond';
    if (rating >= 1400) return 'gold';
    if (rating >= 1200) return 'silver';
    return 'bronze';
}

export function submitRankedParty(partyIds) {
    const profile = getRankedProfile();
    const parties = readJson(RANKED_PARTIES_KEY, []);
    const party = {
        id: makeId(),
        owner_id: profile.player_id,
        party_ids: [...partyIds],
        party_hash: [...partyIds].sort().join('|'),
        rating: profile.rating,
        rank: profile.rank,
        wins: 0,
        losses: 0,
        game_version: APP_VERSION,
        balance_version: BALANCE_VERSION,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    parties.push(party);
    writeJson(RANKED_PARTIES_KEY, parties.slice(-200));
    insertRow('ranked_parties', party).catch(() => {
        console.warn('Supabase ranked_parties insert failed. Kept local party instead.');
    });
    return party;
}

function buildFallbackOpponent(profile) {
    const candidates = masterCharacters
        .filter(char => !char.isSpecialOnly)
        .filter(char => getSlotCost(char) <= PARTY_SLOT_LIMIT)
        .filter(char => getCharacterRarity(char) <= 3)
        .sort(() => Math.random() - 0.5);
    const picked = [];
    for (const char of candidates) {
        if (getOccupiedSlots(picked) + getSlotCost(char) > PARTY_SLOT_LIMIT) continue;
        picked.push(char);
        if (getOccupiedSlots(picked) === PARTY_SLOT_LIMIT) break;
    }
    return {
        id: 'local_ai_ranked',
        owner_id: 'ai',
        party_ids: picked.map(char => char.id),
        rating: profile.rating,
        rank: profile.rank,
        game_version: APP_VERSION,
        balance_version: BALANCE_VERSION,
        wins: 0,
        losses: 0,
        enabled: true
    };
}

function getPartyIdsSlotTotal(partyIds = []) {
    return (partyIds || []).reduce((total, id) => {
        const char = masterCharacters.find(item => item.id === id);
        return total + getSlotCost(char);
    }, 0);
}

function matchesCurrentSlotMode(party) {
    return getPartyIdsSlotTotal(party?.party_ids || []) === PARTY_SLOT_LIMIT;
}

function getLocalRankedOpponent(profile) {
    const parties = readJson(RANKED_PARTIES_KEY, [])
        .filter(party => party.enabled && party.owner_id !== profile.player_id)
        .filter(party => !party.balance_version || party.balance_version === BALANCE_VERSION)
        .filter(matchesCurrentSlotMode)
        .sort((a, b) => Math.abs(a.rating - profile.rating) - Math.abs(b.rating - profile.rating));
    return parties[0] || buildFallbackOpponent(profile);
}

export async function getRankedOpponent() {
    const profile = getRankedProfile();
    try {
        const query = [
            '?select=*',
            '&enabled=eq.true',
            `&owner_id=neq.${encodeURIComponent(profile.player_id)}`,
            `&balance_version=eq.${encodeURIComponent(BALANCE_VERSION)}`,
            '&limit=50'
        ].join('');
        const remoteParties = await selectRows('ranked_parties', query);
        const parties = (remoteParties || [])
            .filter(matchesCurrentSlotMode)
            .sort((a, b) => Math.abs(a.rating - profile.rating) - Math.abs(b.rating - profile.rating));
        return parties[0] || getLocalRankedOpponent(profile);
    } catch (e) {
        console.warn('Supabase ranked_parties select failed. Using local opponent instead.');
        return getLocalRankedOpponent(profile);
    }
}

export function applyRankedResult(winner, opponentPartyId = null) {
    const profile = getRankedProfile();
    if (winner === 'draw') return profile;
    const didWin = winner === 'player';
    profile.wins += didWin ? 1 : 0;
    profile.losses += didWin ? 0 : 1;
    profile.rating = Math.max(0, profile.rating + (didWin ? 24 : -18));
    profile.rank = getRankFromRating(profile.rating);
    saveRankedProfile(profile);

    if (opponentPartyId) {
        const parties = readJson(RANKED_PARTIES_KEY, []);
        const target = parties.find(party => party.id === opponentPartyId);
        if (target) {
            target.wins += didWin ? 0 : 1;
            target.losses += didWin ? 1 : 0;
            target.rating = Math.max(0, target.rating + (didWin ? -18 : 24));
            target.rank = getRankFromRating(target.rating);
            target.updated_at = new Date().toISOString();
            writeJson(RANKED_PARTIES_KEY, parties);
            updateRows('ranked_parties', `?id=eq.${encodeURIComponent(opponentPartyId)}`, {
                wins: target.wins,
                losses: target.losses,
                rating: target.rating,
                rank: target.rank,
                updated_at: target.updated_at
            }).catch(() => {
                console.warn('Supabase ranked_parties update failed. Kept local rating instead.');
            });
        }
    }

    return profile;
}
