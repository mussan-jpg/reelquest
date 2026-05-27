import { addStatBonus, addStatus } from '../commands/status.js';
import { getOccupiedSlots, PARTY_SLOT_LIMIT } from '../partySlots.js';
import { addShield } from './shield.js';
import { applyShieldedDirectDamage } from './damageResolver.js';
import { syncDragonReelStatBonus } from './setBonuses.js';

export const RELICS = [
    {
        id: 'relic_guardian_charm',
        name: '守護の護符',
        desc: '最初のターンだけ、味方の回復・シールド効果が2倍になる。',
        image: 'images/relic_guardian_charm.svg',
        hooks: { firstTurnHealShieldMultiplier: 2 }
    },
    {
        id: 'relic_tuning_fork',
        name: '調律の音叉',
        desc: '味方がリールアップを引いた時、追加で1段階リールアップする。',
        image: 'images/relic_tuning_fork.svg',
        hooks: { reelUpExtraRerolls: 1 }
    },
    {
        id: 'relic_last_stand',
        name: '踏ん張りの紋章',
        desc: 'HPが半分以下の味方は、ATKとINTが上昇する。',
        image: 'images/relic_last_stand.svg',
        hooks: { lowHpAtkIntBonus: 0.5, lowHpThreshold: 0.5 }
    },
    {
        id: 'relic_repair_kit',
        name: '修復キット',
        desc: '戦闘開始時、元レア度が最も低い味方1体のリールを2段階上げる。',
        image: 'images/relic_repair_kit.svg',
        hooks: { startLowestRarityReelUp: 2 }
    },
    {
        id: 'relic_blue_core',
        name: '蒼い核石',
        desc: '味方がリールアップした時、味方全体にシールド8を付与する。',
        image: 'images/relic_blue_core.svg',
        hooks: { reelUpTriggeredTeamShield: 8 }
    },
    {
        id: 'relic_ember_blade',
        name: '熾火の刃',
        desc: 'ミスを引いた時、自身のATK/INTが「(6 - 現在リール段階)×3%」上昇する。序盤リールほど大きく育つ。',
        image: 'images/relic_ember_blade.svg',
        hooks: { missReelAtkIntBonusPerStep: 0.03, missReelAtkIntMaxStage: 6 }
    },
    {
        id: 'relic_venom_vial',
        name: '毒蛇の小瓶',
        desc: '状態異常中の敵を攻撃する時、ATK/INTが一時上昇する。',
        image: 'images/relic_venom_vial.svg',
        hooks: { statusTargetAtkIntBonus: 0.4 }
    },
    {
        id: 'relic_stun_coil',
        name: '雷鳴コイル',
        desc: '味方がリールアップした時、ランダムな敵1体を30%の確率でマヒにする。',
        image: 'images/relic_stun_coil.svg',
        hooks: { reelUpParalysisChance: 0.3 }
    },
    {
        id: 'relic_cracked_mask',
        name: 'ひび割れ仮面',
        desc: '戦闘開始時、敵で最もSPDが高い1体のリールを1段階下げ、SPD-3。',
        image: 'images/relic_cracked_mask.svg',
        hooks: { battleStartEnemyReelDown: 1, battleStartEnemySpdDown: 3 }
    },
    {
        id: 'relic_underdog_banner',
        name: '下克上の軍旗',
        desc: 'パーティ全員の元レア度合計が6以下なら、戦闘中全員のATK/INTが+100%。',
        image: 'images/relic_underdog_banner.svg',
        hooks: { originalRaritySumMax: 6, atkIntMultiplier: 2 }
    },
    {
        id: 'relic_accelerating_clock',
        name: '加速する時計',
        desc: '同一ターン内、味方が行動するたび、次に動く味方のATK/INTがそのターン中+30%ずつ上昇。',
        image: 'images/relic_accelerating_clock.svg',
        hooks: { actionChainAtkIntBonus: 0.3 }
    },
    {
        id: 'relic_highlander_chalice',
        name: 'ハイランダーの聖杯',
        desc: 'パーティ上限まで編成し、種族がすべて異なる時、全員のATK/INTが+50%。',
        image: 'images/relic_highlander_chalice.svg',
        hooks: { highlanderAtkIntMultiplier: 1.5 }
    },
    {
        id: 'relic_lucky_coin',
        name: '幸運のコイン',
        desc: 'ミスを引いた時、何も起きない代わりに自身のATK/INTが戦闘終了まで+40%される（最大3回）。',
        image: 'images/relic_lucky_coin.svg',
        hooks: { missAtkIntBonus: 0.4, missAtkIntMaxStacks: 3 }
    },
    {
        id: 'relic_rusted_greatsword',
        name: '錆びた巨剣',
        desc: 'パーティ内で最も★が低い味方1体のATK/INTが基礎値×2.0ぶん上昇する。ただし、それ以外の味方のATK/INTは基礎値×0.3ぶん低下する。',
        image: 'images/relic_rusted_greatsword.svg',
        hooks: { lowestRarityAtkIntBonus: 2.0, otherAtkIntPenalty: 0.3 }
    },
    {
        id: 'relic_glass_heart',
        name: 'ガラスの心臓',
        desc: '味方全員のATK/INTが+100%。ただし最大HPと付与シールド量が半分になる。',
        image: 'images/relic_glass_heart.svg',
        hooks: { atkIntMultiplier: 2, maxHpMultiplier: 0.5, shieldMultiplier: 0.5 }
    }
];

export function ensureRelicState(gameState) {
    if (!gameState) return [];
    if (!Array.isArray(gameState.relics)) gameState.relics = [];
    if (!Array.isArray(gameState.enemyRelics)) gameState.enemyRelics = [];
    if (!gameState.relicRuntime) gameState.relicRuntime = {};
    return gameState.relics;
}

function getRelicIdsForSide(gameState, side = 'p') {
    if (!gameState) return [];
    ensureRelicState(gameState);
    return side === 'e' ? gameState.enemyRelics : gameState.relics;
}

export function getOwnedRelics(gameState, side = 'p') {
    const relicIds = getRelicIdsForSide(gameState, side);
    return relicIds
        .map(id => RELICS.find(relic => relic.id === id))
        .filter(Boolean);
}

export function getRelicChoices(gameState, count = 3) {
    const owned = new Set(ensureRelicState(gameState));
    const pool = RELICS.filter(relic => !owned.has(relic.id));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function addRelic(gameState, relicId, side = 'p') {
    const relics = getRelicIdsForSide(gameState, side);
    if (!RELICS.some(relic => relic.id === relicId) || relics.includes(relicId)) return false;
    relics.push(relicId);
    return true;
}

function getPartyForSide(gameState, side) {
    return side === 'e' ? (gameState.enemies || []) : (gameState.players || []);
}

function getCharacterSide(gameState, actor) {
    if ((gameState.players || []).includes(actor)) return 'p';
    if ((gameState.enemies || []).includes(actor)) return 'e';
    return 'p';
}

function ensureRelicRuntimeForSide(gameState, side) {
    if (!gameState.relicRuntime || typeof gameState.relicRuntime !== 'object') {
        gameState.relicRuntime = {};
    }
    if (!gameState.relicRuntime[side]) {
        gameState.relicRuntime[side] = { lowHpBarrierUsed: false };
    }
    return gameState.relicRuntime[side];
}

export function applyRelicBattleStart(gameState) {
    ensureRelicState(gameState);
    const events = [];
    gameState.relicRuntime = {
        p: { lowHpBarrierUsed: false },
        e: { lowHpBarrierUsed: false }
    };

    ['p', 'e'].forEach(side => {
        const relics = getOwnedRelics(gameState, side);
        const party = getPartyForSide(gameState, side);
        relics.forEach(relic => {
            const originalRaritySumMax = Number(relic.hooks?.originalRaritySumMax || 0);
            const raritySum = party.reduce((total, char) => total + Number(char.originalRarity || char.rarity || 1), 0);
            const livingParty = party.filter(char => char.hp > 0);
            const highlander = getOccupiedSlots(livingParty) === PARTY_SLOT_LIMIT
                && livingParty.length > 0
                && new Set(livingParty.map(char => char.species)).size === livingParty.length;
            const sharedAtkIntMultiplier = originalRaritySumMax && raritySum <= originalRaritySumMax
                ? Number(relic.hooks?.atkIntMultiplier || 1)
                : Number(relic.hooks?.atkIntMultiplier || 1);
            const shouldApplySharedMultiplier = (relic.hooks?.atkIntMultiplier && !originalRaritySumMax) || (originalRaritySumMax && raritySum <= originalRaritySumMax);
            if (shouldApplySharedMultiplier && sharedAtkIntMultiplier !== 1) {
                party.forEach((char, index) => {
                    if (char.hp <= 0) return;
                    const atkGain = addStatBonus(char, 'atk', Math.floor((char.baseAtk || char.atk || 1) * (sharedAtkIntMultiplier - 1)));
                    const intGain = addStatBonus(char, 'int', Math.floor((char.baseInt || char.int || 1) * (sharedAtkIntMultiplier - 1)));
                    events.push({ side, relic, hook: 'atkIntMultiplier', targets: [{ char, index, atkGain, intGain }] });
                });
            }
            const highlanderMultiplier = highlander ? Number(relic.hooks?.highlanderAtkIntMultiplier || 1) : 1;
            if (highlanderMultiplier !== 1) {
                party.forEach((char, index) => {
                    const atkGain = addStatBonus(char, 'atk', Math.floor((char.baseAtk || char.atk || 1) * (highlanderMultiplier - 1)));
                    const intGain = addStatBonus(char, 'int', Math.floor((char.baseInt || char.int || 1) * (highlanderMultiplier - 1)));
                    events.push({ side, relic, hook: 'highlanderAtkIntMultiplier', targets: [{ char, index, atkGain, intGain }] });
                });
            }
            if (relic.hooks?.lowestRarityAtkIntBonus || relic.hooks?.otherAtkIntPenalty) {
                const target = party
                    .map((char, index) => ({ char, index }))
                    .filter(({ char }) => char.hp > 0)
                    .sort((a, b) => Number(a.char.originalRarity || a.char.rarity || 1) - Number(b.char.originalRarity || b.char.rarity || 1))[0];
                if (!target) return;
                const targets = [];
                party.forEach((char, index) => {
                    if (char.hp <= 0) return;
                    const isLowestRarityTarget = index === target.index;
                    const atkGain = isLowestRarityTarget
                        ? Math.floor((char.baseAtk || char.atk || 1) * Number(relic.hooks.lowestRarityAtkIntBonus || 0))
                        : -Math.floor((char.baseAtk || char.atk || 1) * Number(relic.hooks.otherAtkIntPenalty || 0));
                    const intGain = isLowestRarityTarget
                        ? Math.floor((char.baseInt || char.int || 1) * Number(relic.hooks.lowestRarityAtkIntBonus || 0))
                        : -Math.floor((char.baseInt || char.int || 1) * Number(relic.hooks.otherAtkIntPenalty || 0));
                    addStatBonus(char, 'atk', atkGain);
                    addStatBonus(char, 'int', intGain);
                    targets.push({ char, index, atkGain, intGain, isLowestRarityTarget });
                });
                if (targets.length > 0) events.push({ side, relic, hook: 'lowestRarityAtkIntTradeoff', targets });
            }
            if (relic.hooks?.maxHpMultiplier) {
                party.forEach((char, index) => {
                    const multiplier = Number(relic.hooks.maxHpMultiplier || 1);
                    const before = char.maxHp;
                    char.maxHp = Math.max(1, Math.floor(char.maxHp * multiplier));
                    char.hp = Math.min(char.hp, char.maxHp);
                    char.shieldMultiplier = Math.min(char.shieldMultiplier || 1, Number(relic.hooks.shieldMultiplier || 1));
                    events.push({ side, relic, hook: 'maxHpMultiplier', targets: [{ char, index, amount: before - char.maxHp }] });
                });
            }
            const allShield = Number(relic.hooks?.battleStartShield || 0);
            if (allShield > 0) {
                const targets = party
                    .map((char, index) => ({ char, index }))
                    .filter(({ char }) => char.hp > 0)
                    .map(({ char, index }) => ({ char, index, amount: addShield(char, allShield) }))
                    .filter(({ amount }) => amount > 0);
                if (targets.length > 0) {
                    events.push({ side, relic, hook: 'battleStartShield', targets });
                }
            }

            const weakestShield = Number(relic.hooks?.weakestStartShield || 0);
            if (weakestShield > 0) {
                const target = party
                    .map((char, index) => ({ char, index }))
                    .filter(({ char }) => char.hp > 0)
                    .sort((a, b) => (a.char.hp / Math.max(1, a.char.maxHp)) - (b.char.hp / Math.max(1, b.char.maxHp)))[0];
                if (target) {
                    const amount = addShield(target.char, weakestShield);
                    if (amount > 0) {
                        events.push({
                            side,
                            relic,
                            hook: 'weakestStartShield',
                            targets: [{ char: target.char, index: target.index, amount }]
                        });
                    }
                }
            }

            const startStatus = relic.hooks?.battleStartEnemyStatus;
            if (startStatus?.statusId) {
                const enemySide = side === 'p' ? 'e' : 'p';
                const targets = getPartyForSide(gameState, enemySide)
                    .map((char, index) => ({ char, index }))
                    .filter(({ char }) => char.hp > 0)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, Math.max(1, Number(startStatus.count || 1)))
                    .filter(({ char }) => addStatus(char, startStatus.statusId))
                    .map(({ char, index }) => ({ char, index, statusId: startStatus.statusId }));
                if (targets.length > 0) {
                    events.push({ side, targetSide: enemySide, relic, hook: 'battleStartEnemyStatus', targets });
                }
            }

            const reelUpLowest = Number(relic.hooks?.startLowestRarityReelUp || 0);
            if (reelUpLowest > 0) {
                const target = party
                    .map((char, index) => ({ char, index }))
                    .filter(({ char }) => char.hp > 0)
                    .sort((a, b) => Number(a.char.originalRarity || a.char.rarity || 1) - Number(b.char.originalRarity || b.char.rarity || 1))[0];
                if (target) {
                    const maxReel = Array.isArray(target.char.commands?.[0]) ? target.char.commands.length - 1 : 0;
                    const before = target.char.currentReel || 0;
                    target.char.currentReel = Math.min(maxReel, before + reelUpLowest);
                    if (target.char.currentReel > before) {
                        syncDragonReelStatBonus(target.char);
                        events.push({
                            side,
                            relic,
                            hook: 'startLowestRarityReelUp',
                            targets: [{ char: target.char, index: target.index, amount: target.char.currentReel - before }]
                        });
                    }
                }
            }

            const enemyReelDown = Number(relic.hooks?.battleStartEnemyReelDown || 0);
            const enemySpdDown = Number(relic.hooks?.battleStartEnemySpdDown || 0);
            if (enemyReelDown > 0 || enemySpdDown > 0) {
                const enemySide = side === 'p' ? 'e' : 'p';
                const target = getPartyForSide(gameState, enemySide)
                    .map((char, index) => ({ char, index }))
                    .filter(({ char }) => char.hp > 0)
                    .sort((a, b) => (b.char.spd || 0) - (a.char.spd || 0))[0];
                if (target) {
                    const beforeReel = target.char.currentReel || 0;
                    target.char.currentReel = Math.max(0, beforeReel - enemyReelDown);
                    if (target.char.currentReel !== beforeReel) syncDragonReelStatBonus(target.char);
                    if (enemySpdDown > 0) {
                        target.char.spd = Math.max(1, (target.char.spd || 1) - enemySpdDown);
                        if (typeof target.char.baseSpd === 'number') {
                            target.char.baseSpd = Math.max(1, target.char.baseSpd - enemySpdDown);
                        }
                    }
                    events.push({
                        side,
                        targetSide: enemySide,
                        relic,
                        hook: 'battleStartEnemyReelDown',
                        targets: [{ char: target.char, index: target.index, amount: beforeReel - target.char.currentReel, spdDown: enemySpdDown }]
                    });
                }
            }
        });
    });

    return events;
}

export function applyRelicReelUp(gameState, actor) {
    if (!actor || actor.hp <= 0) return { shield: 0, events: [] };
    const side = getCharacterSide(gameState, actor);
    const party = getPartyForSide(gameState, side);
    const targetSide = side === 'p' ? 'e' : 'p';
    const enemies = getPartyForSide(gameState, targetSide);
    const events = [];
    let shield = 0;

    getOwnedRelics(gameState, side).forEach(relic => {
        const extraRerolls = Number(relic.hooks?.reelUpExtraRerolls || 0);
        if (extraRerolls > 0) {
            const before = actor.currentReel || 0;
            const maxReel = Array.isArray(actor.commands?.[0]) ? actor.commands.length - 1 : 0;
            actor.currentReel = Math.min(maxReel, before + extraRerolls);
            if (actor.currentReel > before) {
                syncDragonReelStatBonus(actor);
                events.push({ side, relic, hook: 'reelUpExtraRerolls', target: actor, amount: actor.currentReel - before });
            }
        }

        const teamShield = Number(relic.hooks?.reelUpTriggeredTeamShield || 0);
        if (teamShield > 0) {
            const targets = party
                .map((char, index) => ({ char, index }))
                .filter(({ char }) => char.hp > 0)
                .map(({ char, index }) => ({ char, index, amount: addShield(char, teamShield) }))
                .filter(({ amount }) => amount > 0);
            shield += targets.reduce((total, target) => total + target.amount, 0);
            if (targets.length > 0) events.push({ side, relic, hook: 'reelUpTriggeredTeamShield', targets });
        }

        const paralysisChance = Number(relic.hooks?.reelUpParalysisChance || 0);
        if (paralysisChance > 0 && Math.random() < paralysisChance) {
            const target = enemies
                .map((char, index) => ({ char, index }))
                .filter(({ char }) => char.hp > 0)
                .sort(() => Math.random() - 0.5)[0];
            if (target && addStatus(target.char, 'paralysis')) {
                events.push({ side, targetSide, relic, hook: 'reelUpParalysisChance', targets: [target] });
            }
        }
    });

    return { shield, events };
}

export function applyRelicAfterCommand(gameState, actor, commandContext) {
    if (!gameState || !actor || !commandContext) return [];
    const side = getCharacterSide(gameState, actor);
    const events = [];
    getOwnedRelics(gameState, side).forEach(relic => {
        const missReelBonus = Number(relic.hooks?.missReelAtkIntBonusPerStep || 0);
        if (missReelBonus > 0 && commandContext.commandId === 'misc03') {
            const reelStage = Math.max(1, Number(actor.currentReel || 0) + 1);
            const maxStage = Math.max(1, Number(relic.hooks?.missReelAtkIntMaxStage || 6));
            const bonusRate = Math.max(0, (maxStage - reelStage) * missReelBonus);
            if (bonusRate > 0) {
                const atkGain = addStatBonus(actor, 'atk', Math.floor((actor.baseAtk || actor.atk || 1) * bonusRate));
                const intGain = addStatBonus(actor, 'int', Math.floor((actor.baseInt || actor.int || 1) * bonusRate));
                events.push({ side, relic, hook: 'missReelAtkIntBonus', amount: bonusRate, reelStage, atkGain, intGain });
            }
        }

        const actionChain = Number(relic.hooks?.actionChainAtkIntBonus || 0);
        if (actionChain > 0) {
            if (!gameState.turnRuntime) gameState.turnRuntime = {};
            if (!gameState.turnRuntime[side]) gameState.turnRuntime[side] = { nextActorAtkIntBonus: 0 };
            gameState.turnRuntime[side].nextActorAtkIntBonus += actionChain;
            events.push({ side, relic, hook: 'actionChainAtkIntBonus', amount: gameState.turnRuntime[side].nextActorAtkIntBonus });
        }

        const missBonus = Number(relic.hooks?.missAtkIntBonus || 0);
        if (missBonus > 0 && commandContext.commandId === 'misc03') {
            const maxMissStacks = Number(relic.hooks?.missAtkIntMaxStacks || 3);
            const beforeStacks = Number(actor.missBuffStacks || 0);
            if (beforeStacks < maxMissStacks) {
                actor.missBuffStacks = beforeStacks + 1;
                const atkGain = addStatBonus(actor, 'atk', Math.floor((actor.baseAtk || actor.atk || 1) * missBonus));
                const intGain = addStatBonus(actor, 'int', Math.floor((actor.baseInt || actor.int || 1) * missBonus));
                events.push({ side, relic, hook: 'missAtkIntBonus', amount: actor.missBuffStacks, atkGain, intGain });
            }
        }
    });
    return events;
}

export function applyRelicAfterAttack(gameState, attacker, target) {
    if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) return [];
    ensureRelicState(gameState);

    const side = getCharacterSide(gameState, attacker);
    const targetSide = side === 'p' ? 'e' : 'p';
    const attackerIndex = getPartyForSide(gameState, side).indexOf(attacker);
    const targetIndex = getPartyForSide(gameState, targetSide).indexOf(target);
    if (targetIndex < 0) return [];

    const events = [];
    getOwnedRelics(gameState, side).forEach(relic => {
        const bonusDamage = Math.max(0, Number(relic.hooks?.attackBonusDamage || 0));
        if (bonusDamage > 0 && target.hp > 0) {
            const { shieldResult } = applyShieldedDirectDamage(gameState, {
                target,
                targetPrefix: targetSide,
                targetIdx: targetIndex,
                attackerPrefix: side,
                attackerIdx: attackerIndex,
                damage: bonusDamage,
                baseHp: target.hp
            });
            events.push({
                side,
                targetSide,
                target,
                index: targetIndex,
                relic,
                hook: 'attackBonusDamage',
                amount: bonusDamage,
                hpDamage: shieldResult.hpDamage,
                absorbed: shieldResult.absorbed
            });
        }

        const statusHook = relic.hooks?.attackStatus;
        if (statusHook?.statusId && target.hp > 0 && Math.random() < Number(statusHook.chance || 0)) {
            const added = addStatus(target, statusHook.statusId);
            if (added) {
                events.push({
                    side,
                    targetSide,
                    target,
                    index: targetIndex,
                    relic,
                    hook: 'attackStatus',
                    statusId: statusHook.statusId
                });
            }
        }
    });

    return events;
}

export function applyRelicLowHpBarrier(gameState) {
    ensureRelicState(gameState);

    for (const side of ['p', 'e']) {
        const runtime = ensureRelicRuntimeForSide(gameState, side);
        const relic = getOwnedRelics(gameState, side).find(item => item.hooks?.lowHpBarrier);
        if (!relic || runtime.lowHpBarrierUsed) continue;

        const target = getPartyForSide(gameState, side).find(char => (
            char.hp > 0 && char.hp <= Math.floor(char.maxHp * 0.5)
        ));
        if (!target) continue;

        const amount = addShield(target, Number(relic.hooks.lowHpBarrier || 0));
        if (amount <= 0) continue;
        runtime.lowHpBarrierUsed = true;
        return { target, index: getPartyForSide(gameState, side).indexOf(target), amount, relic, side };
    }

    return null;
}
