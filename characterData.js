// characterData.js
export const masterCharacters = [
    // =========================================================================
    // ⭐ グレード１（★1枠：リール1段階のみ / 計8体）
    // =========================================================================

    // 🟢 【既存敵】スライム
    {
        id: "char_slime",
        name: "スライム",
        hp: 70, maxHp: 70, atk: 14, int: 5, spd: 8,
        commands: [
            ["atk01", "misc_support_reel_up", "atk02", "misc03", "misc_support_reel_up2", "atk01"] // ミス1個
        ],
        image: "images/slime.svg"
    },
    // 🦟 【新規】ゴブリン
    {
        id: "char_goblin",
        name: "ゴブリン",
        hp: 85, maxHp: 85, atk: 16, int: 5, spd: 12,
        commands: [
            ["atk01", "atk03", "atk01", "atk04", "misc01", "misc03"] // ミス1個
        ],
        image: "images/goblin.svg"
    },
    // 🦇 【新規】コウモリ
    {
        id: "char_bat",
        name: "コウモリ",
        hp: 60, maxHp: 60, atk: 12, int: 6, spd: 18,
        commands: [
            ["atk01", "misc01", "atk01", "misc03", "atk01", "atk01"] // ミス2個から1個へ減少（1つをatk01に）
        ],
        image: "images/bat.svg"
    },
    // 🐝 【新規】大ハチ
    {
        id: "char_bee",
        name: "大ハチ",
        hp: 55, maxHp: 55, atk: 14, int: 4, spd: 20,
        commands: [
            ["atk01", "atk04", "misc03", "atk01", "atk04", "atk01"] // ミス2個から1個へ減少（1つをatk01に）
        ],
        image: "images/bee.svg"
    },
    // 🌱 【新規】マンドラゴラ
    {
        id: "char_mandrake",
        name: "マンドラゴラ",
        hp: 75, maxHp: 75, atk: 8, int: 15, spd: 6,
        commands: [
            ["atk01", "atk_weaken", "misc03", "mgc01", "mgc01", "atk01"] // ミス3個から1個へ減少（intが高いので魔法mgc01等に）
        ],
        image: "images/mandrake.svg"
    },
    // 🐚 【新規】ヤドカリ
    {
        id: "char_hermit_crab",
        name: "ヤドカリ",
        hp: 100, maxHp: 100, atk: 12, int: 5, spd: 5,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "atk02"] // ミス3個から1個へ減少（堅実にこうげき系を追加）
        ],
        image: "images/hermit_crab.svg"
    },
    // 🧸 【新規】呪いの人形
    {
        id: "char_puppet",
        name: "呪いの人形",
        hp: 80, maxHp: 80, atk: 13, int: 12, spd: 10,
        commands: [
            ["atk01", "atk_weaken", "misc03", "atk01", "atk_weaken", "atk01"] // ミス3個から1個へ減少（弱体化を付与しやすく）
        ],
        image: "images/puppet.svg"
    },
    // 🧟 【新規】ミイラ男
    {
        id: "char_mummy",
        name: "ミイラ男",
        hp: 110, maxHp: 110, atk: 18, int: 3, spd: 4,
        commands: [
            ["atk01", "atk01", "atk_paralyze", "misc03", "atk01", "atk02"] // ミス3個から1個へ減少（高いatkを活かせる構成に）
        ],
        image: "images/mummy.svg"
    },
    // 🔴 【新規】プチファイア
    {
        id: "char_petit_fire",
        name: "プチファイア",
        hp: 75, maxHp: 75, atk: 10, int: 16, spd: 10,
        commands: [
            ["atk01", "atk_hinoko", "atk_hinoko", "misc01", "atk_hinoko", "misc03"] // ミス1個
        ],
        image: "images/petit_fire.svg"
    },
    // 🔵 【新規】ちびタコ
    {
        id: "char_chibi_tako",
        name: "ちびタコ",
        hp: 80, maxHp: 80, atk: 13, int: 10, spd: 9,
        commands: [
            ["atk01", "atk_sumihaki", "atk01", "atk_sumihaki", "atk02", "misc03"] // ミス1個
        ],
        image: "images/chibi_tako.svg"
    },
    // 🐕 【新規】わんこ
    {
        id: "char_wanko",
        name: "わんこ",
        hp: 85, maxHp: 85, atk: 15, int: 6, spd: 14,
        commands: [
            ["atk01", "atk_kamitsuki", "atk01", "atk_kamitsuki", "atk02", "misc03"] // ミス1個
        ],
        image: "images/wanko.svg"
    },
    // 🐱 【新規】ちびネコ
    {
        id: "char_chibi_neko",
        name: "ちびネコ",
        hp: 65, maxHp: 65, atk: 14, int: 8, spd: 16,
        commands: [
            ["atk01", "atk_hikaki", "atk_hikaki", "atk01", "atk02", "misc03"] // ミス1個
        ],
        image: "images/chibi_neko.svg"
    },
    // 🐻 【新規】ちびグマ
    {
        id: "char_chibi_guma",
        name: "ちびグマ",
        hp: 95, maxHp: 95, atk: 17, int: 5, spd: 8,
        commands: [
            ["atk01", "atk_taiatari", "atk01", "atk_taiatari", "atk02", "misc03"] // ミス1個
        ],
        image: "images/chibi_guma.svg"
    },

    // =========================================================================
    // ⭐ グレード２（★2枠：最大2段階 / 計8体）
    // =========================================================================

    // 💀 【既存敵】ガイコツ
    {
        id: "char_skeleton",
        name: "ガイコツ",
        hp: 110, maxHp: 110, atk: 20, int: 4, spd: 14,
        commands: [
            ["atk01", "atk02", "misc03", "atk01", "misc02", "cmd_up12"], // リール1: ミス1個
            ["atk01", "atk02", "atk_paralyze", "atk02", "misc03", "misc02"] // リール2: ミス1個
        ],
        image: "images/skeleton.svg"
    },
    // 😈 【既存敵】小悪魔
    {
        id: "char_imp",
        name: "小悪魔",
        hp: 75, maxHp: 75, atk: 13, int: 18, spd: 20,
        commands: [
            ["atk01", "mgc01", "misc01", "heal01", "misc03", "cmd_up12"], // リール1: ミス1個
            ["atk01", "mgc01", "atk_weaken", "heal01", "misc01", "misc03"] // リール2: ミス1個
        ],
        image: "images/imp.svg"
    },
    // 👻 【既存敵】ゴースト
    {
        id: "char_ghost",
        name: "ゴースト",
        hp: 75, maxHp: 75, atk: 10, int: 20, spd: 16,
        commands: [
            ["atk01", "atk_weaken", "misc01", "mgc01", "misc03", "cmd_up12"], // リール1: ミス1個
            ["atk01", "atk_weaken", "atk04", "mgc01", "misc01", "misc03"] // リール2: ミス1個
        ],
        image: "images/ghost.svg"
    },
    // 🐺 【新規】ワーウルフ
    {
        id: "char_werewolf",
        name: "ワーウルフ",
        hp: 115, maxHp: 115, atk: 22, int: 6, spd: 16,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"], // リール1: ミス2個→1個に減少
            ["atk01", "atk02", "atk02", "atk03", "atk02", "misc03"] // リール2: ミス2個→1個に減少
        ],
        image: "images/werewolf.svg"
    },
    // 🧜‍♀️ 【新規】人魚
    {
        id: "char_mermaid",
        name: "人魚",
        hp: 90, maxHp: 90, atk: 10, int: 18, spd: 14,
        commands: [
            ["atk01", "mgc01", "misc03", "heal01", "mgc01", "cmd_up12"], // リール1: ミス2個→1個に減少
            ["mgc01", "heal01", "heal01", "heal_cure", "mgc01", "misc03"] // リール2: ミス2個→1個に減少（ヒーラー性能を強化）
        ],
        image: "images/mermaid.svg"
    },
    // 🗿 【新規】ガーゴイル
    {
        id: "char_gargoyle",
        name: "ガーゴイル",
        hp: 125, maxHp: 125, atk: 18, int: 10, spd: 11,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"], // リール1: ミス2個→1個に減少
            ["atk02", "atk02", "atk_weaken", "atk03", "atk02", "misc03"] // リール2: ミス2個→1個に減少
        ],
        image: "images/gargoyle.svg"
    },
    // 🧙‍♀️ 【新規】魔女
    {
        id: "char_witch",
        name: "魔女",
        hp: 85, maxHp: 85, atk: 9, int: 22, spd: 13,
        commands: [
            ["atk01", "mgc01", "misc03", "atk_weaken", "mgc01", "cmd_up12"], // リール1: ミス2個→1個に減少
            ["mgc01", "mgc01", "atk_weaken", "atk04", "mgc01", "misc03"] // リール2: ミス2個→1個に減少
        ],
        image: "images/witch.svg"
    },
    // 👤 【新規】シャドウ
    {
        id: "char_shadow",
        name: "シャドウ",
        hp: 80, maxHp: 80, atk: 16, int: 14, spd: 18,
        commands: [
            ["atk01", "misc02", "misc03", "atk01", "atk01", "cmd_up12"], // リール1: ミス2個→1個に減少
            ["atk01", "atk04", "misc02", "atk02", "atk04", "misc03"] // リール2: ミス2個→1個に減少
        ],
        image: "images/shadow.svg"
    },

    // =========================================================================
    // ⭐ グレード３（★3枠：最大3段階 / 計9体 ※元データ維持）
    // =========================================================================

    // ⛪ 【既存職】僧侶
    {
        id: "char_soryo",
        name: "僧侶",
        hp: 90, maxHp: 90, atk: 12, int: 25, spd: 12,
        commands: [
            ["atk01", "heal01", "misc03", "heal01", "atk01", "cmd_up12"],
            ["atk01", "heal01", "heal01", "heal_cure", "misc03", "cmd_up23"],
            ["heal01", "heal01", "heal01", "heal_cure", "misc03", "heal01"]
        ],
        image: "images/soryo.svg"
    },
    // 👤 【既存職】盗賊
    {
        id: "char_thief",
        name: "盗賊",
        hp: 80, maxHp: 80, atk: 16, int: 12, spd: 25,
        commands: [
            ["atk01", "atk04", "misc01", "misc02", "atk01", "cmd_up12"],
            ["atk01", "atk04", "atk_paralyze", "misc02", "atk04", "cmd_up23"],
            ["atk01", "atk04", "atk_paralyze", "misc02", "misc01", "atk04"]
        ],
        image: "images/thief.svg"
    },
    // 🧙‍♂️ 【既存職】魔法使い
    {
        id: "char_mahoutsukai",
        name: "魔法使い",
        hp: 85, maxHp: 85, atk: 8, int: 28, spd: 13,
        commands: [
            ["atk01", "mgc01", "misc03", "mgc01", "atk01", "cmd_up12"],
            ["atk01", "mgc01", "mgc01", "atk_weaken", "misc03", "cmd_up23"],
            ["atk01", "mgc01", "mgc01", "atk_weaken", "misc03", "mgc01"]
        ],
        image: "images/mahoutsukai.svg"
    },
    // 👊 【既存職】武闘家
    {
        id: "char_butouka",
        name: "武闘家",
        hp: 110, maxHp: 110, atk: 24, int: 6, spd: 22,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"],
            ["atk01", "atk01", "atk02", "atk05", "misc03", "cmd_up23"],
            ["atk01", "atk01", "atk02", "atk05", "misc03", "atk05"]
        ],
        image: "images/butouka.svg"
    },
    // ⚡ 【既存敵】サンダーバード
    {
        id: "char_thunderbird",
        name: "サンダーバード",
        hp: 95, maxHp: 95, atk: 15, int: 14, spd: 24,
        commands: [
            ["atk01", "misc01", "atk03", "atk_paralyze", "misc01", "cmd_up12"],
            ["atk01", "atk_paralyze", "misc01", "atk03", "atk_paralyze", "cmd_up23"],
            ["atk01", "atk_paralyze", "atk_paralyze", "misc01", "atk03", "atk_paralyze"]
        ],
        image: "images/thunderbird.svg"
    },
    // ⚔️ 【既存職】勇者
    {
        id: "char_yusha",
        name: "勇者",
        hp: 140, maxHp: 140, atk: 20, int: 15, spd: 16,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "heal01", "cmd_up12"],
            ["atk02", "atk02", "heal01", "atk03", "misc03", "cmd_up12"],
            ["atk03", "atk03", "heal02", "atk03", "misc03", "cmd_down12"]
        ],
        image: "images/player.svg"
    },
    // 🏹 【既存職】狩人
    {
        id: "char_hunter",
        name: "狩人",
        hp: 110, maxHp: 110, atk: 18, int: 10, spd: 22,
        commands: [
            ["atk01", "atk02", "misc03", "atk02", "atk03", "cmd_up12"],
            ["atk02", "atk03", "misc03", "atk03", "atk03", "cmd_up12"],
            ["atk03", "atk03", "atk03", "atk03", "misc03", "cmd_down12"]
        ],
        image: "images/player.svg"
    },
    // 🔫 【既存職】ガンマン
    {
        id: "char_gunman",
        name: "ガンマン",
        hp: 105, maxHp: 105, atk: 24, int: 8, spd: 18,
        commands: [
            ["atk01", "atk01", "misc03", "atk03", "misc03", "cmd_up12"],
            ["atk02", "atk02", "atk03", "atk03", "misc03", "cmd_up12"],
            ["atk03", "atk03", "atk03", "atk03", "atk03", "cmd_down12"]
        ],
        image: "images/player.svg"
    },
    // 🔮 【既存職】召喚士
    {
        id: "char_summoner",
        name: "召喚士",
        hp: 95, maxHp: 95, atk: 10, int: 22, spd: 12,
        commands: [
            ["atk01", "misc01", "misc03", "atk02", "misc01", "cmd_up12"],
            ["atk02", "misc01", "misc03", "atk03", "misc02", "cmd_up12"],
            ["atk03", "misc02", "misc02", "atk03", "misc02", "cmd_down12"]
        ],
        image: "images/player.svg"
    },

    // =========================================================================
    // ⭐ グレード４（★4枠：最大4段階 / 計8体）
    // =========================================================================

    // ⚔️ 【既存職】剣士
    {
        id: "char_kenshi",
        name: "剣士",
        hp: 120, maxHp: 120, atk: 22, int: 10, spd: 15,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"],
            ["atk01", "atk02", "misc03", "atk02", "atk03", "cmd_up23"],
            ["atk02", "atk02", "atk03", "atk03", "atk05", "cmd_up34"],
            ["atk02", "atk03", "atk03", "atk05", "misc03", "atk05"]
        ],
        image: "images/player.svg"
    },
    // 🛡️ 【既存職】聖騎士
    {
        id: "char_seikishi",
        name: "聖騎士",
        hp: 140, maxHp: 140, atk: 18, int: 15, spd: 10,
        commands: [
            ["atk01", "atk01", "misc03", "heal01", "atk01", "cmd_up12"],
            ["atk01", "atk03", "heal01", "heal_cure", "misc03", "cmd_up23"],
            ["atk01", "atk03", "heal01", "heal_cure", "atk02", "cmd_up34"],
            ["atk01", "atk03", "heal01", "heal_cure", "atk02", "misc03"]
        ],
        image: "images/seikishi.svg"
    },
    // 🐉 【既存敵】ドラゴン
    {
        id: "char_dragon",
        name: "ドラゴン",
        hp: 180, maxHp: 180, atk: 26, int: 12, spd: 9,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "misc03", "cmd_up12"],
            ["atk01", "atk02", "misc03", "atk_fire", "misc03", "cmd_up23"],
            ["atk01", "atk02", "atk_fire", "atk_fire", "misc03", "cmd_up34"],
            ["atk01", "atk02", "atk_fire", "atk_fire", "misc03", "misc03"]
        ],
        image: "images/dragon.svg"
    },
    // 👑 【新規】魔王
    {
        id: "char_maou",
        name: "魔王",
        hp: 200, maxHp: 200, atk: 25, int: 25, spd: 12,
        commands: [
            ["atk01", "mgc01", "misc03", "atk02", "misc03", "cmd_up12"],
            ["atk02", "mgc01", "atk_weaken", "atk03", "misc03", "cmd_up23"],
            ["atk03", "mgc01", "atk_fire", "atk03", "misc03", "cmd_up34"],
            ["atk03", "mgc01", "atk_fire", "atk05", "atk_weaken", "misc03"]
        ],
        image: "images/maou.svg"
    },
    // 📖 【新規】大賢者
    {
        id: "char_daikenja",
        name: "大賢者",
        hp: 130, maxHp: 130, atk: 10, int: 32, spd: 15,
        commands: [
            ["atk01", "mgc01", "misc03", "heal01", "misc03", "cmd_up12"],
            ["mgc01", "mgc01", "heal01", "atk_weaken", "misc03", "cmd_up23"],
            ["mgc01", "mgc01", "heal01", "heal_cure", "misc03", "cmd_up34"],
            ["mgc01", "mgc01", "mgc01", "heal01", "heal_cure", "misc03"]
        ],
        image: "images/daikenja.svg"
    },
    // 🦅 【新規】フェニックス
    {
        id: "char_phoenix",
        name: "フェニックス",
        hp: 150, maxHp: 150, atk: 20, int: 22, spd: 18,
        commands: [
            ["atk01", "mgc01", "misc03", "heal01", "misc03", "cmd_up12"],
            ["atk02", "mgc01", "atk_fire", "heal01", "misc03", "cmd_up23"],
            ["atk02", "mgc01", "atk_fire", "heal01", "heal_cure", "cmd_up34"],
            ["atk03", "mgc01", "atk_fire", "heal01", "heal_cure", "misc03"]
        ],
        image: "images/phoenix.svg"
    },
    // 🎭 【新規】アサシンマスター
    {
        id: "char_assassin_master",
        name: "アサシンマスター",
        hp: 120, maxHp: 120, atk: 24, int: 12, spd: 26,
        commands: [
            ["atk01", "atk04", "misc03", "misc02", "atk01", "cmd_up12"],
            ["atk01", "atk04", "atk_paralyze", "misc02", "atk02", "cmd_up23"],
            ["atk02", "atk04", "atk_paralyze", "misc02", "atk03", "cmd_up34"],
            ["atk02", "atk04", "atk_paralyze", "misc02", "atk05", "atk03"]
        ],
        image: "images/assassin_master.svg"
    },
    // 🌟 【新規】ゴッドハンド
    {
        id: "char_godhand",
        name: "ゴッドハンド",
        hp: 160, maxHp: 160, atk: 28, int: 8, spd: 20,
        commands: [
            ["atk01", "atk01", "misc03", "atk02", "atk01", "cmd_up12"],
            ["atk01", "atk02", "atk02", "atk03", "misc03", "cmd_up23"],
            ["atk02", "atk02", "atk03", "atk05", "misc03", "cmd_up34"],
            ["atk03", "atk03", "atk05", "atk05", "misc03", "atk05"]
        ],
        image: "images/godhand.svg"
    },
    // =========================================================================
    // 🛡️ 新規追加：本格戦略RPGバトル用キャラクター
    // =========================================================================

    // 🛡️ アイアンナイト（盾役：高いHPと「かばう」で味方を死守する）
    {
        id: "char_iron_knight",
        name: "アイアンナイト",
        hp: 180, maxHp: 180, atk: 15, int: 5, spd: 9,
        commands: [
            ["atk01", "cmd_cover", "misc03", "atk01", "misc03", "cmd_up12"],
            ["atk02", "cmd_cover", "cmd_cover", "atk01", "misc03", "cmd_up23"],
            ["atk02", "cmd_cover", "cmd_cover", "cmd_sweep", "atk02", "misc03"] // ★3でなぎ払いも可能に
        ],
        image: "images/iron_knight.svg"
    },

    // 🧙‍♂️ 大魔導士（魔導士：高い魔力を誇り、最終リールにロマン技「大爆発」を秘める）
    {
        id: "char_grand_mage",
        name: "大魔導士",
        hp: 95, maxHp: 95, atk: 7, int: 26, spd: 13,
        commands: [
            ["atk01", "mgc01", "misc03", "mgc01", "misc03", "cmd_up12"],
            ["mgc01", "cmd_sweep", "misc03", "mgc01", "cmd_sweep", "cmd_up23"],
            ["mgc02", "cmd_sweep", "cmd_explosion", "mgc02", "cmd_sweep", "misc03"]
        ],
        image: "images/grand_mage.svg"
    },

    // 🐉 レッドドラゴン（最高峰のスペックを持ち、物理全体攻撃と大爆発を両方使いこなす）
    {
        id: "char_red_dragon",
        name: "レッドドラゴン",
        hp: 210, maxHp: 210, atk: 24, int: 16, spd: 11,
        commands: [
            ["atk01", "atk02", "misc03", "atk01", "misc03", "cmd_up12"],
            ["atk02", "cmd_sweep", "misc03", "atk02", "cmd_sweep", "cmd_up23"],
            ["atk03", "cmd_sweep", "cmd_explosion", "atk03", "cmd_sweep", "misc03"]
        ],
        image: "images/red_dragon.svg"
    },

    // 🛐 大司祭（僧侶：★2以降から「いやしの雨」がリールに入り、パーティを一気に立て直す）
    {
        id: "char_high_priest",
        name: "大司祭",
        hp: 110, maxHp: 110, atk: 9, int: 22, spd: 15,
        commands: [
            ["atk01", "heal01", "misc03", "heal01", "misc03", "cmd_up12"],
            ["heal01", "heal_cure", "misc03", "heal01", "cmd_healing_rain", "cmd_up23"],
            ["heal02", "cmd_healing_rain", "cmd_healing_rain", "heal_cure", "heal02", "misc03"]
        ],
        image: "images/high_priest.svg"
    },
];