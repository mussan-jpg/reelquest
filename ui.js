// ui.js
import { commandEffects } from './commands.js';
import { statusEffects } from './statusEffects.js'; // 状態異常のデータをインポート

// カスタムツールチップのセットアップ
function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const _tooltipEl = document.createElement('div');
_tooltipEl.id = 'game-tooltip';
_tooltipEl.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 20000;
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 12px;
    max-width: 280px;
    white-space: pre-wrap;
    line-height: 1.3;
    display: none;
`;
document.body.appendChild(_tooltipEl);

let _tooltipTimer = null;
document.addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('[data-tooltip]') || (e.target && e.target.getAttribute && e.target.getAttribute('data-tooltip') ? e.target : null);
    if (!el) return;
    const text = el.getAttribute('data-tooltip');
    if (!text) return;

    // ほぼ即時表示（遅延を極小に）
    if (_tooltipTimer) clearTimeout(_tooltipTimer);
    _tooltipTimer = setTimeout(() => {
        _tooltipEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
        _tooltipEl.style.display = 'block';
        const rect = el.getBoundingClientRect();
        const top = rect.top - 10 - _tooltipEl.offsetHeight;
        const left = rect.left + (rect.width / 2) - (_tooltipEl.offsetWidth / 2);
        _tooltipEl.style.top = (top > 8 ? top : rect.bottom + 12) + 'px';
        _tooltipEl.style.left = Math.max(8, left) + 'px';
    }, 30); // 30ms の短い遅延でほぼ即時表示
});

document.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget;
    if (_tooltipTimer) { clearTimeout(_tooltipTimer); _tooltipTimer = null; }
    _tooltipEl.style.display = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (_tooltipEl.style.display === 'block') {
        // マウスに追従させない（固定表示）が望ましいが、軽く位置調整
        const maxRight = window.innerWidth - 16 - _tooltipEl.offsetWidth;
        const left = Math.min(Math.max(8, e.clientX - (_tooltipEl.offsetWidth / 2)), maxRight);
        const top = Math.min(Math.max(8, e.clientY - 24 - _tooltipEl.offsetHeight), window.innerHeight - 16 - _tooltipEl.offsetHeight);
        _tooltipEl.style.left = left + 'px';
        _tooltipEl.style.top = top + 'px';
    }
});

// 💡 追加：キャラクターの直前のHPを記憶するマップ（ダメージ・回復ポップアップの自動検知用）
const prevHpMap = new Map();
const prevStatusMap = new Map();
const prevStatMap = new Map();

// コマンド名を取得するヘルパー関数
function getCommandName(commandId) {
    return commandEffects[commandId] ? commandEffects[commandId].name : commandId;
}

// 💡 修正：リールのグレードスタイルに、カード（キャラクターセクション）全体の背景用スタイル(cardBg)を追加
function getReelGradeStyle(reelIdx) {
    switch (reelIdx) {
        case 0: // ★1 (銅)
            return {
                text: "★1",
                style: "background: linear-gradient(135deg, #a05a2c, #d08a5c) !important; color: #fff !important; border: 1px solid #703a1c !important;",
                cardBg: "#f2dcc9"
            };
        case 1: // ★2 (銀)
            return {
                text: "★2",
                style: "background: linear-gradient(135deg, #bdc3c7, #ecf0f1) !important; color: #333 !important; border: 1px solid #95a5a6 !important;",
                cardBg: "#e1e8eb"
            };
        case 2: // ★3 (金)
            return {
                text: "★3",
                style: "background: linear-gradient(135deg, #f1c40f, #f39c12) !important; color: #fff !important; border: 1px solid #d35400 !important; text-shadow: 1px 1px 1px rgba(0,0,0,0.3) !important;",
                cardBg: "#ffe999"
            };
        case 3: // ★4 虹（最深部）
        default:
            return {
                text: "★4",
                style: "background: linear-gradient(45deg, #ff7675, #ffeaa7, #55efc4, #74b9ff, #a29bfe) !important; background-size: 400% 400% !important; animation: rainbow-bg 4s ease infinite !important; color: #fff !important; border: 1px solid #fff !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;",
                cardBg: "linear-gradient(135deg, #ffd6c6, #ffeaa5, #c9f3e8, #d9dcff)"
            };
    }
}

// 💡 追加：ダメージ・回復のポップアップエフェクトをキャラクターの中央に表示する関数
export function showPopupEffect(prefix, charIdx, text, type, customColor = null) {
    const sectionEl = document.getElementById(`${prefix}-section-${charIdx}`);
    if (!sectionEl) return;

    // ポップアップ用要素の作成
    const popup = document.createElement('div');
    popup.innerText = text;

    // タイプに応じたテキスト色
    let color = customColor || '#e74c3c'; // デフォルト：赤（ダメージ）
    if (type === 'heal') {
        color = customColor || '#2ecc71'; // 緑（回復）
    } else if (type === 'system') {
        color = customColor || '#3498db'; // 青（リール昇格など）
    } else if (type === 'status') {
        color = customColor || '#9b59b6';
    } else if (type === 'buff') {
        color = customColor || '#27ae60';
    } else if (type === 'debuff') {
        color = customColor || '#e67e22';
    }

    // スタイルの設定（中央配置、縁取り文字、フェードアップアニメーション）
    popup.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2.2rem;
        font-weight: 900;
        color: ${color};
        text-shadow: -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0px 0px 8px rgba(0,0,0,0.6);
        pointer-events: none;
        z-index: 1000;
        animation: popup-fade-up 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        white-space: nowrap;
    `;

    // 親要素に基準位置（relative）を設定
    sectionEl.style.position = 'relative';
    sectionEl.appendChild(popup);

    // アミュニーション終了後にDOMから自動削除
    setTimeout(() => {
        popup.remove();
    }, 800);
}

function flashCharacterEffect(prefix, charIdx, color) {
    const sectionEl = document.getElementById(`${prefix}-section-${charIdx}`);
    if (!sectionEl) return;

    const flash = document.createElement('div');
    flash.className = 'character-effect-flash';
    flash.style.background = color;
    sectionEl.style.position = 'relative';
    sectionEl.appendChild(flash);

    setTimeout(() => flash.remove(), 520);
}

function getStatusEffectColor(statusId) {
    return statusEffects?.[statusId]?.color || '#9b59b6';
}

function getStatSnapshot(char) {
    return {
        atk: char.atk,
        int: char.int,
        spd: char.spd
    };
}

function formatStatValue(icon, current, base) {
    const diff = current - base;
    const diffHtml = diff === 0
        ? ''
        : `<span class="stat-delta ${diff > 0 ? 'positive' : 'negative'}">${diff > 0 ? '+' : ''}${diff}</span>`;

    return `<div>${icon}${current}${diffHtml}</div>`;
}

function buildCommandTooltip(effect, char) {
    if (!effect) return '効果: 詳細なし';

    let tooltipText = `${effect.name}\n効果: ${effect.desc || '詳細なし'}`;
    if (typeof effect.calcDamage === 'function') {
        const dmg = effect.calcDamage(char);
        if (dmg > 0) {
            tooltipText += `\n\n【予想ダメージ: ${dmg}】`;
        }
    }

    return tooltipText;
}

// コマンド（ルーレット）の生成
export function generateCommands(prefix, charIdx, currentCommands) {
    if (!currentCommands || currentCommands.length === 0) return '';

    return currentCommands.map((id, i) => {
        const cmdName = getCommandName(id);
        const isActive = i === 0 ? 'active' : '';
        return `
            <div class="cmd-item ${isActive}" id="${prefix}-${charIdx}-c${i}"
                 style="
                    writing-mode: vertical-rl !important;
                    text-orientation: upright !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 4px 1px !important; 
                    font-size: 0.8em !important; 
                    font-weight: bold !important;
                    width: 32px !important;
                    flex-shrink: 0 !important;
                    height: 125px !important;
                    box-sizing: border-box !important;
                    letter-spacing: 1px !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    transition: background-color 0.1s, color 0.1s;
                    border-right: 1px solid #ccc;
                    background: #ffffff;
                 ">
                ${cmdName}
            </div>
        `;
    }).join('');
}

// マヒバッジの文字を黒にして視認性を向上
function generateStatusBadges(statusList) {
    if (!statusList || statusList.length === 0) return '';
    return statusList.map(statusId => {
        let effect = statusEffects ? statusEffects[statusId] : null;
        if (!effect) {
            if (statusId === 'poison') {
                effect = { name: '🤢 毒', color: '#9c88ff' };
            } else if (statusId === 'paralysis') {
                effect = { name: '⚡ マヒ', color: '#f1c40f' };
            } else {
                return '';
            }
        }
                // data-tooltip 属性に説明を入れてカスタムツールチップで詳細を表示
                const titleText = effect.desc ? `${effect.name} - ${effect.desc}` : effect.name;
                return `
                        <span data-tooltip="${escapeHtml(titleText)}"
                  style="
                    background-color: ${effect.color}; 
                    color: ${statusId === 'paralysis' ? 'black' : 'white'};
                    padding: 2px 5px; 
                    font-size: 0.7em; 
                    font-weight: bold; 
                    border-radius: 3px; 
                    border: 1px solid rgba(0,0,0,0.15);
                    display: inline-block;
                    white-space: nowrap;
                    line-height: 1;
                    cursor: help;
                  ">${effect.name}</span>
        `;
    }).join('');
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

// 各チーム（陣営）のキャラクターセクションを生成
function renderSection(characters, prefix) {
    return characters.map((char, i) => {
        const activeReelIdx = char.currentReel !== undefined ? char.currentReel : 0;
        const currentCmds = (char.commands && Array.isArray(char.commands[0]))
            ? char.commands[activeReelIdx]
            : char.commands;

        const isDead = char.hp <= 0;
        const isParalyzed = char.status && char.status.includes('paralysis');

        // 現在のリールのスタイル（バッジ用）
        const currentGrade = getReelGradeStyle(activeReelIdx);

        // 💡 修正：最大グレードのスタイルを取得（カード背景用）
        const maxReelIdx = (char.commands && Array.isArray(char.commands[0])) ? char.commands.length - 1 : 0;
        const maxGrade = getReelGradeStyle(maxReelIdx);

        // 💡 修正：デフォルト背景を白から「最大グレードに応じた背景(maxGrade.cardBg)」に変更
        let statusCardStyle = `border: 3px solid transparent; background: ${maxGrade.cardBg} !important; position: relative;`;
        if (maxGrade.cardAnimation) {
            statusCardStyle += ` background-size: 400% 400% !important; animation: ${maxGrade.cardAnimation} !important;`;
        }

        if (isDead) {
            statusCardStyle = 'border: 3px solid #e74c3c !important; box-shadow: inset 0 0 15px rgba(231, 76, 60, 0.2) !important; background: #fce4e4 !important; position: relative;';
        }

        return `
            <div class="character-section ${isDead ? 'is-dead' : ''}" id="${prefix}-section-${i}" 
                 style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; gap: 10px; margin-bottom: 15px; padding: 10px; border-radius: 8px; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); width: 400px; box-sizing: border-box; ${statusCardStyle}">
                
                <div style="display: flex; flex-direction: column; width: 150px; flex-shrink: 0; gap: 4px;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-weight: bold; font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">
                            ${char.name}
                        </span>
                        <span id="${prefix}-reel-badge-${i}" style="padding: 1px 4px; font-size: 0.75em; font-weight: bold; border-radius: 3px; white-space: nowrap; ${currentGrade.style}">${currentGrade.text}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 0.8em; font-weight: bold; color: #333;">
                        <span>HP</span>
                        <span class="hp-text" id="${prefix}-hp-text-${i}" style="white-space: nowrap;">${char.hp}/${char.maxHp}</span>
                    </div>
                    
                    <div class="hp-bar-container" style="width: 100%; height: 8px; background-color: #ddd; border-radius: 4px; overflow: hidden;">
                        <div class="hp-bar" id="${prefix}-hp-bar-${i}" style="width: ${(char.hp / char.maxHp) * 100}%; height: 100%; background-color: #4cd137; transition: width 0.3s ease, background-color 0.3s ease;"></div>
                    </div>
                    
                    <div id="${prefix}-status-${i}" style="display: flex; gap: 2px; min-height: 20px; align-items: center; width: 100%; flex-wrap: wrap;">
                        ${generateStatusBadges(char.status)}
                    </div>

                    <div style="display: flex; gap: 6px; align-items: center; width: 100%;">
                            <div class="character-image" 
                                oncontextmenu="event.preventDefault(); window.showCharacterDetail('${char.id}')"
                                style="width: 64px; height: 64px; border: 1.5px solid #333; background: white; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; flex-shrink: 0; box-sizing: border-box; cursor: pointer;"
                                data-tooltip="右クリックで全リール表示">
                            <img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: contain;">
                        </div>
                        
                        <div id="${prefix}-stats-${i}" class="stat-list" style="font-size: 0.7em; color: #444; display: flex; flex-direction: column; gap: 2px; background: rgba(0,0,0,0.04); padding: 4px; border-radius: 4px; flex: 1; box-sizing: border-box; text-align: left;">
                            ${formatStatValue('⚔️', char.atk, char.baseAtk ?? char.atk)}
                            ${formatStatValue('🔮', char.int, char.baseInt ?? char.int)}
                            ${formatStatValue('👟', char.spd, char.baseSpd ?? char.spd)}
                        </div>
                    </div>
                </div>

                <div class="roulette" id="${prefix}-roulette-${i}" 
                     style="
                        display: flex !important; 
                        flex-direction: row !important; 
                        width: 196px !important;      
                        height: 129px !important;      
                        flex-shrink: 0 !important;      
                        border: 2px solid #333; 
                        border-radius: 5px; 
                        overflow: hidden; 
                        background: #ffffff;            
                        box-sizing: border-box;
                     ">
                    ${generateCommands(prefix, i, currentCmds)}
                </div>

            </div>
        `;
    }).join('');
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
            /* 💡 追加：ダメージポップアップ用の飛び出すアニメーション定義 */
            @keyframes popup-fade-up {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -20%) scale(0.4);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -65%) scale(1.3); /* 最初はドンッと大きく飛び出す */
                }
                40% {
                    transform: translate(-50%, -70%) scale(1.0); /* 少し沈む */
                }
                75% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -105%) scale(0.8); /* 上に消えていく */
                }
            }
        </style>

        <div style="display: flex; gap: 30px; width: 100%; justify-content: center; align-items: flex-start;">
            <div class="party-p" style="display: flex; flex-direction: column; align-items: center;">
                <h2 style="text-align: center; margin-top: 0; color: #2ecc71; margin-bottom: 15px;">味方チーム</h2>
                ${renderSection(gameState.players, 'p')}
            </div>
            <div class="party-e" style="display: flex; flex-direction: column; align-items: center;">
                <h2 style="text-align: center; margin-top: 0; color: #e74c3c; margin-bottom: 15px;">敵チーム</h2>
                ${renderSection(gameState.enemies, 'e')}
            </div>
        </div>
    `;

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
export function updateAllHPBars(gameState) {
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
            if (prevHp !== undefined && prevHp !== char.hp) {
                const diff = char.hp - prevHp;
                if (diff < 0) {
                    // ダメージを受けた（赤文字）
                    showPopupEffect(prefix, i, Math.abs(diff), 'damage');
                    flashCharacterEffect(prefix, i, 'rgba(231, 76, 60, 0.34)');
                } else if (diff > 0) {
                    // 回復した（緑文字、頭にプラス付き）
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
                showPopupEffect(prefix, i, '解除', 'system');
                flashCharacterEffect(prefix, i, 'rgba(52, 152, 219, 0.28)');
            }
            prevStatusMap.set(key, [...currentStatuses]);

            const prevStats = prevStatMap.get(key);
            const currentStats = getStatSnapshot(char);
            if (prevStats) {
                const statDiffs = ['atk', 'int', 'spd'].map(stat => currentStats[stat] - prevStats[stat]);
                const totalDiff = statDiffs.reduce((sum, diff) => sum + diff, 0);
                if (totalDiff !== 0) {
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
                    // 💀 死亡時は確実に赤くする
                    sectionEl.style.setProperty('border', '3px solid #e74c3c', 'important');
                    sectionEl.style.setProperty('box-shadow', 'inset 0 0 15px rgba(231, 76, 60, 0.2)', 'important');
                    sectionEl.style.setProperty('background', '#fce4e4', 'important');
                    sectionEl.style.removeProperty('animation');
                } else {
                    // 現在行動中（すでに黄色枠がついている）かどうかをチェック
                    const isActing = sectionEl.style.borderColor === 'rgb(241, 196, 15)' || sectionEl.style.borderColor === '#f1c40f';

                    if (isActing) {
                        // ⚔️ 行動中のキャラのみ外枠を黄色にする
                        sectionEl.style.setProperty('border', '3px solid #f1c40f', 'important');
                    } else {
                        // 🛡️ 通常時（マヒ時含む）は外枠を透明にする
                        sectionEl.style.setProperty('border', '3px solid transparent', 'important');
                    }

                    // 背景色やシャドウ、虹アニメーションなどは、通常時・マヒ時・行動中問わず、常に最大グレードのデザインを維持
                    sectionEl.style.setProperty('box-shadow', '0 2px 5px rgba(0,0,0,0.05)', 'important');
                    sectionEl.style.setProperty('background', maxGrade.cardBg, 'important');
                    if (maxGrade.cardAnimation) {
                        sectionEl.style.setProperty('background-size', '400% 400%', 'important');
                        sectionEl.style.setProperty('animation', maxGrade.cardAnimation, 'important');
                    } else {
                        sectionEl.style.removeProperty('animation');
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
}
