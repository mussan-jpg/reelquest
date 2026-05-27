// data/characters/grade1.js

export const grade1Characters = [
    {
        id: "char_apprentice_soldier",
        name: "見習い兵士",
        species: "human",
        hp: 90, atk: 14, int: 6, spd: 12,
        commands: [
            ["atk01", "misc_fighting_spirit", "misc03", "cmd_coordinated_slash", "misc_guard", "atk02"]
        ],
        image: "images/apprentice_soldier.svg"
    },
    {
        id: "char_novice_mage",
        name: "見習い魔法使い",
        species: "human",
        hp: 70, atk: 6, int: 18, spd: 12,
        commands: [
            ["mgc01", "misc_mana_charge", "misc03", "mgc01", "atk_weaken", "misc_fighting_spirit"]
        ],
        image: "images/novice_mage.svg"
    },
    // 🎵 【新規】見習い吟遊詩人
    {
        id: "char_apprentice_bard",
        name: "見習い吟遊詩人",
        species: "human",
        hp: 55, atk: 8, int: 15, spd: 16,
        commands: [
            ["atk01", "misc_support_reel_up", "mgc01", "heal01", "cmd_coordinated_slash", "misc_quickstep"]
        ],
        image: "images/apprentice_bard.svg"
    },
    {
        id: "char_baby_dragon",
        name: "ベビードラゴン",
        species: "dragon",
        hp: 100, atk: 14, int: 9, spd: 7,
        commands: [
            ["atk01", "atk_hinoko", "misc03", "cmd_drake_surge", "atk_hinoko", "atk02"]
        ],
        image: "images/baby_dragon.svg"
    },
    {
        id: "char_clockwork_mouse",
        name: "からくりネズミ",
        species: "construct",
        hp: 90, atk: 12, int: 5, spd: 15,
        commands: [
            ["atk01", "misc_quickstep", "misc03", "cmd_anchor_guard", "misc_guard", "atk01"]
        ],
        image: "images/clockwork_mouse.svg"
    },
    // 🟢 【既存敵】スライム
    {
        id: "char_slime",
        name: "スライム",
        species: "slime",
        hp: 75, atk: 15, int: 9, spd: 11,
        commands: [
            ["atk01", "cmd_jelly_rebound", "heal01", "atk01", "misc_support_reel_up", "cmd_mucus_mend"]
        ],
        image: "images/slime.svg"
    },
    {
        id: "char_poison_slime",
        name: "ポイズンスライム",
        species: "slime",
        hp: 75, atk: 12, int: 13, spd: 10,
        commands: [
            ["atk01", "atk04", "cmd_jelly_rebound", "atk01", "misc_support_reel_up", "cmd_mucus_mend"]
        ],
        image: "images/poison_slime.svg"
    },
    // 🦟 【新規】ゴブリン
    {
        id: "char_goblin",
        name: "ゴブリン",
        species: "demon",
        hp: 85, atk: 16, int: 5, spd: 12,
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
        hp: 60, atk: 13, int: 6, spd: 19,
        commands: [
            ["atk01", "misc_wingbeat", "atk_paralyze", "cmd_feral_dash", "atk01", "misc03"]
        ],
        image: "images/bat.svg"
    },
    // 🌱 【新規】マンドラゴラ
    {
        id: "char_mandrake",
        name: "マンドラゴラ",
        species: "nature",
        hp: 90, atk: 9, int: 16, spd: 7,
        commands: [
            ["mgc01", "atk_weaken", "misc03", "cmd_cleansing_thorn", "atk_prank", "mgc01"]
        ],
        image: "images/mandrake.svg"
    },
    // 🐚 【新規】ヤドカリ
    {
        id: "char_hermit_crab",
        name: "ヤドカリ",
        species: "aquatic",
        hp: 125, atk: 13, int: 6, spd: 6,
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
        hp: 125, atk: 18, int: 3, spd: 4,
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
        hp: 85, atk: 9, int: 15, spd: 9,
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
        statProfile: { scoreMultiplier: 1.06 },
        hp: 80, atk: 13, int: 11, spd: 10,
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
        hp: 80, atk: 13, int: 9, spd: 12,
        commands: [
            ["atk01", "atk_kamitsuki", "heal01", "cmd_hamstring_claw", "atk02", "misc03"] // ミス1個
        ],
        image: "images/wanko.svg"
    },
    // 🐱 【新規】ちびネコ
    {
        id: "char_chibi_neko",
        name: "ちびネコ",
        species: "beast",
        statProfile: { scoreMultiplier: 1.08 },
        hp: 60, atk: 10, int: 12, spd: 16,
        commands: [
            ["atk_hikaki", "misc_quickstep", "atk01", "cmd_counter_howl", "misc_support_reel_up", "atk02"] // 速さを活かす軽攻撃役
        ],
        image: "images/chibi_neko.svg"
    },
    // 🐻 【新規】ちびグマ
    {
        id: "char_chibi_guma",
        name: "ちびグマ",
        species: "beast",
        hp: 110, atk: 16, int: 5, spd: 7,
        commands: [
            ["atk01", "atk_taiatari", "misc_guard", "cmd_hamstring_claw", "atk01", "misc03"] // 攻撃寄りのかばう役
        ],
        image: "images/chibi_guma.svg"
    },
    // 🐢 【新規】こいしガメ
    {
        id: "char_koishi_game",
        name: "こいしガメ",
        species: "aquatic",
        statProfile: { scoreMultiplier: 0.96 },
        hp: 125, atk: 12, int: 7, spd: 6,
        commands: [
            ["misc_guard", "atk01", "heal01", "misc_guard", "cmd_cover", "atk01"]
        ],
        image: "images/koishi_game.svg"
    },
    // 🌳 【新規】こだま
    {
        id: "char_kodama",
        name: "こだま",
        species: "nature",
        hp: 75, atk: 7, int: 16, spd: 12,
        commands: [
            ["mgc01", "atk_weaken", "misc03", "misc_support_reel_up", "heal01", "cmd_lifebloom_bolt"]
        ],
        image: "images/kodama.svg"
    },
    {
        id: "char_bubble_slime",
        name: "バブルスライム",
        species: "slime",
        hp: 60, atk: 12, int: 14, spd: 12,
        commands: [
            ["atk01", "cmd_shield", "cmd_split_foam", "heal01", "cmd_jelly_rebound", "cmd_shield"]
        ],
        image: "images/bubble_slime.svg"
    },
    {
        id: "char_shield_slime",
        name: "シールドスライム",
        species: "slime",
        hp: 85, atk: 14, int: 10, spd: 9,
        commands: [
            ["cmd_barrier", "atk01", "cmd_jelly_rebound", "cmd_shield", "misc_guard", "cmd_split_foam"]
        ],
        image: "images/shield_slime.svg"
    },
    {
        id: "char_river_sprite",
        name: "川の精",
        species: "aquatic",
        statProfile: { scoreMultiplier: 1.06 },
        hp: 65, atk: 10, int: 12, spd: 15,
        commands: [
            ["mgc01", "heal01", "cmd_shield", "misc03", "atk_sumihaki", "heal01"]
        ],
        image: "images/river_sprite.svg"
    },
    {
        id: "char_copper_mouse",
        name: "銅ねずみ",
        species: "construct",
        hp: 90, atk: 13, int: 6, spd: 13,
        commands: [
            ["atk01", "cmd_shield", "misc03", "cmd_piston_bulwark", "misc_quickstep", "atk01"]
        ],
        image: "images/copper_mouse.svg"
    },
    {
        id: "char_cinder_imp",
        name: "火の粉インプ",
        species: "demon",
        hp: 70, atk: 10, int: 14, spd: 12,
        commands: [
            ["mgc01", "atk_hinoko", "misc03", "atk_prank", "misc_mana_charge", "atk01"]
        ],
        image: "images/cinder_imp.svg"
    },
    {
        id: "char_sproutling",
        name: "若芽の子",
        species: "nature",
        hp: 80, atk: 12, int: 11, spd: 11,
        commands: [
            ["heal01", "cmd_root_guard", "misc03", "cmd_shield", "atk_weaken", "heal01"]
        ],
        image: "images/sproutling.svg"
    },
    {
        id: "char_lost_soul",
        name: "さまよう魂",
        species: "undead",
        hp: 65, atk: 11, int: 13, spd: 13,
        commands: [
            ["mgc01", "atk_weaken", "misc03", "atk_prank", "cmd_shield", "cmd_soul_siphon"]
        ],
        image: "images/lost_soul.svg"
    },
    {
        id: "char_rookie_guard",
        name: "新米衛兵",
        species: "human",
        typeHint: "guard",
        hp: 95, atk: 12, int: 6, spd: 10,
        commands: [
            ["misc_guard", "atk01", "cmd_rally_banner", "cmd_shield", "misc03", "atk01"]
        ],
        image: "images/rookie_guard.svg"
    },
    {
        id: "char_contract_imp",
        name: "契約インプ",
        species: "demon",
        typeHint: "support",
        hp: 65, atk: 8, int: 16, spd: 13,
        commands: [
            ["cmd_doom_spark", "misc_mana_charge", "misc03", "heal01", "atk_prank", "cmd_infernal_gamble"]
        ],
        image: "images/contract_imp.svg"
    },
    {
        id: "char_rust_mouse",
        name: "錆びネズミ",
        species: "construct",
        typeHint: "disrupt",
        hp: 82, atk: 12, int: 8, spd: 14,
        commands: [
            ["cmd_pack_mark", "atk01", "misc03", "cmd_patch_frame", "atk_guard_break", "cmd_scrap_driver"]
        ],
        image: "images/rust_mouse.svg"
    }
];
