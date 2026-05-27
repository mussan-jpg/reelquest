// data/characters/grade2.js

export const grade2Characters = [
    // ⚔️ 【既存職】剣士
    {
        id: "char_kenshi",
        name: "剣士",
        species: "human",
        hp: 105, atk: 19, int: 7, spd: 13,
        commands: [
            ["atk01", "atk01", "cmd_up12", "atk02", "atk01", "cmd_up12"],
            ["atk01", "atk02", "cmd_coordinated_slash", "atk02", "atk03", "misc03"]
        ],
        image: "images/player.svg"
    },
    // 🧙‍♂️ 【既存職】魔法使い
    {
        id: "char_mahoutsukai",
        name: "魔法使い",
        species: "human",
        hp: 85, atk: 7, int: 23, spd: 13,
        commands: [
            ["atk01", "mgc01", "cmd_up12", "mgc01", "atk01", "cmd_up12"],
            ["mgc01", "atk_prank", "mgc02", "atk_weaken", "misc03", "misc_fighting_spirit"]
        ],
        image: "images/mahoutsukai.svg"
    },
    // 🌿 【新規】薬草師
    {
        id: "char_herbalist",
        name: "薬草師",
        species: "human",
        hp: 85, atk: 7, int: 22, spd: 14,
        commands: [
            ["heal01", "heal_cure", "cmd_up12", "heal01", "misc_mana_charge", "cmd_up12"],
            ["heal01", "heal02", "heal_cure", "cmd_first_aid_strike", "misc_mana_charge", "cmd_down12"]
        ],
        image: "images/herbalist.svg"
    },
    // 👤 【既存職】盗賊
    {
        id: "char_thief",
        name: "盗賊",
        species: "human",
        statProfile: { scoreMultiplier: 0.94 },
        hp: 60, atk: 15, int: 11, spd: 22,
        commands: [
            ["cmd_up12", "atk04", "misc_quickstep", "misc02", "cmd_up12", "misc03"],
            ["atk_prank", "atk04", "atk_paralyze", "misc02", "misc_quickstep", "cmd_suppressive_shot"]
        ],
        image: "images/thief.svg"
    },
    {
        id: "char_heal_slime",
        name: "ヒールスライム",
        species: "slime",
        hp: 70, atk: 9, int: 24, spd: 13,
        commands: [
            ["heal01", "cmd_mucus_mend", "cmd_up12", "mgc01", "heal01", "cmd_up12"],
            ["heal01", "heal01", "cmd_mucus_mend", "heal_cure", "mgc01", "misc_support_reel_up"]
        ],
        image: "images/heal_slime.svg"
    },
    // 🛡️ アイアンナイト（盾役：高いHPと「かばう」で味方を死守する）
    {
        id: "char_iron_knight",
        name: "アイアンナイト",
        species: "construct",
        hp: 155, atk: 15, int: 6, spd: 8,
        commands: [
            ["atk01", "cmd_cover", "misc03", "atk01", "misc03", "cmd_up12"],
            ["atk02", "cmd_cover", "misc_guard", "cmd_anchor_guard", "cmd_cover", "misc03"]
        ],
        image: "images/iron_knight.svg"
    },
    // 🧸 【新規】呪いの人形
    {
        id: "char_puppet",
        name: "呪いの人形",
        species: "undead",
        statProfile: { scoreMultiplier: 1.06 },
        hp: 100, atk: 14, int: 15, spd: 11,
        commands: [
            ["atk01", "atk_weaken", "cmd_up12", "atk01", "atk_weaken", "cmd_up12"],
            ["cmd_cover", "atk_weaken", "atk_weaken", "misc03", "atk_prank", "atk01"]
        ],
        image: "images/puppet.svg"
    },
    // 💀 【既存敵】ガイコツ
    {
        id: "char_skeleton",
        name: "ガイコツ",
        species: "undead",
        hp: 115, atk: 19, int: 4, spd: 14,
        commands: [
            ["atk01", "atk02", "cmd_up12", "atk01", "misc_focus", "cmd_up12"],
            ["atk01", "atk02", "atk_paralyze", "atk02", "misc03", "misc_focus"]
        ],
        image: "images/skeleton.svg"
    },
    // 😈 【既存敵】小悪魔
    {
        id: "char_imp",
        name: "小悪魔",
        species: "demon",
        hp: 70, atk: 12, int: 16, spd: 18,
        commands: [
            ["cmd_up12", "mgc01", "misc_quickstep", "atk_prank", "cmd_up12", "cmd_up12"],
            ["atk_prank", "mgc01", "atk_weaken", "heal01", "misc_quickstep", "misc03"]
        ],
        image: "images/imp.svg"
    },
    // 👻 【既存敵】ゴースト
    {
        id: "char_ghost",
        name: "ゴースト",
        species: "undead",
        hp: 80, atk: 10, int: 19, spd: 15,
        commands: [
            ["mgc01", "atk_weaken", "misc_mana_charge", "mgc01", "cmd_up12", "cmd_up12"],
            ["atk_prank", "atk_weaken", "misc03", "cmd_soul_siphon", "misc_mana_charge", "misc03"]
        ],
        image: "images/ghost.svg"
    },
    // 🐺 【新規】ワーウルフ
    {
        id: "char_werewolf",
        name: "ワーウルフ",
        species: "beast",
        hp: 110, atk: 19, int: 5, spd: 14,
        commands: [
            ["atk01", "cmd_hamstring_claw", "cmd_up12", "atk02", "atk01", "cmd_up12"],
            ["cmd_predator_pounce", "atk02", "misc_focus", "atk03", "cmd_hamstring_claw", "misc03"]
        ],
        image: "images/werewolf.svg"
    },
    {
        id: "char_little_dragon",
        name: "リトルドラゴン",
        species: "dragon",
        hp: 100, atk: 16, int: 14, spd: 10,
        commands: [
            ["atk01", "atk_hinoko", "cmd_up12", "atk02", "atk_hinoko", "cmd_up12"],
            ["atk02", "atk_fire", "cmd_drake_surge", "misc_mana_charge", "atk02", "misc03"]
        ],
        image: "images/little_dragon.svg"
    },
    // 🧜‍♀️ 【新規】人魚
    {
        id: "char_mermaid",
        name: "人魚",
        species: "aquatic",
        hp: 90, atk: 10, int: 19, spd: 13,
        commands: [
            ["atk01", "heal01", "cmd_up12", "heal01", "mgc01", "cmd_up12"],
            ["mgc01", "heal01", "heal02", "heal_cure", "heal01", "misc03"]
        ],
        image: "images/mermaid.svg"
    },
    // 🗿 【新規】ガーゴイル
    {
        id: "char_gargoyle",
        name: "ガーゴイル",
        species: "construct",
        hp: 135, atk: 16, int: 8, spd: 9,
        commands: [
            ["atk01", "misc_guard", "misc03", "atk02", "cmd_cover", "cmd_up12"],
            ["cmd_cover", "cmd_anchor_guard", "misc_guard", "atk02", "atk02", "misc03"]
        ],
        image: "images/gargoyle.svg"
    },
    {
        id: "char_flower_fairy",
        name: "花の精",
        species: "nature",
        hp: 85, atk: 7, int: 21, spd: 15,
        commands: [
            ["mgc01", "heal01", "cmd_up12", "atk_weaken", "heal01", "cmd_up12"],
            ["heal01", "atk_weaken", "heal02", "misc_support_reel_up", "cmd_lifebloom_bolt", "misc03"]
        ],
        image: "images/flower_fairy.svg"
    },
    // 👤 【新規】シャドウ
    {
        id: "char_shadow",
        name: "シャドウ",
        species: "undead",
        hp: 75, atk: 15, int: 13, spd: 17,
        commands: [
            ["cmd_up12", "misc_focus", "cmd_up12", "atk_prank", "atk01", "cmd_up12"],
            ["atk_prank", "atk04", "misc_focus", "atk02", "atk_paralyze", "misc03"]
        ],
        image: "images/shadow.svg"
    },
    // 🛡️ 【新規】盾ゴブリン
    {
        id: "char_shield_goblin",
        name: "盾ゴブリン",
        species: "demon",
        hp: 135, atk: 18, int: 5, spd: 10,
        commands: [
            ["atk01", "misc_guard", "cmd_up12", "atk02", "misc_guard", "cmd_up12"],
            ["misc_guard", "atk_guard_break", "atk02", "cmd_cover", "atk02", "misc03"]
        ],
        image: "images/shield_goblin.svg"
    },
    {
        id: "char_drake_whelp",
        name: "ドレイクの幼体",
        species: "dragon",
        hp: 110, atk: 16, int: 12, spd: 10,
        commands: [
            ["atk01", "atk_hinoko", "cmd_shield", "cmd_up12", "atk02", "cmd_up12"],
            ["atk02", "atk_fire", "cmd_barrier", "cmd_drake_surge", "atk_hinoko", "atk02"]
        ],
        image: "images/drake_whelp.svg"
    },
    {
        id: "char_gear_medic",
        name: "歯車メディック",
        species: "construct",
        hp: 105, atk: 15, int: 14, spd: 10,
        commands: [
            ["heal01", "cmd_shield", "cmd_up12", "heal01", "cmd_up12", "misc_mana_charge"],
            ["heal01", "cmd_team_barrier", "heal02", "cmd_anchor_guard", "misc03", "heal_cure"]
        ],
        image: "images/gear_medic.svg"
    },
    {
        id: "char_mist_slime",
        name: "ミストスライム",
        species: "slime",
        hp: 70, atk: 14, int: 17, spd: 15,
        commands: [
            ["mgc01", "cmd_shield", "cmd_up12", "cmd_mucus_mend", "atk_weaken", "cmd_up12"],
            ["mgc01", "heal02", "cmd_team_barrier", "atk_weaken", "cmd_split_foam", "cmd_jelly_rebound"]
        ],
        image: "images/mist_slime.svg"
    },
    {
        id: "char_lantern_devil",
        name: "ランタンデビル",
        species: "demon",
        hp: 80, atk: 13, int: 17, spd: 14,
        commands: [
            ["mgc01", "atk_prank", "cmd_up12", "atk_weaken", "cmd_up12", "misc_mana_charge"],
            ["mgc01", "mgc02", "atk_weaken", "atk_prank", "misc03", "cmd_shield"]
        ],
        image: "images/lantern_devil.svg"
    },
    {
        id: "char_leaf_healer",
        name: "木の葉ヒーラー",
        species: "nature",
        hp: 90, atk: 14, int: 15, spd: 13,
        commands: [
            ["heal01", "mgc01", "cmd_up12", "cmd_shield", "cmd_up12", "heal01"],
            ["heal01", "heal02", "cmd_team_barrier", "cmd_cleansing_thorn", "misc03", "heal_cure"]
        ],
        image: "images/leaf_healer.svg"
    },
    {
        id: "char_shell_guard",
        name: "シェルガード",
        species: "aquatic",
        hp: 140, atk: 14, int: 10, spd: 8,
        commands: [
            ["misc_guard", "cmd_shield", "atk01", "misc03", "cmd_up12", "atk02"],
            ["cmd_cover", "cmd_barrier", "atk_guard_break", "cmd_shield", "misc03", "atk02"]
        ],
        image: "images/shell_guard.svg"
    },
    {
        id: "char_lynx_scout",
        name: "リンクス斥候",
        species: "beast",
        hp: 80, atk: 15, int: 10, spd: 19,
        commands: [
            ["atk_hikaki", "misc_quickstep", "cmd_up12", "cmd_feral_dash", "atk02", "cmd_up12"],
            ["cmd_predator_pounce", "atk_guard_break", "misc_quickstep", "atk_prank", "cmd_counter_howl", "atk02"]
        ],
        image: "images/lynx_scout.svg"
    },
    {
        id: "char_reef_duelist",
        name: "リーフデュエリスト",
        species: "aquatic",
        hp: 95, atk: 16, int: 10, spd: 15,
        commands: [
            ["atk01", "atk_sumihaki", "cmd_up12", "misc_quickstep", "atk02", "cmd_up12"],
            ["atk02", "atk_guard_break", "misc_quickstep", "cmd_shield", "atk03", "misc03"]
        ],
        image: "images/reef_duelist.svg"
    },
    {
        id: "char_sky_hawk",
        name: "空渡りの鷹",
        species: "beast",
        statProfile: { scoreMultiplier: 1.08 },
        hp: 70, atk: 16, int: 9, spd: 21,
        commands: [
            ["cmd_up12", "misc_wingbeat", "cmd_feral_dash", "misc_support_reel_up", "cmd_up12", "atk02"],
            ["cmd_predator_pounce", "misc_wingbeat", "atk_guard_break", "misc_support_reel_up2", "atk03", "cmd_counter_howl"]
        ],
        image: "images/sky_hawk.svg"
    },
    {
        id: "char_shell_slime",
        name: "シェルスライム",
        species: "slime",
        typeHint: "guard",
        hp: 125, atk: 12, int: 14, spd: 8,
        commands: [
            ["cmd_shield", "cmd_jelly_cushion", "cmd_up12", "misc_guard", "heal01", "cmd_up12"],
            ["cmd_barrier", "cmd_jelly_cushion", "cmd_split_foam", "cmd_shield", "misc_guard", "cmd_down12"]
        ],
        image: "images/shell_slime.svg"
    },
    {
        id: "char_snare_fox",
        name: "スネアフォックス",
        species: "beast",
        typeHint: "disrupt",
        hp: 78, atk: 16, int: 10, spd: 20,
        commands: [
            ["cmd_pack_mark", "misc_quickstep", "cmd_up12", "atk01", "cmd_hamstring_claw", "cmd_up12"],
            ["cmd_pack_mark", "atk_prank", "cmd_predator_pounce", "cmd_leaping_watch", "atk_guard_break", "cmd_down12"]
        ],
        image: "images/snare_fox.svg"
    },
    {
        id: "char_vine_warden",
        name: "蔦の番人",
        species: "nature",
        typeHint: "guard",
        hp: 125, atk: 13, int: 14, spd: 8,
        commands: [
            ["misc_guard", "cmd_shield", "cmd_up12", "cmd_verdant_pulse", "atk_weaken", "cmd_up12"],
            ["cmd_cover", "cmd_root_guard", "cmd_spore_lance", "cmd_verdant_pulse", "cmd_team_barrier", "cmd_down12"]
        ],
        image: "images/vine_warden.svg"
    },
    {
        id: "char_grave_shieldman",
        name: "墓守の盾兵",
        species: "undead",
        typeHint: "guard",
        hp: 128, atk: 15, int: 11, spd: 8,
        commands: [
            ["misc_guard", "cmd_shield", "cmd_up12", "cmd_grave_echo", "atk01", "cmd_up12"],
            ["cmd_cover", "cmd_bone_offering", "cmd_grave_echo", "cmd_barrier", "atk_weaken", "cmd_down12"]
        ],
        image: "images/grave_shieldman.svg"
    },
    {
        id: "char_shieldscale_drake",
        name: "盾鱗ドレイク",
        species: "dragon",
        typeHint: "guard",
        hp: 118, atk: 16, int: 12, spd: 10,
        commands: [
            ["cmd_scale_charge", "cmd_shield", "cmd_up12", "atk_hinoko", "misc_guard", "cmd_up12"],
            ["cmd_scale_charge", "cmd_barrier", "cmd_skyline_roar", "atk02", "cmd_wing_ascent", "cmd_down12"]
        ],
        image: "images/shieldscale_drake.svg"
    }
];
