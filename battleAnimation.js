// battleAnimation.js

/**
 * コマンドルーレットのアニメーションを回す関数
 */
export async function doRoulette(prefix, charIdx, commands) {
    const targetIdx = Math.floor(Math.random() * commands.length);
    const totalSteps = 18 + targetIdx; // 最低3周＋ターゲット分まわる
    const rouletteId = `${prefix}-roulette-${charIdx}`;

    for (let i = 0; i <= totalSteps; i++) {
        let currentIdx = i % commands.length;
        // 一旦すべての枠から active クラスを外す
        document.querySelectorAll(`#${rouletteId} .cmd-item`).forEach(el => el.classList.remove('active'));

        // 現在の枠に active クラスを付与
        const currentEl = document.getElementById(`${prefix}-${charIdx}-c${currentIdx}`);
        if (currentEl) currentEl.classList.add('active');

        // 終盤はブレーキをかける（速度を落とす）
        let speed = (i > totalSteps - 4) ? 100 : 20;
        await new Promise(r => setTimeout(r, speed));
    }
    return targetIdx;
}