// gameData.js

export class Character {
    // 引数を data というオブジェクト1つで受け取る形に変更
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        // hp や atk もデータから動的に受け取れるようにしておくと便利です
        this.hp = data.hp ?? 100;
        this.maxHp = data.maxHp ?? 100;
        this.atk = data.atk ?? 10;
        this.int = data.int ?? 10;
        this.spd = data.spd ?? 10;
        this.baseAtk = data.baseAtk ?? this.atk;
        this.baseInt = data.baseInt ?? this.int;
        this.baseSpd = data.baseSpd ?? this.spd;
        this.image = data.image;
        
        // コマンドの配列（最大4段階の二次元配列）
        this.commands = data.commands; 
        
        // ★ 現在滞在しているリールのインデックス（0 = 1リール目, 1 = 2リール目...）
        this.currentReel = 0; 
        
        this.status = []; // 状態異常リスト
        this.poisonedIndices = [];
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
