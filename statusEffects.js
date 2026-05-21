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
        desc: "攻撃力が半分になる（与ダメージが減少）"
    },
    "weakened": {
        name: "弱体",
        color: "#e67e22",
        desc: "被ダメージが増加する（受けるダメージが増加）"
    },
    "paralysis": {
        name: "マヒ",
        color: "#f1c40f",
        desc: "行動不能になることがある（次の行動をスキップする）"
    },
    // 🌟 追加
    "cover": {
        name: "かばう",
        color: "#2ecc71" // 防御らしい緑、またはお好みの色で
    }
};