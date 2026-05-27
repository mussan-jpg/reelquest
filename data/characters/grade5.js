// data/characters/grade5.js

export const grade5Characters = [
    {
        id: "char_arc_dragon",
        name: "アークドラゴン",
        species: "dragon",
        hp: 341, atk: 23, int: 19, spd: 11,
        slotCost: 1,
        isSpecialOnly: true,
        commands: [
            ["atk01", "atk02", "cmd_up12", "atk_fire", "cmd_up12", "atk02"],
            ["atk02", "atk_fire", "atk_guard_break", "cmd_up23", "cmd_up23", "atk03"],
            ["atk03", "cmd_sweep", "cmd_drake_surge", "atk_guard_break", "cmd_up34", "cmd_up34"],
            ["atk_fire", "cmd_sweep", "atk03", "cmd_earthquake", "cmd_wing_ascent", "cmd_up45"],
            ["atk05", "cmd_sweep", "atk_fire", "cmd_earthquake", "cmd_ancient_roar", "misc03"]
        ],
        image: "images/arc_dragon.svg"
    },
    // ⚔️ 【既存職】勇者
    {
        id: "char_yusha",
        name: "勇者",
        species: "human",
        hp: 180, atk: 27, int: 19, spd: 19,
        commands: [
            ["cmd_up12", "atk01", "cmd_up12", "atk02", "heal01", "misc03"],
            ["atk02", "atk_guard_break", "cmd_up23", "atk03", "cmd_up23", "misc03"],
            ["cmd_up34", "atk_guard_break", "heal02", "atk03", "cmd_up34", "misc03"],
            ["cmd_up45", "atk05", "cmd_coordinated_slash", "heal02", "cmd_up45", "atk02"],
            ["atk05", "cmd_coordinated_slash", "heal02", "atk_fire", "atk03", "cmd_down12"]
        ],
        image: "images/yusha.svg"
    },
    // 📖 【新規】大賢者
    {
        id: "char_daikenja",
        name: "大賢者",
        species: "human",
        statProfile: { scoreMultiplier: 0.9 },
        hp: 210, atk: 12, int: 40, spd: 18,
        commands: [
            ["atk01", "mgc01", "cmd_up12", "heal01", "cmd_up12", "misc03"],
            ["mgc01", "mgc02", "heal01", "atk_weaken", "cmd_up23", "cmd_up23"],
            ["cmd_starfall", "mgc01", "heal02", "heal_cure", "cmd_up34", "cmd_up34"],
            ["mgc02", "mgc02", "heal02", "cmd_first_aid_strike", "cmd_up45", "cmd_up45"],
            ["cmd_starfall", "mgc02", "cmd_healing_rain", "cmd_first_aid_strike", "cmd_up45", "misc_mana_charge"]
        ],
        image: "images/daikenja.svg"
    },
    {
        id: "char_chimera",
        name: "キメラ",
        species: "beast",
        hp: 321, atk: 22, int: 17, spd: 18,
        slotCost: 1,
        isSpecialOnly: true,
        commands: [
            ["cmd_up12", "atk_paralyze", "cmd_up12", "atk_fire", "cmd_up12", "misc_wingbeat"],
            ["cmd_up23", "cmd_hamstring_claw", "atk_fire", "atk_prank", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "cmd_up34", "atk_weaken", "cmd_sweep", "cmd_up34", "cmd_feral_dash"],
            ["cmd_up45", "cmd_up45", "atk_guard_break", "cmd_predator_pounce", "cmd_up45", "cmd_starfall"],
            ["atk05", "cmd_starfall", "cmd_sweep", "atk_prank", "atk_paralyze", "cmd_counter_howl"]
        ],
        image: "images/chimera.svg"
    },
    {
        id: "char_abyss_kraken",
        name: "深淵クラーケン",
        species: "aquatic",
        hp: 220, atk: 24, int: 23, spd: 10,
        commands: [
            ["atk01", "atk_sumihaki", "cmd_up12", "atk02", "cmd_up12", "atk_sumihaki"],
            ["atk02", "atk_sumihaki", "atk_weaken", "cmd_sweep", "cmd_up23", "cmd_up23"],
            ["atk03", "cmd_sweep", "atk_weakened", "atk_sumihaki", "cmd_up34", "cmd_up34"],
            ["atk05", "cmd_sweep", "atk_weakened", "cmd_starfall", "cmd_up45", "cmd_up45"],
            ["atk05", "cmd_sweep", "cmd_starfall", "atk_weakened", "misc_guard", "atk_sumihaki"]
        ],
        image: "images/abyss_kraken.svg"
    },
    {
        id: "char_lich_lord",
        name: "リッチロード",
        species: "undead",
        hp: 215, atk: 10, int: 32, spd: 16,
        commands: [
            ["atk01", "mgc01", "cmd_up12", "atk_weaken", "misc03", "misc_mana_charge"],
            ["mgc01", "atk_prank", "atk_weaken", "mgc02", "cmd_up23", "misc03"],
            ["mgc02", "atk_weakened", "cmd_grave_pact", "atk_prank", "cmd_up34", "misc03"],
            ["mgc02", "cmd_starfall", "atk_weakened", "cmd_up45", "mgc01", "heal_cure"],
            ["mgc02", "cmd_starfall", "atk_weakened", "atk_prank", "cmd_soul_siphon", "misc03"]
        ],
        image: "images/lich_lord.svg"
    },
    {
        id: "char_slime_emperor",
        name: "スライムエンペラー",
        species: "slime",
        rarity: 6,
        hp: 408, atk: 28, int: 28, spd: 14,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["atk01", "cmd_mucus_mend", "misc_support_reel_up", "atk02", "cmd_up12", "cmd_up12"],
            ["atk02", "cmd_jelly_rebound", "atk04", "misc_support_reel_up", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "heal02", "atk_weakened", "cmd_split_foam", "cmd_up34", "misc_support_reel_up2"],
            ["cmd_up45", "heal02", "cmd_starfall", "atk_guard_break", "cmd_up45", "cmd_mucus_mend"],
            ["cmd_up56", "cmd_starfall", "cmd_split_foam", "atk_weakened", "cmd_up56", "cmd_sweep"],
            ["atk05", "cmd_starfall", "cmd_mucus_mend", "atk_weakened", "cmd_sweep", "misc_support_reel_up2"]
        ],
        image: "images/slime_emperor.svg"
    },
    {
        id: "char_aegis_colossus",
        name: "アイギスコロッサス",
        species: "construct",
        hp: 250, atk: 24, int: 21, spd: 6,
        commands: [
            ["cmd_shield", "misc_guard", "cmd_aegis_fortress", "cmd_up12", "atk02", "misc03"],
            ["atk02", "cmd_cover", "cmd_barrier", "cmd_up23", "cmd_aegis_deploy", "misc03"],
            ["atk03", "cmd_team_barrier", "cmd_aegis_fortress", "cmd_up34", "atk_guard_break", "misc03"],
            ["cmd_earthquake", "cmd_aegis_deploy", "cmd_anchor_guard", "cmd_up45", "cmd_cover", "cmd_barrier"],
            ["atk05", "cmd_earthquake", "cmd_aegis_deploy", "cmd_cover", "cmd_core_knuckle", "misc_guard"]
        ],
        image: "images/aegis_colossus.svg"
    },
    {
        id: "char_abyss_archfiend",
        name: "深淵の大悪魔",
        species: "demon",
        hp: 315, atk: 28, int: 32, spd: 15,
        slotCost: 1,
        commands: [
            ["cmd_demon_whisper", "atk_prank", "misc_mana_charge", "cmd_up12", "atk_weaken", "cmd_up12"],
            ["cmd_demon_whisper", "atk_weaken", "atk_weakened", "cmd_up23", "atk_prank", "cmd_demon_whisper"],
            ["cmd_demon_whisper", "cmd_starfall", "atk_weakened", "cmd_up34", "mgc01", "atk_prank"],
            ["misc_mana_charge", "mgc02", "atk_weakened", "cmd_up45", "atk_fire", "cmd_demon_whisper"],
            ["cmd_starfall", "mgc02", "atk_weakened", "cmd_demon_whisper", "atk_prank", "cmd_demon_whisper"]
        ],
        image: "images/abyss_archfiend.svg"
    },
    {
        id: "char_worldroot_sage",
        name: "世界樹の賢者",
        species: "nature",
        statProfile: { scoreMultiplier: 1.06 },
        hp: 351, atk: 17, int: 23, spd: 11,
        slotCost: 1,
        commands: [
            ["heal01", "mgc01", "cmd_shield", "cmd_up12", "atk_weaken", "cmd_root_guard"],
            ["heal02", "atk_weaken", "cmd_team_barrier", "cmd_up23", "mgc02", "heal_cure"],
            ["heal02", "mgc02", "atk_weakened", "cmd_root_guard", "cmd_team_barrier", "misc03"],
            ["cmd_cleansing_thorn", "cmd_starfall", "heal02", "cmd_lifebloom_bolt", "atk_weakened", "cmd_verdant_pulse"],
            ["cmd_healing_rain", "cmd_starfall", "heal02", "cmd_root_guard", "heal_cure", "cmd_lifebloom_bolt"]
        ],
        image: "images/worldroot_sage.svg"
    },
    {
        id: "char_tide_oracle",
        name: "潮汐オラクル",
        species: "aquatic",
        hp: 180, atk: 16, int: 29, spd: 18,
        commands: [
            ["heal01", "cmd_shield", "cmd_up12", "mgc01", "cmd_up12", "heal_cure"],
            ["heal02", "cmd_team_barrier", "atk_weaken", "cmd_up23", "cmd_up23", "heal01"],
            ["cmd_up34", "cmd_healing_rain", "cmd_team_barrier", "atk_weakened", "cmd_up34", "cmd_up34"],
            ["cmd_up45", "cmd_starfall", "heal02", "cmd_team_barrier", "cmd_up45", "heal_cure"],
            ["cmd_healing_rain", "cmd_starfall", "cmd_shield", "heal02", "atk_weakened", "cmd_down12"]
        ],
        image: "images/tide_oracle.svg"
    },
    {
        id: "char_orbital_core",
        name: "軌道核",
        species: "construct",
        statProfile: { scoreMultiplier: 1.04 },
        hp: 205, atk: 20, int: 25, spd: 13,
        commands: [
            ["cmd_shield", "mgc01", "cmd_up12", "cmd_barrier", "misc03", "atk_weaken"],
            ["cmd_team_barrier", "atk_weaken", "cmd_up23", "cmd_shield", "misc03", "mgc02"],
            ["cmd_up34", "cmd_team_barrier", "atk_weakened", "cmd_barrier", "cmd_up34", "misc03"],
            ["cmd_up45", "cmd_starfall", "cmd_shield", "mgc02", "cmd_up45", "cmd_shield"],
            ["cmd_shield", "cmd_starfall", "atk_weakened", "cmd_barrier", "cmd_core_knuckle", "cmd_down12"]
        ],
        image: "images/orbital_core.svg"
    },
    {
        id: "char_void_duchess",
        name: "虚空公爵夫人",
        species: "demon",
        statProfile: { scoreMultiplier: 0.86 },
        hp: 225, atk: 13, int: 38, spd: 19,
        commands: [
            ["cmd_demon_whisper", "atk_prank", "mgc01", "cmd_up12", "atk_weaken", "misc_mana_charge"],
            ["mgc02", "atk_weaken", "cmd_demon_whisper", "atk_weakened", "cmd_up23", "misc_mana_charge"],
            ["cmd_demon_whisper", "cmd_starfall", "atk_weakened", "atk_prank", "cmd_up34", "mgc02"],
            ["cmd_demon_whisper", "mgc02", "cmd_starfall", "atk_weakened", "cmd_up45", "misc_mana_charge"],
            ["cmd_starfall", "mgc02", "atk_weakened", "atk_prank", "cmd_demon_whisper", "cmd_demon_whisper"]
        ],
        image: "images/void_duchess.svg"
    },
    {
        id: "char_terra_dragon",
        name: "地脈竜",
        species: "dragon",
        hp: 225, atk: 28, int: 20, spd: 8,
        commands: [
            ["atk01", "cmd_shield", "cmd_up12", "atk02", "cmd_up12", "misc_guard"],
            ["atk02", "cmd_barrier", "cmd_up23", "atk_guard_break", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "cmd_earthquake", "cmd_team_barrier", "cmd_drake_surge", "cmd_up34", "cmd_up34"],
            ["cmd_up45", "cmd_earthquake", "cmd_ancient_roar", "cmd_barrier", "cmd_wing_ascent", "cmd_cover"],
            ["atk05", "cmd_earthquake", "cmd_team_barrier", "atk_guard_break", "cmd_cover", "cmd_down12"]
        ],
        image: "images/terra_dragon.svg"
    },
    {
        id: "char_prism_slime",
        name: "プリズムスライム",
        species: "slime",
        hp: 165, atk: 18, int: 26, spd: 19,
        commands: [
            ["heal01", "cmd_shield", "cmd_up12", "cmd_mucus_mend", "cmd_up12", "misc_support_reel_up"],
            ["heal02", "cmd_team_barrier", "cmd_up23", "atk_weaken", "cmd_up23", "cmd_jelly_rebound"],
            ["cmd_up34", "cmd_healing_rain", "cmd_team_barrier", "cmd_split_foam", "cmd_up34", "misc03"],
            ["cmd_up45", "cmd_starfall", "cmd_mucus_mend", "cmd_team_barrier", "cmd_up45", "heal_cure"],
            ["cmd_healing_rain", "cmd_starfall", "cmd_shield", "cmd_split_foam", "misc_support_reel_up", "cmd_down12"]
        ],
        image: "images/prism_slime.svg"
    },
    {
        id: "char_mother_gel",
        name: "マザージェル",
        species: "slime",
        typeHint: "support",
        hp: 330, atk: 15, int: 31, spd: 12,
        slotCost: 1,
        isSpecialOnly: true,
        commands: [
            ["cmd_gel_chorus", "cmd_jelly_cushion", "cmd_up12", "heal01", "cmd_shield", "cmd_up12"],
            ["cmd_mucus_mend", "cmd_gel_chorus", "cmd_team_barrier", "cmd_up23", "cmd_up23", "cmd_jelly_cushion"],
            ["cmd_up34", "cmd_healing_rain", "cmd_split_foam", "atk_weaken", "cmd_up34", "cmd_team_barrier"],
            ["cmd_up45", "cmd_gel_chorus", "cmd_healing_rain", "cmd_jelly_cushion", "cmd_up45", "heal_cure"],
            ["cmd_healing_rain", "cmd_gel_chorus", "cmd_split_foam", "cmd_team_barrier", "cmd_jelly_cushion", "cmd_down12"]
        ],
        image: "images/mother_gel.svg"
    },
    {
        id: "char_silver_mantis",
        name: "白銀マンティス",
        species: "beast",
        typeHint: "allrounder",
        hp: 205, atk: 30, int: 10, spd: 30,
        commands: [
            ["cmd_pack_mark", "cmd_feral_dash", "cmd_up12", "misc_quickstep", "cmd_leaping_watch", "cmd_up12"],
            ["cmd_predator_pounce", "cmd_pack_mark", "cmd_up23", "misc_quickstep", "cmd_up23", "atk_guard_break"],
            ["cmd_up34", "cmd_counter_howl", "cmd_leaping_watch", "cmd_pack_mark", "cmd_up34", "misc_quickstep"],
            ["cmd_up45", "cmd_predator_pounce", "cmd_sweep", "cmd_pack_mark", "cmd_up45", "cmd_counter_howl"],
            ["atk05", "cmd_predator_pounce", "cmd_pack_mark", "cmd_leaping_watch", "cmd_sweep", "cmd_down12"]
        ],
        image: "images/silver_mantis.svg"
    },
    {
        id: "char_poison_alraune",
        name: "毒花アルラウネ",
        species: "nature",
        typeHint: "disrupt",
        statProfile: { scoreMultiplier: 0.82 },
        hp: 175, atk: 10, int: 32, spd: 17,
        commands: [
            ["mgc01", "atk_weaken", "cmd_up12", "cmd_verdant_pulse", "mgc01", "cmd_up12"],
            ["mgc02", "mgc01", "cmd_up23", "atk_weakened", "cmd_up23", "heal01"],
            ["cmd_up34", "mgc02", "cmd_root_guard", "atk_weakened", "cmd_up34", "cmd_team_barrier"],
            ["cmd_up45", "mgc02", "mgc02", "heal02", "cmd_up45", "atk_weakened"],
            ["mgc02", "mgc02", "cmd_root_guard", "heal02", "atk_weakened", "cmd_down12"]
        ],
        image: "images/poison_alraune.svg"
    },
    {
        id: "char_soulstitch_nun",
        name: "魂縫いの修道女",
        species: "undead",
        typeHint: "support",
        hp: 180, atk: 10, int: 33, spd: 16,
        commands: [
            ["cmd_grave_echo", "heal01", "cmd_up12", "cmd_bone_offering", "heal_cure", "cmd_up12"],
            ["heal02", "cmd_grave_echo", "cmd_up23", "atk_weaken", "cmd_up23", "cmd_soul_siphon"],
            ["cmd_up34", "cmd_healing_rain", "cmd_bone_offering", "atk_weakened", "cmd_up34", "heal_cure"],
            ["cmd_up45", "cmd_grave_echo", "cmd_last_grasp", "cmd_healing_rain", "cmd_up45", "cmd_soul_siphon"],
            ["cmd_healing_rain", "cmd_grave_echo", "cmd_bone_offering", "cmd_last_grasp", "heal_cure", "cmd_down12"]
        ],
        image: "images/soulstitch_nun.svg"
    },
    {
        id: "char_mist_dragon",
        name: "霧竜",
        species: "dragon",
        typeHint: "disrupt",
        hp: 190, atk: 18, int: 30, spd: 18,
        commands: [
            ["cmd_skyline_roar", "mgc01", "cmd_up12", "cmd_scale_charge", "atk_weaken", "cmd_up12"],
            ["mgc02", "cmd_skyline_roar", "cmd_up23", "cmd_scale_charge", "cmd_up23", "atk_weaken"],
            ["cmd_up34", "cmd_skyline_roar", "cmd_drake_surge", "atk_weakened", "cmd_up34", "cmd_team_barrier"],
            ["cmd_up45", "cmd_starfall", "cmd_skyline_roar", "cmd_scale_charge", "cmd_up45", "cmd_ancient_roar"],
            ["cmd_starfall", "cmd_skyline_roar", "cmd_scale_charge", "atk_weakened", "cmd_ancient_roar", "cmd_down12"]
        ],
        image: "images/mist_dragon.svg"
    },
    {
        id: "char_crystal_computer",
        name: "水晶演算機",
        species: "construct",
        typeHint: "allrounder",
        hp: 220, atk: 17, int: 30, spd: 10,
        commands: [
            ["cmd_patch_frame", "mgc01", "cmd_up12", "cmd_shield", "cmd_scrap_driver", "cmd_up12"],
            ["cmd_team_barrier", "cmd_patch_frame", "cmd_up23", "atk_weaken", "cmd_up23", "cmd_piston_bulwark"],
            ["cmd_up34", "cmd_scrap_driver", "cmd_team_barrier", "atk_weakened", "cmd_up34", "cmd_barrier"],
            ["cmd_up45", "cmd_patch_frame", "cmd_core_knuckle", "cmd_starfall", "cmd_up45", "cmd_team_barrier"],
            ["cmd_scrap_driver", "cmd_patch_frame", "cmd_core_knuckle", "cmd_team_barrier", "cmd_starfall", "cmd_down12"]
        ],
        image: "images/crystal_computer.svg"
    }
];
