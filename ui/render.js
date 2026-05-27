// ui/render.js
import { commandEffects } from '../commands/index.js';
import { statusEffects } from '../statusEffects.js';
import { showPopupEffect, flashCharacterEffect, getStatusEffectColor, playHealEffect, playHitEffect, playParalysisReleaseEffect, playStatusApplyEffect, playStatusClearEffect, playTauntStatusEffect } from './effects.js';
import { 
    generateCommands, 
    generateStatusBadges, 
    getReelGradeStyle, 
    formatStatValue,
    formatHpValue,
    formatShieldValue,
    formatSetStatRail,
    formatBattleProgressPanel
} from './components.js';
import { applyCommandTooltips } from './battleCharacterCard.js';
import { getBattleElement, getBattleRoot, getNextActionIconContainer } from './battleDom.js';
import { renderBattleField, renderInitialOrderIcons, renderOrderIconsFromQueue } from './battleView.js';

export function updateOrderIcons(actionQueue) {
    const nextIconContainer = getNextActionIconContainer();
    if (!nextIconContainer) return;

    nextIconContainer.innerHTML = renderOrderIconsFromQueue(actionQueue);
}

export function updateBattleHeader(gameState) {
    const floorText = document.getElementById('floor-text');
    if (floorText) {
        if (gameState?.mode === 'custom') {
            floorText.innerText = 'CUSTOM';
        } else if (gameState?.mode === 'ranked') {
            floorText.innerText = 'RANKED';
        } else {
            floorText.innerText = `${gameState?.currentFloor || 1} / ${gameState?.maxFloor || 1}`;
        }
    }

    const turnText = document.getElementById('turn-text');
    if (turnText) {
        turnText.innerText = String(Math.max(0, Math.floor(Number(gameState?.turn || 0))));
    }
}

// キャラクターの直前のHPを記憶するマップ（ダメージ・回復ポップアップの自動検知用）
export const prevHpMap = new Map();
export const prevShieldMap = new Map();
export const prevStatusMap = new Map();
export const prevStatMap = new Map();

export function getStatSnapshot(char) {
    return {
        atk: char.atk,
        int: char.int,
        spd: char.spd
    };
}

// リール移行時などにコマンドUIとグレードバッジを部分再描画する関数
export function updateCommandsUI(prefix, charIdx, currentCommands, currentReelIndex, char = null) {
    const rouletteEl = getBattleElement(prefix, charIdx, 'roulette');
    if (rouletteEl) {
        rouletteEl.innerHTML = generateCommands(prefix, charIdx, currentCommands);
        if (char) applyCommandTooltips(char, prefix, charIdx, commandEffects);
    }

    const reelBadgeEl = getBattleElement(prefix, charIdx, 'reel-badge');
    if (reelBadgeEl) {
        const grade = getReelGradeStyle(currentReelIndex);
        reelBadgeEl.textContent = grade.text;
        reelBadgeEl.style.cssText = grade.style;
    }
}

// 初期描画関数
export function render(gameState) {
    const container = getBattleRoot();
    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen) {
        const currentFloor = Number(gameState.currentFloor || 1);
        battleScreen.dataset.floor = String(currentFloor);
        battleScreen.dataset.floorTheme = currentFloor <= 2 ? 'tower-lower' : currentFloor <= 4 ? 'tower-middle' : 'tower-upper';
        battleScreen.dataset.mode = gameState.mode || '';
    }
    updateBattleHeader(gameState);

    let target = container;
    if (!target) {
        target = document.createElement('div');
        target.id = 'game-container';
        document.body.appendChild(target);
    }

    target.innerHTML = renderBattleField(gameState);
    
    // Render order icons into the next-action area (if present)
    try {
        const nextIconContainer = getNextActionIconContainer();
        if (nextIconContainer) {
            nextIconContainer.innerHTML = renderInitialOrderIcons(gameState);
        }
    } catch (e) {
        // ignore
    }

    // 初回描画時に前回のHPマップをセット（初回からポップアップが出るのを防ぐため）
    gameState.players.forEach((char, i) => prevHpMap.set(`p-${i}`, char.hp));
    gameState.enemies.forEach((char, i) => prevHpMap.set(`e-${i}`, char.hp));
    gameState.players.forEach((char, i) => prevShieldMap.set(`p-${i}`, char.shield || 0));
    gameState.enemies.forEach((char, i) => prevShieldMap.set(`e-${i}`, char.shield || 0));
    gameState.players.forEach((char, i) => prevStatusMap.set(`p-${i}`, [...(char.status || [])]));
    gameState.enemies.forEach((char, i) => prevStatusMap.set(`e-${i}`, [...(char.status || [])]));
    gameState.players.forEach((char, i) => prevStatMap.set(`p-${i}`, getStatSnapshot(char)));
    gameState.enemies.forEach((char, i) => prevStatMap.set(`e-${i}`, getStatSnapshot(char)));

    updateAllHPBars(gameState);
    const statsPanel = document.getElementById('battle-stats-panel');
    if (statsPanel) {
        statsPanel.classList.remove('hidden');
        statsPanel.dataset.activeTab = statsPanel.dataset.activeTab || 'dealt';
        window.refreshBattleStatsPanel?.();
    }
}

function updateHpChangeEffects(prefix, index, char, prevHp, skipHpPopup) {
    if (prevHp === undefined || prevHp === char.hp) return;

    const diff = char.hp - prevHp;
    if (skipHpPopup) {
        if (char.suppressNextHpPopup) delete char.suppressNextHpPopup;
        return;
    }
    if (char.suppressNextHpPopup) {
        delete char.suppressNextHpPopup;
        flashCharacterEffect(prefix, index, diff > 0 ? 'rgba(46, 204, 113, 0.34)' : 'rgba(231, 76, 60, 0.34)');
        return;
    }
    if (diff < 0) {
        const damageRatio = Math.abs(diff) / Math.max(1, Number(char.maxHp || 1));
        const impact = damageRatio >= 0.32 ? 'heavy' : damageRatio >= 0.12 ? 'light' : 'none';
        showPopupEffect(prefix, index, Math.abs(diff), 'damage');
        playHitEffect(prefix, index, { impact });
        flashCharacterEffect(prefix, index, 'rgba(231, 76, 60, 0.34)');
    } else if (diff > 0) {
        showPopupEffect(prefix, index, `+${diff}`, 'heal');
        playHealEffect(prefix, index);
        flashCharacterEffect(prefix, index, 'rgba(46, 204, 113, 0.34)');
    }
}

function updateShieldChangeEffects(prefix, index, char, prevShield) {
    const currentShield = Math.max(0, Number(char.shield || 0));
    if (prevShield === undefined || prevShield === currentShield) return;
    const diff = currentShield - prevShield;
    if (diff > 0) {
        if (char.suppressNextShieldPopup) {
            delete char.suppressNextShieldPopup;
            flashCharacterEffect(prefix, index, 'rgba(56, 189, 248, 0.26)');
            return;
        }
        showPopupEffect(prefix, index, `SH+${diff}`, 'shield', '#38bdf8');
        flashCharacterEffect(prefix, index, 'rgba(56, 189, 248, 0.26)');
    }
}

function updateStatusChangeEffects(prefix, index, char, addedStatuses, removedStatuses) {
    if (addedStatuses.length > 0) {
        const statusId = addedStatuses[0];
        const statusName = statusEffects?.[statusId]?.name || statusId;
        const statusColor = getStatusEffectColor(statusId);
        if (statusId === 'taunt') {
            playTauntStatusEffect(prefix, index);
            return;
        }
        playStatusApplyEffect(prefix, index, statusColor);
        showPopupEffect(prefix, index, `${statusName}付与`, 'status', statusColor);
        flashCharacterEffect(prefix, index, `${statusColor}66`);
        return;
    }

    if (removedStatuses.length === 0) return;

    const statusNames = removedStatuses
        .map(statusId => statusEffects?.[statusId]?.name || statusId)
        .join(' / ');
    const statusColor = getStatusEffectColor(removedStatuses[0]);

    if (removedStatuses.includes('paralysis')) {
        if (char?.suppressParalysisReleaseEffect) {
            delete char.suppressParalysisReleaseEffect;
            return;
        }
        playParalysisReleaseEffect(prefix, index);
        flashCharacterEffect(prefix, index, 'rgba(125, 211, 252, 0.22)');
        setTimeout(() => {
            showPopupEffect(prefix, index, 'しびれ解除', 'paralysis-release', statusColor);
        }, 240);
        return;
    }

    playStatusClearEffect(prefix, index, statusColor);
    showPopupEffect(prefix, index, `${statusNames} 解除`, 'status-remove', statusColor);
    flashCharacterEffect(prefix, index, `${statusColor}55`);
}

function updateStatChangeEffects(prefix, index, char, prevStats, currentStats, statusChangeCovered) {
    if (!prevStats) return;

    const statDiffs = [
        ['atk', 'ATK'],
        ['int', 'INT'],
        ['spd', 'SPD']
    ]
        .map(([stat, label]) => ({
            label,
            value: Math.floor(Number(currentStats[stat] || 0) - Number(prevStats[stat] || 0))
        }))
        .filter(item => item.value !== 0);
    const totalDiff = statDiffs.reduce((sum, item) => sum + item.value, 0);

    if (statDiffs.length === 0) return;
    if (char.suppressNextStatPopup) {
        delete char.suppressNextStatPopup;
        flashCharacterEffect(prefix, index, totalDiff > 0 ? 'rgba(39, 174, 96, 0.28)' : 'rgba(230, 126, 34, 0.3)');
        return;
    }
    if (statusChangeCovered) return;

    const resultText = statDiffs
        .map(item => `${item.label}${item.value > 0 ? '+' : ''}${item.value}`)
        .join('/');
    showPopupEffect(prefix, index, resultText, totalDiff >= 0 ? 'buff' : 'debuff');
    flashCharacterEffect(prefix, index, totalDiff > 0 ? 'rgba(39, 174, 96, 0.28)' : 'rgba(230, 126, 34, 0.3)');
}

function updateHpBarElements(char, bar, shieldBar, text, shieldText) {
    const hpPercent = char.maxHp > 0 ? Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100)) : 0;
    const shield = Math.max(0, Number(char.shield || 0));
    const hasShield = shield > 0;
    const shieldPercent = char.maxHp > 0
        ? Math.max(0, Math.min(100, (shield / char.maxHp) * 100))
        : 0;

    if (bar) {
        bar.style.width = `${hpPercent}%`;
        bar.style.backgroundColor = hpPercent < 30 ? '#e74c3c' : '#4cd137';
    }
    if (shieldBar) {
        shieldBar.style.left = '0%';
        shieldBar.style.width = `${shieldPercent}%`;
        shieldBar.classList.toggle('is-active', hasShield);
        shieldBar.parentElement?.classList.toggle('has-shield', hasShield);
        shieldBar.setAttribute('aria-label', hasShield ? `シールド ${Math.floor(shield)}` : '');
    }
    if (text) text.innerHTML = formatHpValue(char);
    if (shieldText) shieldText.innerHTML = formatShieldValue(char);
}

function updateCardTheme(char, sectionEl) {
    if (!sectionEl) return;

    if (char.hp <= 0) {
        sectionEl.classList.remove('active-actor', 'is-paralyzed');
        sectionEl.style.removeProperty('border');
        sectionEl.style.removeProperty('box-shadow');
        sectionEl.style.removeProperty('--battle-card-bg');
        sectionEl.style.removeProperty('--battle-card-bg-size');
        sectionEl.style.removeProperty('--battle-card-animation');
        return;
    }

    const isParalyzed = !!(char.status && char.status.includes('paralysis'));
    sectionEl.classList.toggle('is-paralyzed', isParalyzed);

    if (sectionEl.classList.contains('active-actor')) return;

    const maxReelIdx = (char.commands && Array.isArray(char.commands[0])) ? char.commands.length - 1 : 0;
    const maxGrade = getReelGradeStyle(maxReelIdx);
    sectionEl.style.setProperty('--battle-card-bg', maxGrade.cardBg);
    if (maxGrade.cardAnimation) {
        sectionEl.style.setProperty('--battle-card-bg-size', '400% 400%');
        sectionEl.style.setProperty('--battle-card-animation', maxGrade.cardAnimation);
    } else {
        sectionEl.style.removeProperty('--battle-card-bg-size');
        sectionEl.style.removeProperty('--battle-card-animation');
    }
}

// 全員のHP ＆ 状態異常 ＆ コマンド状態のリアルタイム更新関数
export function updateAllHPBars(gameState, options = {}) {
    const skipHpPopup = !!options.skipHpPopup;
    const updateParty = (party, prefix) => {
        party.forEach((char, i) => {
            const bar = getBattleElement(prefix, i, 'hp-bar');
            const shieldBar = getBattleElement(prefix, i, 'shield-bar');
            const text = getBattleElement(prefix, i, 'hp-text');
            const shieldText = getBattleElement(prefix, i, 'shield-text');
            const status = getBattleElement(prefix, i, 'status');
            const stats = getBattleElement(prefix, i, 'stats');
            const setStats = getBattleElement(prefix, i, 'set-stats');
            const progressPanel = getBattleElement(prefix, i, 'progress-panel');
            const sectionEl = getBattleElement(prefix, i, 'section');

            const key = `${prefix}-${i}`;
            const prevHp = prevHpMap.get(key);
            updateHpChangeEffects(prefix, i, char, prevHp, skipHpPopup);
            prevHpMap.set(key, char.hp); // 今回のHPを次のターンのために記憶
            const prevShield = prevShieldMap.get(key);
            updateShieldChangeEffects(prefix, i, char, prevShield);
            prevShieldMap.set(key, Math.max(0, Number(char.shield || 0)));

            const prevStatuses = prevStatusMap.get(key) || [];
            const currentStatuses = char.status || [];
            const addedStatuses = currentStatuses.filter(statusId => !prevStatuses.includes(statusId));
            const removedStatuses = prevStatuses.filter(statusId => !currentStatuses.includes(statusId));
            updateStatusChangeEffects(prefix, i, char, addedStatuses, removedStatuses);
            prevStatusMap.set(key, [...currentStatuses]);

            const prevStats = prevStatMap.get(key);
            const currentStats = getStatSnapshot(char);
            updateStatChangeEffects(prefix, i, char, prevStats, currentStats, addedStatuses.length > 0 || removedStatuses.length > 0);
            prevStatMap.set(key, currentStats);

            updateHpBarElements(char, bar, shieldBar, text, shieldText);
            if (status) status.innerHTML = generateStatusBadges(char.status, char);
            if (stats) {
                stats.innerHTML = `
                    ${formatStatValue('⚔️', char.atk, char.baseAtk ?? char.atk, { setBonus: char.activeSpeciesBonus?.atkBonus })}
                    ${formatStatValue('🔮', char.int, char.baseInt ?? char.int, { setBonus: char.activeSpeciesBonus?.intBonus })}
                    ${formatStatValue('👟', char.spd, char.baseSpd ?? char.spd, { setBonus: char.activeSpeciesBonus?.spdBonus })}
                `;
            }
            if (setStats) setStats.innerHTML = formatSetStatRail(char);
            if (progressPanel) progressPanel.innerHTML = formatBattleProgressPanel(char);

            updateCardTheme(char, sectionEl);

            applyCommandTooltips(char, prefix, i, commandEffects);
        });
    };

    updateParty(gameState.players, 'p');
    updateParty(gameState.enemies, 'e');
    if (typeof window.refreshBattleStatsPanel === 'function') {
        window.refreshBattleStatsPanel();
    }
}
