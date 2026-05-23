// commands/heal.js

import { removeStatus, syncStatusEffects } from './status.js';
import { statusEffects } from '../statusEffects.js';

export const healCommands = {
    // =========================================================================
    // ⛪ 回復・サポート系（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "heal01": {
        name: "回復の祈り",
        desc: "味方単体のHPを回復する。",
        calcDamage: (attacker) => 0,
        calcHeal: (attacker) => Math.floor(attacker.int * 1.5),
        action: (attacker, target, commandEffects) => {
            const healValue = commandEffects["heal01"].calcHeal(attacker);
            target.hp = Math.min(target.maxHp, target.hp + healValue);
            return `💚 ${attacker.name}の「回復の祈り」！ ${target.name}のHPが ${healValue} 回復した！`;
        }
    },
    "heal02": {
        name: "大回復",
        desc: "味方単体のHPを大きく回復する。",
        calcDamage: (attacker) => 0,
        calcHeal: (attacker) => Math.floor(attacker.int * 2.4),
        action: (attacker, target, commandEffects) => {
            const healValue = commandEffects["heal02"].calcHeal(attacker);
            target.hp = Math.min(target.maxHp, target.hp + healValue);
            return `💚 ${attacker.name}の「大回復」！ ${target.name}のHPが ${healValue} 大きく回復した！`;
        }
    },
    "heal_cure": {
        name: "状態異常解除",
        desc: "味方単体の状態異常を解除する。",
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
