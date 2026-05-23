// data/characters/grade3.js

export const grade3Characters = [
    // ⛪ 【既存職】僧侶
    {
        id: "char_soryo",
        name: "僧侶",
        species: "human",
        hp: 92, maxHp: 92, atk: 12, int: 25, spd: 12,
        commands: [
            ["atk01", "heal01", "misc03", "heal01", "atk01", "cmd_up12"],
            ["atk01", "heal01", "heal02", "heal_cure", "misc03", "cmd_up23"],
            ["heal01", "heal02", "heal_cure", "heal02", "heal_cure", "heal01"]
        ],
        image: "images/soryo.svg"
    },
    // 👤 【既存職】盗賊
    {
        id: "char_thief",
        name: "盗賊",
        species: "human",
        hp: 80, maxHp: 80, atk: 16, int: 12, spd: 25,
        commands: [
            ["atk01", "atk04", "misc_quickstep", "misc02", "atk01", "cmd_up12"],
            ["atk_prank", "atk04", "atk_paralyze", "misc02", "atk04", "cmd_up23"],
            ["atk_prank", "atk04", "atk_paralyze", "misc02", "misc_quickstep", "atk04"]
        ],
        image: "images/thief.svg"
    },
    // 👊 【既存職】武闘家
    {
        id: "char_butouka",
        name: "武闘家",
        species: "human",
        hp: 116, maxHp: 116, atk: 23, int: 6, spd: 22,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"],
            ["atk01", "misc_focus", "atk02", "atk05", "misc03", "cmd_up23"],
            ["atk02", "misc_focus", "atk05", "atk05", "misc03", "atk05"]
        ],
        image: "images/butouka.svg"
    },
    {
        id: "char_metal_slime",
        name: "メタルスライム",
        species: "slime",
        hp: 120, maxHp: 120, atk: 14, int: 14, spd: 28,
        commands: [
            ["atk01", "misc_quickstep", "misc03", "misc_guard", "atk01", "cmd_up12"],
            ["atk02", "misc_quickstep", "misc_guard", "atk_guard_break", "cmd_up23", "misc03"],
            ["atk_guard_break", "misc_guard", "misc_quickstep", "atk03", "misc02", "atk02"]
        ],
        image: "images/metal_slime.svg"
    },
    // ⚡ 【既存敵】サンダーバード
    {
        id: "char_thunderbird",
        name: "サンダーバード",
        species: "beast",
        hp: 95, maxHp: 95, atk: 15, int: 14, spd: 24,
        commands: [
            ["atk01", "misc_wingbeat", "atk03", "atk_paralyze", "misc_wingbeat", "cmd_up12"],
            ["atk01", "atk_paralyze", "misc_wingbeat", "atk03", "atk_paralyze", "cmd_up23"],
            ["atk01", "atk_paralyze", "atk_paralyze", "misc_wingbeat", "atk03", "atk_paralyze"]
        ],
        image: "images/thunderbird.svg"
    },
    // 🏹 【既存職】狩人
    {
        id: "char_hunter",
        name: "狩人",
        species: "human",
        hp: 110, maxHp: 110, atk: 18, int: 10, spd: 22,
        commands: [
            ["atk01", "atk02", "misc03", "atk02", "atk03", "cmd_up12"],
            ["atk02", "atk03", "misc03", "atk03", "atk03", "cmd_up12"],
            ["atk03", "atk03", "atk03", "atk03", "misc03", "cmd_down12"]
        ],
        image: "images/hunter.svg"
    },
    // 🔫 【既存職】ガンマン
    {
        id: "char_gunman",
        name: "ガンマン",
        species: "human",
        hp: 105, maxHp: 105, atk: 24, int: 8, spd: 18,
        commands: [
            ["atk01", "atk01", "misc03", "atk03", "misc03", "cmd_up12"],
            ["atk02", "atk02", "atk03", "atk03", "misc03", "cmd_up12"],
            ["atk03", "atk03", "atk03", "atk03", "atk03", "cmd_down12"]
        ],
        image: "images/gunman.svg"
    },
    // 🔮 【既存職】召喚士
    {
        id: "char_summoner",
        name: "召喚士",
        species: "human",
        hp: 92, maxHp: 92, atk: 8, int: 24, spd: 12,
        commands: [
            ["atk01", "misc_mana_charge", "misc03", "mgc01", "misc_mana_charge", "cmd_up12"],
            ["mgc01", "misc_mana_charge", "misc_support_reel_up", "atk_weakened", "misc03", "cmd_up23"],
            ["mgc02", "misc_support_reel_up2", "atk_weakened", "mgc02", "misc_mana_charge", "cmd_down12"]
        ],
        image: "images/summoner.svg"
    },
    // 🛡️ 【既存職】聖騎士
    {
        id: "char_seikishi",
        name: "聖騎士",
        species: "human",
        hp: 125, maxHp: 125, atk: 17, int: 14, spd: 10,
        commands: [
            ["atk01", "cmd_cover", "misc_guard", "heal01", "atk01", "cmd_up12"],
            ["atk01", "atk03", "heal01", "heal_cure", "cmd_cover", "cmd_up23"],
            ["atk_guard_break", "atk03", "heal02", "heal_cure", "atk02", "misc_guard"]
        ],
        image: "images/seikishi.svg"
    },
    {
        id: "char_treant",
        name: "トレント",
        species: "nature",
        hp: 140, maxHp: 140, atk: 16, int: 18, spd: 6,
        commands: [
            ["atk01", "misc_guard", "heal01", "atk_weaken", "misc03", "cmd_up12"],
            ["misc_guard", "atk_guard_break", "heal01", "atk_weakened", "cmd_up23", "misc03"],
            ["cmd_cover", "atk_guard_break", "heal02", "atk_weakened", "misc_guard", "heal01"]
        ],
        image: "images/treant.svg"
    },
    // 🧙‍♂️ 大魔導士（魔導士：高い魔力を誇り、最終リールにロマン技「大爆発」を秘める）
    {
        id: "char_grand_mage",
        name: "大魔導士",
        species: "human",
        hp: 95, maxHp: 95, atk: 7, int: 28, spd: 13,
        commands: [
            ["atk01", "mgc01", "misc03", "mgc01", "misc03", "cmd_up12"],
            ["mgc02", "mgc01", "atk_weaken", "mgc02", "misc03", "cmd_up23"],
            ["mgc02", "mgc01", "cmd_explosion", "mgc02", "atk_weaken", "misc03"]
        ],
        image: "images/grand_mage.svg"
    },
    // 🛐 大司祭（僧侶：★3から「いやしの雨」がリールに入り、パーティを一気に立て直す）
    {
        id: "char_high_priest",
        name: "大司祭",
        species: "human",
        hp: 105, maxHp: 105, atk: 8, int: 24, spd: 14,
        commands: [
            ["atk01", "heal01", "misc03", "heal01", "misc03", "cmd_up12"],
            ["heal02", "heal_cure", "heal01", "heal01", "misc03", "cmd_up23"],
            ["heal02", "heal_cure", "cmd_healing_rain", "heal01", "cmd_healing_rain", "misc03"]
        ],
        image: "images/high_priest.svg"
    }
];
