// battleAI.js

/**
 * 技に応じた正しいターゲットを判定・選出するAIロジック
 */
export function determineTarget(commandId, attackerIdx, currentSide, gameState) {
    const myParty = currentSide === 'p' ? gameState.players : gameState.enemies;
    const enemyParty = currentSide === 'p' ? gameState.enemies : gameState.players;
    const myPrefix = currentSide;
    const enemyPrefix = currentSide === 'p' ? 'e' : 'p';

    // 自己対象の技（ぬるぬる等）は自分をターゲットにする
    if (commandId === 'misc01' || commandId === 'misc02') {
        return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
    }

    // 回復・サポート系の技
    if (commandId.includes('heal')) {
        const aliveFriends = myParty
            .map((char, idx) => ({ data: char, prefix: myPrefix, index: idx }))
            .filter(item => item.data.hp > 0);

        if (aliveFriends.length === 0) {
            return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
        }

        // 【状態異常解除】の時のターゲット優先索敵
        if (commandId === 'heal_cure') {
            const afflictedFriends = aliveFriends.filter(item => 
                // 通常の状態異常（マヒ・弱体化）がある、またはコマンド毒が1つ以上ある仲間
                (item.data.status && item.data.status.length > 0) || 
                (item.data.poisonedIndices && item.data.poisonedIndices.length > 0)
            );

            // 苦しんでいる仲間がいれば、その中からランダムに選んで最優先で救う
            if (afflictedFriends.length > 0) {
                return afflictedFriends[Math.floor(Math.random() * afflictedFriends.length)];
            }
        }

        // 誰も状態異常にかかっていない場合や、通常の「回復」は生存メンバーからランダム
        return aliveFriends[Math.floor(Math.random() * aliveFriends.length)];
    }

    // 攻撃系の技：生存している敵からランダム
    const aliveEnemies = enemyParty
        .map((char, idx) => ({ data: char, prefix: enemyPrefix, index: idx }))
        .filter(item => item.data.hp > 0);

    if (aliveEnemies.length === 0) return null;
    return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
}