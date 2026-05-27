// commands/misc.js

import { addStatBonus, addStatus, hasStatus } from './status.js';
import { addShield } from '../battle/shield.js';
import { applyNormalDamage } from '../battle/damageResolver.js';
import { getSlotScalingText } from './effectScaling.js';

const SMALL_STAT_GAIN = 10;
const LARGE_STAT_GAIN = 20;

function addStat(character, stat, amount) {
    if (!character || typeof character[stat] !== 'number') return 0;
    return addStatBonus(character, stat, amount);
}

function applyAreaDamageCommand(gameState, attacker, commandEffects, commandId, openingText) {
    if (!gameState) return openingText;
    const isPlayer = gameState.players.some(p => p === attacker);
    const targets = isPlayer ? gameState.enemies : gameState.players;
    const targetPrefix = isPlayer ? 'e' : 'p';
    const attackerPrefix = isPlayer ? 'p' : 'e';
    const attackerIndex = gameState[isPlayer ? 'players' : 'enemies'].indexOf(attacker);

    let logMsg = openingText;
    targets.forEach((target, index) => {
        if (target.hp <= 0) return;
        const initialHp = target.hp;
        const command = commandEffects?.[commandId] || miscCommands[commandId];
        const rawDamage = command.calcDamage(attacker);
        const { shieldResult, breakdown } = applyNormalDamage(gameState, {
            target,
            targetPrefix,
            targetIdx: index,
            attackerPrefix,
            attackerIdx: attackerIndex,
            rawDamage,
            attacker,
            isAreaAttack: true,
            baseHp: initialHp
        });

        logMsg += `\n  → ${target.name}に ${shieldResult.hpDamage} のダメージ！`;
        if (shieldResult.absorbed > 0) {
            logMsg += `（シールド${shieldResult.absorbed}）`;
        }
        if (breakdown.mitigatedDamage > 0) {
            logMsg += `（軽減${breakdown.mitigatedDamage}）`;
        }
        if (breakdown.evasionTriggered) {
            logMsg += `（素早く受け流した）`;
        }
    });
    return logMsg;
}

export const miscCommands = {
    // =========================================================================
    // 🟢 その他・ミス（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "misc01": {
        name: "ぬるぬるする",
        desc: "自分 / SPD+20",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.spd;
            addStat(attacker, 'spd', LARGE_STAT_GAIN);
            return `🟢 ${attacker.name}は「ぬるぬる」と身体をくねらせている！ 素早さが ${before} から ${attacker.spd} に上昇した！`;
        }
    },
    "misc_quickstep": {
        name: "軽やかステップ",
        desc: "自分 / SPD+20",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.spd;
            addStat(attacker, 'spd', 20);
            return `👟 ${attacker.name}は軽やかに間合いを変えた！ 素早さが ${before} から ${attacker.spd} に上昇した！`;
        }
    },
    "misc_wingbeat": {
        name: "羽ばたく",
        desc: "自分 / SPD+20",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.spd;
            addStat(attacker, 'spd', 20);
            return `🪽 ${attacker.name}は翼を大きく羽ばたかせた！ 素早さが ${before} から ${attacker.spd} に上昇した！`;
        }
    },
    "misc_mana_charge": {
        name: "魔力集中",
        desc: "自分 / INT+10",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.int;
            addStat(attacker, 'int', SMALL_STAT_GAIN);
            return `🔮 ${attacker.name}は魔力を集中させた！ 魔力が ${before} から ${attacker.int} に上昇した！`;
        }
    },
    "misc02": {
        name: "身を隠す",
        desc: "自分 / ATK+20 + 隠密",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.atk;
            addStat(attacker, 'atk', LARGE_STAT_GAIN);
            addStatus(attacker, 'hidden');
            return `👤 ${attacker.name}は闇に紛れて「身を隠した」！ 攻撃力が ${before} から ${attacker.atk} に上昇し、他に狙える味方がいる間は攻撃対象から外れる！`;
        }
    },
    "misc_focus": {
        name: "力をためる",
        desc: "自分 / ATK+10",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const before = attacker.atk;
            addStat(attacker, 'atk', SMALL_STAT_GAIN);
            return `💪 ${attacker.name}は「力をためる」！ 攻撃力が ${before} から ${attacker.atk} に上昇した！`;
        }
    },
    "misc_fighting_spirit": {
        name: "気合い直し",
        desc: "自分 / ATK+8 + INT+8",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            const beforeAtk = attacker.atk;
            const beforeInt = attacker.int;
            addStat(attacker, 'atk', 8);
            addStat(attacker, 'int', 8);
            return `💪 ${attacker.name}は「気合い直し」！ ATKが ${beforeAtk} から ${attacker.atk}、INTが ${beforeInt} から ${attacker.int} に上昇した！`;
        }
    },
    "misc_guard": {
        name: "かばう",
        desc: "自分 / 挑発2T",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            addStatus(attacker, "taunt", { duration: 2, extendDuration: true });
            return `🛡️ ${attacker.name}は「かばう」構えをとった！ 攻撃を引きつけ、受けるダメージを抑える！（残り${attacker.tauntDuration}ターン）`;
        }
    },
    "misc03": {
        name: "ミス",
        desc: "効果なし",
        calcDamage: (attacker) => 0,
        action: (attacker, target, commandEffects) => {
            return `💤 ${attacker.name}の行動……しかし何も起きなかった（ミス）！`;
        }
    },
    "cmd_demon_whisper": {
        name: "魔王の囁き",
        desc: "単体 / 高い方(ATK,INT)2.0x + リール+1",
        calcDamage: (attacker) => Math.max(attacker.atk || 0, attacker.int || 0) * 2,
        action: (attacker, target, commandEffects) => {
            const maxReelIndex = Array.isArray(attacker.commands?.[0]) ? attacker.commands.length - 1 : 0;
            const before = attacker.currentReel || 0;
            if (before < maxReelIndex) {
                attacker.currentReel = Math.min(maxReelIndex, before + 1);
                return `😈 ${attacker.name}の「魔王の囁き」！ ${target.name}へ魔力を叩き込み、リールが1段階上がった！`;
            }
            return `😈 ${attacker.name}の「魔王の囁き」！ ${target.name}へ魔力を叩き込んだ！`;
        }
    },
    "misc_support_reel_up": {
        name: "リール支援",
        desc: "単体 / 味方リール+1",
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
        desc: "単体 / 味方リール+2",
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
        desc: "自分 / リール1→2",
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
        desc: "自分 / リール2→3",
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
        desc: "自分 / リール3→4",
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
        desc: "自分 / リール4→5",
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
        desc: "自分 / リール5→6",
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
        desc: "自分 / リール→1",
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
        desc: "全体 / 物理 ATK0.9x",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.9),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `⚔️ ${attacker.name}の「なぎ払い」！`;
            return applyAreaDamageCommand(gameState, attacker, commandEffects, "cmd_sweep", `⚔️ ${attacker.name}の「なぎ払い」！ 敵全体を攻撃！`);
        }
    },
    "cmd_earthquake": {
        name: "大地震",
        desc: "全体 / 物理 ATK1.15x",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.15),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `🌋 ${attacker.name}の「大地震」！`;
            return applyAreaDamageCommand(gameState, attacker, commandEffects, "cmd_earthquake", `🌋 ${attacker.name}の「大地震」！ 激しい揺れが敵全体を襲う！`);
        }
    },
    "cmd_starfall": {
        name: "星降り",
        desc: "全体 / 魔法 INT1.45x",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.int * 1.45),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `🌠 ${attacker.name}の「星降り」！`;
            return applyAreaDamageCommand(gameState, attacker, commandEffects, "cmd_starfall", `🌠 ${attacker.name}の「星降り」！ 星の光が敵全体へ降り注ぐ！`);
        }
    },
    "cmd_explosion": {
        name: "大爆発",
        desc: "全体 / 魔法 INT2.5x + 自滅",
        isAreaAttack: true,
        calcDamage: (attacker) => Math.floor(attacker.int * 2.5),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `💥 ${attacker.name}の「大爆発」！`;
            let logMsg = applyAreaDamageCommand(gameState, attacker, commandEffects, "cmd_explosion", `💥 ${attacker.name}の決死の「大爆発」！！！`);
            attacker.hp = 0;
            logMsg += `\n  → ${attacker.name}は爆発の反動で戦闘不能になった！`;
            return logMsg;
        }
    },
    "cmd_healing_rain": {
        name: "いやしの雨",
        desc: "全体 / 回復 INT1.4x",
        calcDamage: (attacker) => 0,
        calcHeal: (attacker) => Math.floor(attacker.int * 1.4),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `🌧️ ${attacker.name}の「いやしの雨」！`;
            const isPlayer = gameState.players.some(p => p === attacker);
            const allies = isPlayer ? gameState.players : gameState.enemies;
            const slotScalingText = getSlotScalingText(attacker);

            let logMsg = `🌧️ ${attacker.name}の「いやしの雨」！ 聖なる雨が味方全体に降り注ぐ！${slotScalingText}`;
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
    "cmd_shield": {
        name: "シールド",
        desc: "単体 / シールド ATK1.0x + INT0.15x",
        calcDamage: (attacker) => 0,
        calcShield: (attacker) => Math.max(20, Math.floor(attacker.atk * 1.0 + attacker.int * 0.15)),
        apply: ({ actor, target, commandEffects }) => {
            const shield = commandEffects["cmd_shield"].calcShield(actor);
            const applied = addShield(target, shield);
            return { type: 'shield', shield: applied || shield };
        },
        formatLog: ({ actor, target, shield }) => (
            `🔷 ${actor.name}の「シールド」！ ${target.name}にシールド${shield}を付与した！`
        )
    },
    "cmd_barrier": {
        name: "バリア",
        desc: "自分 / シールド ATK0.25x + INT0.9x + HP6.5%",
        calcDamage: (attacker) => 0,
        calcShield: (attacker) => Math.max(18, Math.floor(attacker.atk * 0.25 + attacker.int * 0.9 + attacker.maxHp * 0.065)),
        action: (attacker, target, gameState, commandEffects) => {
            const shield = commandEffects["cmd_barrier"].calcShield(attacker);
            addShield(attacker, shield);
            return `🔷 ${attacker.name}は「バリア」を展開！ 自分にシールド${shield}を付与した！`;
        }
    },
    "cmd_team_barrier": {
        name: "全体バリア",
        desc: "全体 / シールド ATK0.2x + INT0.6x + HP1.5%",
        calcDamage: (attacker) => 0,
        calcShield: (attacker) => Math.max(18, Math.floor(attacker.atk * 0.2 + attacker.int * 0.6 + attacker.maxHp * 0.015)),
        apply: ({ actor, gameState, commandEffects }) => {
            if (!gameState) return { type: 'shield', shield: 0, targets: [] };
            const isPlayer = gameState.players.some(p => p === actor);
            const allies = isPlayer ? gameState.players : gameState.enemies;
            const shield = commandEffects["cmd_team_barrier"].calcShield(actor);
            const targets = [];
            allies.forEach(ally => {
                if (ally.hp <= 0) return;
                const applied = addShield(ally, shield);
                targets.push({ target: ally, shield: applied || shield });
            });
            return { type: 'teamShield', shield, targets };
        },
        formatLog: ({ actor, shield, targets = [] }) => {
            let logMsg = `🔷 ${actor.name}の「全体バリア」！ 味方全体にシールドを張った！`;
            targets.forEach(({ target }) => {
                logMsg += `\n  → ${target.name}にシールド${shield}`;
            });
            return logMsg;
        }
    },
    "cmd_aegis_deploy": {
        name: "アイギス展開",
        desc: "全体 / シールド ATK0.35x + INT0.65x + HP4.5% + 挑発2T",
        calcDamage: (attacker) => 0,
        calcShield: (attacker) => Math.max(18, Math.floor(attacker.atk * 0.35 + attacker.int * 0.65 + attacker.maxHp * 0.045)),
        action: (attacker, target, gameState, commandEffects) => {
            if (!gameState) return `🔷 ${attacker.name}の「アイギス展開」！`;
            const isPlayer = gameState.players.some(p => p === attacker);
            const allies = isPlayer ? gameState.players : gameState.enemies;
            const shield = commandEffects["cmd_aegis_deploy"].calcShield(attacker);
            addStatus(attacker, "taunt", { duration: 2, extendDuration: true });

            let logMsg = `🔷 ${attacker.name}の「アイギス展開」！ 防壁を広げ、攻撃を引き受ける！（残り${attacker.tauntDuration}ターン）`;
            allies.forEach(ally => {
                if (ally.hp <= 0) return;
                addShield(ally, shield);
                logMsg += `\n  → ${ally.name}にシールド${shield}`;
            });
            return logMsg;
        }
    },
    "cmd_aegis_fortress": {
        name: "巨壁起動",
        desc: "自分 / シールド ATK0.5x + INT0.85x + HP7.5% + 挑発3T",
        calcDamage: (attacker) => 0,
        calcShield: (attacker) => Math.max(32, Math.floor(attacker.atk * 0.5 + attacker.int * 0.85 + attacker.maxHp * 0.075)),
        action: (attacker, target, gameState, commandEffects) => {
            const shield = commandEffects["cmd_aegis_fortress"].calcShield(attacker);
            addShield(attacker, shield);
            addStatus(attacker, "taunt", { duration: 3, extendDuration: true });
            return `🛡️ ${attacker.name}の「巨壁起動」！ 自分にシールド${shield}を付与し、攻撃を強く引きつける！（残り${attacker.tauntDuration}ターン）`;
        }
    },
    "cmd_cover": {
        name: "守護結界",
        desc: "自分 / 挑発3T",
        calcDamage: (attacker) => 0,
        action: (attacker, target, gameState, commandEffects) => {
            // targetは自分自身
            const alreadyTaunting = hasStatus(target, "taunt");
            addStatus(target, "taunt", { duration: 3, extendDuration: true });
            return alreadyTaunting
                ? `🛡️ ${target.name}の「守護結界」が強まった！ 挑発効果の継続時間が3ターン延長された！（残り${target.tauntDuration}ターン）`
                : `🛡️ ${target.name}は「守護結界」を発動した！ 攻撃を引きつけて受けるダメージを抑える！（残り${target.tauntDuration}ターン）`;
        }
    }
};
