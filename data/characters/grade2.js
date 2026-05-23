// data/characters/grade2.js

export const grade2Characters = [
    // ⚔️ 【既存職】剣士
    {
        id: "char_kenshi",
        name: "剣士",
        species: "human",
        hp: 105, maxHp: 105, atk: 20, int: 8, spd: 14,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"],
            ["atk01", "atk02", "atk_guard_break", "atk02", "atk03", "misc03"]
        ],
        image: "images/player.svg"
    },
    // 🧙‍♂️ 【既存職】魔法使い
    {
        id: "char_mahoutsukai",
        name: "魔法使い",
        species: "human",
        hp: 80, maxHp: 80, atk: 7, int: 23, spd: 13,
        commands: [
            ["atk01", "mgc01", "misc03", "mgc01", "atk01", "cmd_up12"],
            ["mgc01", "mgc01", "mgc02", "atk_weaken", "misc03", "misc_mana_charge"]
        ],
        image: "images/mahoutsukai.svg"
    },
    {
        id: "char_heal_slime",
        name: "ヒールスライム",
        species: "slime",
        hp: 86, maxHp: 86, atk: 8, int: 22, spd: 12,
        commands: [
            ["heal01", "misc_support_reel_up", "misc03", "mgc01", "heal01", "cmd_up12"],
            ["heal01", "heal02", "misc_support_reel_up", "heal_cure", "mgc01", "misc03"]
        ],
        image: "images/heal_slime.svg"
    },
    // 🛡️ アイアンナイト（盾役：高いHPと「かばう」で味方を死守する）
    {
        id: "char_iron_knight",
        name: "アイアンナイト",
        species: "construct",
        hp: 130, maxHp: 130, atk: 14, int: 5, spd: 7,
        commands: [
            ["atk01", "cmd_cover", "misc03", "atk01", "misc03", "cmd_up12"],
            ["atk02", "cmd_cover", "misc_guard", "atk_guard_break", "cmd_cover", "misc03"]
        ],
        image: "images/iron_knight.svg"
    },
    // 🧸 【新規】呪いの人形
    {
        id: "char_puppet",
        name: "呪いの人形",
        species: "undead",
        hp: 95, maxHp: 95, atk: 15, int: 16, spd: 12,
        commands: [
            ["atk01", "atk_weaken", "misc03", "atk01", "atk_weaken", "cmd_up12"],
            ["cmd_cover", "atk_weaken", "atk_weaken", "misc03", "atk_prank", "atk01"]
        ],
        image: "images/puppet.svg"
    },
    // 💀 【既存敵】ガイコツ
    {
        id: "char_skeleton",
        name: "ガイコツ",
        species: "undead",
        hp: 110, maxHp: 110, atk: 20, int: 4, spd: 14,
        commands: [
            ["atk01", "atk02", "misc03", "atk01", "misc_focus", "cmd_up12"], // リール1: ミス1個
            ["atk01", "atk02", "atk_paralyze", "atk02", "misc03", "misc_focus"] // リール2: ミス1個
        ],
        image: "images/skeleton.svg"
    },
    // 😈 【既存敵】小悪魔
    {
        id: "char_imp",
        name: "小悪魔",
        species: "demon",
        hp: 75, maxHp: 75, atk: 13, int: 18, spd: 20,
        commands: [
            ["atk01", "mgc01", "misc_quickstep", "atk_prank", "misc03", "cmd_up12"],
            ["atk_prank", "mgc01", "atk_weaken", "heal01", "misc_quickstep", "misc03"]
        ],
        image: "images/imp.svg"
    },
    // 👻 【既存敵】ゴースト
    {
        id: "char_ghost",
        name: "ゴースト",
        species: "undead",
        hp: 75, maxHp: 75, atk: 10, int: 20, spd: 16,
        commands: [
            ["mgc01", "atk_weaken", "misc_mana_charge", "mgc01", "misc03", "cmd_up12"],
            ["atk_prank", "atk_weaken", "atk04", "mgc01", "misc_mana_charge", "misc03"]
        ],
        image: "images/ghost.svg"
    },
    // 🐺 【新規】ワーウルフ
    {
        id: "char_werewolf",
        name: "ワーウルフ",
        species: "beast",
        hp: 115, maxHp: 115, atk: 22, int: 6, spd: 16,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"], // リール1: ミス2個→1個に減少
            ["atk01", "atk02", "atk02", "atk03", "atk02", "misc03"] // リール2: ミス2個→1個に減少
        ],
        image: "images/werewolf.svg"
    },
    {
        id: "char_little_dragon",
        name: "リトルドラゴン",
        species: "dragon",
        hp: 105, maxHp: 105, atk: 18, int: 16, spd: 12,
        commands: [
            ["atk01", "atk_hinoko", "misc03", "atk02", "atk_hinoko", "cmd_up12"],
            ["atk02", "atk_fire", "atk_hinoko", "misc_mana_charge", "atk02", "misc03"]
        ],
        image: "images/little_dragon.svg"
    },
    // 🧜‍♀️ 【新規】人魚
    {
        id: "char_mermaid",
        name: "人魚",
        species: "aquatic",
        hp: 90, maxHp: 90, atk: 10, int: 18, spd: 14,
        commands: [
            ["atk01", "heal01", "misc03", "heal01", "mgc01", "cmd_up12"],
            ["mgc01", "heal01", "heal02", "heal_cure", "heal01", "misc03"]
        ],
        image: "images/mermaid.svg"
    },
    // 🗿 【新規】ガーゴイル
    {
        id: "char_gargoyle",
        name: "ガーゴイル",
        species: "construct",
        hp: 128, maxHp: 128, atk: 17, int: 8, spd: 9,
        commands: [
            ["atk01", "misc_guard", "misc03", "atk02", "cmd_cover", "cmd_up12"],
            ["cmd_cover", "atk_guard_break", "misc_guard", "atk02", "atk02", "misc03"]
        ],
        image: "images/gargoyle.svg"
    },
    // 🧙‍♀️ 【新規】魔女
    {
        id: "char_witch",
        name: "魔女",
        species: "human",
        hp: 85, maxHp: 85, atk: 9, int: 22, spd: 13,
        commands: [
            ["mgc01", "mgc01", "misc03", "atk_weaken", "atk_prank", "cmd_up12"],
            ["mgc01", "mgc02", "atk_weaken", "atk04", "atk_prank", "misc03"]
        ],
        image: "images/witch.svg"
    },
    {
        id: "char_flower_fairy",
        name: "花の精",
        species: "nature",
        hp: 82, maxHp: 82, atk: 7, int: 22, spd: 16,
        commands: [
            ["mgc01", "heal01", "misc03", "atk_weaken", "heal01", "cmd_up12"],
            ["heal01", "atk_weaken", "heal02", "misc_support_reel_up", "mgc01", "misc03"]
        ],
        image: "images/flower_fairy.svg"
    },
    // 👤 【新規】シャドウ
    {
        id: "char_shadow",
        name: "シャドウ",
        species: "undead",
        hp: 80, maxHp: 80, atk: 16, int: 14, spd: 18,
        commands: [
            ["atk01", "misc_focus", "misc03", "atk_prank", "atk01", "cmd_up12"],
            ["atk_prank", "atk04", "misc_focus", "atk02", "atk_paralyze", "misc03"]
        ],
        image: "images/shadow.svg"
    },
    // 🛡️ 【新規】盾ゴブリン
    {
        id: "char_shield_goblin",
        name: "盾ゴブリン",
        species: "demon",
        hp: 120, maxHp: 120, atk: 17, int: 5, spd: 10,
        commands: [
            ["atk01", "misc_guard", "misc03", "atk02", "misc_guard", "cmd_up12"],
            ["misc_guard", "atk_guard_break", "atk02", "cmd_cover", "atk02", "misc03"]
        ],
        image: "images/shield_goblin.svg"
    },
    // 🌿 【新規】薬草師
    {
        id: "char_herbalist",
        name: "薬草師",
        species: "human",
        hp: 78, maxHp: 78, atk: 7, int: 24, spd: 13,
        commands: [
            ["heal01", "heal_cure", "misc03", "heal01", "misc_mana_charge", "cmd_up12"],
            ["heal01", "heal02", "heal_cure", "heal01", "misc_mana_charge", "misc03"]
        ],
        image: "images/herbalist.svg"
    },
    // 🎵 【新規】見習い吟遊詩人
    {
        id: "char_apprentice_bard",
        name: "見習い吟遊詩人",
        species: "human",
        hp: 78, maxHp: 78, atk: 9, int: 18, spd: 17,
        commands: [
            ["atk01", "misc_support_reel_up", "misc03", "heal01", "misc_support_reel_up", "cmd_up12"],
            ["misc_support_reel_up", "misc_support_reel_up2", "heal01", "mgc01", "misc03", "misc_quickstep"]
        ],
        image: "images/apprentice_bard.svg"
    }
];
