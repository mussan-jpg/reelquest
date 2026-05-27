// screens/resultScreen.js
import { statusEffects } from '../statusEffects.js';
import { LIMIT_BREAK_MAX_LEVEL, getCharacterLevel, getLimitBreakDisplayText, getLimitBreakRequiredBattlesForLevel, getSpeciesPoints } from '../partySlots.js';

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

function getSetResultEntries(gameState, side = null) {
    const sides = side ? [side] : ['p', 'e'];
    return sides.flatMap(currentSide => Object.values(gameState.battleStats?.set?.[currentSide] || {})
        .filter(stats => hasVisibleSetStats(stats))
        .map(stats => ({ stats, side: currentSide })));
}

function hasVisibleSetStats(stats = {}) {
    return [
        'damageDealt',
        'damageResisted',
        'damageTaken',
        'damageMitigated',
        'healingDone',
        'shieldGranted',
        'statusInflicted',
        'statReduced',
        'statIncreased',
        'statActiveGranted'
    ].some(key => (stats[key] || 0) > 0);
}

function getResultMaxValue(gameState, keys) {
    let maxValue = 0;

    getAllResultEntries(gameState).forEach(({ stats }) => {
        keys.forEach(key => {
            maxValue = Math.max(maxValue, stats[key] || 0);
        });
    });
    getSetResultEntries(gameState).forEach(({ stats }) => {
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

function renderDefenseMetric(stats, globalMaxValue) {
    const damageTaken = stats.damageTaken || 0;
    const damageMitigated = stats.damageMitigated || 0;
    const totalPressure = damageTaken + damageMitigated;
    const percent = getBarPercent(totalPressure, globalMaxValue);
    const takenPercent = getBarPercent(damageTaken, globalMaxValue);
    const mitigatedPercent = getBarPercent(damageMitigated, globalMaxValue);
    return `
        <div class="result-metric result-metric--defense" style="--result-bar-width: ${percent}%; --result-taken-width: ${takenPercent}%; --result-mitigate-width: ${mitigatedPercent}%;">
            <i class="result-defense-segment result-defense-segment--taken"></i>
            <i class="result-defense-segment result-defense-segment--mitigate"></i>
            <span>防御</span>
            <strong>${totalPressure}</strong>
            <small>被 ${damageTaken} / 軽 ${damageMitigated}</small>
        </div>
    `;
}

function renderOffenseMetric(stats, globalMaxValue) {
    const damageDealt = stats.damageDealt || 0;
    const damageResisted = stats.damageResisted || 0;
    const totalOffense = damageDealt + damageResisted;
    const percent = getBarPercent(totalOffense, globalMaxValue);
    const dealtPercent = getBarPercent(damageDealt, globalMaxValue);
    const resistedPercent = getBarPercent(damageResisted, globalMaxValue);
    return `
        <div class="result-metric result-metric--offense" style="--result-bar-width: ${percent}%; --result-dealt-width: ${dealtPercent}%; --result-resisted-width: ${resistedPercent}%;">
            <i class="result-offense-segment result-offense-segment--dealt"></i>
            <i class="result-offense-segment result-offense-segment--resisted"></i>
            <span>攻撃</span>
            <strong>${totalOffense}</strong>
            <small>与 ${damageDealt} / 軽 ${damageResisted}</small>
        </div>
    `;
}

function renderSupportMetric(stats, globalMaxValue) {
    const healingDone = stats.healingDone || 0;
    const shieldGranted = stats.shieldGranted || 0;
    const totalSupport = healingDone + shieldGranted;
    const percent = getBarPercent(totalSupport, globalMaxValue);
    const healPercent = getBarPercent(healingDone, globalMaxValue);
    const shieldPercent = getBarPercent(shieldGranted, globalMaxValue);
    return `
        <div class="result-metric result-metric--support" style="--result-bar-width: ${percent}%; --result-heal-width: ${healPercent}%; --result-shield-width: ${shieldPercent}%;">
            <i class="result-support-segment result-support-segment--heal"></i>
            <i class="result-support-segment result-support-segment--shield"></i>
            <span>支援</span>
            <strong>${totalSupport}</strong>
            <small>回 ${healingDone} / SH ${shieldGranted}</small>
        </div>
    `;
}

function renderSetBuffMetric(stats, globalMaxValue) {
    const total = stats.statIncreased || 0;
    const activeTotal = stats.statActiveGranted || 0;
    const byStat = stats.statIncreasedBy || {};
    const activeByStat = stats.statActiveGrantedBy || {};
    const chips = [
        ['atk', 'ATK'],
        ['int', 'INT'],
        ['spd', 'SPD']
    ]
        .map(([key, label]) => ({ label, value: Math.max(0, Math.floor(Number(byStat[key] || 0))) }))
        .filter(item => item.value > 0);
    const chipHtml = chips.map(item => `<em>${item.label} <b>+${item.value}</b></em>`).join('');
    const activeChips = [
        ['atk', 'ATK'],
        ['int', 'INT'],
        ['spd', 'SPD']
    ]
        .map(([key, label]) => ({ label, value: Math.max(0, Math.floor(Number(activeByStat[key] || 0))) }))
        .filter(item => item.value > 0);
    const activeChipHtml = activeChips.map(item => `<em>${item.label} <b>+${item.value}</b></em>`).join('');
    const displayedTotal = Math.max(total, activeTotal);
    const percent = getBarPercent(displayedTotal, globalMaxValue);
    return `
        <div class="result-metric result-metric--buff result-metric--set-buff" style="--result-bar-width: ${percent}%;">
            <span>${activeTotal > 0 ? '最大能力付与' : '能力上昇内訳'}</span>
            <strong>${displayedTotal}</strong>
            ${chipHtml ? `<div class="result-set-buff-chips">${chipHtml}</div>` : ''}
            ${activeChipHtml ? `<div class="result-set-buff-chips"><small>最大</small>${activeChipHtml}</div>` : ''}
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

function getLevelUpEvent(gameState, char) {
    return (gameState.lastBattleProgressEvents || []).find(event => event.id === char?.id && event.newlyLimitBroken) || null;
}

function renderResultCard(gameState, side, index, maxValues) {
    const { char, stats } = getCharacterStats(gameState, side, index);
    if (!char) return '';

    const statusText = (char.status && char.status.length > 0)
        ? char.status.map(statusId => statusEffects?.[statusId]?.name || statusId).join(', ')
        : 'なし';
    const hpText = `${Math.max(0, char.hp)} / ${char.maxHp}`;
    const hpPercent = char.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((char.hp / char.maxHp) * 100))) : 0;
    const isAlive = char.hp > 0;
    const survivalClass = isAlive ? 'result-card--alive' : 'result-card--defeated';
    const survivalText = isAlive ? '生存' : '戦闘不能';
    const slotText = (char.slotCost || 1) > 1 ? `<span>${char.slotCost}枠</span>` : '';
    const limitBreakText = `<span>${escapeHtml(getLimitBreakDisplayText(char))}</span>`;
    const levelUpEvent = side === 'p' ? getLevelUpEvent(gameState, char) : null;
    const leveledTo = levelUpEvent?.newlyLimitBrokenLevel
        ? Number(levelUpEvent.newlyLimitBrokenLevel) + 1
        : getCharacterLevel(char);
    const levelUpText = levelUpEvent
        ? `<span class="result-level-up">LEVEL UP Lv${Math.max(1, leveledTo)}</span>`
        : '';
    const reelCount = Array.isArray(char.commands?.[0]) ? char.commands.length : 1;
    const currentReel = Math.max(0, Math.min(reelCount - 1, char.currentReel || 0)) + 1;
    const reelText = `<span>リール ${currentReel} / ${reelCount}</span>`;

    return `
        <div class="result-card ${side === 'p' ? 'result-card--ally' : 'result-card--enemy'} ${survivalClass}"
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
                <span class="result-survival-badge">${survivalText}</span>
            </div>
            <div class="result-hp-bar">
                <div style="width: ${hpPercent}%;"></div>
            </div>
            <div class="result-stat-grid">
                ${renderOffenseMetric(stats, maxValues.primary)}
                ${renderDefenseMetric(stats, maxValues.primary)}
                ${renderSupportMetric(stats, maxValues.primary)}
                ${renderResultMetric('異常付与', stats.statusInflicted || 0, maxValues.status, 'status')}
                <div class="result-effect-row">
                    ${renderResultMetric('弱化付与', stats.statReduced || 0, maxValues.statEffect, 'debuff')}
                    ${renderResultMetric('能力上昇', stats.statIncreased || 0, maxValues.statEffect, 'buff')}
                </div>
            </div>
            <div class="result-final-stats">
                ${renderFinalStat('ATK', char.atk, char.baseAtk)}
                ${renderFinalStat('INT', char.int, char.baseInt)}
                ${renderFinalStat('SPD', char.spd, char.baseSpd)}
                ${reelText}
                ${slotText}
                ${side === 'p' ? `${levelUpText}${limitBreakText}<span>種族${getSpeciesPoints(char)}pt</span>` : ''}
                <span>状態: ${escapeHtml(statusText)}</span>
            </div>
        </div>
    `;
}

function renderSetResultCard(entry, maxValues) {
    const stats = entry.stats || {};
    const tierText = stats.tier ? `TIER${stats.tier}` : 'SET';
    const sourceCount = Object.keys(stats.breakdown || {}).length;
    return `
        <div class="result-card result-card--set result-card--${entry.side === 'p' ? 'ally' : 'enemy'}">
            <div class="result-set-header">
                <div>
                    <div class="result-set-kicker">SET EFFECT</div>
                    <div class="result-card-name">${escapeHtml(stats.label || stats.name || 'セット効果')} <span>${escapeHtml(tierText)}</span></div>
                </div>
                <span class="result-set-badge">別枠</span>
            </div>
            <div class="result-stat-grid result-stat-grid--set">
                ${renderOffenseMetric(stats, maxValues.primary)}
                ${renderSupportMetric(stats, maxValues.primary)}
                ${renderResultMetric('異常付与', stats.statusInflicted || 0, maxValues.status, 'status')}
                <div class="result-effect-row">
                    ${renderResultMetric('弱化付与', stats.statReduced || 0, maxValues.statEffect, 'debuff')}
                    ${renderSetBuffMetric(stats, maxValues.statEffect)}
                </div>
            </div>
            <div class="result-set-note">キャラ行動に上乗せせず、セット効果が直接発生させた実績のみ集計${sourceCount > 1 ? ` / ${sourceCount}種` : ''}</div>
        </div>
    `;
}

function renderSetResults(gameState, side, maxValues) {
    const entries = getSetResultEntries(gameState, side);
    if (entries.length === 0) return '';
    return `
        <div class="result-set-block">
            <div class="result-set-block-title">セット効果サマリー</div>
            ${entries.map(entry => renderSetResultCard(entry, maxValues)).join('')}
        </div>
    `;
}

function renderPartyResults(gameState, side, maxValues) {
    const party = side === 'p' ? gameState.players : gameState.enemies;
    return `
        ${renderSetResults(gameState, side, maxValues)}
        ${party.map((_, index) => renderResultCard(gameState, side, index, maxValues)).join('')}
    `;
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
            damageResisted: stats.damageResisted || 0,
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
        dealt: { label: '⚔️', title: '攻撃（与ダメージ+軽減された量）', value: entry => entry.damageDealt + entry.damageResisted, tone: 'dealt' },
        taken: { label: '🛡️', title: '防御（被ダメージ+軽減）', value: entry => entry.damageTaken + entry.damageMitigated, tone: 'taken' },
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
    const dealtPercent = tab === 'dealt' ? getBarPercent(entry.damageDealt, maxValue) : 0;
    const resistedPercent = tab === 'dealt' ? getBarPercent(entry.damageResisted, maxValue) : 0;
    const sideText = entry.side === 'p' ? '味方' : '敵';
    const detailText = tab === 'taken'
        ? `被 ${entry.damageTaken} / 軽減 ${entry.damageMitigated}`
        : tab === 'heal'
            ? `回復 ${entry.healingDone}`
            : `与 ${entry.damageDealt} / 軽減 ${entry.damageResisted}`;

    return `
        <div class="battle-stats-row battle-stats-row--${meta.tone} battle-stats-row--${entry.side}" data-battle-stats-key="${entry.side}-${entry.index}" style="--battle-stats-bar-width: ${percent}%; --battle-stats-taken-width: ${takenPercent}%; --battle-stats-mitigate-width: ${mitigatePercent}%; --battle-stats-dealt-width: ${dealtPercent}%; --battle-stats-resisted-width: ${resistedPercent}%;">
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
            const progressText = (gameState.lastBattleProgressEvents || [])
                .map(event => event.newlyLimitBroken
                    ? `${event.name}: LEVEL UP 現在Lv${Number(event.limitBreakLevel || 0) + 1}`
                    : (event.limitBreakLevel || 0) >= LIMIT_BREAK_MAX_LEVEL
                        ? `${event.name}: 現在Lv${LIMIT_BREAK_MAX_LEVEL + 1}`
                        : `${event.name}: 現在Lv${Number(event.limitBreakLevel || 0) + 1} EXP ${event.battles}/${getLimitBreakRequiredBattlesForLevel((event.limitBreakLevel || 0) + 1)}`)
                .join(' / ');
            winner.className = `result-winner ${winnerInfo.className}`;
            winner.innerHTML = `
                <div class="result-winner-main">${escapeHtml(winnerInfo.text)}</div>
                <div class="result-winner-sub">${escapeHtml(winnerInfo.subText)}</div>
                ${progressText ? `<div class="result-winner-sub">${escapeHtml(progressText)}</div>` : ''}
            `;
        }

        const maxValues = {
            damage: Math.max(0, ...getAllResultEntries(gameState).map(({ stats }) => (
                (stats.damageDealt || 0) + (stats.damageResisted || 0)
            )), ...getSetResultEntries(gameState).map(({ stats }) => (
                (stats.damageDealt || 0) + (stats.damageResisted || 0)
            ))),
            defense: Math.max(0, ...getAllResultEntries(gameState).map(({ stats }) => (
                (stats.damageTaken || 0) + (stats.damageMitigated || 0)
            ))),
            support: Math.max(0, ...getAllResultEntries(gameState).map(({ stats }) => (
                (stats.healingDone || 0) + (stats.shieldGranted || 0)
            )), ...getSetResultEntries(gameState).map(({ stats }) => (
                (stats.healingDone || 0) + (stats.shieldGranted || 0)
            ))),
            status: getResultMaxValue(gameState, ['statusInflicted']),
            statEffect: getResultMaxValue(gameState, ['statReduced', 'statIncreased', 'statActiveGranted'])
        };
        maxValues.primary = Math.max(maxValues.damage, maxValues.defense, maxValues.support);
        allies.innerHTML = renderPartyResults(gameState, 'p', maxValues);
        enemies.innerHTML = renderPartyResults(gameState, 'e', maxValues);

        battleScreen?.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        window.refreshBattleStatsPanel?.();
        continueBtn.textContent = gameState.mode === 'maintenance-preview' ? '管理画面へ戻る' : '次へ';

        continueBtn.onclick = () => {
            resultScreen.classList.add('hidden');
            resolve();
        };
    });
}
