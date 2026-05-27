// statusEffects.js
export const statusEffects = {
    "poison": {
        name: "毒",
        color: "#9c88ff",
        desc: "行動時に継続ダメージを受ける（最大HP割合のダメージ）"
    },
    "weak": {
        name: "脱力",
        color: "#3498db",
        desc: "ATKが30%ずつ低下する（重ね掛け可・加算）"
    },
    "weakened": {
        name: "弱体",
        color: "#e67e22",
        desc: "受けるダメージが20%ずつ増加する（重ね掛け可・加算）"
    },
    "hidden": {
        name: "隠密",
        color: "#636e72",
        desc: "他に狙える味方がいる間、攻撃対象にならない"
    },
    "taunt": {
        name: "挑発",
        color: "#db2777",
        desc: "単体攻撃の対象になり、被ダメージが0.6倍になる"
    },
    "paralysis": {
        name: "マヒ",
        color: "#f1c40f",
        desc: "行動不能になることがある（次の行動をスキップする）"
    }
};