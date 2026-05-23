// commands/grade1.js
import { addStatus } from './status.js';

export const grade1Commands = {
    // =========================================================================
    // 🔰 グレード1専用・技
    // =========================================================================
    "atk_hinoko": {
        name: "火の粉",
        desc: "敵単体に小さな魔法ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.2),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_hinoko"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🔥 ${attacker.name}の「火の粉」！ ${target.name}に ${dmg} の魔法ダメージ！`;
        }
    },
    "atk_sumihaki": {
        name: "スミ吐き",
        desc: "敵単体に小ダメージを与え、脱力を付与する。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_sumihaki"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            let effectMsg = "";
            if (addStatus(target, "weak")) {
                effectMsg = ` さらに ${target.name} を【脱力】状態にした！`;
            }
            return `🦑 ${attacker.name}の「スミ吐き」！ ${target.name}に ${dmg} のダメージ！${effectMsg}`;
        }
    },
    "atk_kamitsuki": {
        name: "かみつき",
        desc: "敵単体に中ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.2),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_kamitsuki"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🦴 ${attacker.name}の「かみつき」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk_scream": {
        name: "叫び声",
        desc: "敵単体に小さな魔法ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.0),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_scream"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `📢 ${attacker.name}の「叫び声」！ ${target.name}に ${dmg} の魔法ダメージ！`;
        }
    },
    "atk_hikaki": {
        name: "ひっかき",
        desc: "敵単体に小ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.1),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_hikaki"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🐾 ${attacker.name}の「ひっかき」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk_taiatari": {
        name: "たいあたり",
        desc: "敵単体に中ダメージを与える。",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.3),
        action: (attacker, target, commandEffects) => {
            const dmg = commandEffects["atk_taiatari"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `💥 ${attacker.name}の「たいあたり」！ ${target.name}に ${dmg} のダメージ！`;
        }
    }
};
