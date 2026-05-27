// commands/grade1.js
import { addStatus } from './status.js';

function applyGradeDamage(commandId, actor, target, commandEffects) {
    const damage = commandEffects[commandId].calcDamage(actor);
    target.hp = Math.max(0, target.hp - damage);
    return { type: 'damage', damage };
}

export const grade1Commands = {
    // =========================================================================
    // 🔰 グレード1専用・技
    // =========================================================================
    "atk_hinoko": {
        name: "火の粉",
        desc: "単体 / 魔法 INT1.2x",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.2),
        apply: ({ actor, target, commandEffects }) => applyGradeDamage("atk_hinoko", actor, target, commandEffects),
        formatLog: (event) => `🔥 ${event.actor.name}の「火の粉」！ ${event.target.name}に ${event.damage} の魔法ダメージ！`
    },
    "atk_sumihaki": {
        name: "スミ吐き",
        desc: "単体 / 物理 ATK0.8x + 脱力(ATK-30%、加算)",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8),
        apply: ({ actor, target, commandEffects }) => {
            const damage = commandEffects["atk_sumihaki"].calcDamage(actor);
            target.hp = Math.max(0, target.hp - damage);
            const addedStatus = addStatus(target, "weak");
            return { type: 'damageStatus', damage, status: 'weak', addedStatus };
        },
        formatLog: (event) => {
            const effectMsg = event.addedStatus ? ` さらに ${event.target.name}を【脱力:ATK-30%】状態にした！` : '';
            return `🦑 ${event.actor.name}の「スミ吐き」！ ${event.target.name}に ${event.damage} のダメージ！${effectMsg}`;
        }
    },
    "atk_kamitsuki": {
        name: "かみつき",
        desc: "単体 / 物理 ATK1.2x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.2),
        apply: ({ actor, target, commandEffects }) => applyGradeDamage("atk_kamitsuki", actor, target, commandEffects),
        formatLog: (event) => `🦴 ${event.actor.name}の「かみつき」！ ${event.target.name}に ${event.damage} のダメージ！`
    },
    "atk_scream": {
        name: "叫び声",
        desc: "単体 / 魔法 INT1.0x",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.0),
        apply: ({ actor, target, commandEffects }) => applyGradeDamage("atk_scream", actor, target, commandEffects),
        formatLog: (event) => `📢 ${event.actor.name}の「叫び声」！ ${event.target.name}に ${event.damage} の魔法ダメージ！`
    },
    "atk_hikaki": {
        name: "ひっかき",
        desc: "単体 / 物理 ATK1.1x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.1),
        apply: ({ actor, target, commandEffects }) => applyGradeDamage("atk_hikaki", actor, target, commandEffects),
        formatLog: (event) => `🐾 ${event.actor.name}の「ひっかき」！ ${event.target.name}に ${event.damage} のダメージ！`
    },
    "atk_taiatari": {
        name: "たいあたり",
        desc: "単体 / 物理 ATK1.3x",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.3),
        apply: ({ actor, target, commandEffects }) => applyGradeDamage("atk_taiatari", actor, target, commandEffects),
        formatLog: (event) => `💥 ${event.actor.name}の「たいあたり」！ ${event.target.name}に ${event.damage} のダメージ！`
    }
};
