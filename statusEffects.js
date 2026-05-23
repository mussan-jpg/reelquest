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
        desc: "攻撃力が0.7倍になる（与ダメージが減少）"
    },
    "weakened": {
        name: "弱体",
        color: "#e67e22",
        desc: "被ダメージが増加する（受けるダメージが増加）"
    },
    "hidden": {
        name: "隠密",
        color: "#636e72",
        desc: "被ダメージが0.8倍になる"
    },
    "taunt": {
        name: "挑発",
        color: "#f39c12",
        desc: "単体攻撃の対象になり、被ダメージが0.6倍になる"
    },
    "paralysis": {
        name: "マヒ",
        color: "#f1c40f",
        desc: "行動不能になることがある（次の行動をスキップする）"
    }
};