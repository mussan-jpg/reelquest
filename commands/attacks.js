// commands/attacks.js

import { addShield } from '../battle/shield.js';
import { addStatBonus, addStatus, removeStatus, syncStatusEffects } from './status.js';

const REMOVABLE_NEGATIVE_STATUSES = ["paralysis", "poison", "weak", "weakened"];

function applyDamageCommand(commandId, actor, target, commandEffects) {
    const damage = commandEffects[commandId].calcDamage(actor);
    target.hp = Math.max(0, target.hp - damage);
    return { type: 'damage', damage };
}

function formatDamageLog(event, commandName, damageLabel = 'ダメージ') {
    return `⚔️ ${event.actor.name}の「${commandName}」！ ${event.target.name}に ${event.damage} の${damageLabel}！`;
}

function getAllies(gameState, actor) {
    if ((gameState?.players || []).includes(actor)) return gameState.players;
    if ((gameState?.enemies || []).includes(actor)) return gameState.enemies;
    return actor ? [actor] : [];
}

function getLowestHpAlly(gameState, actor) {
    return getAllies(gameState, actor)
        .filter(ally => ally?.hp > 0)
        .sort((a, b) => {
            const aRatio = Number(a.hp || 0) / Math.max(1, Number(a.maxHp || 1));
            const bRatio = Number(b.hp || 0) / Math.max(1, Number(b.maxHp || 1));
            return aRatio - bRatio;
        })[0] || actor;
}

function getLowestShieldAlly(gameState, actor) {
    return getAllies(gameState, actor)
        .filter(ally => ally?.hp > 0)
        .sort((a, b) => {
            const shieldDiff = Math.max(0, Number(a.shield || 0)) - Math.max(0, Number(b.shield || 0));
            if (shieldDiff !== 0) return shieldDiff;
            const aRatio = Number(a.hp || 0) / Math.max(1, Number(a.maxHp || 1));
            const bRatio = Number(b.hp || 0) / Math.max(1, Number(b.maxHp || 1));
            return aRatio - bRatio;
        })[0] || actor;
}

function removeFirstNegativeStatus(character) {
    const statusId = REMOVABLE_NEGATIVE_STATUSES.find(id => character?.status?.includes(id));
    if (!statusId) return null;
    removeStatus(character, statusId);
    if (statusId === 'poison') character.poisonedIndices = [];
    syncStatusEffects(character);
    return statusId;
}

function spendHpWithoutDeath(actor, amount) {
    if (!actor || actor.hp <= 1) return 0;
    const cost = Math.max(0, Math.floor(Number(amount || 0)));
    const paid = Math.min(cost, actor.hp - 1);
    actor.hp -= paid;
    return paid;
}

function healSelf(actor, amount) {
    if (!actor || actor.hp <= 0) return 0;
    const before = actor.hp;
    actor.hp = Math.min(actor.maxHp, actor.hp + Math.max(0, Math.floor(Number(amount || 0))));
    return Math.max(0, actor.hp - before);
}

function getReelStage(actor) {
    return Math.max(0, Math.floor(Number(actor?.currentReel || 0)));
}

function getMaxReelStage(actor) {
    return Array.isArray(actor?.commands?.[0]) ? actor.commands.length - 1 : 0;
}

function advanceReel(actor, amount = 1) {
    const maxStage = getMaxReelStage(actor);
    if (!actor || maxStage <= 0) return 0;
    const before = getReelStage(actor);
    actor.currentReel = Math.min(maxStage, before + Math.max(0, Math.floor(amount)));
    return Math.max(0, actor.currentReel - before);
}

export const attackCommands = {
    // =========================================================================
    // ⚔️ 物理攻撃系
    // =========================================================================
    "atk01": {
        name: "こうげき",
        desc: "単体 / 物理 ATK1.0x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.0),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("atk01", actor, target, commandEffects),
        formatLog: (event) => formatDamageLog(event, "こうげき")
    },
    "atk02": {
        name: "こうげき！",
        desc: "単体 / 物理 ATK1.4x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.4),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("atk02", actor, target, commandEffects),
        formatLog: (event) => formatDamageLog(event, "こうげき！")
    },
    "atk03": {
        name: "会心の一撃",
        desc: "単体 / 物理 ATK2.0x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 2.0),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("atk03", actor, target, commandEffects),
        formatLog: (event) => formatDamageLog(event, "会心の一撃")
    },
    "atk05": {
        name: "必殺の一撃",
        desc: "単体 / 物理 ATK2.8x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 2.8),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("atk05", actor, target, commandEffects),
        formatLog: (event) => formatDamageLog(event, "必殺の一撃", "大ダメージ")
    },

    // =========================================================================
    // 🔮 魔法・属性攻撃系
    // =========================================================================
    "mgc01": {
        name: "魔法攻撃",
        desc: "単体 / 魔法 INT1.6x",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.6),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("mgc01", actor, target, commandEffects),
        formatLog: (event) => `🔮 ${event.actor.name}の「魔法攻撃」！ ${event.target.name}に ${event.damage} の魔法ダメージ！`
    },
    "mgc02": {
        name: "大魔法",
        desc: "単体 / 魔法 INT2.3x",
        calcDamage: (attacker) => Math.floor(attacker.int * 2.3),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("mgc02", actor, target, commandEffects),
        formatLog: (event) => `🔮 ${event.actor.name}の「大魔法」！ ${event.target.name}に ${event.damage} の大ダメージ！`
    },
    "atk_fire": {
        name: "火炎放射",
        desc: "単体 / 混合 ATK1.8x + INT1.0x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.8 + attacker.int * 1.0),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("atk_fire", actor, target, commandEffects),
        formatLog: (event) => `🔥 ${event.actor.name}の「火炎放射」！ ${event.target.name}に ${event.damage} の大ダメージ！`
    },
    "cmd_root_guard": {
        name: "根護の魔弾",
        desc: "単体 / 魔法 INT1.7x + 自分にシールド INT0.8x + HP3%",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.7),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_root_guard"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const shield = addShield(actor, Math.floor(actor.int * 0.8 + actor.maxHp * 0.03));
            return { type: 'damageShield', damage, shield, shieldTarget: actor };
        },
        formatLog: (event) => `🌳 ${event.actor.name}の「根護の魔弾」！ ${event.target.name}に ${event.damage} の魔法ダメージ！ ${event.shieldTarget.name}にシールド${event.shield}！`
    },
    "cmd_cleansing_thorn": {
        name: "浄化の棘",
        desc: "単体 / 魔法 INT1.6x + 自分の状態異常を1つ解除",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.6),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_cleansing_thorn"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const removedStatus = removeFirstNegativeStatus(actor);
            return { type: 'damageCleanse', damage, removedStatus };
        },
        formatLog: (event) => {
            const cleanseText = event.removedStatus ? ` 自身の状態異常を1つ解除した！` : '';
            return `🌿 ${event.actor.name}の「浄化の棘」！ ${event.target.name}に ${event.damage} の魔法ダメージ！${cleanseText}`;
        }
    },
    "cmd_lifebloom_bolt": {
        name: "生命開花の魔弾",
        desc: "単体 / 魔法 INT1.5x + HP割合が最も低い味方にシールド INT0.7x + HP2%",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.5),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = commandEffects["cmd_lifebloom_bolt"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const shieldTarget = getLowestHpAlly(gameState, actor);
            const shield = addShield(shieldTarget, Math.floor(actor.int * 0.7 + actor.maxHp * 0.02));
            return { type: 'damageShield', damage, shield, shieldTarget };
        },
        formatLog: (event) => `🌱 ${event.actor.name}の「生命開花の魔弾」！ ${event.target.name}に ${event.damage} の魔法ダメージ！ ${event.shieldTarget.name}にシールド${event.shield}！`
    },
    "cmd_jelly_rebound": {
        name: "ぷるん反撃",
        desc: "単体 / 混合 ATK0.8x + INT0.9x + シールドが最も薄い味方にシールド INT0.6x + HP3%",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8 + attacker.int * 0.9),
        calcShield: (attacker) => Math.floor(attacker.int * 0.6 + attacker.maxHp * 0.03),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = commandEffects["cmd_jelly_rebound"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const shieldTarget = getLowestShieldAlly(gameState, actor);
            const shield = addShield(shieldTarget, commandEffects["cmd_jelly_rebound"].calcShield(actor));
            return { type: 'damageShield', damage, shield, shieldTarget };
        },
        formatLog: (event) => `🫧 ${event.actor.name}の「ぷるん反撃」！ ${event.target.name}に ${event.damage} の混合ダメージ！ ${event.shieldTarget.name}にシールド${event.shield}！`
    },
    "cmd_mucus_mend": {
        name: "粘液手当",
        desc: "単体 / 魔法 INT1.15x + HP割合が最も低い味方をINT1.0x + HP3%回復",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.15),
        calcHeal: (attacker) => Math.floor(attacker.int * 1.0 + attacker.maxHp * 0.03),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = commandEffects["cmd_mucus_mend"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const healTarget = getLowestHpAlly(gameState, actor);
            const beforeHp = healTarget?.hp || 0;
            const rawHeal = commandEffects["cmd_mucus_mend"].calcHeal(actor);
            if (healTarget) healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + rawHeal);
            const heal = healTarget ? Math.max(0, healTarget.hp - beforeHp) : 0;
            return { type: 'damageHeal', damage, heal, rawHeal, healTarget };
        },
        formatLog: (event) => `💧 ${event.actor.name}の「粘液手当」！ ${event.target.name}に ${event.damage} の魔法ダメージ！ ${event.healTarget?.name || event.actor.name}をHP${event.rawHeal ?? event.heal}回復！`
    },
    "cmd_split_foam": {
        name: "分裂フォーム",
        desc: "単体 / 魔法 INT1.0x + 自分とHP割合が最も低い味方にシールド INT0.45x + HP2%",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.0),
        calcShield: (attacker) => Math.floor(attacker.int * 0.45 + attacker.maxHp * 0.02),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = commandEffects["cmd_split_foam"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const primaryTarget = getLowestHpAlly(gameState, actor);
            const shieldTargets = [actor, primaryTarget].filter((ally, index, allies) => ally && allies.indexOf(ally) === index);
            const shieldAmount = commandEffects["cmd_split_foam"].calcShield(actor);
            const shieldTotal = shieldTargets.reduce((total, ally) => total + addShield(ally, shieldAmount), 0);
            return { type: 'damageMultiShield', damage, shield: shieldTotal, shieldTargets };
        },
        formatLog: (event) => {
            const names = (event.shieldTargets || []).map(ally => ally.name).join(' / ') || event.actor.name;
            return `🫧 ${event.actor.name}の「分裂フォーム」！ ${event.target.name}に ${event.damage} の魔法ダメージ！ ${names}に合計シールド${event.shield}！`;
        }
    },
    "cmd_piston_bulwark": {
        name: "装甲ピストン",
        desc: "単体 / 物理 ATK1.35x + 自身の現在シールド25%を追加ダメージ + 自分にシールド ATK0.55x + HP2%",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.35 + Math.max(0, attacker.shield || 0) * 0.25),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_piston_bulwark"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const shield = addShield(actor, Math.floor(actor.atk * 0.55 + actor.maxHp * 0.02));
            return { type: 'damageShield', damage, shield, shieldTarget: actor };
        },
        formatLog: (event) => `⚙️ ${event.actor.name}の「装甲ピストン」！ 装甲の圧で${event.target.name}に ${event.damage} の物理ダメージ！ ${event.shieldTarget.name}にシールド${event.shield}！`
    },
    "cmd_anchor_guard": {
        name: "アンカーガード",
        desc: "単体 / 物理 ATK1.2x + シールドが最も薄い味方にシールド ATK0.45x + HP2% + 自分に挑発1T",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.2),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = commandEffects["cmd_anchor_guard"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const shieldTarget = getLowestShieldAlly(gameState, actor);
            const shield = addShield(shieldTarget, Math.floor(actor.atk * 0.45 + actor.maxHp * 0.02));
            addStatus(actor, "taunt", { duration: 1, extendDuration: true });
            return { type: 'damageShieldTaunt', damage, shield, shieldTarget };
        },
        formatLog: (event) => `⚓ ${event.actor.name}の「アンカーガード」！ ${event.target.name}に ${event.damage} の物理ダメージ！ ${event.shieldTarget.name}にシールド${event.shield}、自身は攻撃を引きつける！`
    },
    "cmd_core_knuckle": {
        name: "コアナックル",
        desc: "単体 / 混合 ATK1.3x + INT0.6x + 廃材35%を追加ダメージ + 自分にシールド ATK0.25x + INT0.45x + 廃材30%",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.3 + attacker.int * 0.6 + Math.max(0, attacker.constructRecycleCore || 0) * 0.35),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_core_knuckle"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const shield = addShield(actor, Math.floor(actor.atk * 0.25 + actor.int * 0.45 + Math.max(0, actor.constructRecycleCore || 0) * 0.3));
            return { type: 'damageShield', damage, shield, shieldTarget: actor };
        },
        formatLog: (event) => `🔩 ${event.actor.name}の「コアナックル」！ 廃材を共振させ、${event.target.name}に ${event.damage} の混合ダメージ！ ${event.shieldTarget.name}にシールド${event.shield}！`
    },
    "cmd_grave_pact": {
        name: "墓所の契約",
        desc: "単体 / 魔法 INT1.9x + 自分のHP10%消費（HP1未満にならない）",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.9),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_grave_pact"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const hpCost = spendHpWithoutDeath(actor, Math.floor(actor.maxHp * 0.1));
            return { type: 'damageHpCost', damage, hpCost };
        },
        formatLog: (event) => `🪦 ${event.actor.name}の「墓所の契約」！ ${event.target.name}に ${event.damage} の魔法ダメージ！ 代償としてHP${event.hpCost}を支払った！`
    },
    "cmd_soul_siphon": {
        name: "魂吸収",
        desc: "単体 / 魔法 INT1.45x + 与ダメージの35%ぶん自分を回復",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.45),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_soul_siphon"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const heal = healSelf(actor, Math.floor(damage * 0.35));
            return { type: 'damageDrain', damage, heal };
        },
        formatLog: (event) => `👻 ${event.actor.name}の「魂吸収」！ ${event.target.name}に ${event.damage} の魔法ダメージ！ HP${event.heal}を吸収した！`
    },
    "cmd_last_grasp": {
        name: "死線の一撃",
        desc: "単体 / 混合 INT1.2x + 減少HP35%ぶん追加ダメージ",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.2 + Math.max(0, attacker.maxHp - attacker.hp) * 0.35),
        apply: ({ actor, target, commandEffects }) => applyDamageCommand("cmd_last_grasp", actor, target, commandEffects),
        formatLog: (event) => `💀 ${event.actor.name}の「死線の一撃」！ ${event.target.name}に ${event.damage} の怨念ダメージ！`
    },
    "cmd_drake_surge": {
        name: "竜脈撃",
        desc: "単体 / 混合 ATK1.45x + INT0.55x + 次の攻撃に最大HP20%の固定追撃を予約",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.45 + attacker.int * 0.55),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_drake_surge"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const fixedDamage = Math.max(1, Math.floor((actor.maxHp || 1) * 0.2));
            actor.pendingFixedDamage = Math.max(0, Number(actor.pendingFixedDamage || 0)) + fixedDamage;
            return { type: 'damageCharge', damage, fixedDamage };
        },
        formatLog: (event) => `🐉 ${event.actor.name}の「竜脈撃」！ ${event.target.name}に ${event.damage} の混合ダメージ！ 次の攻撃に固定${event.fixedDamage}を宿した！`
    },
    "cmd_wing_ascent": {
        name: "昇竜翼",
        desc: "単体 / 物理 ATK1.1x + 自分のリール+1",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.1),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_wing_ascent"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const reelDelta = advanceReel(actor, 1);
            return { type: 'damageReelUp', damage, reelDelta };
        },
        formatLog: (event) => `🪽 ${event.actor.name}の「昇竜翼」！ ${event.target.name}に ${event.damage} の物理ダメージ！${event.reelDelta ? ` リールが${event.reelDelta}段階上昇！` : ''}`
    },
    "cmd_ancient_roar": {
        name: "古竜の咆哮",
        desc: "単体 / 魔法 INT1.65x + 脱力",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.65),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_ancient_roar"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const addedStatus = addStatus(target, "weak");
            return { type: 'damageStatus', damage, status: 'weak', addedStatus };
        },
        formatLog: (event) => {
            const statusText = event.addedStatus ? ` ${event.target.name}に【脱力】を付与した！` : '';
            return `🌋 ${event.actor.name}の「古竜の咆哮」！ ${event.target.name}に ${event.damage} の魔法ダメージ！${statusText}`;
        }
    },
    "cmd_predator_pounce": {
        name: "捕食跳躍",
        desc: "単体 / 物理 ATK1.35x + SPD差20%を追加ダメージ",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.35),
        apply: ({ actor, target, commandEffects }) => {
            const speedEdge = Math.max(0, Number(actor.spd || 0) - Number(target?.spd || 0));
            const bonusDamage = Math.floor(speedEdge * 0.2);
            const damage = commandEffects["cmd_predator_pounce"].calcDamage(actor) + bonusDamage;
            target.hp = Math.max(0, target.hp - damage);
            return { type: 'damageSpeedEdge', damage, bonusDamage };
        },
        formatLog: (event) => `🐾 ${event.actor.name}の「捕食跳躍」！ ${event.target.name}に ${event.damage} の物理ダメージ！${event.bonusDamage ? ` 速度差で+${event.bonusDamage}！` : ''}`
    },
    "cmd_hamstring_claw": {
        name: "脚砕きの爪",
        desc: "単体 / 物理 ATK1.15x + 対象SPD-10",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.15),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_hamstring_claw"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const spdLoss = addStatBonus(target, 'spd', -10);
            return { type: 'damageDebuff', damage, spdLoss };
        },
        formatLog: (event) => `🐺 ${event.actor.name}の「脚砕きの爪」！ ${event.target.name}に ${event.damage} の物理ダメージ！ ${event.target.name}のSPD${event.spdLoss}！`
    },
    "cmd_feral_dash": {
        name: "野生疾走",
        desc: "単体 / 物理 ATK1.05x + 自分SPD+20",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.05),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_feral_dash"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const spdGain = addStatBonus(actor, 'spd', 20);
            return { type: 'damageBuff', damage, spdGain };
        },
        formatLog: (event) => `💨 ${event.actor.name}の「野生疾走」！ ${event.target.name}に ${event.damage} の物理ダメージ！ さらにSPD+${event.spdGain}！`
    },
    "cmd_counter_howl": {
        name: "反撃の遠吠え",
        desc: "単体 / 物理 ATK0.95x + 自分SPD+16 + 隠密",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.95),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_counter_howl"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const spdGain = addStatBonus(actor, 'spd', 16);
            const addedStatus = addStatus(actor, 'hidden');
            return { type: 'damageBuffStatus', damage, spdGain, status: 'hidden', addedStatus };
        },
        formatLog: (event) => `🌕 ${event.actor.name}の「反撃の遠吠え」！ ${event.target.name}に ${event.damage} の物理ダメージ！ SPD+${event.spdGain}、身を隠した！`
    },
    "cmd_coordinated_slash": {
        name: "連携斬り",
        desc: "単体 / 物理 ATK1.25x + 自分のATK+6",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.25),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_coordinated_slash"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const atkGain = addStatBonus(actor, 'atk', 6);
            return { type: 'damageBuff', damage, atkGain };
        },
        formatLog: (event) => `🗡️ ${event.actor.name}の「連携斬り」！ ${event.target.name}に ${event.damage} の物理ダメージ！ 続く攻めに備えてATK+${event.atkGain}！`
    },
    "cmd_suppressive_shot": {
        name: "制圧射撃",
        desc: "単体 / 物理 ATK1.35x + 脱力",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.35),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["cmd_suppressive_shot"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const addedStatus = addStatus(target, "weak");
            return { type: 'damageStatus', damage, status: 'weak', addedStatus };
        },
        formatLog: (event) => {
            const statusText = event.addedStatus ? ` ${event.target.name}に【脱力】を付与した！` : '';
            return `🔫 ${event.actor.name}の「制圧射撃」！ ${event.target.name}に ${event.damage} の物理ダメージ！${statusText}`;
        }
    },
    "cmd_first_aid_strike": {
        name: "応急手当",
        desc: "単体 / 物理 ATK0.8x + HP割合が最も低い味方をINT0.8x回復",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = commandEffects["cmd_first_aid_strike"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const healTarget = getLowestHpAlly(gameState, actor);
            const beforeHp = healTarget?.hp || 0;
            if (healTarget) healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + Math.max(1, Math.floor((actor.int || 1) * 0.8)));
            const heal = healTarget ? Math.max(0, healTarget.hp - beforeHp) : 0;
            return { type: 'damageHeal', damage, heal, healTarget };
        },
        formatLog: (event) => `🩹 ${event.actor.name}の「応急手当」！ ${event.target.name}に ${event.damage} の物理ダメージ！ ${event.healTarget?.name || event.actor.name}をHP${event.heal}回復！`
    }
};
