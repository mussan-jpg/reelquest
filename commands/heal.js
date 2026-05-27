// commands/heal.js

import { removeStatus, syncStatusEffects } from './status.js';
import { statusEffects } from '../statusEffects.js';
import { getSlotScalingText } from './effectScaling.js';

export const healCommands = {
    // =========================================================================
    // ⛪ 回復・サポート系（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "heal01": {
        name: "回復の祈り",
        desc: "単体 / 回復 INT1.5x",
        calcDamage: (attacker) => 0,
        calcHeal: (attacker) => Math.floor(attacker.int * 1.5),
        apply: ({ actor, target, commandEffects }) => {
            const heal = commandEffects["heal01"].calcHeal(actor);
            const beforeHp = target.hp;
            target.hp = Math.min(target.maxHp, target.hp + heal);
            return { type: 'heal', heal: Math.max(0, target.hp - beforeHp), rawHeal: heal };
        },
        formatLog: ({ actor, target, heal, rawHeal }) => (
            `💚 ${actor.name}の「回復の祈り」！ ${target.name}のHPが ${rawHeal ?? heal} 回復した！${getSlotScalingText(actor)}`
        )
    },
    "heal02": {
        name: "大回復",
        desc: "単体 / 回復 INT2.4x",
        calcDamage: (attacker) => 0,
        calcHeal: (attacker) => Math.floor(attacker.int * 2.4),
        apply: ({ actor, target, commandEffects }) => {
            const heal = commandEffects["heal02"].calcHeal(actor);
            const beforeHp = target.hp;
            target.hp = Math.min(target.maxHp, target.hp + heal);
            return { type: 'heal', heal: Math.max(0, target.hp - beforeHp), rawHeal: heal };
        },
        formatLog: ({ actor, target, heal, rawHeal }) => (
            `💚 ${actor.name}の「大回復」！ ${target.name}のHPが ${rawHeal ?? heal} 大きく回復した！${getSlotScalingText(actor)}`
        )
    },
    "heal_cure": {
        name: "状態異常解除",
        desc: "単体 / 状態異常解除",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const removableStatuses = ["paralysis", "poison", "weak", "weakened", "taunt", "hidden"];
            const removedStatuses = removableStatuses.filter(statusId => target.status?.includes(statusId));
            removableStatuses.forEach(statusId => removeStatus(target, statusId));
            target.poisonedIndices = [];
            syncStatusEffects(target);
            const removedText = removedStatuses.length > 0
                ? removedStatuses.map(statusId => statusEffects?.[statusId]?.name || statusId).join(' / ')
                : '状態異常';
            return `✨ ${attacker.name}の「状態異常解除」！ ${target.name}の【${removedText}】が解除された！`;
        }
    }
};
