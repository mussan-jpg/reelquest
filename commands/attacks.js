// commands/attacks.js

export const attackCommands = {
    // =========================================================================
    // ⚔️ 物理攻撃系
    // =========================================================================
    "atk01": {
        name: "こうげき",
        desc: "敵単体に小ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.0),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk01"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `⚔️ ${attacker.name}の「こうげき」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk02": {
        name: "こうげき！",
        desc: "敵単体に中ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.4),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk02"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `⚔️ ${attacker.name}の「こうげき！」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk03": {
        name: "会心の一撃",
        desc: "敵単体に大ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 2.0),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk03"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `⚔️ ${attacker.name}の「会心の一撃」が炸裂！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk05": {
        name: "必殺の一撃",
        desc: "敵単体に特大ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 2.8),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk05"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `⚔️ ${attacker.name}の「必殺の一撃」が炸裂！！ ${target.name}に ${dmg} の大ダメージ！`;
        }
    },

    // =========================================================================
    // 🔮 魔法・属性攻撃系
    // =========================================================================
    "mgc01": {
        name: "魔法攻撃",
        desc: "敵単体に魔法ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.6),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["mgc01"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🔮 ${attacker.name}の「魔法攻撃」！ ${target.name}に ${dmg} の魔法ダメージ！`;
        }
    },
    "mgc02": {
        name: "大魔法",
        desc: "敵単体に強い魔法ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.int * 2.3),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["mgc02"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🔮 ${attacker.name}の「大魔法」！ 魔力の奔流が ${target.name} を飲み込み、${dmg} の大ダメージ！`;
        }
    },
    "atk_fire": {
        name: "火炎放射",
        desc: "敵単体に攻撃と魔力で大ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.8 + attacker.int * 1.0),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_fire"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🔥 ${attacker.name}の「火炎放射」！！ 激しい炎が ${target.name} を焼き尽くし、 ${dmg} の大ダメージ！`;
        }
    }
};
