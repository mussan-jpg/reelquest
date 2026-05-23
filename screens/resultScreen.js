// screens/resultScreen.js
import { statusEffects } from '../statusEffects.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getCharacterStats(gameState, side, index) {
    const char = (side === 'p' ? gameState.players : gameState.enemies)[index];
    const stats = gameState.battleStats?.[side]?.[index] || {};
    return { char, stats };
}

function getAllResultEntries(gameState) {
    return [
        ...(gameState.players || []).map((_, index) => getCharacterStats(gameState, 'p', index)),
        ...(gameState.enemies || []).map((_, index) => getCharacterStats(gameState, 'e', index))
    ];
}

function getResultMaxValue(gameState, keys) {
    let maxValue = 0;

    getAllResultEntries(gameState).forEach(({ stats }) => {
        keys.forEach(key => {
            maxValue = Math.max(maxValue, stats[key] || 0);
        });
    });

    return maxValue;
}

function getBarPercent(value, globalMaxValue) {
    if (!globalMaxValue || value <= 0) return 0;
    return Math.round((value / globalMaxValue) * 100);
}

function renderResultMetric(label, value, globalMaxValue, tone) {
    const percent = getBarPercent(value, globalMaxValue);
    return `
        <div class="result-metric result-metric--${tone}" style="--result-bar-width: ${percent}%;">
            <span>${label}</span>
            <strong>${value}</strong>
        </div>
    `;
}

function renderFinalStat(label, current, base) {
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const safeBase = Number.isFinite(base) ? base : safeCurrent;
    const diff = safeCurrent - safeBase;
    const diffText = diff === 0 ? '' : ` <em class="result-stat-delta ${diff > 0 ? 'positive' : 'negative'}">(${diff > 0 ? '+' : ''}${diff})</em>`;
    return `<span>${label} ${safeCurrent}${diffText}</span>`;
}

function renderResultCard(gameState, side, index, maxValues) {
    const { char, stats } = getCharacterStats(gameState, side, index);
    if (!char) return '';

    const statusText = (char.status && char.status.length > 0)
        ? char.status.map(statusId => statusEffects?.[statusId]?.name || statusId).join(', ')
        : 'なし';
    const hpText = `${Math.max(0, char.hp)} / ${char.maxHp}`;
    const hpPercent = char.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((char.hp / char.maxHp) * 100))) : 0;
    const slotText = (char.slotCost || 1) > 1 ? `<span>${char.slotCost}枠</span>` : '';
    const reelCount = Array.isArray(char.commands?.[0]) ? char.commands.length : 1;
    const currentReel = Math.max(0, Math.min(reelCount - 1, char.currentReel || 0)) + 1;
    const reelText = `<span>リール ${currentReel} / ${reelCount}</span>`;

    return `
        <div class="result-card ${side === 'p' ? 'result-card--ally' : 'result-card--enemy'}"
             oncontextmenu="event.preventDefault(); window.showCharacterDetail('${escapeHtml(char.id)}'); return false;"
             title="右クリックで詳細表示">
            <div class="result-card-header">
                <div class="result-card-img">
                    <img src="${escapeHtml(char.image)}" alt="${escapeHtml(char.name)}">
                </div>
                <div>
                    <div class="result-card-name">${escapeHtml(char.name)}</div>
                    <div class="result-card-hp">HP ${hpText}</div>
                </div>
            </div>
            <div class="result-hp-bar">
                <div style="width: ${hpPercent}%;"></div>
            </div>
            <div class="result-stat-grid">
                ${renderResultMetric('与ダメージ', stats.damageDealt || 0, maxValues.damage, 'dealt')}
                ${renderResultMetric('被ダメージ', stats.damageTaken || 0, maxValues.damage, 'taken')}
                ${renderResultMetric('回復量', stats.healingDone || 0, maxValues.damage, 'heal')}
                ${renderResultMetric('軽減量', stats.damageMitigated || 0, maxValues.damage, 'mitigate')}
                <div class="result-effect-row">
                    ${renderResultMetric('異常付与', stats.statusInflicted || 0, maxValues.status, 'status')}
                    ${renderResultMetric('弱化付与', stats.statReduced || 0, maxValues.statEffect, 'debuff')}
                    ${renderResultMetric('強化付与', stats.statIncreased || 0, maxValues.statEffect, 'buff')}
                </div>
            </div>
            <div class="result-final-stats">
                ${renderFinalStat('ATK', char.atk, char.baseAtk)}
                ${renderFinalStat('INT', char.int, char.baseInt)}
                ${renderFinalStat('SPD', char.spd, char.baseSpd)}
                ${reelText}
                ${slotText}
                <span>状態: ${escapeHtml(statusText)}</span>
            </div>
        </div>
    `;
}

function renderPartyResults(gameState, side, maxValues) {
    const party = side === 'p' ? gameState.players : gameState.enemies;
    return party.map((_, index) => renderResultCard(gameState, side, index, maxValues)).join('');
}

function getWinnerInfo(gameState) {
    const playersAlive = (gameState.players || []).some(char => char.hp > 0);
    const enemiesAlive = (gameState.enemies || []).some(char => char.hp > 0);

    if (playersAlive && !enemiesAlive) {
        return {
            className: 'result-winner--ally',
            text: 'WIN - 味方チーム勝利',
            subText: '敵チームを撃破しました'
        };
    }
    if (!playersAlive && enemiesAlive) {
        return {
            className: 'result-winner--enemy',
            text: 'LOSE - 敵チーム勝利',
            subText: '味方チームが全滅しました'
        };
    }
    return {
        className: 'result-winner--draw',
        text: 'DRAW',
        subText: '両チームが戦闘不能になりました'
    };
}

function getBattleStatsEntries(gameState) {
    const buildEntries = (party, side) => (party || []).map((char, index) => {
        const stats = gameState.battleStats?.[side]?.[index] || {};
        return {
            char,
            side,
            index,
            stats,
            damageDealt: stats.damageDealt || 0,
            damageTaken: stats.damageTaken || 0,
            damageMitigated: stats.damageMitigated || 0,
            healingDone: stats.healingDone || 0
        };
    });

    return [
        ...buildEntries(gameState.players, 'p'),
        ...buildEntries(gameState.enemies, 'e')
    ];
}

function getBattleStatsTabMeta(tab) {
    const tabs = {
        dealt: { label: '⚔️', title: '与ダメージ', value: entry => entry.damageDealt, tone: 'dealt' },
        taken: { label: '🩹', title: '被ダメージ+軽減', value: entry => entry.damageTaken + entry.damageMitigated, tone: 'taken' },
        heal: { label: '💚', title: '回復', value: entry => entry.healingDone, tone: 'heal' }
    };
    return tabs[tab] || tabs.dealt;
}

function renderBattleStatsRow(entry, tab, maxValue) {
    const meta = getBattleStatsTabMeta(tab);
    const value = meta.value(entry);
    const percent = getBarPercent(value, maxValue);
    const takenPercent = tab === 'taken' ? getBarPercent(entry.damageTaken, maxValue) : 0;
    const mitigatePercent = tab === 'taken' ? getBarPercent(entry.damageMitigated, maxValue) : 0;
    const sideText = entry.side === 'p' ? '味方' : '敵';
    const detailText = tab === 'taken'
        ? `被 ${entry.damageTaken} / 軽減 ${entry.damageMitigated}`
        : tab === 'heal'
            ? `回復 ${entry.healingDone}`
            : `与ダメ ${entry.damageDealt}`;

    return `
        <div class="battle-stats-row battle-stats-row--${meta.tone} battle-stats-row--${entry.side}" data-battle-stats-key="${entry.side}-${entry.index}" style="--battle-stats-bar-width: ${percent}%; --battle-stats-taken-width: ${takenPercent}%; --battle-stats-mitigate-width: ${mitigatePercent}%;">
            <div class="battle-stats-rank-img">
                <img src="${escapeHtml(entry.char.image)}" alt="${escapeHtml(entry.char.name)}">
            </div>
            <div class="battle-stats-rank-main">
                <div>
                    <span class="battle-stats-side battle-stats-side--${entry.side}">${sideText}</span>
                    <strong>${escapeHtml(entry.char.name)}</strong>
                </div>
                <small>${detailText}</small>
            </div>
            <div class="battle-stats-rank-value">${value}</div>
        </div>
    `;
}

export function renderBattleStatsPanel(gameState, activeTab = 'dealt') {
    const entries = getBattleStatsEntries(gameState);
    const meta = getBattleStatsTabMeta(activeTab);
    const sortedEntries = entries
        .map(entry => ({ ...entry, activeValue: meta.value(entry) }))
        .sort((a, b) => b.activeValue - a.activeValue);
    const maxValue = Math.max(0, ...sortedEntries.map(entry => entry.activeValue));
    const tabs = ['dealt', 'taken', 'heal'];

    return `
        <div class="battle-stats-header">
            <button type="button" class="battle-stats-close" onclick="toggleBattleStatsPanel()">×</button>
        </div>
        <div class="battle-stats-tabs">
            ${tabs.map(tab => `
                <button type="button" class="${tab === activeTab ? 'active' : ''}" data-battle-stats-tab="${tab}">
                    <span title="${getBattleStatsTabMeta(tab).title}">${getBattleStatsTabMeta(tab).label}</span>
                </button>
            `).join('')}
        </div>
        <div class="battle-stats-list">
            ${sortedEntries.map(entry => renderBattleStatsRow(entry, activeTab, maxValue)).join('')}
        </div>
    `;
}

export function showBattleResult(gameState) {
    return new Promise(resolve => {
        const resultScreen = document.getElementById('result-screen');
        const battleScreen = document.getElementById('battle-screen');
        const title = document.getElementById('result-title');
        const winner = document.getElementById('result-winner');
        const allies = document.getElementById('result-allies');
        const enemies = document.getElementById('result-enemies');
        const continueBtn = document.getElementById('result-continue-btn');

        if (!resultScreen || !allies || !enemies || !continueBtn) {
            resolve();
            return;
        }

        if (title) {
            title.textContent = `${gameState.currentFloor}階 リザルト`;
        }
        if (winner) {
            const winnerInfo = getWinnerInfo(gameState);
            winner.className = `result-winner ${winnerInfo.className}`;
            winner.innerHTML = `
                <div class="result-winner-main">${escapeHtml(winnerInfo.text)}</div>
                <div class="result-winner-sub">${escapeHtml(winnerInfo.subText)}</div>
            `;
        }

        const maxValues = {
            damage: getResultMaxValue(gameState, ['damageDealt', 'damageTaken', 'healingDone', 'damageMitigated']),
            status: getResultMaxValue(gameState, ['statusInflicted']),
            statEffect: getResultMaxValue(gameState, ['statReduced', 'statIncreased'])
        };
        allies.innerHTML = renderPartyResults(gameState, 'p', maxValues);
        enemies.innerHTML = renderPartyResults(gameState, 'e', maxValues);

        battleScreen?.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        window.refreshBattleStatsPanel?.();

        continueBtn.onclick = () => {
            resultScreen.classList.add('hidden');
            resolve();
        };
    });
}
