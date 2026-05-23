// data/characters/grade6.js

export const grade6Characters = [
    {
        id: "char_ancient_golem",
        name: "古代ゴーレム",
        species: "construct",
        hp: 600, maxHp: 600, atk: 34, int: 12, spd: 6,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["atk01", "misc_guard", "cmd_up12", "atk02", "cmd_up12", "misc_guard"],
            ["atk02", "cmd_cover", "atk_guard_break", "cmd_up23", "cmd_up23", "atk02"],
            ["atk03", "cmd_cover", "atk_guard_break", "cmd_earthquake", "cmd_up34", "cmd_up34"],
            ["atk03", "atk05", "cmd_earthquake", "cmd_cover", "cmd_up45", "atk03"],
            ["atk05", "cmd_earthquake", "cmd_cover", "atk_guard_break", "cmd_up56", "atk03"],
            ["atk05", "cmd_earthquake", "atk05", "cmd_cover", "atk_guard_break", "cmd_earthquake"]
        ],
        image: "images/ancient_golem.svg"
    },
    {
        id: "char_celestial_dragon",
        name: "星天竜",
        species: "dragon",
        hp: 600, maxHp: 600, atk: 30, int: 34, spd: 18,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["atk01", "mgc01", "misc03", "atk_fire", "cmd_up12", "mgc01"],
            ["mgc01", "atk_fire", "heal01", "atk_weaken", "cmd_up23", "misc03"],
            ["mgc02", "atk_fire", "cmd_starfall", "heal02", "cmd_up34", "misc03"],
            ["mgc02", "cmd_healing_rain", "cmd_starfall", "atk_weakened", "cmd_up45", "misc03"],
            ["mgc02", "cmd_starfall", "heal02", "atk_fire", "cmd_up56", "misc03"],
            ["mgc02", "cmd_starfall", "cmd_healing_rain", "atk_fire", "atk_weakened", "cmd_starfall"]
        ],
        image: "images/celestial_dragon.svg"
    }
];
