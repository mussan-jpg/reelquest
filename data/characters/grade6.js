// data/characters/grade6.js

export const grade6Characters = [
    {
        id: "char_ancient_golem",
        name: "古代ゴーレム",
        species: "construct",
        hp: 643, atk: 35, int: 12, spd: 6,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["atk01", "cmd_barrier", "cmd_up12", "atk02", "cmd_up12", "cmd_barrier"],
            ["atk02", "cmd_team_barrier", "atk_guard_break", "cmd_up23", "cmd_up23", "atk02"],
            ["atk03", "cmd_barrier", "atk_guard_break", "cmd_earthquake", "cmd_up34", "cmd_up34"],
            ["atk03", "atk05", "cmd_earthquake", "cmd_team_barrier", "cmd_up45", "cmd_up45"],
            ["atk05", "cmd_earthquake", "cmd_barrier", "cmd_anchor_guard", "cmd_up56", "cmd_up56"],
            ["atk05", "cmd_earthquake", "atk05", "cmd_team_barrier", "cmd_core_knuckle", "cmd_earthquake"]
        ],
        image: "images/ancient_golem.svg"
    },
    {
        id: "char_celestial_dragon",
        name: "星天竜",
        species: "dragon",
        hp: 548, atk: 26, int: 30, spd: 16,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["cmd_up12", "mgc01", "cmd_up12", "atk_fire", "cmd_up12", "mgc01"],
            ["mgc01", "atk_fire", "cmd_up23", "atk_weaken", "cmd_up23", "cmd_up23"],
            ["cmd_up34", "atk_fire", "cmd_starfall", "heal02", "cmd_drake_surge", "cmd_up34"],
            ["cmd_up45", "cmd_healing_rain", "cmd_starfall", "atk_weakened", "cmd_wing_ascent", "cmd_up45"],
            ["cmd_up56", "cmd_starfall", "heal02", "cmd_ancient_roar", "cmd_up56", "cmd_up56"],
            ["mgc02", "cmd_starfall", "cmd_healing_rain", "cmd_ancient_roar", "atk_weakened", "cmd_starfall"]
        ],
        image: "images/celestial_dragon.svg"
    },
    {
        id: "char_hero_king",
        name: "王国の英雄王",
        species: "human",
        typeHint: "allrounder",
        hp: 540, atk: 30, int: 24, spd: 20,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["cmd_rally_banner", "atk02", "cmd_up12", "heal01", "cmd_tactical_feint", "cmd_up12"],
            ["atk02", "cmd_coordinated_slash", "cmd_rally_banner", "heal02", "cmd_up23", "cmd_up23"],
            ["atk03", "cmd_suppressive_shot", "cmd_tactical_feint", "heal02", "cmd_up34", "cmd_up34"],
            ["cmd_up45", "atk05", "cmd_rally_banner", "cmd_first_aid_strike", "cmd_up45", "cmd_coordinated_slash"],
            ["cmd_up56", "atk05", "cmd_healing_rain", "cmd_tactical_feint", "cmd_rally_banner", "cmd_up56"],
            ["atk05", "cmd_coordinated_slash", "cmd_rally_banner", "cmd_healing_rain", "cmd_tactical_feint", "cmd_down12"]
        ],
        image: "images/hero_king.svg"
    },
    {
        id: "char_leogald_beast_king",
        name: "百獣王レオガルド",
        species: "beast",
        typeHint: "attack",
        hp: 520, atk: 34, int: 12, spd: 28,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["cmd_pack_mark", "cmd_feral_dash", "cmd_up12", "atk02", "cmd_leaping_watch", "cmd_up12"],
            ["cmd_predator_pounce", "cmd_pack_mark", "cmd_up23", "misc_quickstep", "cmd_up23", "atk02"],
            ["atk03", "cmd_feral_dash", "cmd_pack_mark", "cmd_sweep", "cmd_up34", "cmd_up34"],
            ["cmd_up45", "cmd_predator_pounce", "cmd_leaping_watch", "atk_guard_break", "cmd_up45", "atk03"],
            ["cmd_up56", "atk05", "cmd_sweep", "cmd_pack_mark", "cmd_counter_howl", "cmd_up56"],
            ["atk05", "cmd_predator_pounce", "cmd_sweep", "cmd_pack_mark", "cmd_leaping_watch", "cmd_down12"]
        ],
        image: "images/leogald_beast_king.svg"
    },
    {
        id: "char_worldgrove_miko",
        name: "森羅の巫女",
        species: "nature",
        typeHint: "support",
        hp: 500, atk: 14, int: 36, spd: 18,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["heal01", "cmd_verdant_pulse", "cmd_up12", "cmd_shield", "cmd_spore_lance", "cmd_up12"],
            ["heal02", "cmd_verdant_pulse", "cmd_team_barrier", "cmd_up23", "cmd_up23", "cmd_cleansing_thorn"],
            ["cmd_up34", "cmd_healing_rain", "cmd_spore_lance", "cmd_root_guard", "cmd_up34", "heal_cure"],
            ["cmd_up45", "cmd_verdant_pulse", "cmd_healing_rain", "cmd_lifebloom_bolt", "cmd_up45", "cmd_team_barrier"],
            ["cmd_up56", "cmd_healing_rain", "cmd_spore_lance", "cmd_root_guard", "cmd_verdant_pulse", "cmd_up56"],
            ["cmd_healing_rain", "cmd_verdant_pulse", "cmd_lifebloom_bolt", "cmd_team_barrier", "cmd_spore_lance", "cmd_down12"]
        ],
        image: "images/worldgrove_miko.svg"
    },
    {
        id: "char_ocean_emperor_leviathan",
        name: "海皇リヴァイアサン",
        species: "aquatic",
        typeHint: "allrounder",
        hp: 560, atk: 25, int: 30, spd: 16,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["cmd_tidal_screen", "atk_sumihaki", "cmd_up12", "cmd_shield", "cmd_brine_net", "cmd_up12"],
            ["atk02", "cmd_brine_net", "cmd_team_barrier", "cmd_up23", "cmd_up23", "atk_sumihaki"],
            ["cmd_up34", "cmd_tidal_screen", "atk_weakened", "cmd_sweep", "cmd_up34", "cmd_team_barrier"],
            ["cmd_up45", "cmd_starfall", "cmd_brine_net", "cmd_team_barrier", "cmd_up45", "heal02"],
            ["cmd_up56", "cmd_tidal_screen", "cmd_healing_rain", "atk_weakened", "cmd_sweep", "cmd_up56"],
            ["cmd_starfall", "cmd_tidal_screen", "cmd_brine_net", "cmd_team_barrier", "cmd_healing_rain", "cmd_down12"]
        ],
        image: "images/ocean_emperor_leviathan.svg"
    },
    {
        id: "char_nocturne_overlord",
        name: "冥王ノクターン",
        species: "undead",
        typeHint: "disrupt",
        hp: 510, atk: 18, int: 34, spd: 18,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["cmd_bone_offering", "atk_weaken", "cmd_up12", "cmd_grave_echo", "misc03", "cmd_up12"],
            ["cmd_grave_echo", "cmd_soul_siphon", "cmd_up23", "atk_weakened", "cmd_up23", "misc03"],
            ["cmd_up34", "cmd_bone_offering", "cmd_last_grasp", "atk_weakened", "cmd_up34", "heal_cure"],
            ["cmd_up45", "cmd_starfall", "cmd_grave_echo", "cmd_last_grasp", "cmd_up45", "cmd_soul_siphon"],
            ["cmd_up56", "cmd_bone_offering", "cmd_starfall", "atk_weakened", "cmd_grave_echo", "cmd_up56"],
            ["cmd_starfall", "cmd_last_grasp", "cmd_bone_offering", "cmd_grave_echo", "atk_weakened", "cmd_down12"]
        ],
        image: "images/nocturne_overlord.svg"
    },
    {
        id: "char_endbringer_fiend",
        name: "終焉の魔神",
        species: "demon",
        typeHint: "attack",
        hp: 500, atk: 24, int: 36, spd: 18,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["cmd_doom_spark", "misc03", "cmd_up12", "atk_prank", "cmd_infernal_gamble", "cmd_up12"],
            ["mgc02", "cmd_doom_spark", "cmd_up23", "misc03", "cmd_up23", "atk_weaken"],
            ["cmd_up34", "cmd_infernal_gamble", "atk_weakened", "cmd_starfall", "cmd_up34", "misc03"],
            ["cmd_up45", "cmd_doom_spark", "cmd_starfall", "mgc02", "cmd_up45", "misc03"],
            ["cmd_up56", "cmd_infernal_gamble", "cmd_starfall", "atk_weakened", "cmd_doom_spark", "cmd_up56"],
            ["cmd_starfall", "cmd_infernal_gamble", "cmd_doom_spark", "mgc02", "atk_weakened", "cmd_down12"]
        ],
        image: "images/endbringer_fiend.svg"
    }
];
