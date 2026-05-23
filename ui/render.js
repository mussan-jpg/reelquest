// ui/render.js
import { commandEffects } from '../commands/index.js';
import { statusEffects } from '../statusEffects.js';
import { showPopupEffect, flashCharacterEffect, getStatusEffectColor } from './effects.js';
import { 
    generateCommands, 
    generateStatusBadges, 
    getReelGradeStyle, 
    renderSection,
    formatStatValue,
    buildCommandTooltip
} from './components.js';

export function updateOrderIcons(actionQueue) {
    const nextIconContainer = document.getElementById('next-action-icon');
    if (!nextIconContainer) return;

    const orderHtml = actionQueue.map((item, idx) => {
        const bgGradient = item.side === 'p'
            ? 'linear-gradient(135deg, #d5f4e6, #c8e6c9)'
            : 'linear-gradient(135deg, #fadbd8, #f5b7b1)';
        return `
            <div id="order-${item.side}-${item.index}" class="order-icon${idx === 0 ? ' active' : ''}" style="background: ${bgGradient};">
                <img src="${item.char.image}" alt="${item.char.name}" />
            </div>
        `;
    }).join('');

    nextIconContainer.innerHTML = `<div class="order-icon-wrapper" style="display:flex; gap:8px; align-items:center; justify-content:center;">${orderHtml}</div>`;
}

// キャラクターの直前のHPを記憶するマップ（ダメージ・回復ポップアップの自動検知用）
export const prevHpMap = new Map();
export const prevStatusMap = new Map();
export const prevStatMap = new Map();

export function getStatSnapshot(char) {
    return {
        atk: char.atk,
        int: char.int,
        spd: char.spd
    };
}

// リール移行時などにコマンドUIとリール数バッジを部分再描画する関数
export function updateCommandsUI(prefix, charIdx, currentCommands, currentReelIndex) {
    const rouletteEl = document.getElementById(`${prefix}-roulette-${charIdx}`);
    if (rouletteEl) {
        rouletteEl.innerHTML = generateCommands(prefix, charIdx, currentCommands);
    }

    // リールの段階に応じたグレード色・テキストへリアルタイムに更新
    const reelBadgeEl = document.getElementById(`${prefix}-reel-badge-${charIdx}`);
    if (reelBadgeEl) {
        const grade = getReelGradeStyle(currentReelIndex);
        reelBadgeEl.textContent = grade.text;
        reelBadgeEl.style.cssText = `padding: 1px 4px; font-size: 0.75em; font-weight: bold; border-radius: 3px; white-space: nowrap; ${grade.style}`;

        // 💡 修正：最大グレード色を維持するため、リール移行時のカード全体の背景色更新処理を削除しました

        // 💡 おまけ：リールが上がった時に「グレードUP!」の青いポップアップを出す演出
        showPopupEffect(prefix, charIdx, "グレードUP!", "system");
    }
}

// 初期描画関数
export function render(gameState) {
    const container = document.getElementById('game-container');

    let target = container;
    if (!target) {
        target = document.createElement('div');
        target.id = 'game-container';
        document.body.appendChild(target);
    }

    // アイコンバー用のHTML生成
    const allChars = [
        ...gameState.players.map((char, idx) => ({char, idx, side: 'p', image: char.image})),
        ...gameState.enemies.map((char, idx) => ({char, idx, side: 'e', image: char.image}))
    ].sort((a, b) => (b.char.spd || 0) - (a.char.spd || 0));
    
    const iconBarHtml = allChars.map((item) => {
        return {
            side: item.side,
            idx: item.idx,
            image: item.image,
            name: item.char.name
        };
    });

    target.innerHTML = `
        <style>
            .roulette .cmd-item.active {
                background: #ffeaa7 !important; 
                color: #000000 !important;
                box-shadow: none !important;          
                border: 1px solid transparent !important; 
                height: 100% !important;                                                                                
            }
            .roulette .cmd-item:last-child {
                border-right: none !important; 
            }
            @keyframes rainbow-bg {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        </style>

        <div style="display: flex; flex-direction: column; width: 100%; gap: 10px;">
            <!-- BATTLE ORDER ICON BAR (rendered into #next-action-icon) -->

            <!-- BATTLEFIELD (Left: Allies, Right: Enemies) -->
            <div class="battle-teams-row">
                <div class="battle-team-panel battle-team-panel--allies">
                    <h2>🛡️ YOUR ALLIES</h2>
                    ${renderSection(gameState.players, 'p')}
                </div>

                <div class="battle-team-panel battle-team-panel--enemies">
                    <h2>⚔️ ENEMIES</h2>
                    ${renderSection(gameState.enemies, 'e')}
                </div>
            </div>
        </div>
    `;
    
    // Render order icons into the next-action area (if present)
    try {
        const nextIconContainer = document.getElementById('next-action-icon');
        if (nextIconContainer) {
            const orderHtml = `<div class="order-icon-wrapper" style="display:flex; gap:8px; align-items:center; justify-content:center;">${iconBarHtml.map(item =>
                `<div id="order-${item.side}-${item.idx}" class="order-icon" data-side="${item.side}" data-idx="${item.idx}" title="${item.name}" style="width:28px; height:28px; border:2px solid transparent; border-radius:6px; overflow:hidden; display:flex; align-items:center; justify-content:center; background: ${item.side === 'p' ? 'linear-gradient(135deg, #d5f4e6, #c8e6c9)' : 'linear-gradient(135deg, #fadbd8, #f5b7b1)'};">` +
                    `<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain;">` +
                `</div>`
            ).join('')}</div>`;

            nextIconContainer.style.display = 'flex';
            nextIconContainer.style.gap = '8px';
            nextIconContainer.style.alignItems = 'center';
            nextIconContainer.style.justifyContent = 'center';
            nextIconContainer.style.minWidth = '180px';
            nextIconContainer.innerHTML = orderHtml;
        }
    } catch (e) {
        // ignore
    }

    // 初回描画時に前回のHPマップをセット（初回からポップアップが出るのを防ぐため）
    gameState.players.forEach((char, i) => prevHpMap.set(`p-${i}`, char.hp));
    gameState.enemies.forEach((char, i) => prevHpMap.set(`e-${i}`, char.hp));
    gameState.players.forEach((char, i) => prevStatusMap.set(`p-${i}`, [...(char.status || [])]));
    gameState.enemies.forEach((char, i) => prevStatusMap.set(`e-${i}`, [...(char.status || [])]));
    gameState.players.forEach((char, i) => prevStatMap.set(`p-${i}`, getStatSnapshot(char)));
    gameState.enemies.forEach((char, i) => prevStatMap.set(`e-${i}`, getStatSnapshot(char)));

    updateAllHPBars(gameState);
}

// 全員のHP ＆ 状態異常 ＆ コマンド状態のリアルタイム更新関数
export function updateAllHPBars(gameState, options = {}) {
    const skipHpPopup = !!options.skipHpPopup;
    const updateParty = (party, prefix) => {
        party.forEach((char, i) => {
            const bar = document.getElementById(`${prefix}-hp-bar-${i}`);
            const text = document.getElementById(`${prefix}-hp-text-${i}`);
            const status = document.getElementById(`${prefix}-status-${i}`);
            const stats = document.getElementById(`${prefix}-stats-${i}`);
            const sectionEl = document.getElementById(`${prefix}-section-${i}`);

            // 💡 追加：自動HP差分検知（前回のHPと比較して変化があればポップアップを表示）
            const key = `${prefix}-${i}`;
            const prevHp = prevHpMap.get(key);
            if (!skipHpPopup && prevHp !== undefined && prevHp !== char.hp) {
                const diff = char.hp - prevHp;
                if (diff < 0) {
                    showPopupEffect(prefix, i, Math.abs(diff), 'damage');
                    flashCharacterEffect(prefix, i, 'rgba(231, 76, 60, 0.34)');
                } else if (diff > 0) {
                    showPopupEffect(prefix, i, `+${diff}`, 'heal');
                    flashCharacterEffect(prefix, i, 'rgba(46, 204, 113, 0.34)');
                }
            }
            prevHpMap.set(key, char.hp); // 今回のHPを次のターンのために記憶

            const prevStatuses = prevStatusMap.get(key) || [];
            const currentStatuses = char.status || [];
            const addedStatuses = currentStatuses.filter(statusId => !prevStatuses.includes(statusId));
            const removedStatuses = prevStatuses.filter(statusId => !currentStatuses.includes(statusId));
            if (addedStatuses.length > 0) {
                const statusId = addedStatuses[0];
                const statusName = statusEffects?.[statusId]?.name || statusId;
                const statusColor = getStatusEffectColor(statusId);
                showPopupEffect(prefix, i, statusName, 'status', statusColor);
                flashCharacterEffect(prefix, i, `${statusColor}66`);
            } else if (removedStatuses.length > 0) {
                const statusNames = removedStatuses
                    .map(statusId => statusEffects?.[statusId]?.name || statusId)
                    .join(' / ');
                const statusColor = getStatusEffectColor(removedStatuses[0]);
                showPopupEffect(prefix, i, `${statusNames} 解除`, 'status-remove', statusColor);
                flashCharacterEffect(prefix, i, `${statusColor}55`);
            }
            prevStatusMap.set(key, [...currentStatuses]);

            const prevStats = prevStatMap.get(key);
            const currentStats = getStatSnapshot(char);
            if (prevStats) {
                const statDiffs = ['atk', 'int', 'spd'].map(stat => currentStats[stat] - prevStats[stat]);
                const totalDiff = statDiffs.reduce((sum, diff) => sum + diff, 0);
                const statChangeCoveredByStatus = addedStatuses.length > 0 || removedStatuses.length > 0;
                if (totalDiff !== 0 && !statChangeCoveredByStatus) {
                    showPopupEffect(prefix, i, totalDiff > 0 ? '能力UP' : '能力DOWN', totalDiff > 0 ? 'buff' : 'debuff');
                    flashCharacterEffect(prefix, i, totalDiff > 0 ? 'rgba(39, 174, 96, 0.28)' : 'rgba(230, 126, 34, 0.3)');
                }
            }
            prevStatMap.set(key, currentStats);

            if (bar) {
                const percent = (char.hp / char.maxHp) * 100;
                bar.style.width = `${percent}%`;
                bar.style.backgroundColor = percent < 30 ? '#e74c3c' : '#4cd137';
            }
            if (text) text.innerText = `${Math.max(0, char.hp)} / ${char.maxHp}`;
            if (status) status.innerHTML = generateStatusBadges(char.status);
            if (stats) {
                stats.innerHTML = `
                    ${formatStatValue('⚔️', char.atk, char.baseAtk ?? char.atk)}
                    ${formatStatValue('🔮', char.int, char.baseInt ?? char.int)}
                    ${formatStatValue('👟', char.spd, char.baseSpd ?? char.spd)}
                `;
            }

            // 💡 修正：最大グレードのスタイルを取得（生存時のカード背景用）
            const maxReelIdx = (char.commands && Array.isArray(char.commands[0])) ? char.commands.length - 1 : 0;
            const maxGrade = getReelGradeStyle(maxReelIdx);

            // ⚡ 修正：死亡・マヒ・通常生存時（最大グレード背景）のスタイル競合をクリアに解決
            if (sectionEl) {
                if (char.hp <= 0) {
                    sectionEl.classList.remove('active-actor', 'is-paralyzed');
                    sectionEl.style.removeProperty('border');
                    sectionEl.style.removeProperty('box-shadow');
                    sectionEl.style.removeProperty('animation');
                    sectionEl.style.removeProperty('background');
                    sectionEl.style.removeProperty('background-size');
                } else if (sectionEl.classList.contains('active-actor')) {
                    sectionEl.classList.toggle('is-paralyzed', !!(char.status && char.status.includes('paralysis')));
                } else {
                    const isParalyzed = !!(char.status && char.status.includes('paralysis'));
                    sectionEl.classList.toggle('is-paralyzed', isParalyzed);
                    sectionEl.style.removeProperty('animation');
                    sectionEl.style.setProperty('background', maxGrade.cardBg, 'important');
                    if (maxGrade.cardAnimation) {
                        sectionEl.style.setProperty('background-size', '400% 400%', 'important');
                        sectionEl.style.setProperty('animation', maxGrade.cardAnimation, 'important');
                    } else {
                        sectionEl.style.removeProperty('background-size');
                    }
                }
            }

            const activeReelIdx = char.currentReel !== undefined ? char.currentReel : 0;
            const currentCmds = (char.commands && Array.isArray(char.commands[0]))
                ? char.commands[activeReelIdx]
                : char.commands;

            if (currentCmds) {
                currentCmds.forEach((cmdId, cmdIdx) => {
                    const cmdEl = document.getElementById(`${prefix}-${i}-c${cmdIdx}`);
                    if (cmdEl) {
                        cmdEl.style.backgroundColor = 'white';
                        cmdEl.style.color = 'black';

                        const effect = commandEffects[cmdId];
                        if (effect) {
                            const tooltipText = buildCommandTooltip(effect, char);
                            // カスタムツールチップ用に data-tooltip を設定（ネイティブの title は消す）
                            cmdEl.removeAttribute('title');
                            cmdEl.setAttribute('data-tooltip', tooltipText);
                        }
                    }
                });
            }
        });
    };

    updateParty(gameState.players, 'p');
    updateParty(gameState.enemies, 'e');
    if (typeof window.refreshBattleStatsPanel === 'function') {
        window.refreshBattleStatsPanel();
    }
}
