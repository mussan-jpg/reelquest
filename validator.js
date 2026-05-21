// validator.js
export function validateGameData(gameState, commandEffects) {
    let hasError = false;

    // プレイヤーと敵全員をまとめる
    const allCharacters = [...gameState.players, ...gameState.enemies];

    allCharacters.forEach(char => {
        // 多段階リールの構造（2次元配列）を走査する
        // char.commands が 2次元配列であることを前提に処理します
        if (!Array.isArray(char.commands)) {
            console.error(`【エラー】${char.name}のコマンドデータが配列ではありません。`);
            hasError = true;
            return;
        }

        char.commands.forEach((reel, reelIndex) => {
            // 各リールの中身（コマンドIDの配列）をチェック
            reel.forEach((cmd, slotIndex) => {
                
                // 定義漏れチェック
                if (!commandEffects[cmd]) {
                    console.error(`【エラー】${char.name}（リール${reelIndex + 1} / スロット${slotIndex + 1}）のコマンド「${cmd}」が commands.js に見つかりません！`);
                    hasError = true;
                }
            });

            // 重複チェック（各リールごとの重複を警告）
            const uniqueCommands = new Set(reel);
            if (uniqueCommands.size !== reel.length) {
                console.warn(`【警告】${char.name}の第${reelIndex + 1}リールに重複コマンドが含まれています。`);
            }
        });
    });

    return !hasError; // エラーがなければ true を返す
}