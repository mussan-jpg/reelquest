// commands/misc.js

import { addStatBonus, addStatus, calculateAdjustedDamageBreakdown, hasStatus } from './status.js';
import { recordDamageMitigated } from '../battle/stats.js';

const SMALL_STAT_GAIN = 5;
const LARGE_STAT_GAIN = 8;

function addStat(character, stat, amount) {
    if (!character || typeof character[stat] !== 'number') return 0;
    return addStatBonus(character, stat, amount);
}

export const miscCommands = {
    // =========================================================================
    // 🟢 その他・ミス（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "misc01": {
        name: "ぬるぬるする",
        desc: "自分の素早さを上昇させる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.spd;
            addStat(attacker, 'spd', LARGE_STAT_GAIN);
            return `🟢 ${attacker.name}は「ぬるぬる」と身体をくねらせている！ 素早さが ${before} から ${attacker.spd} に上昇した！`;
        }
    },
    "misc_quickstep": {
        name: "軽やかステップ",
        desc: "自分の素早さを少し上昇させる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.spd;
            addStat(attacker, 'spd', SMALL_STAT_GAIN);
            return `👟 ${attacker.name}は軽やかに間合いを変えた！ 素早さが ${before} から ${attacker.spd} に上昇した！`;
        }
    },
    "misc_wingbeat": {
        name: "羽ばたく",
        desc: "自分の素早さを少し上昇させる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.spd;
            addStat(attacker, 'spd', SMALL_STAT_GAIN);
            return `🪽 ${attacker.name}は翼を大きく羽ばたかせた！ 素早さが ${before} から ${attacker.spd} に上昇した！`;
        }
    },
    "misc_mana_charge": {
        name: "魔力集中",
        desc: "自分の魔力を少し上昇させる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.int;
            addStat(attacker, 'int', SMALL_STAT_GAIN);
            return `🔮 ${attacker.name}は魔力を集中させた！ 魔力が ${before} から ${attacker.int} に上昇した！`;
        }
    },
    "misc02": {
        name: "身を隠す",
        desc: "自分の攻撃力を大きく上昇させ、防御効果を付与する。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.atk;
            addStat(attacker, 'atk', LARGE_STAT_GAIN);
            addStatus(attacker, 'hidden');
            return `👤 ${attacker.name}は闇に紛れて「身を隠した」！ 攻撃力が ${before} から ${attacker.atk} に上昇し、受けるダメージも減少する！`;
        }
    },
    "misc_focus": {
        name: "力をためる",
        desc: "自分の攻撃力を少し上昇させる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.atk;
            addStat(attacker, 'atk', SMALL_STAT_GAIN);
            return `💪 ${attacker.name}は「力をためる」！ 攻撃力が ${before} から ${attacker.atk} に上昇した！`;
        }
    },
    "misc_guard": {
        name: "かばう",
        desc: "自分に短い挑発効果を付与する。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            addStatus(attacker, "taunt", { duration: 1, extendDuration: true });
            return `🛡️ ${attacker.name}は「かばう」構えをとった！ 攻撃を引きつけ、受けるダメージを抑える！（残り${attacker.tauntDuration}ターン）`;
        }
    },
    "misc03": {
        name: "ミス",
        desc: "何も起きない。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            return `💤 ${attacker.name}の行動……しかし何も起きなかった（ミス）！`;
        }
    },
    "misc_support_reel_up": {
        name: "リール支援",
        desc: "味方単体のリールを1段階上げる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            if (!target) return `🟢 ${attacker.name}のリール支援！ しかし仲間が見つからない。`;
            const maxReelIndex = Array.isArray(target.commands[0]) ? target.commands.length - 1 : 0;
            if (target.currentReel < maxReelIndex) {
                target.currentReel += 1;
                return `🟢 ${attacker.name}の「リール支援」！ ${target.name}のリールが1段階上がった！`;
            }
            return `🟢 ${attacker.name}の「リール支援」！ しかし ${target.name} はこれ以上リールを上げられない。`;
        }
    },
    "misc_support_reel_up2": {
        name: "リール大支援",
        desc: "味方単体のリールを2段階上げる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            if (!target) return `🟢 ${attacker.name}のリール大支援！ しかし仲間が見つからない。`;
            const maxReelIndex = Array.isArray(target.commands[0]) ? target.commands.length - 1 : 0;
            if (target.currentReel < maxReelIndex) {
                const before = target.currentReel;
                target.currentReel = Math.min(maxReelIndex, target.currentReel + 2);
                return `🟢 ${attacker.name}の「リール大支援」！ ${target.name}のリールが${target.currentReel - before}段階上がった！`;
            }
            return `🟢 ${attacker.name}の「リール大支援」！ しかし ${target.name} はこれ以上リールを上げられない。`;
        }
    },

    // =========================================================================
    // 🔼 コマンドリール上昇系（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "cmd_up12": {
        name: "★リール加速",
        desc: "自分のリールを1段階上げる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            if (attacker.currentReel === 0) {
                attacker.currentReel = 1;
                return `🔼 ${attacker.name}の「★リール加速」！ コマンドリールが 【2段階目（★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★リール加速」！ しかしリールはすでに変動している。`;
        }
    },
    "cmd_up23": {
        name: "★リール加速",
        desc: "自分のリールを1段階上げる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            if (attacker.currentReel === 1) {
                attacker.currentReel = 2;
                return `🔼 ${attacker.name}の「★リール加速」！ コマンドリールが 【3段階目（★★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★リール加速」！ しかしリールはすでに変動している。`;
        }
    },
    "cmd_up34": {
        name: "★リール加速",
        desc: "自分のリールを1段階上げる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            if (attacker.currentReel === 2) {
                attacker.currentReel = 3;
                return `🔼 ${attacker.name}の「★リール加速」！ コマンドリールが 【4段階目（★★★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★リール加速」！ しかしリールはすでに変動している。`;
        }
    },
    "cmd_up45": {
        name: "★リール加速",
        desc: "自分のリールを1段階上げる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            if (attacker.currentReel === 3) {
                attacker.currentReel = 4;
                return `🔼 ${attacker.name}の「★リール加速」！ コマンドリールが 【5段階目（★★★★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★リール加速」！ しかしリールはすでに変動している。`;
        }
    },
    "cmd_up56": {
        name: "★リール加速",
        desc: "自分のリールを1段階上げる。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            if (attacker.currentReel === 4) {
                attacker.currentReel = 5;
                return `🔼 ${attacker.name}の「★リール加速」！ コマンドリールが 【6段階目（★★★★★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★リール加速」！ しかしリールはすでに変動している。`;
        }
    },
    "cmd_down12": {
        name: "☆リールダウン",
        desc: "自分のリールを1段階目へ戻す。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            attacker.currentReel = 0;
            return `🔽 ${attacker.name}の「☆リールダウン」！ コマンドリールが 【1段階目（★）】 に戻った。まだ行動できる！`;
        }
    },

    // =========================================================================
    // 🛡️ 戦略・特殊系コマンド
    // =========================================================================
    "cmd_sweep": {
        name: "なぎ払い",
        desc: "敵全体に物理ダメージを与える。",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.9),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `⚔️ ${attacker.name}の「なぎ払い」！`;
            const isPlayer = gameState.players.some(p => p === attacker);
            const targets = isPlayer ? gameState.enemies : gameState.players;

            let logMsg = `⚔️ ${attacker.name}の「なぎ払い」！ 敵全体を攻撃！`;
            const targetPrefix = isPlayer ? 'e' : 'p';
            targets.forEach((t, index) => {
                if (t.hp > 0) {
                    const dmg = commandEffects["cmd_sweep"].calcDamage(attacker);
                    const damageBreakdown = calculateAdjustedDamageBreakdown(dmg, t, { isAreaAttack: true, attacker });
                    const actualDamage = damageBreakdown.finalDamage;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        recordDamageMitigated(gameState, targetPrefix, index, damageBreakdown.mitigatedDamage);
                    }
                    t.hp = Math.max(0, t.hp - actualDamage);
                    logMsg += `\n  → ${t.name}に ${actualDamage} のダメージ！`;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        logMsg += `（軽減${damageBreakdown.mitigatedDamage}）`;
                    }
                    if (damageBreakdown.evasionTriggered) {
                        logMsg += `（素早く受け流した）`;
                    }
                }
            });
            return logMsg;
        }
    },
    "cmd_earthquake": {
        name: "大地震",
        desc: "敵全体に強い物理ダメージを与える。",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.15),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `🌋 ${attacker.name}の「大地震」！`;
            const isPlayer = gameState.players.some(p => p === attacker);
            const targets = isPlayer ? gameState.enemies : gameState.players;

            let logMsg = `🌋 ${attacker.name}の「大地震」！ 激しい揺れが敵全体を襲う！`;
            const targetPrefix = isPlayer ? 'e' : 'p';
            targets.forEach((t, index) => {
                if (t.hp > 0) {
                    const dmg = commandEffects["cmd_earthquake"].calcDamage(attacker);
                    const damageBreakdown = calculateAdjustedDamageBreakdown(dmg, t, { isAreaAttack: true, attacker });
                    const actualDamage = damageBreakdown.finalDamage;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        recordDamageMitigated(gameState, targetPrefix, index, damageBreakdown.mitigatedDamage);
                    }
                    t.hp = Math.max(0, t.hp - actualDamage);
                    logMsg += `\n  → ${t.name}に ${actualDamage} のダメージ！`;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        logMsg += `（軽減${damageBreakdown.mitigatedDamage}）`;
                    }
                    if (damageBreakdown.evasionTriggered) {
                        logMsg += `（素早く受け流した）`;
                    }
                }
            });
            return logMsg;
        }
    },
    "cmd_starfall": {
        name: "星降り",
        desc: "敵全体に強い魔法ダメージを与える。",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.int * 1.45),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `🌠 ${attacker.name}の「星降り」！`;
            const isPlayer = gameState.players.some(p => p === attacker);
            const targets = isPlayer ? gameState.enemies : gameState.players;

            let logMsg = `🌠 ${attacker.name}の「星降り」！ 星の光が敵全体へ降り注ぐ！`;
            const targetPrefix = isPlayer ? 'e' : 'p';
            targets.forEach((t, index) => {
                if (t.hp > 0) {
                    const dmg = commandEffects["cmd_starfall"].calcDamage(attacker);
                    const damageBreakdown = calculateAdjustedDamageBreakdown(dmg, t, { isAreaAttack: true, attacker });
                    const actualDamage = damageBreakdown.finalDamage;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        recordDamageMitigated(gameState, targetPrefix, index, damageBreakdown.mitigatedDamage);
                    }
                    t.hp = Math.max(0, t.hp - actualDamage);
                    logMsg += `\n  → ${t.name}に ${actualDamage} のダメージ！`;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        logMsg += `（軽減${damageBreakdown.mitigatedDamage}）`;
                    }
                    if (damageBreakdown.evasionTriggered) {
                        logMsg += `（素早く受け流した）`;
                    }
                }
            });
            return logMsg;
        }
    },
    "cmd_explosion": {
        name: "大爆発",
        desc: "敵全体に魔法ダメージを与え、自分は倒れる。",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.int * 2.5),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `💥 ${attacker.name}の「大爆発」！`;
            const isPlayer = gameState.players.some(p => p === attacker);
            const targets = isPlayer ? gameState.enemies : gameState.players;

            let logMsg = `💥 ${attacker.name}の決死の「大爆発」！！！`;
            const targetPrefix = isPlayer ? 'e' : 'p';
            targets.forEach((t, index) => {
                if (t.hp > 0) {
                    const dmg = commandEffects["cmd_explosion"].calcDamage(attacker);
                    const damageBreakdown = calculateAdjustedDamageBreakdown(dmg, t, { isAreaAttack: true, attacker });
                    const actualDamage = damageBreakdown.finalDamage;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        recordDamageMitigated(gameState, targetPrefix, index, damageBreakdown.mitigatedDamage);
                    }
                    t.hp = Math.max(0, t.hp - actualDamage);
                    logMsg += `\n  → ${t.name}に ${actualDamage} のダメージ！`;
                    if (damageBreakdown.mitigatedDamage > 0) {
                        logMsg += `（軽減${damageBreakdown.mitigatedDamage}）`;
                    }
                    if (damageBreakdown.evasionTriggered) {
                        logMsg += `（素早く受け流した）`;
                    }
                }
            });
            attacker.hp = 0;
            logMsg += `\n  → ${attacker.name}は爆発の反動で戦闘不能になった！`;
            return logMsg;
        }
    },
    "cmd_healing_rain": {
        name: "いやしの雨",
        desc: "味方全体のHPを回復する。",
        calcDamage: (attacker) => 0,
        calcHeal: (attacker) => Math.floor(attacker.int * 1.4),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `🌧️ ${attacker.name}の「いやしの雨」！`;
            const isPlayer = gameState.players.some(p => p === attacker);
            const allies = isPlayer ? gameState.players : gameState.enemies;

            let logMsg = `🌧️ ${attacker.name}の「いやしの雨」！ 聖なる雨が味方全体に降り注ぐ！`;
            allies.forEach(a => {
                if (a.hp > 0) {
                    const heal = commandEffects["cmd_healing_rain"].calcHeal(attacker);
                    a.hp = Math.min(a.maxHp, a.hp + heal);
                    logMsg += `\n  → ${a.name}のHPが ${heal} 回復！`;
                }
            });
            return logMsg;
        }
    },
    "cmd_cover": {
        name: "守護結界",
        desc: "自分に長い挑発効果を付与する。",
        calcDamage: (attacker) => 0,
        action: (attacker, target, gameState, commandEffects) => {
            // targetは自分自身
            const alreadyTaunting = hasStatus(target, "taunt");
            addStatus(target, "taunt", { duration: 2, extendDuration: true });
            return alreadyTaunting
                ? `🛡️ ${target.name}の「守護結界」が強まった！ 挑発効果の継続時間が2ターン延長された！（残り${target.tauntDuration}ターン）`
                : `🛡️ ${target.name}は「守護結界」を発動した！ 攻撃を引きつけて受けるダメージを抑える！（残り${target.tauntDuration}ターン）`;
        }
    }
};
