// data/characters/grade4.js

export const grade4Characters = [
    // 🐉 【既存敵】ドラゴン
    {
        id: "char_dragon",
        name: "ドラゴン",
        species: "dragon",
        hp: 160, atk: 30, int: 15, spd: 10,
        commands: [
            ["atk01", "atk02", "cmd_drake_surge", "cmd_up12", "cmd_wing_ascent", "cmd_up12"],
            ["atk02", "atk_fire", "cmd_drake_surge", "cmd_up23", "cmd_wing_ascent", "cmd_up23"],
            ["atk03", "atk_fire", "cmd_drake_surge", "cmd_ancient_roar", "cmd_up34", "cmd_up34"],
            ["atk05", "atk_fire", "cmd_drake_surge", "cmd_ancient_roar", "atk03", "cmd_down12"]
        ],
        image: "images/dragon.svg"
    },
    // 👊 【既存職】武闘家
    {
        id: "char_butouka",
        name: "武闘家",
        species: "human",
        hp: 145, atk: 26, int: 7, spd: 25,
        commands: [
            ["cmd_up12", "atk01", "cmd_up12", "atk02", "atk01", "cmd_up12"],
            ["cmd_up23", "misc_focus", "atk02", "atk03", "cmd_up23", "cmd_up23"],
            ["atk02", "misc_fighting_spirit", "atk05", "atk05", "misc03", "cmd_up34"],
            ["atk03", "misc_fighting_spirit", "atk05", "atk05", "misc03", "atk05"]
        ],
        image: "images/butouka.svg"
    },
    // 👑 【新規】魔王
    {
        id: "char_maou",
        name: "魔王",
        species: "demon",
        hp: 185, atk: 20, int: 20, spd: 10,
        commands: [
            ["atk01", "mgc01", "cmd_up12", "atk02", "misc03", "cmd_up12"],
            ["atk02", "mgc01", "atk_weaken", "atk03", "cmd_up23", "cmd_up23"],
            ["atk03", "mgc01", "atk_fire", "atk03", "cmd_up34", "cmd_up34"],
            ["atk03", "mgc01", "atk_fire", "atk05", "atk_weaken", "misc03"]
        ],
        image: "images/maou.svg"
    },
    // 🛐 大司祭（僧侶：★4として「いやしの雨」でパーティを一気に立て直す）
    {
        id: "char_high_priest",
        name: "大司祭",
        species: "human",
        hp: 145, atk: 9, int: 31, spd: 18,
        commands: [
            ["heal01", "heal01", "cmd_up12", "heal01", "heal_cure", "cmd_up12"],
            ["heal02", "mgc02", "cmd_healing_rain", "heal01", "cmd_up23", "cmd_up23"],
            ["heal02", "cmd_starfall", "cmd_healing_rain", "cmd_first_aid_strike", "cmd_up34", "cmd_up34"],
            ["mgc02", "heal_cure", "cmd_healing_rain", "cmd_first_aid_strike", "cmd_healing_rain", "cmd_down12"]
        ],
        image: "images/high_priest.svg"
    },
    {
        id: "char_angel_knight",
        name: "天翼騎士",
        species: "human",
        hp: 130, atk: 21, int: 22, spd: 18,
        commands: [
            ["cmd_up12", "heal01", "cmd_up12", "atk02", "cmd_up12", "misc_guard"],
            ["atk02", "cmd_up23", "atk_guard_break", "heal_cure", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "heal02", "atk_guard_break", "cmd_cover", "cmd_up34", "cmd_up34"],
            ["atk05", "cmd_healing_rain", "cmd_first_aid_strike", "cmd_starfall", "cmd_cover", "cmd_coordinated_slash"]
        ],
        image: "images/angel_knight.svg"
    },
    // 🦅 【新規】フェニックス
    {
        id: "char_phoenix",
        name: "フェニックス",
        species: "dragon",
        hp: 115, atk: 21, int: 24, spd: 19,
        commands: [
            ["mgc01", "heal01", "cmd_up12", "cmd_wing_ascent", "cmd_up12", "atk_hinoko"],
            ["atk02", "mgc01", "cmd_wing_ascent", "cmd_drake_surge", "cmd_up23", "cmd_up23"],
            ["atk_fire", "heal_cure", "cmd_wing_ascent", "cmd_drake_surge", "cmd_up34", "cmd_up34"],
            ["atk03", "cmd_drake_surge", "atk_fire", "heal02", "heal_cure", "cmd_ancient_roar"]
        ],
        image: "images/phoenix.svg"
    },
    // 🎭 【新規】アサシンマスター
    {
        id: "char_assassin_master",
        name: "影魔アサシン",
        species: "demon",
        statProfile: { scoreMultiplier: 0.92 },
        hp: 125, atk: 24, int: 12, spd: 26,
        commands: [
            ["cmd_up12", "atk04", "cmd_up12", "misc02", "atk01", "cmd_up12"],
            ["misc03", "atk04", "atk_paralyze", "atk01", "cmd_up23", "cmd_up23"],
            ["misc03", "cmd_up34", "atk_paralyze", "misc02", "atk02", "cmd_up34"],
            ["atk02", "atk04", "atk_paralyze", "misc02", "atk03", "atk03"]
        ],
        image: "images/assassin_master.svg"
    },
    // 🌟 【新規】ゴッドハンド
    {
        id: "char_godhand",
        name: "ゴッドハンド",
        species: "construct",
        hp: 165, atk: 27, int: 8, spd: 19,
        commands: [
            ["misc03", "atk01", "cmd_up12", "atk02", "atk01", "cmd_up12"],
            ["misc03", "atk02", "atk02", "atk03", "cmd_up23", "cmd_up23"],
            ["misc03", "cmd_piston_bulwark", "atk03", "atk05", "cmd_up34", "cmd_up34"],
            ["cmd_piston_bulwark", "atk03", "atk05", "atk05", "misc03", "atk05"]
        ],
        image: "images/godhand.svg"
    },
    // 🐉 レッドドラゴン（最高峰のスペックを持ち、物理全体攻撃を使いこなす）
    {
        id: "char_red_dragon",
        name: "レッドドラゴン",
        species: "dragon",
        hp: 210, atk: 21, int: 14, spd: 10,
        commands: [
            ["atk01", "atk02", "cmd_up12", "atk01", "misc03", "cmd_up12"],
            ["atk02", "atk_fire", "cmd_up23", "cmd_sweep", "atk03", "cmd_up23"],
            ["atk03", "cmd_sweep", "cmd_drake_surge", "cmd_ancient_roar", "cmd_up34", "cmd_up34"],
            ["atk03", "cmd_sweep", "atk_fire", "atk05", "cmd_sweep", "misc03"]
        ],
        image: "images/red_dragon.svg"
    },
    {
        id: "char_death_armor",
        name: "デスアーマー",
        species: "undead",
        statProfile: { scoreMultiplier: 1.05 },
        hp: 145, atk: 26, int: 20, spd: 12,
        commands: [
            ["atk01", "cmd_cover", "cmd_shield", "cmd_up12", "cmd_grave_pact", "cmd_up12"],
            ["atk02", "cmd_cover", "atk_weaken", "cmd_barrier", "cmd_soul_siphon", "cmd_up23"],
            ["cmd_up34", "cmd_cover", "atk_weakened", "cmd_team_barrier", "cmd_last_grasp", "cmd_up34"],
            ["cmd_last_grasp", "cmd_cover", "atk05", "cmd_barrier", "atk_weakened", "cmd_soul_siphon"]
        ],
        image: "images/death_armor.svg"
    },
    {
        id: "char_crystal_slime",
        name: "クリスタルスライム",
        species: "slime",
        hp: 160, atk: 18, int: 21, spd: 16,
        commands: [
            ["mgc01", "cmd_shield", "cmd_mucus_mend", "cmd_up12", "cmd_up12", "atk_prank"],
            ["mgc02", "cmd_team_barrier", "cmd_split_foam", "atk_weaken", "cmd_up23", "cmd_up23"],
            ["cmd_team_barrier", "heal02", "mgc02", "atk_weakened", "cmd_up34", "cmd_up34"],
            ["cmd_team_barrier", "mgc02", "cmd_mucus_mend", "cmd_split_foam", "atk_weakened", "cmd_down12"]
        ],
        image: "images/crystal_slime.svg"
    },
    {
        id: "char_elder_dryad",
        name: "老樹ドライアド",
        species: "nature",
        hp: 165, atk: 16, int: 25, spd: 13,
        commands: [
            ["heal01", "mgc01", "cmd_shield", "cmd_up12", "cmd_up12", "atk_weaken"],
            ["heal02", "atk_weaken", "cmd_team_barrier", "mgc01", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "heal02", "atk_weakened", "cmd_team_barrier", "cmd_up34", "heal_cure"],
            ["cmd_healing_rain", "cmd_cleansing_thorn", "heal02", "atk_weakened", "cmd_team_barrier", "cmd_down12"]
        ],
        image: "images/elder_dryad.svg"
    },
    {
        id: "char_leviathan_cub",
        name: "リヴァイアサン幼体",
        species: "aquatic",
        hp: 140, atk: 21, int: 25, spd: 13,
        commands: [
            ["atk01", "atk_sumihaki", "cmd_shield", "cmd_up12", "atk_weaken", "cmd_up12"],
            ["atk02", "atk_sumihaki", "cmd_sweep", "cmd_barrier", "atk_weakened", "cmd_up23"],
            ["atk03", "cmd_sweep", "atk_weakened", "cmd_team_barrier", "cmd_up34", "cmd_up34"],
            ["atk05", "cmd_sweep", "cmd_starfall", "atk_weakened", "cmd_team_barrier", "cmd_barrier"]
        ],
        image: "images/leviathan_cub.svg"
    },
    {
        id: "char_moonfang_alpha",
        name: "月牙の群長",
        species: "beast",
        statProfile: { scoreMultiplier: 0.92 },
        hp: 140, atk: 24, int: 13, spd: 22,
        commands: [
            ["cmd_up12", "misc_quickstep", "cmd_up12", "cmd_feral_dash", "cmd_up12", "misc_focus"],
            ["cmd_up23", "atk_guard_break", "cmd_predator_pounce", "atk_paralyze", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "misc02", "atk_paralyze", "cmd_sweep", "cmd_up34", "cmd_up34"],
            ["atk05", "cmd_predator_pounce", "atk_guard_break", "cmd_counter_howl", "atk03", "cmd_down12"]
        ],
        image: "images/moonfang_alpha.svg"
    },
    {
        id: "char_saber_tiger",
        name: "サーベルタイガー",
        species: "beast",
        statProfile: { scoreMultiplier: 0.92 },
        hp: 155, atk: 26, int: 7, spd: 23,
        commands: [
            ["cmd_up12", "misc_quickstep", "atk02", "cmd_up12", "atk02", "cmd_up12"],
            ["cmd_up23", "atk_guard_break", "misc_focus", "cmd_predator_pounce", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "misc02", "atk03", "atk02", "cmd_up34", "atk_guard_break"],
            ["cmd_predator_pounce", "atk03", "atk_guard_break", "misc02", "atk03", "cmd_down12"]
        ],
        image: "images/saber_tiger.svg"
    },
    {
        id: "char_rail_sentinel",
        name: "レールセンチネル",
        species: "construct",
        hp: 180, atk: 22, int: 17, spd: 12,
        commands: [
            ["atk01", "cmd_shield", "cmd_up12", "misc_guard", "cmd_up12", "atk02"],
            ["atk02", "cmd_barrier", "atk_guard_break", "cmd_up23", "cmd_up23", "cmd_shield"],
            ["cmd_up34", "cmd_team_barrier", "cmd_cover", "atk03", "cmd_up34", "cmd_up34"],
            ["cmd_earthquake", "cmd_team_barrier", "atk_guard_break", "cmd_cover", "cmd_core_knuckle", "cmd_down12"]
        ],
        image: "images/rail_sentinel.svg"
    },
    {
        id: "char_sunflower_saint",
        name: "陽花の聖者",
        species: "nature",
        hp: 150, atk: 12, int: 29, spd: 16,
        commands: [
            ["heal01", "mgc01", "cmd_up12", "cmd_shield", "cmd_up12", "heal_cure"],
            ["heal02", "atk_weaken", "cmd_team_barrier", "cmd_up23", "cmd_up23", "heal01"],
            ["cmd_healing_rain", "heal02", "atk_weakened", "cmd_up34", "cmd_up34", "cmd_team_barrier"],
            ["cmd_healing_rain", "heal02", "cmd_starfall", "cmd_lifebloom_bolt", "cmd_team_barrier", "cmd_down12"]
        ],
        image: "images/sunflower_saint.svg"
    },
    {
        id: "char_banshee_queen",
        name: "バンシークイーン",
        species: "undead",
        hp: 145, atk: 9, int: 31, spd: 18,
        commands: [
            ["misc03", "mgc01", "atk_weaken", "cmd_up12", "atk_prank", "cmd_up12"],
            ["mgc02", "atk_weakened", "misc03", "atk_prank", "cmd_up23", "heal_cure"],
            ["misc03", "cmd_starfall", "atk_weakened", "mgc02", "cmd_up34", "cmd_up34"],
            ["cmd_starfall", "atk_weakened", "mgc02", "cmd_last_grasp", "heal_cure", "cmd_down12"]
        ],
        image: "images/banshee_queen.svg"
    },
    {
        id: "char_aurora_slime",
        name: "オーロラスライム",
        species: "slime",
        typeHint: "allrounder",
        hp: 135, atk: 16, int: 25, spd: 17,
        commands: [
            ["cmd_jelly_cushion", "heal01", "cmd_up12", "cmd_shield", "cmd_gel_chorus", "cmd_up12"],
            ["cmd_mucus_mend", "cmd_team_barrier", "atk_weaken", "cmd_up23", "cmd_up23", "cmd_jelly_cushion"],
            ["cmd_up34", "cmd_gel_chorus", "cmd_split_foam", "atk_weakened", "cmd_up34", "cmd_team_barrier"],
            ["cmd_healing_rain", "cmd_jelly_cushion", "cmd_gel_chorus", "cmd_split_foam", "atk_weakened", "cmd_down12"]
        ],
        image: "images/aurora_slime.svg"
    },
    {
        id: "char_strategist",
        name: "軍師",
        species: "human",
        typeHint: "disrupt",
        hp: 135, atk: 15, int: 24, spd: 18,
        commands: [
            ["cmd_rally_banner", "atk_weaken", "cmd_up12", "cmd_tactical_feint", "misc_support_reel_up", "cmd_up12"],
            ["cmd_rally_banner", "cmd_suppressive_shot", "cmd_up23", "heal01", "cmd_up23", "atk_weaken"],
            ["cmd_up34", "cmd_tactical_feint", "atk_weakened", "misc_support_reel_up2", "cmd_up34", "cmd_rally_banner"],
            ["cmd_rally_banner", "cmd_suppressive_shot", "cmd_tactical_feint", "heal02", "atk_weakened", "cmd_down12"]
        ],
        image: "images/strategist.svg"
    },
    {
        id: "char_succubus_tempter",
        name: "誘惑サキュバス",
        species: "demon",
        typeHint: "allrounder",
        hp: 120, atk: 13, int: 30, spd: 21,
        commands: [
            ["cmd_doom_spark", "atk_prank", "cmd_up12", "misc03", "heal01", "cmd_up12"],
            ["cmd_doom_spark", "mgc02", "misc03", "cmd_up23", "cmd_up23", "atk_weaken"],
            ["cmd_up34", "cmd_infernal_gamble", "atk_weakened", "cmd_soul_siphon", "cmd_up34", "misc03"],
            ["cmd_doom_spark", "cmd_infernal_gamble", "cmd_starfall", "atk_prank", "misc03", "cmd_down12"]
        ],
        image: "images/succubus_tempter.svg"
    },
    {
        id: "char_deep_seiren",
        name: "深海セイレーン",
        species: "aquatic",
        typeHint: "disrupt",
        statProfile: { scoreMultiplier: 0.9 },
        hp: 125, atk: 12, int: 30, spd: 20,
        commands: [
            ["cmd_brine_net", "heal01", "cmd_up12", "atk_sumihaki", "cmd_tidal_screen", "cmd_up12"],
            ["cmd_brine_net", "mgc02", "cmd_team_barrier", "cmd_up23", "cmd_up23", "atk_weaken"],
            ["cmd_up34", "cmd_tidal_screen", "atk_weakened", "heal02", "cmd_up34", "cmd_brine_net"],
            ["mgc02", "cmd_brine_net", "cmd_healing_rain", "cmd_tidal_screen", "atk_weakened", "cmd_down12"]
        ],
        image: "images/deep_seiren.svg"
    },
    {
        id: "char_windchant_wyvern",
        name: "風詠みワイバーン",
        species: "dragon",
        typeHint: "support",
        statProfile: { scoreMultiplier: 1.06 },
        hp: 135, atk: 19, int: 23, spd: 20,
        commands: [
            ["misc_wingbeat", "cmd_scale_charge", "cmd_up12", "heal01", "cmd_skyline_roar", "cmd_up12"],
            ["cmd_wing_ascent", "cmd_skyline_roar", "misc_support_reel_up", "cmd_up23", "cmd_up23", "heal01"],
            ["cmd_up34", "cmd_scale_charge", "misc_wingbeat", "cmd_team_barrier", "cmd_up34", "cmd_skyline_roar"],
            ["cmd_wing_ascent", "cmd_skyline_roar", "cmd_scale_charge", "heal02", "misc_support_reel_up2", "cmd_down12"]
        ],
        image: "images/windchant_wyvern.svg"
    }
];
