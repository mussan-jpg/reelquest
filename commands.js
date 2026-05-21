// commands.js

export const commandEffects = {
    // =========================================================================
    // ⚔️ 物理攻撃系
    // =========================================================================
    "atk01": {
        name: "こうげき",
        desc: "軽い物理攻撃",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.0),
        action: (attacker, target) => {
            const dmg = commandEffects["atk01"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `⚔️ ${attacker.name}の「こうげき」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk02": {
        name: "こうげき！",
        desc: "少し重い物理攻撃",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.4),
        action: (attacker, target) => {
            const dmg = commandEffects["atk02"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `⚔️ ${attacker.name}の「こうげき！」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk03": {
        name: "会心の一撃",
        desc: "剣士や聖騎士などが放つ強力な一撃",
        calcDamage: (attacker) => Math.floor(attacker.atk * 2.0),
        action: (attacker, target) => {
            const dmg = commandEffects["atk03"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `⚔️ ${attacker.name}の「会心の一撃」が炸裂！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk05": {
        name: "必殺の一撃",
        desc: "武闘家や上級リールの剣士が放つ超大技",
        calcDamage: (attacker) => Math.floor(attacker.atk * 2.8),
        action: (attacker, target) => {
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
        desc: "魔力(int)に依存した強力な呪文攻撃",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.6),
        action: (attacker, target) => {
            const dmg = commandEffects["mgc01"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🔮 ${attacker.name}の「魔法攻撃」！ ${target.name}に ${dmg} の魔法ダメージ！`;
        }
    },
    "atk_fire": {
        name: "火炎放射",
        desc: "ドラゴン専用。攻撃と魔力を合わせた壊滅的な一撃",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.8 + attacker.int * 1.0),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_fire"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🔥 ${attacker.name}の「火炎放射」！！ 激しい炎が ${target.name} を焼き尽くし、 ${dmg} の大ダメージ！`;
        }
    },

    // =========================================================================
    // 🤢 状態異常・弱体化系
    // =========================================================================
    "atk04": {
        name: "毒攻撃",
        desc: "ダメージを与え、相手を毒状態にする。毒状態のキャラクターは行動時にダメージを受ける",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8),
        action: (attacker, target) => {
            const dmg = commandEffects["atk04"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            
            let msg = `🤢 ${attacker.name}の「毒攻撃」！ ${target.name}に ${dmg} のダメージ！`;
            
            if (!target.status.includes("poison")) {
                target.status.push("poison");
                msg += ` さらに ${target.name} を【毒状態】にした！`;
            }
            return msg;
        }
    },
    "atk_paralyze": {
        name: "マヒ攻撃",
        desc: "ダメージを与え、確率で相手をマヒさせて行動不能にする",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.9),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_paralyze"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            
            let msg = `⚡ ${attacker.name}の「マヒ攻撃」！ ${target.name}に ${dmg} のダメージ！`;
            
            if (Math.random() < 1.0) {
                if (!target.status.includes("paralysis")) {
                    target.status.push("paralysis");
                    msg += ` さらに ${target.name} は身体が痺れて【マヒ状態】になった！`;
                }
            }
            return msg;
        }
    },
    "atk_weaken": {
        name: "弱体化攻撃",
        desc: "ダメージを与え、相手を脱力状態（攻撃力半減）にするデバフ技",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.0),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_weaken"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            
            let msg = `📉 ${attacker.name}の「弱体化攻撃」！ ${target.name}に ${dmg} のダメージ！`;
            
            if (!target.status.includes("weak")) {
                target.status.push("weak");
                msg += ` さらに ${target.name} を【脱力状態】にした！`;
            }
            return msg;
        }
    },
    "atk_weakened": {
        name: "弱体呪詛",
        desc: "ダメージを与え、相手を弱体状態（被ダメージ1.5倍）にする強力な弱体化魔法",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.2),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_weakened"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            
            let msg = `🛡️ ${attacker.name}の「弱体呪詛」！ ${target.name}に ${dmg} のダメージ！`;
            
            if (!target.status.includes("weakened")) {
                target.status.push("weakened");
                msg += ` さらに ${target.name} は防護が崩れて【弱体状態】になった！`;
            }
            return msg;
        }
    },

    // =========================================================================
    // ⛪ 回復・サポート系（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "heal01": {
        name: "回復の祈り",
        desc: "魔力(int)に応じた量、味方単体のHPを回復する",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            const healValue = Math.floor(attacker.int * 1.5);
            target.hp = Math.min(target.maxHp, target.hp + healValue);
            return `💚 ${attacker.name}の「回復の祈り」！ ${target.name}のHPが ${healValue} 回復した！`;
        }
    },
    "heal_cure": {
        name: "状態異常解除",
        desc: "味方のマヒ・毒・脱力・弱体状態をすべて綺麗に浄化する",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            target.status = target.status.filter(s => s !== "paralysis" && s !== "poison" && s !== "weak" && s !== "weakened");
            target.poisonedIndices = []; 
            return `✨ ${attacker.name}の「状態異常解除」！ ${target.name}の身体からすべての状態異常が綺麗に浄化された！`;
        }
    },

    // =========================================================================
    // 🟢 その他・ミス（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "misc01": {
        name: "ぬるぬるする",
        desc: "スライムなどの特殊行動。自身の素早さを上昇させる",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            const before = attacker.spd;
            attacker.spd = Math.floor(attacker.spd * 1.3);
            const gained = attacker.spd - before;
            return `🟢 ${attacker.name}は「ぬるぬる」と身体をくねらせている！ 素早さが ${before} から ${attacker.spd} に上昇した！`;
        }
    },
    "misc02": {
        name: "身を隠す",
        desc: "盗賊などの特殊行動。自身の攻撃力を大きく高める",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            const before = attacker.atk;
            attacker.atk = Math.floor(attacker.atk * 1.4);
            const gained = attacker.atk - before;
            return `👤 ${attacker.name}は闇に紛れて「身を隠した」！ 攻撃力が ${before} から ${attacker.atk} に上昇した！`;
        }
    },
    "misc03": {
        name: "ミス",
        desc: "何も起きない。リール構成のお邪魔枠",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            return `💤 ${attacker.name}の行動……しかし何も起きなかった（ミス）！`;
        }
    },
    "misc_support_reel_up": {
        name: "応援の旋律",
        desc: "他の味方1体のリールを1段階上げる支援技",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            if (!target) return `🟢 ${attacker.name}の応援！ しかし仲間が見つからない。`;
            const maxReelIndex = Array.isArray(target.commands[0]) ? target.commands.length - 1 : 0;
            if (target.currentReel < maxReelIndex) {
                target.currentReel += 1;
                return `🟢 ${attacker.name}の「応援の旋律」！ ${target.name}のリールが1段階上がった！`;
            }
            return `🟢 ${attacker.name}の「応援の旋律」！ しかし ${target.name} はこれ以上リールを上げられない。`;
        }
    },
    "misc_support_reel_up2": {
        name: "エールの歌",
        desc: "他の味方1体のリールを2段階上げる応援技",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            if (!target) return `🟢 ${attacker.name}のエール！ しかし仲間が見つからない。`;
            const maxReelIndex = Array.isArray(target.commands[0]) ? target.commands.length - 1 : 0;
            if (target.currentReel < maxReelIndex) {
                target.currentReel += 2;
                return `🟢 ${attacker.name}の「エールの歌」！ ${target.name}のリールが1段階上がった！`;
            }
            return `🟢 ${attacker.name}の「エールの歌」！ しかし ${target.name} はこれ以上リールを上げられない。`;
        }
    },

    // =========================================================================
    // 🔼 コマンドリール上昇系（ダメージを伴わないため calcDamage は 0）
    // =========================================================================
    "cmd_up12": {
        name: "★→★★",
        desc: "コマンドリールを 1段階目 から 2段階目 に進める",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            if (attacker.currentReel === 0) {
                attacker.currentReel = 1;
                return `🔼 ${attacker.name}のコマンドリールが 【2段階目（★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★→★★」！ しかしリールはすでに変動している。`;
        }
    },
    "cmd_up23": {
        name: "★★→★★★",
        desc: "コマンドリールを 2段階目 から 3段階目 に進める",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            if (attacker.currentReel === 1) {
                attacker.currentReel = 2;
                return `🔼 ${attacker.name}のコマンドリールが 【3段階目（★★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★★→★★★」！ しかしリールはすでに変動している。`;
        }
    },
    "cmd_up34": {
        name: "★★★→★★★★",
        desc: "コマンドリールを 3段階目 から 4段階目 に進める",
        calcDamage: (attacker) => 0,
        action: (attacker, target) => {
            if (attacker.currentReel === 2) {
                attacker.currentReel = 3;
                return `🔼 ${attacker.name}のコマンドリールが 【4段階目（★★★★）】 に昇格した！`;
            }
            return `💤 ${attacker.name}の「★★★→★★★★」！ しかしリールはすでに変動している。`;
        }
    },

    // =========================================================================
    // 🛡️ 戦略・特殊系コマンド
    // =========================================================================
    "cmd_sweep": {
        name: "なぎ払い",
        desc: "敵全体に鋭い物理攻撃を繰り出す",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.9),
        action: (attacker, target, gameState) => {
            if (!gameState) return `⚔️ ${attacker.name}の「なぎ払い」！`;
            const isPlayer = gameState.players.some(p => p.id === attacker.id || p === attacker);
            const targets = isPlayer ? gameState.enemies : gameState.players;
            
            let logMsg = `⚔️ ${attacker.name}の「なぎ払い」！ 敵全体を攻撃！`;
            targets.forEach(t => {
                if (t.hp > 0) {
                    const dmg = commandEffects["cmd_sweep"].calcDamage(attacker);
                    t.hp = Math.max(0, t.hp - dmg);
                    logMsg += `\n  → ${t.name}に ${dmg} のダメージ！`;
                }
            });
            return logMsg;
        }
    },
    "cmd_explosion": {
        name: "大爆発",
        desc: "敵全体に超強力な魔法ダメージを与えるが、自身も戦闘不能になる",
        calcDamage: (attacker) => Math.floor(attacker.int * 2.5),
        action: (attacker, target, gameState) => {
            if (!gameState) return `💥 ${attacker.name}の「大爆発」！`;
            const isPlayer = gameState.players.some(p => p.id === attacker.id || p === attacker);
            const targets = isPlayer ? gameState.enemies : gameState.players;
            
            let logMsg = `💥 ${attacker.name}の決死の「大爆発」！！！`;
            targets.forEach(t => {
                if (t.hp > 0) {
                    const dmg = commandEffects["cmd_explosion"].calcDamage(attacker);
                    t.hp = Math.max(0, t.hp - dmg);
                    logMsg += `\n  → ${t.name}に ${dmg} のダメージ！`;
                }
            });
            attacker.hp = 0; 
            logMsg += `\n  → ${attacker.name}は爆発の反動で戦闘不能になった！`;
            return logMsg;
        }
    },
    "cmd_healing_rain": {
        name: "いやしの雨",
        desc: "慈愛の雨を降らせ、味方全体のHPを大きく回復する",
        calcDamage: (attacker) => 0,
        action: (attacker, target, gameState) => {
            if (!gameState) return `🌧️ ${attacker.name}の「いやしの雨」！`;
            const isPlayer = gameState.players.some(p => p.id === attacker.id || p === attacker);
            const allies = isPlayer ? gameState.players : gameState.enemies;
            
            let logMsg = `🌧️ ${attacker.name}の「いやしの雨」！ 聖なる雨が味方全体に降り注ぐ！`;
            allies.forEach(a => {
                if (a.hp > 0) {
                    const heal = Math.floor(attacker.int * 1.4); 
                    a.hp = Math.min(a.maxHp, a.hp + heal);
                    logMsg += `\n  → ${a.name}のHPが ${heal} 回復！`;
                }
            });
            return logMsg;
        }
    },

    // =========================================================================
    // 🔰 グレード1専用・技
    // =========================================================================
    "atk_hinoko": {
        name: "火の粉",
        desc: "小さな火の粉を飛ばす魔法攻撃",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.2),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_hinoko"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🔥 ${attacker.name}の「火の粉」！ ${target.name}に ${dmg} の魔法ダメージ！`;
        }
    },
    "atk_sumihaki": {
        name: "スミ吐き",
        desc: "スミを吐きかけて攻撃し、相手を脱力させる",
        calcDamage: (attacker) => Math.floor(attacker.atk * 0.8),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_sumihaki"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            let effectMsg = "";
            if (!target.status.includes("weak")) {
                target.status.push("weak");
                effectMsg = ` さらに ${target.name} を【脱力】状態にした！`;
            }
            return `🦑 ${attacker.name}の「スミ吐き」！ ${target.name}に ${dmg} のダメージ！${effectMsg}`;
        }
    },
    "atk_kamitsuki": {
        name: "かみつき",
        desc: "鋭い牙で噛みつく物理攻撃",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.2),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_kamitsuki"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🦴 ${attacker.name}の「かみつき」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk_scream": {
        name: "叫び声",
        desc: "うるさい叫び声で相手を精神的に攻撃する",
        calcDamage: (attacker) => Math.floor(attacker.int * 1.0),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_scream"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `📢 ${attacker.name}の「叫び声」！ ${target.name}に ${dmg} の魔法ダメージ！`;
        }
    },
    "atk_hikaki": {
        name: "ひっかき",
        desc: "鋭い爪でひっかく物理攻撃",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.1),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_hikaki"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `🐾 ${attacker.name}の「ひっかき」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
    "atk_taiatari": {
        name: "たいあたり",
        desc: "体全体でぶつかる確実な物理攻撃",
        calcDamage: (attacker) => Math.floor(attacker.atk * 1.3),
        action: (attacker, target) => {
            const dmg = commandEffects["atk_taiatari"].calcDamage(attacker);
            target.hp = Math.max(0, target.hp - dmg);
            return `💥 ${attacker.name}の「たいあたり」！ ${target.name}に ${dmg} のダメージ！`;
        }
    },
};