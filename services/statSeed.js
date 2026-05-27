import { masterCharacters } from '../data/characters/index.js';
import { createCharacterFromData, getOccupiedSlots, getSlotCost, getSpeciesPoints, PARTY_SLOT_LIMIT } from '../partySlots.js';
import { submitBattleResults } from './statsApi.js';
import { commandEffects } from '../commands/index.js';
import { runCommandEffect } from '../commands/runner.js';
import { addStatBonus, addStatus, removeStatus, syncAllStatusEffects } from '../commands/status.js';
import { addShield } from '../battle/shield.js';
import { NEGATIVE_STATUS_IDS, SPECIES_BONUSES, addAquaticTide, addBeastHuntStack, addConstructRecycleCore, addNatureBuds, addSlimeMucus, advanceDemonDoomCount, applyAllUndeadLastStandBonuses, applyDemonDoomStatBonuses, applySpeciesReelUpEffects, applySpeciesSetBonuses, buildDemonDoomMilestoneEvents, consumeConstructRecycleCore, consumeConstructRecycleCoreAmount, consumeNatureBuds, consumeSlimeMucus, countNegativeStatuses, countSpeciesPoints, getConstructRecycleCore, getSlimeMucus, getSpeciesTierBonus, notifySpeciesAllyDeaths, recordHumanAction, resetHumanTurnActions, syncDragonReelStatBonus } from '../battle/setBonuses.js';
import { createBattleSnapshot, initBattleStats, recordActionStats, recordSetStatIncreased } from '../battle/stats.js';
import { applyDirectHpLoss, applyFixedDamage, applyNormalDamage, applyShieldedDirectDamage, calculateDamageWithBreakdown } from '../battle/damageResolver.js';
import { buildFusionReplacement, findFusionRuleForParty } from '../screens/specialEventScreen.js';
import { ADVENTURE_MAX_FLOOR, generateRandomEnemies, getFloorRarityRange, shouldIncludeSpecialEnemies } from '../battle/enemy.js';
import { addRelic, applyRelicAfterCommand, applyRelicBattleStart, applyRelicLowHpBarrier, applyRelicReelUp, ensureRelicState, getRelicChoices, RELICS } from '../battle/relics.js';
import { buildCommandContext, clearActiveCommandContext, setActiveCommandContext } from '../battle/commandContext.js';
import { determineTarget as resolveTarget, getLivingParty } from '../battle/targeting.js';
import { buildBattleResult } from './battleResultSerializer.js';
import { absorbPendingExtraActions, clearRemainingActions, consumeAction, getRemainingActionCount, grantExtraActions, grantTurnActions } from '../battle/actionCount.js';
import { resolvePendingUndeadLastStand } from '../battle/lastStand.js';

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function shuffledCopy(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

const initialPartyPool = masterCharacters.filter(char => {
    const rarity = char.rarity || 1;
    return !char.isSpecialOnly && getSlotCost(char) === 1 && rarity <= 2;
});

const customPartyPool = masterCharacters.filter(char => !char.isSpecialOnly && getSlotCost(char) <= PARTY_SLOT_LIMIT);
const customFallbackPool = customPartyPool.filter(char => getSlotCost(char) === 1);
const replacementPoolCache = new Map();

function normalizeSeedFilters(options = {}) {
    const filters = options.filters || options.partyFilters || {};
    const grade = filters.grade === 'all' || filters.grade === '' || filters.grade == null
        ? null
        : Math.floor(Number(filters.grade));
    const setTier = filters.setTier === 'all' || filters.setTier === '' || filters.setTier == null
        ? null
        : Math.floor(Number(filters.setTier));
    return {
        grade: Number.isFinite(grade) && grade > 0 ? grade : null,
        setTier: Number.isFinite(setTier) && setTier > 0 ? setTier : null,
        setSpecies: filters.setSpecies && filters.setSpecies !== 'all' ? String(filters.setSpecies) : null
    };
}

function hasActiveSeedFilters(filters = {}) {
    return !!(filters.grade || filters.setTier || filters.setSpecies);
}

function matchesSeedCharacterFilters(char, filters = {}) {
    if (!char || char.isSpecialOnly) return false;
    if (filters.grade && Number(char.rarity || 1) !== filters.grade) return false;
    return true;
}

function getGeneratedPartyTier(partyData, species) {
    const pointsBySpecies = countSpeciesPoints(partyData);
    if (species) {
        return getSpeciesTierBonus(SPECIES_BONUSES[species], pointsBySpecies[species] || 0)?.tier || 0;
    }
    return Math.max(0, ...Object.entries(pointsBySpecies).map(([speciesId, points]) => (
        getSpeciesTierBonus(SPECIES_BONUSES[speciesId], points)?.tier || 0
    )));
}

function matchesSeedPartyFilters(partyData, filters = {}) {
    if (getOccupiedSlots(partyData) !== PARTY_SLOT_LIMIT) return false;
    if (filters.setTier && getGeneratedPartyTier(partyData, filters.setSpecies) !== filters.setTier) return false;
    if (filters.setSpecies && !filters.setTier && getGeneratedPartyTier(partyData, filters.setSpecies) <= 0) return false;
    return true;
}

function filterSeedPool(pool, filters = {}) {
    return pool.filter(char => matchesSeedCharacterFilters(char, filters));
}

function getRequiredSpeciesPointsForTier(tier) {
    return Math.max(2, Number(tier || 0) + 1);
}

function canAddCandidateToSeedParty(party, occupiedSlots, candidate) {
    if (!candidate || party.some(char => char.id === candidate.id)) return false;
    const slotCost = getSlotCost(candidate);
    return slotCost <= PARTY_SLOT_LIMIT && occupiedSlots + slotCost <= PARTY_SLOT_LIMIT;
}

function getTargetSpeciesForTier(pool, filters = {}) {
    const speciesIds = filters.setSpecies
        ? [filters.setSpecies]
        : Object.keys(SPECIES_BONUSES);
    return shuffledCopy(speciesIds).filter(species => pool.some(char => char.species === species));
}

function buildSeedPartyForSetTier(pool, filters = {}) {
    if (!filters.setTier) return null;
    const requiredPoints = getRequiredSpeciesPointsForTier(filters.setTier);
    const upperExclusive = filters.setTier < 3 ? getRequiredSpeciesPointsForTier(filters.setTier + 1) : Infinity;

    for (let attempts = 0; attempts < 500; attempts += 1) {
        const targetSpecies = randomItem(getTargetSpeciesForTier(pool, filters));
        if (!targetSpecies) return null;

        const party = [];
        let occupiedSlots = 0;
        let targetPoints = 0;
        for (const candidate of shuffledCopy(pool.filter(char => char.species === targetSpecies))) {
            if (!canAddCandidateToSeedParty(party, occupiedSlots, candidate)) continue;
            const nextTargetPoints = targetPoints + getSpeciesPoints(candidate);
            if (nextTargetPoints >= upperExclusive) continue;
            party.push(candidate);
            occupiedSlots += getSlotCost(candidate);
            targetPoints = nextTargetPoints;
            if (targetPoints >= requiredPoints) break;
        }
        if (targetPoints < requiredPoints || targetPoints >= upperExclusive) continue;

        for (const candidate of shuffledCopy(pool)) {
            if (!canAddCandidateToSeedParty(party, occupiedSlots, candidate)) continue;
            party.push(candidate);
            occupiedSlots += getSlotCost(candidate);
            if (occupiedSlots === PARTY_SLOT_LIMIT) break;
        }

        if (matchesSeedPartyFilters(party, filters)) return party;
    }

    return null;
}

function createPartyFromDataList(partyData) {
    return partyData
        .map(data => createCharacterFromData(data))
        .filter(Boolean);
}

function getInitialPartyData(options = {}) {
    const filters = normalizeSeedFilters(options);
    const basePool = hasActiveSeedFilters(filters) ? customPartyPool : initialPartyPool;
    return getRandomPartyDataFromPool(filterSeedPool(basePool, filters), filters);
}

function getReplacementRarityRange(clearedFloor) {
    return getFloorRarityRange(clearedFloor + 1);
}

function fillRandomPartyFromPool(pool) {
    const party = [];
    let occupiedSlots = 0;
    const shuffled = shuffledCopy(pool);

    for (const candidate of shuffled) {
        if (party.some(char => char.id === candidate.id)) continue;
        if (getSlotCost(candidate) > PARTY_SLOT_LIMIT) continue;
        const slotCost = getSlotCost(candidate);
        if (occupiedSlots + slotCost > PARTY_SLOT_LIMIT) continue;
        party.push(candidate);
        occupiedSlots += slotCost;
        if (occupiedSlots === PARTY_SLOT_LIMIT) break;
    }
    return party;
}

function getRandomPartyDataFromPool(pool, filters = {}) {
    if (!pool.length) {
        throw new Error('指定された統計生成フィルタに合うキャラクター候補がありません。');
    }
    const targetedParty = buildSeedPartyForSetTier(pool, filters);
    if (targetedParty) return targetedParty;

    for (let attempts = 0; attempts < 500; attempts += 1) {
        const party = fillRandomPartyFromPool(pool);
        if (matchesSeedPartyFilters(party, filters)) return party;
    }

    const fallback = fillRandomPartyFromPool(filterSeedPool(customFallbackPool, filters));
    if (matchesSeedPartyFilters(fallback, filters)) return fallback;
    throw new Error('指定された統計生成フィルタでフル編成を作成できません。条件を緩めてください。');
}

function getRandomCustomPartyData(options = {}) {
    const filters = normalizeSeedFilters(options);
    return getRandomPartyDataFromPool(filterSeedPool(customPartyPool, filters), filters);
}

function getReplacementCandidateData(currentPartyData, clearedFloor, options = {}) {
    const filters = normalizeSeedFilters(options);
    const currentIds = new Set(currentPartyData.map(char => char.id));
    const { minRarity, maxRarity } = getReplacementRarityRange(clearedFloor);
    const cacheKey = `${minRarity}:${maxRarity}:${filters.grade || 'all'}`;
    if (!replacementPoolCache.has(cacheKey)) {
        replacementPoolCache.set(cacheKey, masterCharacters.filter(char => {
            const rarity = char.rarity || 1;
            return !char.isSpecialOnly
                && getSlotCost(char) <= PARTY_SLOT_LIMIT
                && rarity >= minRarity
                && rarity <= maxRarity
                && matchesSeedCharacterFilters(char, filters);
        }));
    }
    const pool = replacementPoolCache.get(cacheKey).filter(char => !currentIds.has(char.id));
    return shuffledCopy(pool).slice(0, 3);
}

function rebuildPartyData(currentPartyData, clearedFloor, options = {}) {
    const filters = normalizeSeedFilters(options);
    const replacementCandidates = getReplacementCandidateData(currentPartyData, clearedFloor, options);
    const rebuildPool = [...currentPartyData, ...replacementCandidates];
    const rebuilt = fillRandomPartyFromPool(rebuildPool);
    const fullParty = matchesSeedPartyFilters(rebuilt, filters) ? rebuilt : currentPartyData;
    return applySeedFusion(fullParty);
}

function applySeedFusion(partyData) {
    const rule = findFusionRuleForParty(partyData);
    const replacement = buildFusionReplacement(partyData, rule);
    if (!replacement) return partyData;

    const fusedData = {
        ...replacement.resultData,
        sourceIds: replacement.removedCharacters.map(char => char.id).filter(Boolean)
    };
    return [...replacement.remainingParty, fusedData];
}

function applySeedFloorEvent(partyData, nextFloor) {
    if (nextFloor < ADVENTURE_MAX_FLOOR) return partyData;
    const resultData = masterCharacters.find(char => char.id === 'char_ancient_golem');
    if (!resultData) return partyData;
    return [{
        ...resultData,
        sourceIds: partyData.map(char => char.id).filter(Boolean)
    }];
}

function estimateCommandDamage(commandId, actor, target) {
    const effect = commandEffects[commandId];
    if (!effect || typeof effect.calcDamage !== 'function') return 0;
    const rawDamage = Math.max(0, Math.floor(effect.calcDamage(actor)));
    if (rawDamage <= 0 || !target) return rawDamage;
    return calculateDamageWithBreakdown(rawDamage, actor, target, { isAreaAttack: !!effect.isAreaAttack }).finalDamage;
}

function determineHeadlessTarget(commandId, attackerIdx, side, gameState) {
    return resolveTarget(commandId, attackerIdx, side, gameState, {
        policy: 'heuristic',
        getHealAmount: (id, actor) => commandEffects[id]?.calcHeal?.(actor),
        estimateDamage: estimateCommandDamage
    });
}

function getCurrentCommands(actor) {
    const reelIndex = actor.currentReel || 0;
    return Array.isArray(actor.commands?.[0]) ? actor.commands[reelIndex] : actor.commands;
}

function enforceFinalReelLock(actor) {
    if (!(actor?.demonFinalReelLocked || actor?.undeadFinalReelLocked) || !Array.isArray(actor.commands?.[0])) return;
    actor.currentReel = actor.commands.length - 1;
}

function resolveUndeadReelOverdrive(actor, commandId, currentCommands = []) {
    if (!actor?.undeadFinalReelLocked || !String(commandId).startsWith('cmd_down')) return commandId;
    const candidates = (currentCommands || []).filter(id => id && !String(id).startsWith('cmd_down'));
    return candidates.length > 0 ? randomItem(candidates) : commandId;
}

function chooseUndeadFinalCommand(actor, commands, options = {}) {
    const commandPool = (commands || []).filter(Boolean);
    if (!options.preferDamage) return randomItem(commandPool);
    const damageCommands = commandPool.filter(commandId => {
        const effect = commandEffects[commandId];
        return typeof effect?.calcDamage === 'function' && Math.max(0, Math.floor(effect.calcDamage(actor))) > 0;
    });
    return randomItem(damageCommands.length > 0 ? damageCommands : commandPool);
}

function shouldExpandDamageToArea(attacker, effect) {
    const attackerRarity = attacker?.rarity ?? (Array.isArray(attacker?.commands?.[0]) ? attacker.commands.length : 1);
    return (attacker?.slotCost || 1) >= 3
        && attackerRarity < 5
        && !effect.isAreaAttack
        && typeof effect.calcDamage === 'function'
        && Math.max(0, Math.floor(effect.calcDamage(attacker))) > 0;
}

function applyDeathStates(gameState) {
    syncAllStatusEffects(gameState);
    applyAllUndeadLastStandBonuses(gameState);
}

function runPendingHeadlessUndeadReviveActions(gameState) {
    ['p', 'e'].forEach(side => {
        const party = side === 'p' ? gameState.players : gameState.enemies;
        party.forEach((actor, index) => {
            resolvePendingUndeadLastStand(actor);
            if (!actor?.pendingUndeadReviveAction || actor.hp <= 0 || actor.isUndeadReviveAction) return;

            actor.pendingUndeadReviveAction = false;
            actor.isUndeadReviveAction = true;
            if (Array.isArray(actor.commands?.[0])) {
                actor.currentReel = actor.commands.length - 1;
                actor.undeadFinalReelLocked = true;
            } else {
                enforceFinalReelLock(actor);
            }
            const commands = getCurrentCommands(actor);
            let commandId = resolveUndeadReelOverdrive(actor, chooseUndeadFinalCommand(actor, commands), commands);
            const targetInfo = determineHeadlessTarget(commandId, index, side, gameState);
            if (targetInfo) {
                executeHeadless(actor, targetInfo, commandId, gameState, side, index);
            }
            actor.isUndeadReviveAction = false;
        });
    });
    applyDeathStates(gameState);
}

function consumeHiddenOnAttack(actor, effect, targetPrefix, actorSide) {
    const isEnemyTarget = targetPrefix && targetPrefix !== actorSide;
    const isDamageCommand = typeof effect?.calcDamage === 'function'
        && Math.max(0, Math.floor(effect.calcDamage(actor))) > 0;
    if (!isEnemyTarget || !isDamageCommand || !actor?.status?.includes('hidden')) return;
    removeStatus(actor, 'hidden');
}

function getPartySupportGain(party, beforeParty = []) {
    return party.reduce((total, char, index) => {
        const before = beforeParty[index];
        if (!char || !before || before.hp <= 0) return total;
        const hpGain = Math.max(0, Math.floor(Number(char.hp || 0) - Number(before.hp || 0)));
        const shieldGain = Math.max(0, Math.floor(Number(char.shield || 0) - Number(before.shield || 0)));
        return total + hpGain + shieldGain;
    }, 0);
}

function getPartySupportRecipients(party, beforeParty = []) {
    return party.reduce((recipients, char, index) => {
        const before = beforeParty[index];
        if (!char || !before || before.hp <= 0 || char.hp <= 0) return recipients;
        const hpGain = Math.max(0, Math.floor(Number(char.hp || 0) - Number(before.hp || 0)));
        const shieldGain = Math.max(0, Math.floor(Number(char.shield || 0) - Number(before.shield || 0)));
        const amount = hpGain + shieldGain;
        if (amount > 0) recipients.push({ char, index, amount });
        return recipients;
    }, []);
}

function addPercentStatBonus(char, stat, percent) {
    const base = stat === 'hp' ? char.maxHp : (char.baseStats?.[stat] || char[stat] || 0);
    const amount = Math.floor(base * percent);
    return addStatBonus(char, stat, amount);
}

function applyHeadlessSlimeSupportEffects(gameState, beforeSnapshot, actor, actorSide, actorIdx, commandContext) {
    const party = actorSide === 'p' ? gameState.players : gameState.enemies;
    const targetSide = actorSide === 'p' ? 'e' : 'p';
    const targetParty = targetSide === 'p' ? gameState.players : gameState.enemies;
    const supportRecipients = getPartySupportRecipients(party, beforeSnapshot?.[actorSide] || []);
    const supportGain = supportRecipients.reduce((total, recipient) => total + recipient.amount, 0);
    if (supportGain <= 0) return;

    const mucusFactor = Number(actor?.activeSpeciesBonus?.slimeMucusGainFactor || 0);
    if (mucusFactor > 0) {
        addSlimeMucus(gameState, actorSide, Math.floor(supportGain * mucusFactor));
    }

    if (
        actor?.species === 'slime'
        && actor?.activeSpeciesBonus?.slimeSupportExtraAction
        && (commandContext?.isHeal || commandContext?.isShield)
        && getSlimeMucus(gameState, actorSide) >= Number(actor.activeSpeciesBonus?.slimeMucusExtraActionThreshold || Infinity)
    ) {
        const recipient = randomItem(supportRecipients);
        if (recipient) {
            const { char } = recipient;
            const chance = Number(actor.activeSpeciesBonus?.slimeSupportExtraActionChance || 1);
            const perTurn = Number(actor.activeSpeciesBonus?.slimeSupportExtraActionPerTurn || 0);
            const currentTurn = Number(gameState.turn || 0);
            if (!(chance < 1 && Math.random() >= chance) && !(perTurn > 0 && char.slimeExtraActionTurn === currentTurn && Number(char.slimeExtraActionCount || 0) >= perTurn)) {
                consumeSlimeMucus(gameState, actorSide, actor.activeSpeciesBonus?.slimeMucusExtraActionCost || actor.activeSpeciesBonus?.slimeMucusExtraActionThreshold || 0);
                grantExtraActions(char, 1);
                char.slimeExtraActionTurn = currentTurn;
                char.slimeExtraActionCount = Number(char.slimeExtraActionCount || 0) + 1;
            }
        }
    }
}

function applyHeadlessBeastEvasionEffects(gameState, context = {}) {
    const {
        defender,
        defenderSide,
        defenderIdx,
        attacker,
        attackerSide,
        attackerIdx,
        breakdown,
        beforeSnapshot
    } = context;
    if (defender?.species !== 'beast' || !breakdown?.evasionTriggered) return;

    if (defender?.activeSpeciesBonus?.beastHuntStackBonus) {
        addBeastHuntStack(gameState, defenderSide, 1);
    }

    const counterFactor = defender?.activeSpeciesBonus?.beastEvasionCounterFactor || 0;
    if (!counterFactor || !attacker || attacker.hp <= 0 || defenderSide === attackerSide) return;
    if (defender.beastCounterTurn === gameState?.turn) return;
    defender.beastCounterTurn = gameState?.turn;
    applyFixedDamage(gameState, {
        target: attacker,
        targetPrefix: attackerSide,
        targetIdx: attackerIdx,
        attackerPrefix: defenderSide,
        attackerIdx: defenderIdx,
        damage: Math.max(1, Math.floor(Number(defender.atk || 0) * counterFactor))
    });
}

function applyHeadlessNatureSupportBudGain(gameState, beforeSnapshot, side) {
    const party = side === 'p' ? gameState.players : gameState.enemies;
    const beforeParty = beforeSnapshot?.[side] || [];

    party.forEach((char, index) => {
        if (!char || char.hp <= 0 || !char.activeSpeciesBonus?.natureBudFromSupport) return;
        const before = beforeParty[index];
        if (!before) return;

        const hpGain = Math.max(0, Math.floor(Number(char.hp || 0) - Number(before.hp || 0)));
        const shieldGain = Math.max(0, Math.floor(Number(char.shield || 0) - Number(before.shield || 0)));
        const removedNegativeStatuses = (before.status || []).filter(statusId => !char.status?.includes(statusId) && countNegativeStatuses({ status: [statusId] }) > 0);
        if (hpGain > 0 || shieldGain > 0 || removedNegativeStatuses.length > 0) {
            if (char.activeSpeciesBonus?.natureBudFromSupport) {
                addNatureBuds(gameState, side, 1);
            }
        }
    });
}

function applyHeadlessNatureMagicBloomDamage(gameState, actor, target, actorSide, actorIdx, targetSide, targetIdx, commandContext) {
    const active = actor?.activeSpeciesBonus || {};
    if (!active.natureMagicBloomFixedDamage || commandContext?.category !== '魔法' || !target || target.hp <= 0) return;
    const budCount = Math.max(0, Number(gameState?.natureBudState?.[actorSide]?.buds || 0));
    if (budCount <= 0) return;
    const consumed = consumeNatureBuds(gameState, actorSide, budCount);
    if (consumed <= 0) return;

    applyFixedDamage(gameState, {
        target,
        targetPrefix: targetSide,
        targetIdx,
        attackerPrefix: actorSide,
        attackerIdx: actorIdx,
        damage: Math.max(1, Math.floor((actor.int || 1) * consumed * Number(active.natureMagicBloomDamageFactor || 1)))
    });
}

function applyHeadlessAquaticShieldHitEffects(gameState, defender, attacker, defenderSide, defenderIdx, attackerSide, attackerIdx, shieldResult, breakdown = {}) {
    if (!defender || !attacker || defenderSide === attackerSide || shieldResult?.absorbed <= 0) return;
    const active = defender.activeSpeciesBonus || {};

    if (active.aquaticShieldHitHealPercent) {
        const party = defenderSide === 'p' ? gameState.players : gameState.enemies;
        party.forEach(char => {
            if (char?.hp > 0) {
                const heal = Math.max(1, Math.floor(Number(char.maxHp || 1) * active.aquaticShieldHitHealPercent));
                char.hp = Math.min(char.maxHp, char.hp + heal);
            }
        });
    }

    if (active.aquaticShieldHitDebuff) {
        const statusId = attacker.status?.includes('weak') ? 'poison' : 'weak';
        if (addStatus(attacker, statusId) && statusId === 'poison') {
            if (!attacker.statusSources) attacker.statusSources = {};
            attacker.statusSources.poison = { side: defenderSide, index: defenderIdx };
        }
    }

    const tideGain = Number(shieldResult?.absorbed || 0) + Number(breakdown.aquaticCut || 0);
    if (active.aquaticTideReflectFactor && tideGain > 0) {
        addAquaticTide(gameState, defenderSide, tideGain);
    }
}

function applyHeadlessAquaticAreaShieldHits(gameState, beforeSnapshot, actor, actorSide, actorIdx, effect) {
    const targetSide = actorSide === 'p' ? 'e' : 'p';
    const party = targetSide === 'p' ? gameState.players : gameState.enemies;
    const rawDamage = typeof effect?.calcDamage === 'function'
        ? Math.max(0, Math.floor(effect.calcDamage(actor)))
        : 0;

    party.forEach((target, targetIdx) => {
        const before = beforeSnapshot?.[targetSide]?.[targetIdx];
        if (!target || !before) return;
        const absorbed = Math.max(0, Math.floor(Number(before.shield || 0) - Number(target.shield || 0)));
        if (absorbed <= 0) return;
        if (targetSide !== actorSide) addConstructRecycleCore(gameState, targetSide, absorbed);
        const cutPerDebuff = target.activeSpeciesBonus?.shieldedDebuffDamageCut || 0;
        const aquaticCut = cutPerDebuff && before.shield > 0
            ? Math.floor(rawDamage * Math.min(
                target.activeSpeciesBonus?.shieldedDebuffDamageCutMax || cutPerDebuff * 3,
                countNegativeStatuses(actor) * cutPerDebuff
            ))
            : 0;
        applyHeadlessAquaticShieldHitEffects(gameState, target, actor, targetSide, targetIdx, actorSide, actorIdx, { absorbed }, { aquaticCut });
    });
}

function executeSingleTargetAction(actor, target, commandId, gameState, targetPrefix, targetIdx, options = {}) {
    const effect = commandEffects[commandId];
    if (!effect) return;
    const initialTargetHp = target?.hp || 0;
    const beforeSnapshot = options.beforeSnapshot || createBattleSnapshot(gameState);
    const commandContext = buildCommandContext({ gameState, actor, target, commandId, effect });
    setActiveCommandContext(actor, commandContext);

    runCommandEffect({
        commandId,
        effect,
        actor,
        target: target || actor,
        gameState,
        commandEffects,
        skipLog: true
    });
    consumeHiddenOnAttack(actor, effect, targetPrefix, options.actorSide);
    syncAllStatusEffects(gameState);
    applyHeadlessNatureSupportBudGain(gameState, beforeSnapshot, options.actorSide);
    applyHeadlessSlimeSupportEffects(gameState, beforeSnapshot, actor, options.actorSide, options.actorIdx, commandContext);

    if (!target || effect.isAreaAttack) {
        if (effect.isAreaAttack) {
            applyHeadlessAquaticAreaShieldHits(gameState, beforeSnapshot, actor, options.actorSide, options.actorIdx, effect);
        }
        applyRelicAfterCommand(gameState, actor, commandContext);
        clearActiveCommandContext(actor);
        return;
    }
    const hpLoss = Math.max(0, initialTargetHp - target.hp);
    const rawDamage = typeof effect.calcDamage === 'function'
        ? Math.max(0, Math.floor(effect.calcDamage(actor)))
        : hpLoss;
    if (rawDamage <= 0) {
        applyRelicAfterCommand(gameState, actor, commandContext);
        clearActiveCommandContext(actor);
        return;
    }

    const damageResult = applyNormalDamage(gameState, {
        target,
        targetPrefix,
        targetIdx,
        attackerPrefix: options.actorSide,
        attackerIdx: options.actorIdx,
        rawDamage,
        attacker: actor,
        isAreaAttack: !!options.isAreaAttack,
        baseHp: initialTargetHp
    });
    if (damageResult.shieldResult?.absorbed > 0 && targetPrefix !== options.actorSide) {
        addConstructRecycleCore(gameState, targetPrefix, damageResult.shieldResult.absorbed);
    }
    applyHeadlessBeastEvasionEffects(gameState, {
        defender: target,
        defenderSide: targetPrefix,
        defenderIdx: targetIdx,
        attacker: actor,
        attackerSide: options.actorSide,
        attackerIdx: options.actorIdx,
        breakdown: damageResult.breakdown,
        beforeSnapshot
    });
    applyHeadlessAquaticShieldHitEffects(gameState, target, actor, targetPrefix, targetIdx, options.actorSide, options.actorIdx, damageResult.shieldResult, damageResult.breakdown);
    applyHeadlessNatureMagicBloomDamage(gameState, actor, target, options.actorSide, options.actorIdx, targetPrefix, targetIdx, commandContext);
    applyRelicAfterCommand(gameState, actor, commandContext);
    clearActiveCommandContext(actor);
}

function executeHeadless(actor, targetInfo, commandId, gameState, side, actorIdx) {
    const effect = commandEffects[commandId];
    if (!effect) return;

    syncAllStatusEffects(gameState);
    const beforeSnapshot = createBattleSnapshot(gameState);
    const beforeActorReel = actor.currentReel || 0;
    const beforeTargetReel = targetInfo?.data?.currentReel || 0;
    if (shouldExpandDamageToArea(actor, effect)) {
        const targetSide = side === 'p' ? 'e' : 'p';
        const targets = getLivingParty(gameState, targetSide);
        targets.forEach((item, targetOrder) => executeSingleTargetAction(actor, item.data, commandId, gameState, item.prefix, item.index, {
            isAreaAttack: true,
            actorSide: side,
            actorIdx,
            beforeSnapshot
        }));
    } else {
        executeSingleTargetAction(actor, targetInfo?.data || actor, commandId, gameState, targetInfo?.prefix || side, targetInfo?.index ?? actorIdx, {
            actorSide: side,
            actorIdx,
            beforeSnapshot
        });
    }

    syncAllStatusEffects(gameState);
    recordActionStats(gameState, beforeSnapshot, side, actorIdx);
    notifySpeciesAllyDeaths(gameState, beforeSnapshot, () => {});
    applyDeathStates(gameState);
    runPendingHeadlessUndeadReviveActions(gameState);

    const actorReelIncreased = (actor.currentReel || 0) > beforeActorReel;
    const targetReelIncreased = (targetInfo?.data?.currentReel || 0) > beforeTargetReel;
    const actorReelChanged = (actor.currentReel || 0) !== beforeActorReel;
    const targetReelChanged = (targetInfo?.data?.currentReel || 0) !== beforeTargetReel;
    if (actorReelChanged) syncDragonReelStatBonus(actor);
    if (targetReelChanged && targetInfo?.data !== actor) syncDragonReelStatBonus(targetInfo?.data);
    if (actorReelIncreased || targetReelIncreased) {
        const reelTarget = targetReelIncreased ? targetInfo.data : actor;
        const reelSide = targetReelIncreased ? targetInfo.prefix : side;
        applySpeciesReelUpEffects(gameState, reelTarget, reelSide);
        applyRelicReelUp(gameState, reelTarget);
        syncDragonReelStatBonus(reelTarget);
    }
    advanceDemonDoomCount(gameState, side, 1);
    applyRelicLowHpBarrier(gameState);
}

function tickDefensiveDuration(actor) {
    if (!actor?.tauntDuration) return;
    actor.tauntDuration -= 1;
    if (actor.tauntDuration <= 0) removeStatus(actor, 'taunt');
}

function applyPoison(gameState, actor, side, actorIdx) {
    if (!actor.status?.includes('poison') || actor.hp <= 0) return;
    const beforeSnapshot = createBattleSnapshot(gameState);
    const poisonDmg = Math.floor(actor.maxHp * 0.15);
    const poisonSource = actor.statusSources?.poison;
    applyDirectHpLoss(gameState, {
        target: actor,
        targetPrefix: side,
        targetIdx: actorIdx,
        sourcePrefix: poisonSource?.side,
        sourceIdx: poisonSource?.index,
        damage: poisonDmg
    });
    notifySpeciesAllyDeaths(gameState, beforeSnapshot, () => {});
    applyDeathStates(gameState);
    runPendingHeadlessUndeadReviveActions(gameState);
}

function applyHeadlessConstructEndTurnCoreRelease(gameState) {
    ['p', 'e'].forEach(side => {
        const party = side === 'p' ? gameState.players : gameState.enemies;
        const sourceIndex = party.findIndex(char => (
            char?.hp > 0
            && char.species === 'construct'
            && (
                char.activeSpeciesBonus?.constructEndTurnSingleShieldFactor
                || char.activeSpeciesBonus?.constructEndTurnTeamShieldFactor
                || char.activeSpeciesBonus?.constructRecycleCoreEndTurnDamage
            )
        ));
        if (sourceIndex < 0) return;

        const source = party[sourceIndex];
        const currentCore = getConstructRecycleCore(gameState, side);
        if (currentCore <= 0) return;
        const shieldFactor = Number(source.activeSpeciesBonus?.constructEndTurnTeamShieldFactor || source.activeSpeciesBonus?.constructEndTurnSingleShieldFactor || 0);
        if (shieldFactor > 0) {
            const amount = Math.max(1, Math.floor(currentCore * shieldFactor));
            const shieldTargets = source.activeSpeciesBonus?.constructEndTurnTeamShieldFactor
                ? party.filter(char => char?.hp > 0)
                : [party.filter(char => char?.hp > 0).sort((a, b) => (a.shield || 0) - (b.shield || 0))[0]].filter(Boolean);
            shieldTargets.forEach(char => {
                addShield(char, amount);
            });
            consumeConstructRecycleCoreAmount(gameState, side, Math.min(currentCore, amount * shieldTargets.length));
        }

        const targetSide = side === 'p' ? 'e' : 'p';
        const targets = (targetSide === 'p' ? gameState.players : gameState.enemies)
            .map((target, targetIdx) => ({ target, targetIdx }))
            .filter(item => item.target?.hp > 0);
        const releaseFactor = Number(source.activeSpeciesBonus?.constructRecycleCoreEndTurnDamageFactor || 0);
        const consumePercent = Number(source.activeSpeciesBonus?.constructRecycleCoreEndTurnConsumePercent || 0);
        const damage = Math.max(0, Math.floor(getConstructRecycleCore(gameState, side) * releaseFactor));
        if (damage <= 0) return;

        const selected = randomItem(targets);
        if (!selected) return;
        consumeConstructRecycleCore(gameState, side, consumePercent);
        applyFixedDamage(gameState, {
            target: selected.target,
            targetPrefix: targetSide,
            targetIdx: selected.targetIdx,
            attackerPrefix: side,
            attackerIdx: sourceIndex,
            damage
        });
    });
    applyDeathStates(gameState);
    runPendingHeadlessUndeadReviveActions(gameState);
}

function applyHeadlessSpeciesEndTurnEffects(gameState) {
    ['p', 'e'].forEach(side => {
        const party = side === 'p' ? gameState.players : gameState.enemies;
        const targetSide = side === 'p' ? 'e' : 'p';
        const enemies = targetSide === 'p' ? gameState.players : gameState.enemies;

        const slimeSource = party.find(char => char?.hp > 0 && char.species === 'slime' && char.activeSpeciesBonus?.slimeMucusGainFactor);
        if (slimeSource) {
            const mucus = getSlimeMucus(gameState, side);
            const healFactor = Number(slimeSource.activeSpeciesBonus?.slimeMucusHealFactor || 0);
            if (mucus > 0 && healFactor > 0) {
                const target = [...party].filter(char => char?.hp > 0).sort((a, b) => (a.hp / Math.max(1, a.maxHp || 1)) - (b.hp / Math.max(1, b.maxHp || 1)))[0];
                if (target) {
                    const before = target.hp;
                    target.hp = Math.min(target.maxHp, target.hp + Math.max(1, Math.floor(mucus * healFactor)));
                    consumeSlimeMucus(gameState, side, Math.max(0, target.hp - before));
                }
            }
            const remaining = getSlimeMucus(gameState, side);
            const damageFactor = Number(slimeSource.activeSpeciesBonus?.slimeMucusDamageFactor || 0);
            const target = randomItem(enemies.map((enemy, targetIdx) => ({ enemy, targetIdx })).filter(item => item.enemy?.hp > 0));
            if (remaining > 0 && damageFactor > 0 && target) {
                applyFixedDamage(gameState, {
                    target: target.enemy,
                    targetPrefix: targetSide,
                    targetIdx: target.targetIdx,
                    attackerPrefix: side,
                    attackerIdx: party.indexOf(slimeSource),
                    damage: Math.max(1, Math.floor(remaining * damageFactor))
                });
                consumeSlimeMucus(gameState, side, remaining);
            }
        }

        const natureSource = party.find(char => char?.hp > 0 && char.species === 'nature' && char.activeSpeciesBonus?.natureBudHealPercent);
        const natureBuds = Math.max(0, Math.floor(Number(gameState.natureBudState?.[side]?.buds || 0)));
        if (natureSource && natureBuds > 0) {
            const target = [...party].filter(char => char?.hp > 0).sort((a, b) => (a.hp / Math.max(1, a.maxHp || 1)) - (b.hp / Math.max(1, b.maxHp || 1)))[0];
            const consumed = target ? consumeNatureBuds(gameState, side, 1) : 0;
            if (target && consumed > 0) {
                const healPercent = Number(natureSource.activeSpeciesBonus?.natureBudHealPercent || 0);
                const shieldPercent = Number(natureSource.activeSpeciesBonus?.natureBudShieldPercent || 0);
                target.hp = Math.min(target.maxHp, target.hp + Math.max(1, Math.floor(Number(target.maxHp || 1) * healPercent)));
                if (shieldPercent > 0) addShield(target, Math.max(1, Math.floor(Number(target.maxHp || 1) * shieldPercent)));
                const intGain = Math.max(0, Math.floor(Number(natureSource.activeSpeciesBonus?.natureBudIntBonus || 0)));
                if (intGain > 0) addStatBonus(target, 'int', intGain);
            }
        }

        const humanSource = party.find(char => char?.hp > 0 && char.species === 'human' && char.activeSpeciesBonus?.humanPointStatPercent);
        if (humanSource) {
            const pointPercent = Number(humanSource.activeSpeciesBonus.humanPointStatPercent || 0);
            const finalMultiplier = Number(humanSource.activeSpeciesBonus.humanFinalPointStatMultiplier || 1);
            const living = party.filter(char => char?.hp > 0);
            const finalActive = finalMultiplier > 1 && living.length > 0 && living.every(char => (char.currentReel || 0) >= ((Array.isArray(char.commands?.[0]) ? char.commands.length : 1) - 1));
            const points = Number(gameState.humanSetState?.[side]?.points || 0);
            const percent = points * pointPercent * (finalActive ? finalMultiplier : 1);
            living.forEach(char => {
                const atkGain = percent > 0 ? Math.max(1, Math.floor((char.baseAtk || char.atk || 1) * percent)) : 0;
                const intGain = percent > 0 ? Math.max(1, Math.floor((char.baseInt || char.int || 1) * percent)) : 0;
                const atkDelta = (atkGain || 0) - Number(char.humanPointAtkBonus || 0);
                const intDelta = (intGain || 0) - Number(char.humanPointIntBonus || 0);
                if (atkDelta) addStatBonus(char, 'atk', atkDelta);
                if (intDelta) addStatBonus(char, 'int', intDelta);
                char.humanPointAtkBonus = atkGain;
                char.humanPointIntBonus = intGain;
            });
            const state = gameState.humanSetState?.[side];
            if (state && Number(state.turnActions || 0) >= Number(humanSource.activeSpeciesBonus?.humanLinkActionThreshold || 0)) {
                const targetCount = Math.max(1, Math.floor(Number(humanSource.activeSpeciesBonus?.humanLinkReelUpTargets || 1)));
                living
                    .filter(char => (char.currentReel || 0) < ((Array.isArray(char.commands?.[0]) ? char.commands.length : 1) - 1))
                    .sort((a, b) => (a.currentReel || 0) - (b.currentReel || 0))
                    .slice(0, targetCount)
                    .forEach(candidate => {
                        candidate.currentReel = Math.min(candidate.commands.length - 1, (candidate.currentReel || 0) + 1);
                    });
            }
            if (state) state.turnActions = 0;
        }

        applyDemonDoomStatBonuses(gameState, side);
        buildDemonDoomMilestoneEvents(gameState, side);

        const aquaticSource = party.find(char => char?.hp > 0 && char.species === 'aquatic' && char.activeSpeciesBonus?.aquaticTideReflectFactor);
        const tide = Number(gameState.aquaticTideState?.[side]?.tide || 0);
        const tideTarget = randomItem(enemies.map((enemy, targetIdx) => ({ enemy, targetIdx })).filter(item => item.enemy?.hp > 0));
        if (aquaticSource && tide > 0 && tideTarget) {
            applyFixedDamage(gameState, {
                target: tideTarget.enemy,
                targetPrefix: targetSide,
                targetIdx: tideTarget.targetIdx,
                attackerPrefix: side,
                attackerIdx: party.indexOf(aquaticSource),
                damage: Math.max(1, Math.floor(tide * Number(aquaticSource.activeSpeciesBonus.aquaticTideReflectFactor || 0)))
            });
            if (gameState.aquaticTideState?.[side]) gameState.aquaticTideState[side].tide = 0;
        }
    });
    applyDeathStates(gameState);
    runPendingHeadlessUndeadReviveActions(gameState);
}

function applyHeadlessSpeciesTurnStartEffects(gameState, actionQueue = []) {
    const firstActor = actionQueue.find(item => item.data?.hp > 0)?.data;
    ['p', 'e'].forEach(side => {
        const party = side === 'p' ? gameState.players : gameState.enemies;
        const beastAtkSource = (
            firstActor
            && party.includes(firstActor)
            && firstActor.species === 'beast'
            && firstActor.activeSpeciesBonus?.fastestTurnAtkBonus
        )
            ? firstActor
            : null;
        const beastSpdSource = party.find(char => (
            char?.hp > 0
            && char.species === 'beast'
            && char.activeSpeciesBonus?.beastTurnStartTeamSpdPercent
        ));
        if (beastAtkSource || beastSpdSource) {
            const setInfo = beastAtkSource?.activeSpeciesBonus || beastSpdSource.activeSpeciesBonus;
            const huntStacks = Math.max(0, Number(gameState.beastHuntState?.[side]?.stacks || 0));
            const huntBonus = huntStacks * Number(setInfo.beastHuntStackBonus || 0);
            party.forEach((ally, index) => {
                if (!ally || ally.hp <= 0) return;
                const atkGain = beastAtkSource
                    ? addPercentStatBonus(ally, 'atk', Number(beastAtkSource.activeSpeciesBonus.fastestTurnAtkBonus || 0) + huntBonus)
                    : 0;
                const spdGain = beastSpdSource
                    ? addPercentStatBonus(ally, 'spd', Number(beastSpdSource.activeSpeciesBonus.beastTurnStartTeamSpdPercent || 0) + huntBonus)
                    : 0;
                recordSetStatIncreased(gameState, side, index, atkGain + spdGain, {
                    setInfo,
                    sourceKind: 'turnStart',
                    statBreakdown: { atk: atkGain, spd: spdGain }
                });
            });
        }

        party.forEach(char => {
            if (!char || char.hp <= 0 || !char.activeSpeciesBonus?.turnStartCleanse) return;
            const activeStatuses = NEGATIVE_STATUS_IDS.filter(statusId => char.status?.includes(statusId));
            if (activeStatuses.length === 0) return;
            activeStatuses.forEach(statusId => removeStatus(char, statusId));
            char.poisonedIndices = [];
            const budGain = char.activeSpeciesBonus?.natureBudFromSupport
                ? addNatureBuds(gameState, side, activeStatuses.length)
                : 0;
            if (budGain <= 0) return;
        });
    });
}

function runHeadlessBattle(gameState) {
    const maxTurns = 60;

    for (let turn = 0; turn < maxTurns; turn += 1) {
        gameState.turn = turn + 1;
        resetHumanTurnActions(gameState);
        [...gameState.players, ...gameState.enemies].forEach(char => {
            grantTurnActions(char);
        });
        const actionQueue = [
            ...getLivingParty(gameState, 'p'),
            ...getLivingParty(gameState, 'e')
        ].sort((a, b) => b.data.spd - a.data.spd);
        applyHeadlessSpeciesTurnStartEffects(gameState, actionQueue);
        applyDeathStates(gameState);

        for (const item of actionQueue) {
            const actor = item.data;
            if (actor.hp <= 0) continue;

            tickDefensiveDuration(actor);

            if (actor.status?.includes('paralysis')) {
                removeStatus(actor, 'paralysis');
                clearRemainingActions(actor);
                applyPoison(gameState, actor, item.prefix, item.index);
                continue;
            }

            let reelActionGuard = 0;
            while (actor.hp > 0 && reelActionGuard < 8) {
                reelActionGuard += 1;
                absorbPendingExtraActions(actor);
                if (getRemainingActionCount(actor) <= 0) break;

                const playersAlive = gameState.players.some(char => char.hp > 0);
                const enemiesAlive = gameState.enemies.some(char => char.hp > 0);
                if (!playersAlive || !enemiesAlive) break;

                enforceFinalReelLock(actor);
                const commands = getCurrentCommands(actor);
                let commandId = randomItem(commands);
                commandId = resolveUndeadReelOverdrive(actor, commandId, commands);
                const targetInfo = determineHeadlessTarget(commandId, item.index, item.prefix, gameState);
                if (!targetInfo) break;

                executeHeadless(actor, targetInfo, commandId, gameState, item.prefix, item.index);
                recordHumanAction(gameState, actor, item.prefix);
                enforceFinalReelLock(actor);

                if (commandId.startsWith('cmd_up') || commandId.startsWith('cmd_down')) {
                    continue;
                }
                consumeAction(actor);
                absorbPendingExtraActions(actor);
                if (getRemainingActionCount(actor) <= 0) break;
            }

            applyPoison(gameState, actor, item.prefix, item.index);
        }

        applyHeadlessSpeciesEndTurnEffects(gameState);
        applyHeadlessConstructEndTurnCoreRelease(gameState);
        const playersAlive = gameState.players.some(char => char.hp > 0);
        const enemiesAlive = gameState.enemies.some(char => char.hp > 0);
        if (!playersAlive || !enemiesAlive) break;
    }
}

function chooseSeedRelic(gameState) {
    const choices = getRelicChoices(gameState, 3);
    if (!choices.length) return null;
    const party = gameState.players || [];
    const reelUpCount = party.reduce((total, char) => (
        total + (Array.isArray(char.commands) ? char.commands.flat().filter(command => String(command).startsWith('cmd_up')).length : 0)
    ), 0);
    const lowHpCount = party.filter(char => char.maxHp <= 90).length;
    const shieldCommandCount = party.reduce((total, char) => (
        total + (Array.isArray(char.commands) ? char.commands.flat().filter(command => ['cmd_shield', 'cmd_barrier', 'cmd_team_barrier'].includes(command)).length : 0)
    ), 0);

    const scored = choices.map(relic => {
        let score = 0;
        if (relic.hooks?.battleStartShield) score += 6 + party.length;
        if (relic.hooks?.shieldOnReelUp) score += reelUpCount;
        if (relic.hooks?.lowHpBarrier) score += 4 + lowHpCount * 2;
        if (relic.hooks?.weakestStartShield) score += 5 + lowHpCount;
        if (relic.hooks?.attackBonusDamage) score += 6;
        if (relic.hooks?.attackStatus) score += 5;
        if (relic.hooks?.battleStartEnemyStatus) score += 5;
        if (shieldCommandCount > 0 && relic.hooks?.battleStartShield) score += 1;
        return { relic, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.relic || choices[0];
}

function chooseRandomRelicId(excludedIds = []) {
    const excluded = new Set(excludedIds);
    const pool = RELICS.filter(relic => !excluded.has(relic.id));
    if (pool.length === 0) return null;
    return randomItem(pool).id;
}

function createSeedBattleResult(index, floor, currentPartyData, adventureState = {}, options = {}) {
    const playerParty = createPartyFromDataList(currentPartyData);
    const gameState = {
        players: playerParty,
        enemies: [],
        mode: 'adventure',
        currentFloor: floor,
        floor,
        turn: 0,
        relics: Array.isArray(adventureState.relics) ? [...adventureState.relics] : []
    };
    gameState.enemies = generateRandomEnemies(gameState, { includeSpecialOnly: shouldIncludeSpecialEnemies(floor) });
    const enemyParty = gameState.enemies;

    if (options.disableSetBonuses) {
        gameState.players.forEach(char => { char.hp = char.maxHp; });
        gameState.enemies.forEach(char => { char.hp = char.maxHp; });
    } else {
        applySpeciesSetBonuses(gameState, { healToFull: true });
    }
    ensureRelicState(gameState);
    if (!options.disableRelics) {
        applyRelicBattleStart(gameState);
    }
    initBattleStats(gameState);
    runHeadlessBattle(gameState);
    const result = buildBattleResult(gameState, {
        idPrefix: 'seed_',
        mode: 'adventure',
        floor,
        ranked: null,
        createdAt: new Date(Date.now() - index * 1000)
    });

    return { result, gameState };
}

function createCustomSeedBattleResult(index, options = {}) {
    const playerRelicId = options.disableRelics ? null : (options.playerRelicId || chooseRandomRelicId());
    const enemyRelicId = options.disableRelics ? null : (options.enemyRelicId || chooseRandomRelicId(playerRelicId ? [playerRelicId] : []));
    const gameState = {
        players: createPartyFromDataList(getRandomCustomPartyData(options)),
        enemies: createPartyFromDataList(getRandomCustomPartyData(options)),
        mode: 'custom',
        currentFloor: 1,
        floor: 1,
        turn: 0,
        relics: playerRelicId ? [playerRelicId] : [],
        enemyRelics: enemyRelicId ? [enemyRelicId] : []
    };

    if (options.disableSetBonuses) {
        gameState.players.forEach(char => { char.hp = char.maxHp; });
        gameState.enemies.forEach(char => { char.hp = char.maxHp; });
    } else {
        applySpeciesSetBonuses(gameState, { healToFull: true });
    }
    ensureRelicState(gameState);
    if (!options.disableRelics) {
        applyRelicBattleStart(gameState);
    }
    initBattleStats(gameState);
    runHeadlessBattle(gameState);

    return buildBattleResult(gameState, {
        idPrefix: 'custom_seed_',
        mode: 'custom',
        floor: 1,
        ranked: null,
        createdAt: new Date(Date.now() - index * 1000)
    });
}

function waitForNextFrame() {
    return new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 0);
        }
    });
}

export async function generateSeedBattleResults(count = 10000, options = {}) {
    const batchSize = Math.max(25, Math.min(1000, Number(options.batchSize || 250)));
    const insertChunkSize = Math.max(20, Math.min(1000, Number(options.insertChunkSize || 20)));
    const results = [];

    while (results.length < count) {
        const batch = [];
        let currentPartyData = getInitialPartyData(options);
        let adventureState = { relics: [] };
        while (batch.length < batchSize && results.length + batch.length < count) {
            for (let floor = 1; floor <= ADVENTURE_MAX_FLOOR && batch.length < batchSize && results.length + batch.length < count; floor += 1) {
                const { result, gameState } = createSeedBattleResult(count - results.length - batch.length, floor, currentPartyData, adventureState, options);
                batch.push(result);

                if (result.winner !== 'player' || floor >= ADVENTURE_MAX_FLOOR) {
                    currentPartyData = getInitialPartyData(options);
                    adventureState = { relics: [] };
                    break;
                }
                if ([1, 3, 5].includes(floor)) {
                    const relic = chooseSeedRelic(gameState);
                    if (relic) addRelic(gameState, relic.id);
                    adventureState.relics = [...ensureRelicState(gameState)];
                }
                currentPartyData = applySeedFloorEvent(rebuildPartyData(currentPartyData, floor, options), floor + 1);
            }
        }

        if (options.submit !== false) {
            await submitBattleResults(batch, {
                chunkSize: insertChunkSize,
                concurrency: options.insertConcurrency || 1
            });
        }
        results.push(...batch);
        if (typeof options.onProgress === 'function') {
            options.onProgress({ completed: results.length, total: count });
        }
        await waitForNextFrame();
    }

    return results;
}

export async function generateCustomSeedBattleResults(count = 10000, options = {}) {
    const batchSize = Math.max(25, Math.min(1000, Number(options.batchSize || 250)));
    const insertChunkSize = Math.max(20, Math.min(1000, Number(options.insertChunkSize || 20)));
    const results = [];

    while (results.length < count) {
        const batch = [];
        while (batch.length < batchSize && results.length + batch.length < count) {
            batch.push(createCustomSeedBattleResult(count - results.length - batch.length, options));
        }

        if (options.submit !== false) {
            await submitBattleResults(batch, {
                chunkSize: insertChunkSize,
                concurrency: options.insertConcurrency || 1
            });
        }
        results.push(...batch);
        if (typeof options.onProgress === 'function') {
            options.onProgress({ completed: results.length, total: count });
        }
        await waitForNextFrame();
    }

    return results;
}
