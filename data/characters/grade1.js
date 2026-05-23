// data/characters/grade1.js

export const grade1Characters = [
    // 🟢 【既存敵】スライム
    {
        id: "char_slime",
        name: "スライム",
        species: "slime",
        hp: 66, maxHp: 66, atk: 12, int: 6, spd: 8,
        commands: [
            ["atk01", "misc_support_reel_up", "misc03", "atk01", "misc_support_reel_up", "misc03"]
        ],
        image: "images/slime.svg"
    },
    {
        id: "char_poison_slime",
        name: "ポイズンスライム",
        species: "slime",
        hp: 70, maxHp: 70, atk: 10, int: 10, spd: 9,
        commands: [
            ["atk01", "atk04", "misc03", "atk04", "misc_support_reel_up", "atk01"]
        ],
        image: "images/poison_slime.svg"
    },
    // 🦟 【新規】ゴブリン
    {
        id: "char_goblin",
        name: "ゴブリン",
        species: "demon",
        hp: 85, maxHp: 85, atk: 16, int: 5, spd: 12,
        commands: [
            ["atk01", "atk03", "atk01", "atk04", "misc_focus", "misc03"] // ミス1個
        ],
        image: "images/goblin.svg"
    },
    // 🦇 【新規】コウモリ
    {
        id: "char_bat",
        name: "コウモリ",
        species: "beast",
        hp: 60, maxHp: 60, atk: 12, int: 6, spd: 18,
        commands: [
            ["atk01", "misc_wingbeat", "atk_paralyze", "misc03", "atk01", "atk01"]
        ],
        image: "images/bat.svg"
    },
    // 🐝 【新規】大ハチ
    {
        id: "char_bee",
        name: "大ハチ",
        species: "beast",
        hp: 55, maxHp: 55, atk: 14, int: 4, spd: 20,
        commands: [
            ["atk01", "atk04", "misc03", "atk01", "atk04", "atk01"] // ミス2個から1個へ減少（1つをatk01に）
        ],
        image: "images/bee.svg"
    },
    // 🌱 【新規】マンドラゴラ
    {
        id: "char_mandrake",
        name: "マンドラゴラ",
        species: "nature",
        hp: 75, maxHp: 75, atk: 8, int: 15, spd: 6,
        commands: [
            ["mgc01", "atk_weaken", "misc03", "mgc01", "atk_prank", "mgc01"]
        ],
        image: "images/mandrake.svg"
    },
    // 🐚 【新規】ヤドカリ
    {
        id: "char_hermit_crab",
        name: "ヤドカリ",
        species: "aquatic",
        hp: 100, maxHp: 100, atk: 12, int: 5, spd: 5,
        commands: [
            ["misc_guard", "atk01", "misc_guard", "atk02", "misc03", "atk01"]
        ],
        image: "images/hermit_crab.svg"
    },
    // 🧟 【新規】ミイラ男
    {
        id: "char_mummy",
        name: "ミイラ男",
        species: "undead",
        hp: 110, maxHp: 110, atk: 18, int: 3, spd: 4,
        commands: [
            ["atk01", "atk01", "atk_paralyze", "misc03", "atk01", "atk02"] // ミス3個から1個へ減少（高いatkを活かせる構成に）
        ],
        image: "images/mummy.svg"
    },
    // 🔴 【新規】プチファイア
    {
        id: "char_petit_fire",
        name: "プチファイア",
        species: "nature",
        hp: 75, maxHp: 75, atk: 10, int: 16, spd: 10,
        commands: [
            ["atk01", "atk_hinoko", "atk_hinoko", "misc_mana_charge", "atk_hinoko", "misc03"] // ミス1個
        ],
        image: "images/petit_fire.svg"
    },
    // 🔵 【新規】ちびタコ
    {
        id: "char_chibi_tako",
        name: "ちびタコ",
        species: "aquatic",
        hp: 80, maxHp: 80, atk: 13, int: 10, spd: 9,
        commands: [
            ["atk01", "atk_sumihaki", "atk_prank", "atk_sumihaki", "atk02", "misc03"]
        ],
        image: "images/chibi_tako.svg"
    },
    // 🐕 【新規】わんこ
    {
        id: "char_wanko",
        name: "わんこ",
        species: "beast",
        hp: 88, maxHp: 88, atk: 15, int: 10, spd: 14,
        commands: [
            ["atk01", "atk_kamitsuki", "heal01", "atk_kamitsuki", "atk02", "misc03"] // ミス1個
        ],
        image: "images/wanko.svg"
    },
    // 🐱 【新規】ちびネコ
    {
        id: "char_chibi_neko",
        name: "ちびネコ",
        species: "beast",
        hp: 64, maxHp: 64, atk: 11, int: 14, spd: 18,
        commands: [
            ["atk_hikaki", "misc_quickstep", "heal01", "atk_hikaki", "misc03", "heal01"] // 速さを活かす軽回復役
        ],
        image: "images/chibi_neko.svg"
    },
    // 🐻 【新規】ちびグマ
    {
        id: "char_chibi_guma",
        name: "ちびグマ",
        species: "beast",
        hp: 105, maxHp: 105, atk: 17, int: 5, spd: 7,
        commands: [
            ["atk01", "atk_taiatari", "misc_guard", "atk_taiatari", "atk02", "misc03"] // 攻撃寄りのかばう役
        ],
        image: "images/chibi_guma.svg"
    },
    // 🐢 【新規】こいしガメ
    {
        id: "char_koishi_game",
        name: "こいしガメ",
        species: "aquatic",
        hp: 105, maxHp: 105, atk: 11, int: 6, spd: 5,
        commands: [
            ["misc_guard", "atk01", "misc03", "misc_guard", "atk02", "atk01"]
        ],
        image: "images/koishi_game.svg"
    },
    // 🟤 【新規】まるアルマジロ
    {
        id: "char_maru_armadillo",
        name: "まるアルマジロ",
        species: "beast",
        hp: 95, maxHp: 95, atk: 14, int: 4, spd: 10,
        commands: [
            ["atk01", "misc_guard", "atk_taiatari", "misc03", "misc_guard", "atk01"]
        ],
        image: "images/maru_armadillo.svg"
    },
    // 🐿️ 【新規】こりすナース
    {
        id: "char_korisu_nurse",
        name: "こりすナース",
        species: "beast",
        hp: 62, maxHp: 62, atk: 9, int: 16, spd: 18,
        commands: [
            ["heal01", "atk01", "heal01", "misc03", "misc_quickstep", "atk_hikaki"]
        ],
        image: "images/korisu_nurse.svg"
    },
    // 🌳 【新規】こだま
    {
        id: "char_kodama",
        name: "こだま",
        species: "nature",
        hp: 70, maxHp: 70, atk: 7, int: 16, spd: 12,
        commands: [
            ["mgc01", "atk_weaken", "misc03", "misc_support_reel_up", "heal01", "atk_weaken"]
        ],
        image: "images/kodama.svg"
    }
];
