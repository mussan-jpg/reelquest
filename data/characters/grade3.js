// data/characters/grade3.js

export const grade3Characters = [
    {
        id: "char_metal_slime",
        name: "メタルスライム",
        species: "slime",
        hp: 70, atk: 15, int: 15, spd: 27,
        commands: [
            ["cmd_up12", "misc_quickstep", "cmd_jelly_rebound", "cmd_shield", "cmd_up12", "cmd_up12"],
            ["atk02", "misc_quickstep", "cmd_up23", "cmd_split_foam", "cmd_up23", "cmd_up23"],
            ["atk_guard_break", "cmd_jelly_rebound", "misc_quickstep", "atk03", "cmd_split_foam", "cmd_down12"]
        ],
        image: "images/metal_slime.svg"
    },
    {
        id: "char_young_wyvern",
        name: "若ワイバーン",
        species: "dragon",
        hp: 105, atk: 18, int: 12, spd: 20,
        commands: [
            ["cmd_up12", "misc_wingbeat", "atk_hinoko", "cmd_up12", "atk02", "cmd_up12"],
            ["cmd_up23", "misc_wingbeat", "cmd_wing_ascent", "atk_paralyze", "cmd_up23", "cmd_up23"],
            ["atk03", "atk_fire", "misc_wingbeat", "atk_paralyze", "cmd_drake_surge", "atk_fire"]
        ],
        image: "images/young_wyvern.svg"
    },
    // ⚡ 【既存敵】サンダーバード
    {
        id: "char_thunderbird",
        name: "サンダーバード",
        species: "beast",
        statProfile: { scoreMultiplier: 1.04 },
        hp: 90, atk: 15, int: 14, spd: 24,
        commands: [
            ["cmd_up12", "cmd_up12", "cmd_feral_dash", "atk_paralyze", "misc_wingbeat", "cmd_up12"],
            ["cmd_up23", "cmd_up23", "misc_wingbeat", "cmd_predator_pounce", "atk_paralyze", "cmd_up23"],
            ["cmd_predator_pounce", "atk_paralyze", "cmd_counter_howl", "misc_wingbeat", "atk03", "atk_paralyze"]
        ],
        image: "images/thunderbird.svg"
    },
    // 🔫 【既存職】ガンマン
    {
        id: "char_gunman",
        name: "ガンマン",
        species: "human",
        statProfile: { scoreMultiplier: 0.95 },
        hp: 105, atk: 24, int: 8, spd: 18,
        commands: [
            ["atk01", "atk01", "cmd_up12", "atk02", "cmd_up12", "cmd_up12"],
            ["cmd_up23", "atk02", "atk03", "atk02", "cmd_up23", "cmd_up23"],
            ["cmd_suppressive_shot", "atk03", "atk02", "atk02", "cmd_suppressive_shot", "cmd_down12"]
        ],
        image: "images/gunman.svg"
    },
    // 🛡️ 【既存職】聖騎士
    {
        id: "char_seikishi",
        name: "聖騎士",
        species: "human",
        hp: 125, atk: 18, int: 15, spd: 13,
        commands: [
            ["cmd_up12", "cmd_cover", "misc_guard", "heal01", "atk01", "cmd_up12"],
            ["cmd_cover", "atk03", "cmd_up23", "heal_cure", "cmd_cover", "cmd_up23"],
            ["cmd_coordinated_slash", "atk03", "heal02", "heal_cure", "cmd_cover", "cmd_down12"]
        ],
        image: "images/seikishi.svg"
    },
    {
        id: "char_treant",
        name: "トレント",
        species: "nature",
        hp: 155, atk: 16, int: 18, spd: 6,
        commands: [
            ["atk01", "misc_guard", "heal01", "atk_weaken", "misc03", "cmd_up12"],
            ["misc_guard", "atk_guard_break", "heal01", "atk_weakened", "cmd_up23", "misc03"],
            ["cmd_cover", "cmd_root_guard", "heal02", "atk_weakened", "misc_guard", "heal01"]
        ],
        image: "images/treant.svg"
    },
    // 🧙‍♂️ 大魔導士（魔導士：高い魔力を誇り、最終リールにロマン技「大爆発」を秘める）
    {
        id: "char_grand_mage",
        name: "大魔導士",
        species: "human",
        hp: 105, atk: 7, int: 29, spd: 14,
        commands: [
            ["atk01", "mgc01", "cmd_up12", "mgc01", "misc03", "cmd_up12"],
            ["mgc01", "mgc01", "atk_weaken", "mgc02", "cmd_up23", "cmd_up23"],
            ["mgc01", "mgc01", "cmd_explosion", "mgc02", "atk_weaken", "misc_fighting_spirit"]
        ],
        image: "images/grand_mage.svg"
    },
    {
        id: "char_storm_drake",
        name: "嵐ドレイク",
        species: "dragon",
        hp: 110, atk: 15, int: 17, spd: 17,
        commands: [
            ["cmd_up12", "atk_hinoko", "cmd_up12", "cmd_shield", "cmd_up12", "misc_wingbeat"],
            ["cmd_up23", "atk_fire", "misc_wingbeat", "cmd_wing_ascent", "cmd_up23", "cmd_up23"],
            ["atk_fire", "cmd_sweep", "atk_paralyze", "cmd_team_barrier", "cmd_drake_surge", "cmd_down12"]
        ],
        image: "images/storm_drake.svg"
    },
    {
        id: "char_bone_knight",
        name: "ボーンナイト",
        species: "undead",
        hp: 130, atk: 22, int: 8, spd: 15,
        commands: [
            ["atk01", "misc_guard", "cmd_up12", "atk02", "cmd_up12", "cmd_shield"],
            ["atk02", "cmd_cover", "atk_guard_break", "atk_paralyze", "cmd_up23", "cmd_up23"],
            ["atk03", "cmd_cover", "atk_guard_break", "cmd_barrier", "cmd_last_grasp", "cmd_down12"]
        ],
        image: "images/bone_knight.svg"
    },
    {
        id: "char_grave_mage",
        name: "墓守メイジ",
        species: "undead",
        statProfile: { scoreMultiplier: 0.94 },
        hp: 105, atk: 16, int: 20, spd: 14,
        commands: [
            ["mgc01", "atk_weaken", "cmd_up12", "cmd_shield", "cmd_up12", "cmd_grave_pact"],
            ["mgc01", "atk_weakened", "atk_prank", "mgc02", "cmd_up23", "cmd_up23"],
            ["mgc02", "cmd_starfall", "atk_weakened", "cmd_team_barrier", "cmd_last_grasp", "cmd_down12"]
        ],
        image: "images/grave_mage.svg"
    },
    {
        id: "char_barrier_bot",
        name: "バリアボット",
        species: "construct",
        hp: 125, atk: 17, int: 17, spd: 12,
        commands: [
            ["atk01", "cmd_shield", "cmd_up12", "cmd_barrier", "cmd_up12", "cmd_core_knuckle"],
            ["cmd_shield", "cmd_team_barrier", "atk02", "atk_guard_break", "cmd_up23", "cmd_up23"],
            ["cmd_team_barrier", "cmd_core_knuckle", "cmd_barrier", "cmd_core_knuckle", "cmd_shield", "cmd_down12"]
        ],
        image: "images/barrier_bot.svg"
    },
    {
        id: "char_steam_guardian",
        name: "蒸気ガーディアン",
        species: "construct",
        statProfile: { scoreMultiplier: 1.07 },
        hp: 155, atk: 19, int: 13, spd: 8,
        commands: [
            ["atk01", "misc_guard", "cmd_shield", "misc03", "cmd_up12", "atk02"],
            ["atk02", "cmd_cover", "cmd_barrier", "atk_guard_break", "cmd_up23", "misc03"],
            ["cmd_cover", "cmd_team_barrier", "cmd_anchor_guard", "cmd_barrier", "atk_guard_break", "cmd_down12"]
        ],
        image: "images/steam_guardian.svg"
    },
    {
        id: "char_mirror_slime",
        name: "ミラースライム",
        species: "slime",
        hp: 85, atk: 17, int: 20, spd: 17,
        commands: [
            ["mgc01", "cmd_shield", "cmd_up12", "cmd_mucus_mend", "cmd_up12", "atk_prank"],
            ["mgc01", "cmd_team_barrier", "cmd_split_foam", "atk_weaken", "cmd_up23", "cmd_up23"],
            ["cmd_team_barrier", "mgc02", "cmd_mucus_mend", "atk_weakened", "cmd_jelly_rebound", "cmd_down12"]
        ],
        image: "images/mirror_slime.svg"
    },
    {
        id: "char_hex_warlock",
        name: "呪紋ウォーロック",
        species: "demon",
        hp: 100, atk: 9, int: 28, spd: 14,
        commands: [
            ["mgc01", "misc03", "cmd_up12", "misc_mana_charge", "cmd_up12", "atk_prank"],
            ["mgc02", "misc03", "atk_weakened", "atk_prank", "cmd_up23", "cmd_up23"],
            ["mgc02", "cmd_starfall", "atk_weakened", "misc_mana_charge", "atk_prank", "cmd_down12"]
        ],
        image: "images/hex_warlock.svg"
    },
    {
        id: "char_oni_brawler",
        name: "鬼の拳士",
        species: "demon",
        hp: 115, atk: 23, int: 8, spd: 17,
        commands: [
            ["cmd_up12", "misc_focus", "cmd_up12", "atk02", "cmd_up12", "cmd_shield"],
            ["atk02", "atk02", "atk03", "atk_guard_break", "cmd_up23", "cmd_up23"],
            ["atk03", "atk03", "misc_focus", "cmd_barrier", "atk_guard_break", "cmd_down12"]
        ],
        image: "images/oni_brawler.svg"
    },
    {
        id: "char_moss_guardian",
        name: "苔の守り手",
        species: "nature",
        hp: 140, atk: 18, int: 16, spd: 9,
        commands: [
            ["heal01", "misc_guard", "cmd_shield", "misc03", "cmd_up12", "atk_weaken"],
            ["heal01", "cmd_cover", "cmd_team_barrier", "atk_weaken", "cmd_up23", "misc03"],
            ["cmd_cover", "heal02", "cmd_team_barrier", "atk_weakened", "cmd_lifebloom_bolt", "cmd_down12"]
        ],
        image: "images/moss_guardian.svg"
    },
    {
        id: "char_coral_priest",
        name: "珊瑚プリースト",
        species: "aquatic",
        hp: 100, atk: 15, int: 21, spd: 15,
        commands: [
            ["heal01", "cmd_shield", "cmd_up12", "mgc01", "cmd_up12", "heal_cure"],
            ["heal01", "heal02", "cmd_team_barrier", "atk_sumihaki", "cmd_up23", "cmd_up23"],
            ["cmd_healing_rain", "heal02", "cmd_team_barrier", "heal_cure", "mgc02", "cmd_down12"]
        ],
        image: "images/coral_priest.svg"
    },
    {
        id: "char_tide_hunter",
        name: "潮流ハンター",
        species: "aquatic",
        hp: 105, atk: 19, int: 11, spd: 20,
        commands: [
            ["cmd_up12", "atk_sumihaki", "cmd_up12", "misc_quickstep", "cmd_up12", "atk02"],
            ["cmd_up23", "atk_sumihaki", "atk_guard_break", "misc_quickstep", "cmd_up23", "cmd_up23"],
            ["atk03", "cmd_sweep", "atk_sumihaki", "cmd_shield", "atk_guard_break", "cmd_down12"]
        ],
        image: "images/tide_hunter.svg"
    },
    {
        id: "char_honey_bear",
        name: "ハニーベア",
        species: "beast",
        hp: 135, atk: 20, int: 12, spd: 12,
        commands: [
            ["atk01", "misc_guard", "heal01", "cmd_up12", "cmd_up12", "cmd_hamstring_claw"],
            ["atk02", "cmd_cover", "heal01", "misc_focus", "cmd_up23", "cmd_up23"],
            ["cmd_predator_pounce", "cmd_barrier", "heal02", "cmd_cover", "atk_taiatari", "cmd_down12"]
        ],
        image: "images/honey_bear.svg"
    },
    {
        id: "char_frost_drake",
        name: "霜ドレイク",
        species: "dragon",
        hp: 120, atk: 15, int: 19, spd: 13,
        commands: [
            ["cmd_up12", "mgc01", "cmd_shield", "atk_weaken", "cmd_up12", "atk_hinoko"],
            ["cmd_up23", "mgc02", "cmd_team_barrier", "atk_weaken", "cmd_up23", "cmd_up23"],
            ["mgc02", "cmd_starfall", "cmd_team_barrier", "atk_weakened", "cmd_ancient_roar", "cmd_down12"]
        ],
        image: "images/frost_drake.svg"
    },
    {
        id: "char_thorn_archer",
        name: "茨の射手",
        species: "nature",
        hp: 95, atk: 18, int: 17, spd: 17,
        commands: [
            ["cmd_up12", "atk01", "atk_weaken", "cmd_up12", "atk02", "cmd_shield"],
            ["atk02", "atk_guard_break", "atk_weakened", "cmd_up23", "cmd_up23", "misc03"],
            ["atk03", "atk_weakened", "cmd_cleansing_thorn", "cmd_team_barrier", "atk_guard_break", "cmd_down12"]
        ],
        image: "images/thorn_archer.svg"
    },
    {
        id: "char_acid_slime",
        name: "アシッドスライム",
        species: "slime",
        hp: 85, atk: 18, int: 21, spd: 15,
        commands: [
            ["atk04", "atk_weaken", "cmd_up12", "cmd_jelly_rebound", "cmd_mucus_mend", "cmd_up12"],
            ["atk04", "atk_guard_break", "cmd_up23", "atk_weakened", "cmd_up23", "cmd_split_foam"],
            ["atk_guard_break", "atk_weakened", "mgc02", "cmd_team_barrier", "cmd_jelly_rebound", "cmd_down12"]
        ],
        image: "images/acid_slime.svg"
    },
    {
        id: "char_plague_doctor",
        name: "疫病医",
        species: "undead",
        hp: 95, atk: 12, int: 24, spd: 16,
        commands: [
            ["heal01", "atk04", "cmd_up12", "heal_cure", "atk_weaken", "cmd_up12"],
            ["heal02", "atk04", "atk_weakened", "cmd_up23", "cmd_up23", "heal_cure"],
            ["cmd_healing_rain", "atk_weakened", "cmd_soul_siphon", "heal_cure", "atk04", "cmd_down12"]
        ],
        image: "images/plague_doctor.svg"
    },
    {
        id: "char_blood_jester",
        name: "ブラッドジェスター",
        species: "demon",
        hp: 95, atk: 13, int: 21, spd: 18,
        commands: [
            ["cmd_up12", "atk_prank", "misc_quickstep", "atk_weaken", "cmd_up12", "atk01"],
            ["atk_prank", "atk_weakened", "cmd_up23", "misc_quickstep", "cmd_up23", "mgc01"],
            ["atk_prank", "cmd_starfall", "atk_weakened", "mgc02", "misc02", "cmd_down12"]
        ],
        image: "images/blood_jester.svg"
    },
    {
        id: "char_grand_shell_guard",
        name: "大シェルガード",
        species: "aquatic",
        typeHint: "guard",
        hp: 155, atk: 17, int: 15, spd: 9,
        commands: [
            ["misc_guard", "cmd_tidal_screen", "cmd_up12", "cmd_shield", "cmd_brine_net", "cmd_up12"],
            ["cmd_cover", "cmd_barrier", "cmd_brine_net", "cmd_up23", "cmd_up23", "atk_sumihaki"],
            ["cmd_tidal_screen", "cmd_team_barrier", "atk_weakened", "cmd_cover", "cmd_brine_net", "cmd_down12"]
        ],
        image: "images/grand_shell_guard.svg"
    },
    {
        id: "char_repair_drone",
        name: "リペアドローン",
        species: "construct",
        typeHint: "support",
        hp: 115, atk: 14, int: 19, spd: 12,
        commands: [
            ["cmd_patch_frame", "cmd_shield", "cmd_up12", "mgc01", "cmd_up12", "heal01"],
            ["cmd_patch_frame", "cmd_team_barrier", "cmd_piston_bulwark", "cmd_up23", "cmd_up23", "cmd_shield"],
            ["cmd_patch_frame", "cmd_scrap_driver", "cmd_team_barrier", "cmd_core_knuckle", "heal02", "cmd_down12"]
        ],
        image: "images/repair_drone.svg"
    }
];
