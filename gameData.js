// gameData.js

export class Character {
    // 引数を data というオブジェクト1つで受け取る形に変更
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        // hp や atk もデータから動的に受け取れるようにしておくと便利です
        this.hp = data.hp ?? 100;
        this.maxHp = data.maxHp ?? this.hp;
        this.shield = Math.max(0, Number(data.shield || 0));
        this.baseMaxHp = data.baseMaxHp ?? this.maxHp;
        this.atk = data.atk ?? 10;
        this.int = data.int ?? 10;
        this.spd = data.spd ?? 10;
        this.baseAtk = data.baseAtk ?? this.atk;
        this.baseInt = data.baseInt ?? this.int;
        this.baseSpd = data.baseSpd ?? this.spd;
        this.rarity = data.rarity;
        this.originalRarity = data.originalRarity || data.rarity;
        this.unitTier = Math.max(1, Math.min(3, Number(data.unitTier || data.unit_tier || 1)));
        this.slotCost = Math.max(1, Math.min(4, data.slotCost || 1));
        this.actionsPerTurn = Math.max(1, Math.min(4, Math.floor(Number(data.actionsPerTurn || data.actions_per_turn || 1))));
        this.remainingActions = Math.max(0, Math.floor(Number(data.remainingActions || data.remaining_actions || 0)));
        this.pendingExtraActions = Math.max(0, Math.floor(Number(data.pendingExtraActions || data.pending_extra_actions || 0)));
        this.limitBreakExp = Math.max(0, Number(data.limitBreakExp || data.limit_break_exp || 0));
        this.limitBreakLevel = Math.max(0, Number(data.limitBreakLevel || data.limit_break_level || 0));
        this.isLimitBroken = !!(data.isLimitBroken || data.limitBroken || data.limit_broken);
        this.limitBreakApplied = typeof data.limitBreakApplied === 'number'
            ? data.limitBreakApplied
            : !!data.limitBreakApplied;
        this.isSpecialOnly = !!data.isSpecialOnly;
        this.species = data.species || 'none';
        this.image = data.image;
        
        // コマンドの配列（最大4段階の二次元配列）
        this.commands = data.commands; 
        
        // ★ 現在滞在しているリールのインデックス（0 = 1リール目, 1 = 2リール目...）
        this.currentReel = 0; 
        
        this.status = []; // 状態異常リスト
        this.statusStacks = {};
        this.statusSources = {};
        this.poisonedIndices = [];
        
        // 攻撃力の倍率修正（攻撃コマンドやステータス効果で変更される）
        // 例: { modifier: 0.7, source: "weak" }
        this.statBonuses = { atk: 0, int: 0, spd: 0 };
        this.attackPowerModifiers = [];
        this.pendingUndeadLastStand = null;
        this.pendingUndeadReviveAction = false;
        
        // 挑発関連（「かばう」「守護結界」は同じ状態を延長する）
        this.tauntDuration = 0; // 挑発が残りあと何ターン継続するか
    }

    /**
     * ★ 現在滞在しているリールのコマンド配列（6つ）を安全に取得するゲッター
     * 他のファイルから「character.currentCommands」で呼び出せます。
     */
    get currentCommands() {
        // commandsが二次元配列（多段階リール構造）になっている場合
        if (Array.isArray(this.commands[0])) {
            // 設定された currentReel の配列を返す（存在しない場合は念のため一番上のリールを返す）
            return this.commands[this.currentReel] || this.commands[this.commands.length - 1];
        }
        // 万が一、古い形式の一次元配列データが渡された場合のセーフティ
        return this.commands;
    }
}

export class Party {
    constructor() {
        this.members = []; 
    }
    applyStatusEffects() {
        this.members.forEach(m => { /* 毒ダメージ計算など */ });
    }
}
