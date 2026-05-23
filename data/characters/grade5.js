// data/characters/grade5.js

export const grade5Characters = [
    {
        id: "char_arc_dragon",
        name: "アークドラゴン",
        species: "dragon",
        hp: 420, maxHp: 420, atk: 30, int: 24, spd: 14,
        slotCost: 2,
        isSpecialOnly: true,
        commands: [
            ["atk01", "atk02", "misc03", "atk_fire", "cmd_up12", "atk02"],
            ["atk02", "atk_fire", "atk_guard_break", "misc03", "cmd_up23", "atk03"],
            ["atk03", "cmd_sweep", "atk_fire", "atk_guard_break", "cmd_up34", "misc03"],
            ["atk_fire", "cmd_sweep", "atk03", "cmd_earthquake", "cmd_up45", "misc03"],
            ["atk05", "cmd_sweep", "atk_fire", "cmd_earthquake", "atk_guard_break", "misc03"]
        ],
        image: "images/arc_dragon.svg"
    },
    {
        id: "char_angel_knight",
        name: "天翼騎士",
        species: "human",
        hp: 180, maxHp: 180, atk: 24, int: 26, spd: 20,
        commands: [
            ["atk01", "heal01", "misc03", "atk02", "cmd_up12", "misc_guard"],
            ["atk02", "heal01", "atk_guard_break", "heal_cure", "cmd_up23", "misc03"],
            ["atk03", "heal02", "atk_guard_break", "cmd_cover", "cmd_up34", "heal01"],
            ["atk03", "heal02", "cmd_healing_rain", "cmd_starfall", "cmd_up45", "misc03"],
            ["atk05", "cmd_healing_rain", "heal02", "cmd_starfall", "cmd_cover", "heal_cure"]
        ],
        image: "images/angel_knight.svg"
    },
    {
        id: "char_chimera",
        name: "キメラ",
        species: "beast",
        hp: 390, maxHp: 390, atk: 27, int: 21, spd: 22,
        slotCost: 2,
        isSpecialOnly: true,
        commands: [
            ["atk01", "atk_paralyze", "misc03", "atk_fire", "cmd_up12", "misc_wingbeat"],
            ["atk02", "atk_paralyze", "atk_fire", "atk_prank", "cmd_up23", "misc03"],
            ["atk03", "atk_fire", "atk_weaken", "cmd_sweep", "cmd_up34", "misc_wingbeat"],
            ["atk_fire", "atk_paralyze", "atk_guard_break", "cmd_sweep", "cmd_up45", "cmd_starfall"],
            ["atk05", "cmd_starfall", "cmd_sweep", "atk_prank", "atk_paralyze", "misc03"]
        ],
        image: "images/chimera.svg"
    },
    {
        id: "char_abyss_kraken",
        name: "深淵クラーケン",
        species: "aquatic",
        hp: 220, maxHp: 220, atk: 25, int: 23, spd: 10,
        commands: [
            ["atk01", "atk_sumihaki", "misc03", "atk02", "cmd_up12", "atk_sumihaki"],
            ["atk02", "atk_sumihaki", "atk_weaken", "cmd_sweep", "cmd_up23", "misc03"],
            ["atk03", "cmd_sweep", "atk_weakened", "atk_sumihaki", "cmd_up34", "misc_guard"],
            ["atk05", "cmd_sweep", "atk_weakened", "cmd_starfall", "cmd_up45", "misc03"],
            ["atk05", "cmd_sweep", "cmd_starfall", "atk_weakened", "misc_guard", "atk_sumihaki"]
        ],
        image: "images/abyss_kraken.svg"
    },
    {
        id: "char_lich_lord",
        name: "リッチロード",
        species: "undead",
        hp: 165, maxHp: 165, atk: 10, int: 32, spd: 15,
        commands: [
            ["atk01", "mgc01", "misc03", "atk_weaken", "cmd_up12", "misc_mana_charge"],
            ["mgc01", "atk_prank", "atk_weaken", "mgc02", "cmd_up23", "misc03"],
            ["mgc02", "atk_weakened", "misc_mana_charge", "atk_prank", "cmd_up34", "misc03"],
            ["mgc02", "cmd_starfall", "atk_weakened", "misc_mana_charge", "cmd_up45", "heal_cure"],
            ["mgc02", "cmd_starfall", "atk_weakened", "atk_prank", "misc_mana_charge", "mgc02"]
        ],
        image: "images/lich_lord.svg"
    },
    {
        id: "char_slime_emperor",
        name: "スライムエンペラー",
        species: "slime",
        rarity: 6,
        hp: 460, maxHp: 460, atk: 24, int: 24, spd: 12,
        slotCost: 3,
        isSpecialOnly: true,
        commands: [
            ["atk01", "heal01", "misc_support_reel_up", "atk02", "cmd_up12", "misc03"],
            ["atk02", "heal01", "atk04", "misc_support_reel_up", "cmd_up23", "misc03"],
            ["atk03", "heal02", "atk_weakened", "cmd_sweep", "cmd_up34", "misc_support_reel_up2"],
            ["atk05", "heal02", "cmd_starfall", "atk_guard_break", "cmd_up45", "heal_cure"],
            ["atk05", "cmd_starfall", "heal02", "atk_weakened", "cmd_up56", "cmd_sweep"],
            ["atk05", "cmd_starfall", "heal02", "atk_weakened", "cmd_sweep", "misc_support_reel_up2"]
        ],
        image: "images/slime_emperor.svg"
    }
];
