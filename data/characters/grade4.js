// data/characters/grade4.js

export const grade4Characters = [
    // 🐉 【既存敵】ドラゴン
    {
        id: "char_dragon",
        name: "ドラゴン",
        species: "dragon",
        hp: 180, maxHp: 180, atk: 26, int: 12, spd: 9,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "misc03", "cmd_up12"],
            ["atk01", "atk02", "misc03", "atk_fire", "misc03", "cmd_up23"],
            ["atk01", "atk02", "atk_fire", "atk_fire", "misc03", "cmd_up34"],
            ["atk01", "atk02", "atk_fire", "atk_fire", "misc03", "misc03"]
        ],
        image: "images/dragon.svg"
    },
    // ⚔️ 【既存職】勇者
    {
        id: "char_yusha",
        name: "勇者",
        species: "human",
        hp: 160, maxHp: 160, atk: 26, int: 20, spd: 18,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "heal01", "cmd_up12"],
            ["atk02", "atk_guard_break", "heal01", "atk03", "misc03", "cmd_up23"],
            ["atk03", "atk_guard_break", "heal02", "atk03", "misc03", "cmd_up34"],
            ["atk05", "atk_guard_break", "heal02", "atk_fire", "atk03", "cmd_down12"]
        ],
        image: "images/yusha.svg"
    },
    // 👑 【新規】魔王
    {
        id: "char_maou",
        name: "魔王",
        species: "demon",
        hp: 200, maxHp: 200, atk: 25, int: 25, spd: 12,
        commands: [
            ["atk01", "mgc01", "misc03", "atk02", "misc03", "cmd_up12"],
            ["atk02", "mgc01", "atk_weaken", "atk03", "misc03", "cmd_up23"],
            ["atk03", "mgc01", "atk_fire", "atk03", "misc03", "cmd_up34"],
            ["atk03", "mgc01", "atk_fire", "atk05", "atk_weaken", "misc03"]
        ],
        image: "images/maou.svg"
    },
    // 📖 【新規】大賢者
    {
        id: "char_daikenja",
        name: "大賢者",
        species: "human",
        hp: 130, maxHp: 130, atk: 10, int: 32, spd: 15,
        commands: [
            ["atk01", "mgc01", "misc03", "heal01", "misc03", "cmd_up12"],
            ["mgc01", "mgc02", "heal01", "atk_weaken", "misc03", "cmd_up23"],
            ["mgc02", "mgc01", "heal02", "heal_cure", "misc03", "cmd_up34"],
            ["mgc02", "mgc02", "heal02", "heal01", "heal_cure", "misc03"]
        ],
        image: "images/daikenja.svg"
    },
    // 🦅 【新規】フェニックス
    {
        id: "char_phoenix",
        name: "フェニックス",
        species: "dragon",
        hp: 150, maxHp: 150, atk: 20, int: 22, spd: 18,
        commands: [
            ["atk01", "mgc01", "misc03", "heal01", "misc03", "cmd_up12"],
            ["atk02", "mgc01", "atk_fire", "heal01", "misc03", "cmd_up23"],
            ["atk02", "mgc01", "atk_fire", "heal01", "heal_cure", "cmd_up34"],
            ["atk03", "mgc01", "atk_fire", "heal01", "heal_cure", "misc03"]
        ],
        image: "images/phoenix.svg"
    },
    // 🎭 【新規】アサシンマスター
    {
        id: "char_assassin_master",
        name: "アサシンマスター",
        species: "human",
        hp: 120, maxHp: 120, atk: 24, int: 12, spd: 26,
        commands: [
            ["atk01", "atk04", "misc03", "misc02", "atk01", "cmd_up12"],
            ["atk01", "atk04", "atk_paralyze", "misc02", "atk02", "cmd_up23"],
            ["atk02", "atk04", "atk_paralyze", "misc02", "atk03", "cmd_up34"],
            ["atk02", "atk04", "atk_paralyze", "misc02", "atk05", "atk03"]
        ],
        image: "images/assassin_master.svg"
    },
    // 🌟 【新規】ゴッドハンド
    {
        id: "char_godhand",
        name: "ゴッドハンド",
        species: "human",
        hp: 160, maxHp: 160, atk: 28, int: 8, spd: 20,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"],
            ["atk01", "atk02", "atk02", "atk03", "misc03", "cmd_up23"],
            ["atk02", "atk02", "atk03", "atk05", "misc03", "cmd_up34"],
            ["atk03", "atk03", "atk05", "atk05", "misc03", "atk05"]
        ],
        image: "images/godhand.svg"
    },
    // 🐉 レッドドラゴン（最高峰のスペックを持ち、物理全体攻撃を使いこなす）
    {
        id: "char_red_dragon",
        name: "レッドドラゴン",
        species: "dragon",
        hp: 210, maxHp: 210, atk: 24, int: 16, spd: 11,
        commands: [
            ["atk01", "atk02", "misc03", "atk01", "misc03", "cmd_up12"],
            ["atk02", "atk_fire", "misc03", "cmd_sweep", "atk03", "cmd_up23"],
            ["atk03", "cmd_sweep", "atk_fire", "atk03", "misc03", "cmd_up34"],
            ["atk03", "cmd_sweep", "atk_fire", "atk05", "cmd_sweep", "misc03"]
        ],
        image: "images/red_dragon.svg"
    }
];
