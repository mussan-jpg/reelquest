// ui/components.js
import { commandEffects } from '../commands/index.js';
import { statusEffects } from '../statusEffects.js';
import { formatCharacterTypeLabel, formatSpeciesLabel, getCharacterType, getSpeciesTooltip } from '../screens/shared.js';
import { escapeHtml } from './tooltip.js';

export function getCommandName(commandId) {
    return commandEffects[commandId] ? commandEffects[commandId].name : commandId;
}

export function buildCommandTooltip(effect, char) {
    if (!effect) return '効果: 詳細なし';

    let tooltipText = `${effect.name}\n分類: ${effect.category || 'その他'}\n効果: ${effect.desc || '詳細なし'}`;
    if (typeof effect.calcDamage === 'function') {
        const dmg = effect.calcDamage(char);
        if (dmg > 0) {
            tooltipText += `\n\n【予想ダメージ: ${dmg}】`;
        }
    }
    if (typeof effect.calcHeal === 'function') {
        const heal = effect.calcHeal(char);
        if (heal > 0) {
            tooltipText += `\n\n【予想回復量: ${heal}】`;
        }
    }

    return tooltipText;
}

export function formatStatValue(icon, current, base) {
    const diff = current - base;
    const diffHtml = diff === 0
        ? ''
        : `<span class="stat-delta ${diff > 0 ? 'positive' : 'negative'}">${diff > 0 ? '+' : ''}${diff}</span>`;

    return `<div>${icon}${current}${diffHtml}</div>`;
}

// 💡 修正：リールのグレードスタイルに、カード（キャラクターセクション）全体の背景用スタイル(cardBg)を追加
export function getReelGradeStyle(reelIdx) {
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
        case 3: // ★4 エピック
            return {
                text: "★4",
                style: "background: linear-gradient(135deg, #5b6ee1, #9b59b6) !important; color: #fff !important; border: 1px solid #3442a8 !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.45) !important;",
                cardBg: "linear-gradient(135deg, #d7e7ff, #e8ddff)"
            };
        case 4: // ★5 ミシック
            return {
                text: "★5",
                style: "background: linear-gradient(135deg, #312e81, #4c1d95, #14b8a6) !important; color: #fff !important; border: 1px solid #24115f !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.55) !important;",
                cardBg: "linear-gradient(135deg, #d8ccff, #bac8ff, #a7f3d0)"
            };
        case 5: // ★6 レジェンド
        default:
            return {
                text: "★6",
                style: "background: linear-gradient(45deg, #ff7675, #ffeaa7, #55efc4, #74b9ff, #a29bfe) !important; background-size: 400% 400% !important; animation: rainbow-bg 4s ease infinite !important; color: #fff !important; border: 1px solid #fff !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;",
                cardBg: "linear-gradient(135deg, #ffd6c6, #ffeaa5, #c9f3e8, #d9dcff)"
            };
    }
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
                    padding: 3px 1px !important; 
                    font-size: 0.75em !important; 
                    font-weight: bold !important;
                    width: 28px !important;
                    flex-shrink: 0 !important;
                    height: 94px !important;
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
export function generateStatusBadges(statusList) {
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
            <span class="status-badge" data-tooltip="${escapeHtml(titleText)}"
                  style="background-color: ${effect.color}; color: ${statusId === 'paralysis' ? '#1a1a1a' : '#ffffff'};">
                ${effect.name}
            </span>
        `;
    }).join('');
}

// 各チーム（陣営）のキャラクターセクションを生成
export function renderSection(characters, prefix) {
    return characters.map((char, i) => {
        const activeReelIdx = char.currentReel !== undefined ? char.currentReel : 0;
        const currentCmds = (char.commands && Array.isArray(char.commands[0]))
            ? char.commands[activeReelIdx]
            : char.commands;

        const isDead = char.hp <= 0;
        const isParalyzed = char.status && char.status.includes('paralysis');
        const slotCost = Math.max(1, Math.min(3, char.slotCost || 1));
        const characterType = getCharacterType(char);
        const rarityClass = `rarity-${Math.max(1, Math.min(6, char.rarity || (char.commands && Array.isArray(char.commands[0]) ? char.commands.length : 1)))}`;

        // 現在のリールのスタイル（バッジ用）
        const currentGrade = getReelGradeStyle(activeReelIdx);

        // 💡 修正：最大グレードのスタイルを取得（カード背景用）
        const maxReelIdx = (char.commands && Array.isArray(char.commands[0])) ? char.commands.length - 1 : 0;
        const maxGrade = getReelGradeStyle(maxReelIdx);

        // 💡 修正：デフォルト背景を白から「最大グレードに応じた背景(maxGrade.cardBg)」に変更
        let statusCardStyle = `background: ${maxGrade.cardBg} !important;`;
        if (maxGrade.cardAnimation) {
            statusCardStyle += ` background-size: 400% 400% !important; animation: ${maxGrade.cardAnimation} !important;`;
        }

        if (isDead) {
            statusCardStyle = 'box-shadow: inset 0 0 15px rgba(231, 76, 60, 0.2) !important; background: #fce4e4 !important;';
        }

        return `
            <div class="character-section ${rarityClass} ${isDead ? 'is-dead' : ''}${isParalyzed ? ' is-paralyzed' : ''}" id="${prefix}-section-${i}" 
                 style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; gap: 8px; margin-bottom: 8px; padding: 6px; border-radius: 8px; width: 100%; max-width: 100%; box-sizing: border-box; ${statusCardStyle}">
                
                <div style="display: flex; flex-direction: column; width: 150px; flex-shrink: 0; gap: 4px;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-weight: bold; font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">
                            ${char.name}
                        </span>
                        <span id="${prefix}-reel-badge-${i}" style="padding: 1px 4px; font-size: 0.75em; font-weight: bold; border-radius: 3px; white-space: nowrap; ${currentGrade.style}">${currentGrade.text}</span>
                    </div>
                    ${slotCost > 1 ? `<div class="slot-cost-badge slot-cost-badge--battle">${slotCost}枠モンスター</div>` : ''}

                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 0.8em; font-weight: bold; color: #333;">
                        <span>HP</span>
                        <span class="hp-text" id="${prefix}-hp-text-${i}" style="white-space: nowrap;">${char.hp}/${char.maxHp}</span>
                    </div>
                    
                    <div class="hp-bar-container" style="width: 100%; height: 8px; background-color: #ddd; border-radius: 4px; overflow: hidden;">
                        <div class="hp-bar" id="${prefix}-hp-bar-${i}" style="width: ${(char.hp / char.maxHp) * 100}%; height: 100%; background-color: #4cd137; transition: width 0.3s ease, background-color 0.3s ease;"></div>
                    </div>
                    
                    <div id="${prefix}-status-${i}" style="display: flex; gap: 2px; min-height: 16px; align-items: center; width: 100%; flex-wrap: wrap;">
                        ${generateStatusBadges(char.status)}
                    </div>

                    <div style="display: flex; gap: 6px; align-items: center; width: 100%;">
                            <div class="character-image" 
                                oncontextmenu="event.preventDefault(); window.showCharacterDetail('${char.id}')"
                                style="width: 56px; height: 56px; border: 1.5px solid #333; background: white; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; flex-shrink: 0; box-sizing: border-box; cursor: pointer;"
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

                <div class="battle-reel-stack">
                    <div class="battle-card-tabs">
                        <div class="library-card-type battle-card-type ${characterType.className}">
                            <span class="battle-card-tag-label">${formatCharacterTypeLabel(characterType)}</span>
                        </div>
                        <div class="library-card-type battle-card-type battle-card-species" data-tooltip="${escapeHtml(getSpeciesTooltip(char))}">
                            <span class="battle-card-tag-label">${formatSpeciesLabel(char)}</span>
                        </div>
                    </div>
                    <div class="roulette" id="${prefix}-roulette-${i}" 
                         style="
                            display: flex !important; 
                            flex-direction: row !important; 
                            width: 100% !important;
                            max-width: none !important;
                            flex: 0 0 98px !important;
                            min-width: 0 !important;
                            height: 98px !important;      
                            border: 2px solid #333; 
                            border-radius: 5px; 
                            overflow: hidden; 
                            background: #ffffff;            
                            box-sizing: border-box;
                         ">
                        ${generateCommands(prefix, i, currentCmds)}
                    </div>
                </div>

            </div>
        `;
    }).join('');
}
