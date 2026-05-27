// commands/speciesSynergy.js

import { addShield } from '../battle/shield.js';
import { addStatBonus, addStatus, removeStatus, syncStatusEffects } from './status.js';

const NEGATIVE_STATUSES = ['paralysis', 'poison', 'weak', 'weakened', 'taunt', 'hidden'];

function getAllies(gameState, actor) {
    if ((gameState?.players || []).includes(actor)) return gameState.players;
    if ((gameState?.enemies || []).includes(actor)) return gameState.enemies;
    return actor ? [actor] : [];
}

function getLowestHpAlly(gameState, actor) {
    return getAllies(gameState, actor)
        .filter(ally => ally?.hp > 0)
        .sort((a, b) => (a.hp / Math.max(1, a.maxHp)) - (b.hp / Math.max(1, b.maxHp)))[0] || actor;
}

function getLowestShieldAlly(gameState, actor) {
    return getAllies(gameState, actor)
        .filter(ally => ally?.hp > 0)
        .sort((a, b) => {
            const shieldDiff = Math.max(0, a.shield || 0) - Math.max(0, b.shield || 0);
            if (shieldDiff !== 0) return shieldDiff;
            return (a.hp / Math.max(1, a.maxHp)) - (b.hp / Math.max(1, b.maxHp));
        })[0] || actor;
}

function getReelSupportTarget(gameState, actor) {
    return getAllies(gameState, actor)
        .filter(ally => ally?.hp > 0)
        .filter(ally => {
            const maxReel = Array.isArray(ally.commands?.[0]) ? ally.commands.length - 1 : 0;
            return (ally.currentReel || 0) < maxReel;
        })
        .sort((a, b) => (a.currentReel || 0) - (b.currentReel || 0))[0] || actor;
}

function advanceReel(actor, amount = 1) {
    const maxReel = Array.isArray(actor?.commands?.[0]) ? actor.commands.length - 1 : 0;
    const before = Math.max(0, Number(actor?.currentReel || 0));
    if (!actor || before >= maxReel) return 0;
    actor.currentReel = Math.min(maxReel, before + amount);
    return actor.currentReel - before;
}

function restoreHp(target, amount) {
    if (!target || target.hp <= 0) return 0;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + Math.max(0, Math.floor(amount)));
    return Math.max(0, target.hp - before);
}

function removeFirstNegativeStatus(target) {
    const statusId = NEGATIVE_STATUSES.find(id => target?.status?.includes(id));
    if (!statusId) return null;
    removeStatus(target, statusId);
    if (statusId === 'poison') target.poisonedIndices = [];
    syncStatusEffects(target);
    return statusId;
}

function spendHpWithoutDeath(actor, amount) {
    if (!actor || actor.hp <= 1) return 0;
    const paid = Math.min(Math.max(0, Math.floor(amount)), actor.hp - 1);
    actor.hp -= paid;
    return paid;
}

function applyDamage(commandId, actor, target, commandEffects) {
    const damage = commandEffects[commandId].calcDamage(actor);
    if (target) target.hp = Math.max(0, target.hp - damage);
    return damage;
}

export const speciesSynergyCommands = {
    cmd_jelly_cushion: {
        name: 'ゼリークッション',
        desc: '単体 / 混合 ATK0.6x + INT0.8x + シールドが最も薄い味方にシールド INT0.7x + HP2%',
        category: '混合',
        calcDamage: attacker => Math.floor(attacker.atk * 0.6 + attacker.int * 0.8),
        calcShield: attacker => Math.floor(attacker.int * 0.7 + attacker.maxHp * 0.02),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = applyDamage('cmd_jelly_cushion', actor, target, commandEffects);
            const shieldTarget = getLowestShieldAlly(gameState, actor);
            const shield = addShield(shieldTarget, commandEffects.cmd_jelly_cushion.calcShield(actor));
            return { type: 'damageShield', damage, shield, shieldTarget };
        },
        formatLog: event => `🫧 ${event.actor.name}の「ゼリークッション」！ ${event.target.name}に ${event.damage} の混合ダメージ！ ${event.shieldTarget.name}にシールド${event.shield}！`
    },
    cmd_gel_chorus: {
        name: 'ゲルコーラス',
        desc: '味方全体 / 回復 INT0.7x + リール支援+1',
        category: '回復',
        calcDamage: () => 0,
        calcHeal: attacker => Math.floor(attacker.int * 0.7),
        apply: ({ actor, gameState, commandEffects }) => {
            const healAmount = commandEffects.cmd_gel_chorus.calcHeal(actor);
            const healTotal = getAllies(gameState, actor).reduce((total, ally) => total + restoreHp(ally, healAmount), 0);
            const reelTarget = getReelSupportTarget(gameState, actor);
            const reelDelta = advanceReel(reelTarget, 1);
            return { type: 'teamHealReel', heal: healTotal, rawHeal: healAmount, reelTarget, reelDelta };
        },
        formatLog: event => `🎵 ${event.actor.name}の「ゲルコーラス」！ 味方全体をHP${event.rawHeal}ずつ包み、合計${event.heal}回復！${event.reelDelta ? ` ${event.reelTarget.name}のリール+${event.reelDelta}！` : ''}`
    },
    cmd_rally_banner: {
        name: '号令の旗',
        desc: '味方 / リール支援+1 + ATK/INT+8',
        category: '強化',
        calcDamage: () => 0,
        apply: ({ actor, gameState }) => {
            const target = getReelSupportTarget(gameState, actor);
            const reelDelta = advanceReel(target, 1);
            const atkGain = addStatBonus(target, 'atk', 8);
            const intGain = addStatBonus(target, 'int', 8);
            return { type: 'reelBuff', supportTarget: target, reelDelta, atkGain, intGain };
        },
        formatLog: event => `🚩 ${event.actor.name}の「号令の旗」！ ${event.supportTarget.name}を鼓舞し、リール+${event.reelDelta}、ATK+${event.atkGain}、INT+${event.intGain}！`
    },
    cmd_tactical_feint: {
        name: '戦術フェイント',
        desc: '単体 / 物理 ATK0.95x + 自分ATK/INT+6',
        category: '物理',
        calcDamage: attacker => Math.floor(attacker.atk * 0.95),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_tactical_feint', actor, target, commandEffects);
            const atkGain = addStatBonus(actor, 'atk', 6);
            const intGain = addStatBonus(actor, 'int', 6);
            return { type: 'damageBuff', damage, atkGain, intGain };
        },
        formatLog: event => `🎯 ${event.actor.name}の「戦術フェイント」！ ${event.target.name}に ${event.damage} の物理ダメージ！ 次の布石としてATK+${event.atkGain}、INT+${event.intGain}！`
    },
    cmd_pack_mark: {
        name: 'パックマーク',
        desc: '単体 / 物理 ATK1.1x + 対象SPD-16',
        category: '弱体',
        calcDamage: attacker => Math.floor(attacker.atk * 1.1),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_pack_mark', actor, target, commandEffects);
            const spdLoss = addStatBonus(target, 'spd', -16);
            return { type: 'damageDebuff', damage, spdLoss };
        },
        formatLog: event => `🐾 ${event.actor.name}の「パックマーク」！ ${event.target.name}に ${event.damage} の物理ダメージ！ 獲物のSPD${event.spdLoss}！`
    },
    cmd_leaping_watch: {
        name: '跳躍警戒',
        desc: '単体 / 物理 ATK0.85x + 自分SPD+20 + シールド ATK0.5x',
        category: '物理',
        calcDamage: attacker => Math.floor(attacker.atk * 0.85),
        calcShield: attacker => Math.floor(attacker.atk * 0.5),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_leaping_watch', actor, target, commandEffects);
            const spdGain = addStatBonus(actor, 'spd', 20);
            const shield = addShield(actor, commandEffects.cmd_leaping_watch.calcShield(actor));
            return { type: 'damageBuffShield', damage, spdGain, shield, shieldTarget: actor };
        },
        formatLog: event => `🦊 ${event.actor.name}の「跳躍警戒」！ ${event.target.name}に ${event.damage} の物理ダメージ！ SPD+${event.spdGain}、シールド${event.shield}！`
    },
    cmd_verdant_pulse: {
        name: '新緑の脈動',
        desc: '味方 / 回復 INT1.1x + 状態異常1つ解除',
        category: '回復',
        calcDamage: () => 0,
        calcHeal: attacker => Math.floor(attacker.int * 1.1),
        apply: ({ actor, gameState, commandEffects }) => {
            const healTarget = getLowestHpAlly(gameState, actor);
            const rawHeal = commandEffects.cmd_verdant_pulse.calcHeal(actor);
            const heal = restoreHp(healTarget, rawHeal);
            const removedStatus = removeFirstNegativeStatus(healTarget);
            return { type: 'healCleanse', heal, rawHeal, healTarget, removedStatus };
        },
        formatLog: event => `🌿 ${event.actor.name}の「新緑の脈動」！ ${event.healTarget.name}をHP${event.rawHeal}回復！${event.removedStatus ? ' 状態異常も解除した！' : ''}`
    },
    cmd_spore_lance: {
        name: '胞子槍',
        desc: '単体 / 魔法 INT1.45x + 脱力',
        category: '弱体',
        calcDamage: attacker => Math.floor(attacker.int * 1.45),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_spore_lance', actor, target, commandEffects);
            const addedStatus = addStatus(target, 'weak');
            return { type: 'damageStatus', damage, status: 'weak', addedStatus };
        },
        formatLog: event => `🍄 ${event.actor.name}の「胞子槍」！ ${event.target.name}に ${event.damage} の魔法ダメージ！${event.addedStatus ? ' 脱力を付与！' : ''}`
    },
    cmd_tidal_screen: {
        name: '潮膜斬り',
        desc: '単体 / 混合 ATK0.9x + INT0.65x + 自分にシールド INT0.6x + 脱力',
        category: '弱体',
        calcDamage: attacker => Math.floor(attacker.atk * 0.9 + attacker.int * 0.65),
        calcShield: attacker => Math.floor(attacker.int * 0.6),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_tidal_screen', actor, target, commandEffects);
            const shield = addShield(actor, commandEffects.cmd_tidal_screen.calcShield(actor));
            const addedStatus = addStatus(target, 'weak');
            return { type: 'damageShieldStatus', damage, shield, shieldTarget: actor, addedStatus };
        },
        formatLog: event => `🌊 ${event.actor.name}の「潮膜斬り」！ ${event.target.name}に ${event.damage} の混合ダメージ！ 自身にシールド${event.shield}、敵に脱力！`
    },
    cmd_brine_net: {
        name: '塩網',
        desc: '単体 / 魔法 INT1.0x + 弱体化 + シールドが最も薄い味方にシールド INT0.5x',
        category: '弱体',
        calcDamage: attacker => Math.floor(attacker.int * 1.0),
        calcShield: attacker => Math.floor(attacker.int * 0.5),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = applyDamage('cmd_brine_net', actor, target, commandEffects);
            const addedStatus = addStatus(target, 'weakened');
            const shieldTarget = getLowestShieldAlly(gameState, actor);
            const shield = addShield(shieldTarget, commandEffects.cmd_brine_net.calcShield(actor));
            return { type: 'damageStatusShield', damage, status: 'weakened', addedStatus, shield, shieldTarget };
        },
        formatLog: event => `🕸️ ${event.actor.name}の「塩網」！ ${event.target.name}に ${event.damage} の魔法ダメージと弱体化！ ${event.shieldTarget.name}にシールド${event.shield}！`
    },
    cmd_bone_offering: {
        name: '骨の供物',
        desc: '単体 / 魔法 INT1.75x + 自分のHP8%消費',
        category: '魔法',
        calcDamage: attacker => Math.floor(attacker.int * 1.75),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_bone_offering', actor, target, commandEffects);
            const hpCost = spendHpWithoutDeath(actor, actor.maxHp * 0.08);
            return { type: 'damageHpCost', damage, hpCost };
        },
        formatLog: event => `🦴 ${event.actor.name}の「骨の供物」！ HP${event.hpCost}を代償に、${event.target.name}へ ${event.damage} の魔法ダメージ！`
    },
    cmd_grave_echo: {
        name: '墓所の反響',
        desc: '単体 / 魔法 INT1.25x + HP割合が最も低い味方をINT0.8x回復',
        category: '魔法',
        calcDamage: attacker => Math.floor(attacker.int * 1.25),
        calcHeal: attacker => Math.floor(attacker.int * 0.8),
        apply: ({ actor, target, gameState, commandEffects }) => {
            const damage = applyDamage('cmd_grave_echo', actor, target, commandEffects);
            const healTarget = getLowestHpAlly(gameState, actor);
            const rawHeal = commandEffects.cmd_grave_echo.calcHeal(actor);
            const heal = restoreHp(healTarget, rawHeal);
            return { type: 'damageHeal', damage, heal, rawHeal, healTarget };
        },
        formatLog: event => `🪦 ${event.actor.name}の「墓所の反響」！ ${event.target.name}に ${event.damage} の魔法ダメージ！ ${event.healTarget.name}をHP${event.rawHeal}回復！`
    },
    cmd_doom_spark: {
        name: 'ドゥームスパーク',
        desc: '単体 / 魔法 INT1.1x + 脱力',
        category: '弱体',
        calcDamage: attacker => Math.floor(attacker.int * 1.1),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_doom_spark', actor, target, commandEffects);
            const addedStatus = addStatus(target, 'weak');
            return { type: 'damageStatus', damage, status: 'weak', addedStatus };
        },
        formatLog: event => `😈 ${event.actor.name}の「ドゥームスパーク」！ ${event.target.name}に ${event.damage} の魔法ダメージ！${event.addedStatus ? ' 脱力を刻んだ！' : ''}`
    },
    cmd_infernal_gamble: {
        name: '地獄の賭け',
        desc: '単体 / 混合 高い方2.4x。30%で失敗して自分ATK/INT+8',
        category: '混合',
        calcDamage: attacker => Math.floor(Math.max(attacker.atk || 0, attacker.int || 0) * 2.4),
        apply: ({ actor, target, commandEffects }) => {
            if (Math.random() < 0.3) {
                const atkGain = addStatBonus(actor, 'atk', 8);
                const intGain = addStatBonus(actor, 'int', 8);
                return { type: 'gambleMissBuff', damage: 0, atkGain, intGain };
            }
            const damage = applyDamage('cmd_infernal_gamble', actor, target, commandEffects);
            return { type: 'damage', damage };
        },
        formatLog: event => event.damage > 0
            ? `🔥 ${event.actor.name}の「地獄の賭け」！ ${event.target.name}に ${event.damage} の混合ダメージ！`
            : `🔥 ${event.actor.name}の「地獄の賭け」は外れたが、代償の魔力でATK+${event.atkGain}、INT+${event.intGain}！`
    },
    cmd_scale_charge: {
        name: '鱗突撃',
        desc: '単体 / 物理 ATK1.25x + 自分にシールド ATK0.55x + HP2%',
        category: '物理',
        calcDamage: attacker => Math.floor(attacker.atk * 1.25),
        calcShield: attacker => Math.floor(attacker.atk * 0.55 + attacker.maxHp * 0.02),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_scale_charge', actor, target, commandEffects);
            const shield = addShield(actor, commandEffects.cmd_scale_charge.calcShield(actor));
            return { type: 'damageShield', damage, shield, shieldTarget: actor };
        },
        formatLog: event => `🐉 ${event.actor.name}の「鱗突撃」！ ${event.target.name}に ${event.damage} の物理ダメージ！ 自身にシールド${event.shield}！`
    },
    cmd_skyline_roar: {
        name: '天空咆哮',
        desc: '単体 / 魔法 INT1.5x + 弱体化',
        category: '弱体',
        calcDamage: attacker => Math.floor(attacker.int * 1.5),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_skyline_roar', actor, target, commandEffects);
            const addedStatus = addStatus(target, 'weakened');
            return { type: 'damageStatus', damage, status: 'weakened', addedStatus };
        },
        formatLog: event => `🌌 ${event.actor.name}の「天空咆哮」！ ${event.target.name}に ${event.damage} の魔法ダメージ！${event.addedStatus ? ' 弱体化を付与！' : ''}`
    },
    cmd_patch_frame: {
        name: 'パッチフレーム',
        desc: '味方 / シールド INT0.8x + HP3% + 自分小回復',
        category: '防御',
        calcDamage: () => 0,
        calcShield: attacker => Math.floor(attacker.int * 0.8 + attacker.maxHp * 0.03),
        apply: ({ actor, gameState, commandEffects }) => {
            const shieldTarget = getLowestShieldAlly(gameState, actor);
            const shield = addShield(shieldTarget, commandEffects.cmd_patch_frame.calcShield(actor));
            const heal = restoreHp(actor, Math.floor(actor.int * 0.5));
            return { type: 'shieldHeal', shield, shieldTarget, heal };
        },
        formatLog: event => `🛠️ ${event.actor.name}の「パッチフレーム」！ ${event.shieldTarget.name}にシールド${event.shield}、自身をHP${event.heal}修理！`
    },
    cmd_scrap_driver: {
        name: 'スクラップドライバー',
        desc: '単体 / 物理 ATK1.3x + 現在シールド20%を追加ダメージ',
        category: '物理',
        calcDamage: attacker => Math.floor(attacker.atk * 1.3 + Math.max(0, attacker.shield || 0) * 0.2),
        apply: ({ actor, target, commandEffects }) => {
            const damage = applyDamage('cmd_scrap_driver', actor, target, commandEffects);
            return { type: 'damage', damage };
        },
        formatLog: event => `🔩 ${event.actor.name}の「スクラップドライバー」！ 装甲片を叩き込み、${event.target.name}に ${event.damage} の物理ダメージ！`
    }
};
