// ui/components.js
import { commandEffects } from '../commands/index.js';
import { statusEffects } from '../statusEffects.js';
import { LIMIT_BREAK_MAX_LEVEL, LIMIT_BREAK_REQUIRED_BATTLES, LIMIT_BREAK_TOTAL_REQUIRED_BATTLES, getCharacterLevel, getLimitBreakLevel } from '../partySlots.js';
import { getBaseActionCount, getPendingExtraActionCount, getRemainingActionCount, getStoredActionCount } from '../battle/actionCount.js';
import { escapeHtml } from './tooltip.js';
export { getReelGradeStyle } from './rarityTheme.js';

export function renderOptionButtons(container, options, config = {}) {
    if (!container) return;
    const {
        activeValue,
        activeValues,
        className = 'statistics-filter-btn',
        dataKey = 'value',
        onClick,
        onContextMenu
    } = config;
    const activeSet = activeValues instanceof Set ? activeValues : null;
    container.innerHTML = options.map(option => {
        const value = String(option.value);
        const active = activeSet ? activeSet.has(value) : value === String(activeValue);
        return `
            <button type="button" class="${className} ${active ? 'active' : ''}" data-${dataKey}="${value}">
                ${option.label}
            </button>
        `;
    }).join('');
    container.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => onClick?.(button.dataset[dataKey]));
        if (onContextMenu) {
            button.addEventListener('contextmenu', event => {
                event.preventDefault();
                onContextMenu(button.dataset[dataKey], event);
            });
        }
    });
}

export function renderGradeTabs(container, grades, config = {}) {
    const options = [
        { value: 'all', label: config.allLabel || 'すべて' },
        ...grades.map(grade => ({ value: String(grade), label: `★${grade}` }))
    ];
    renderOptionButtons(container, options, config);
}

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
    if (typeof effect.calcShield === 'function') {
        const shield = effect.calcShield(char);
        if (shield > 0) {
            tooltipText += `\n\n【予想シールド付与量: ${shield}】`;
        }
    }

    return tooltipText;
}

function getPositiveCommandValue(effect, methodName, char) {
    if (typeof effect?.[methodName] !== 'function') return 0;
    return Math.max(0, Math.floor(Number(effect[methodName](char) || 0)));
}

function getStatChangePreviews(effect) {
    const desc = String(effect?.desc || '');
    const previews = [];
    const seen = new Set();
    const pattern = /\b(ATK|INT|SPD)(?:\/(ATK|INT|SPD))?(?:\/(ATK|INT|SPD))?\s*([+-])\s*(\d+)(?!\d)(?!\s*[%x倍])/g;
    let match;
    while ((match = pattern.exec(desc))) {
        const stats = [match[1], match[2], match[3]].filter(Boolean);
        const sign = match[4];
        const amount = Number(match[5] || 0);
        if (!amount) continue;
        stats.forEach(stat => {
            const key = `${stat}:${sign}:${amount}`;
            if (seen.has(key)) return;
            seen.add(key);
            previews.push({
                type: sign === '-' ? 'debuff' : 'buff',
                stat: stat.toLowerCase(),
                value: `${sign}${amount}`
            });
        });
    }
    return previews;
}

export function getCommandForecastValues(effect, char) {
    if (!effect || !char) return [];
    const values = [
        { type: 'damage', value: getPositiveCommandValue(effect, 'calcDamage', char) },
        { type: 'heal', value: getPositiveCommandValue(effect, 'calcHeal', char) },
        { type: 'shield', value: getPositiveCommandValue(effect, 'calcShield', char) }
    ].filter(item => item.value > 0);

    values.push(...getStatChangePreviews(effect));

    return values;
}

export function renderCommandForecast(effect, char) {
    const values = getCommandForecastValues(effect, char);
    if (values.length === 0) return '';

    return `<span class="cmd-forecast" aria-label="予測値">${values
        .slice(0, 4)
        .map(item => `<span class="cmd-forecast-value cmd-forecast-value--${item.type}${item.stat ? ` cmd-forecast-value--${item.stat}` : ''}">${item.value}</span>`)
        .join('')}</span>`;
}

export function formatStatValue(icon, current, base, options = {}) {
    const diff = current - base;
    const setBonus = Number(options.setBonus || 0);
    const valueStateClass = diff < 0 ? ' is-debuffed' : (diff > 0 || setBonus > 0) ? ' is-buffed' : '';
    const diffHtml = diff === 0
        ? ''
        : `<span class="stat-delta ${diff > 0 ? 'positive' : 'negative'}">${diff > 0 ? '+' : ''}${diff}</span>`;

    return `<div class="battle-stat-row">
        <span class="battle-stat-icon">${icon}</span>
        <span class="battle-stat-value${valueStateClass}">${current}</span>
        <span class="battle-stat-modifiers">${diffHtml}</span>
    </div>`;
}

export function formatSetStatRail(char) {
    const activeBonus = char?.activeSpeciesBonus || {};
    const dynamicAtkBonus = Number(char?.humanPointAtkBonus || 0) + Number(char?.demonDoomAtkBonus || 0) + Number(char?.undeadLastStandAtkBonus || 0) + Number(char?.dragonReelAtkBonus || 0);
    const dynamicIntBonus = Number(char?.humanPointIntBonus || 0) + Number(char?.demonDoomIntBonus || 0) + Number(char?.undeadLastStandIntBonus || 0) + Number(char?.dragonReelIntBonus || 0);
    const rows = [
        { label: 'ATK', staticValue: Number(activeBonus.atkBonus || 0), dynamicValue: dynamicAtkBonus, base: (char?.baseAtk ?? char?.atk ?? 0) },
        { label: 'INT', staticValue: Number(activeBonus.intBonus || 0), dynamicValue: dynamicIntBonus, base: (char?.baseInt ?? char?.int ?? 0) },
        { label: 'SPD', staticValue: Number(activeBonus.spdBonus || 0), dynamicValue: 0, base: (char?.baseSpd ?? char?.spd ?? 0) }
    ];

    return rows.map(row => {
        const value = row.staticValue + row.dynamicValue;
        if (!value) return '<span class="battle-set-stat-chip is-empty"></span>';
        const baseWithoutSet = row.base - row.staticValue;
        const detail = [
            row.staticValue ? `常時セット +${row.staticValue}` : '',
            row.dynamicValue ? `戦闘中セット +${row.dynamicValue}` : ''
        ].filter(Boolean).join(' / ');
        const tooltip = `${row.label}: 基礎 ${baseWithoutSet}${detail ? ` / ${detail}` : ''}`;
        return `<span class="battle-set-stat-chip" data-tooltip="${escapeHtml(tooltip)}">S+${value}</span>`;
    }).join('');
}

export function formatHpValue(char) {
    const hpBonus = Number(char?.activeSpeciesBonus?.hpBonus || 0);
    const maxHp = Number(char?.maxHp || 0);
    const baseMaxHp = Math.max(1, maxHp - hpBonus);
    const setBonusHtml = hpBonus === 0
        ? ''
        : `<span class="battle-hp-set-bonus" data-tooltip="${escapeHtml(`最大HP: 基礎 ${baseMaxHp} + セット効果 ${hpBonus} = ${maxHp}`)}">S+${hpBonus}</span>`;

    return `${Math.max(0, char.hp)} / ${maxHp}${setBonusHtml}`;
}

export function formatShieldValue(char) {
    const shield = Math.max(0, Math.floor(Number(char?.shield || 0)));
    if (shield <= 0) return '';
    return `<span class="battle-shield-chip" data-tooltip="${escapeHtml(`シールド: 次に受けるダメージを${shield}軽減し、その分だけ減少します`)}">SH ${shield}</span>`;
}

function renderProgressPips(current, total, options = {}) {
    const safeTotal = Math.max(1, Number(total || 1));
    const safeCurrent = Math.max(0, Math.min(safeTotal, Number(current || 0)));
    const filled = options.forceFull ? safeTotal : safeCurrent;
    return Array.from({ length: safeTotal }, (_, index) => (
        `<span class="battle-progress-pip ${index < filled ? 'is-filled' : ''}"></span>`
    )).join('');
}

function getLimitBreakProgressMeta(char) {
    const level = getLimitBreakLevel(char);
    const exp = Math.min(LIMIT_BREAK_TOTAL_REQUIRED_BATTLES, Math.max(0, Number(char?.limitBreakExp || char?.limit_break_exp || 0)));
    if (level >= LIMIT_BREAK_MAX_LEVEL) {
        return {
            label: `LB${LIMIT_BREAK_MAX_LEVEL}`,
            current: LIMIT_BREAK_REQUIRED_BATTLES,
            total: LIMIT_BREAK_REQUIRED_BATTLES,
            forceFull: true,
            tooltip: `限界突破${LIMIT_BREAK_MAX_LEVEL}済み`
        };
    }

    const currentStageExp = exp % LIMIT_BREAK_REQUIRED_BATTLES;
    const current = currentStageExp === 0 && exp > 0 ? LIMIT_BREAK_REQUIRED_BATTLES : currentStageExp;
    return {
        label: level > 0 ? `LB${level}` : 'EXP',
        current,
        total: LIMIT_BREAK_REQUIRED_BATTLES,
        forceFull: false,
        tooltip: level > 0
            ? `限界突破${level} / 次まで ${current}/${LIMIT_BREAK_REQUIRED_BATTLES}`
            : `限界突破まで ${current}/${LIMIT_BREAK_REQUIRED_BATTLES}`
    };
}

function getBattleStackChips(char) {
    const chips = [];
    const dragonAtk = Number(char?.dragonReelAtkBonus || 0);
    const dragonInt = Number(char?.dragonReelIntBonus || 0);
    if (char?.species === 'dragon' && (dragonAtk > 0 || dragonInt > 0)) {
        const stage = Math.max(1, Number(char?.dragonReelStage || 0));
        const labelValue = dragonAtk === dragonInt ? `A/I+${dragonAtk}` : `A+${dragonAtk} I+${dragonInt}`;
        chips.push({
            label: `竜R${stage} ${labelValue}`,
            tooltip: `竜族 リール補正\nリール段数: ${stage}\nATK+${dragonAtk} / INT+${dragonInt}`,
            className: 'battle-stack-chip--dragon'
        });
    }
    const humanPoints = Number(char?.humanSetPoints || 0);
    if (humanPoints > 0) chips.push({ label: `士${humanPoints}`, tooltip: `士気: ${humanPoints}` });
    const doom = Number(char?.demonDoomCount || 0);
    if (doom > 0) chips.push({ label: `破${doom}`, tooltip: `破滅カウント: ${doom}` });
    const core = Number(char?.constructRecycleCore || 0);
    if (core > 0) chips.push({ label: `廃材${formatCompactStackValue(core)}`, tooltip: `無機族 廃材: ${Math.floor(core)}`, className: 'battle-stack-chip--construct' });
    const slimeMucus = Number(char?.slimeMucus || 0);
    if (slimeMucus > 0) {
        chips.push({
            label: `粘${formatCompactStackValue(slimeMucus)}`,
            tooltip: `スライム族 粘液: ${Math.floor(slimeMucus)}\nターン終了時の粘液再生/分裂追撃、分裂再行動の消費に使われます`,
            className: 'battle-stack-chip--slime'
        });
    }
    const natureBuds = Number(char?.natureBuds || 0);
    if (natureBuds > 0) {
        chips.push({
            label: `芽${formatCompactStackValue(natureBuds)}`,
            tooltip: `自然族 芽吹き: ${Math.floor(natureBuds)}\nターン終了時の芽吹き循環、魔法開花の消費に使われます`,
            className: 'battle-stack-chip--nature'
        });
    }
    const tide = Number(char?.aquaticTide || 0);
    if (tide > 0) {
        chips.push({
            label: `潮${formatCompactStackValue(tide)}`,
            tooltip: `水棲族 潮流: ${Math.floor(tide)}\nターン終了時、潮流反射の固定ダメージに変換されます`,
            className: 'battle-stack-chip--tide'
        });
    }
    const huntStacks = Number(char?.beastHuntStacks || 0);
    if (huntStacks > 0) {
        chips.push({
            label: `狩${formatCompactStackValue(huntStacks)}`,
            tooltip: `獣族 狩猟: ${Math.floor(huntStacks)}\n回避時に上限なしで蓄積し、ターン開始時の群れの号令に加算されます`,
            className: 'battle-stack-chip--hunt'
        });
    }
    const undeadAtk = Number(char?.undeadLastStandAtkBonus || 0);
    const undeadInt = Number(char?.undeadLastStandIntBonus || 0);
    const undeadPercent = Math.round(Number(char?.undeadLastStandPercent || 0) * 100);
    if (undeadAtk || undeadInt) {
        chips.push({
            label: `死+${undeadPercent}%`,
            tooltip: `不死族 死力: 現在HPに応じてATK/INT+${undeadPercent}%（ATK+${undeadAtk} / INT+${undeadInt}）`,
            className: 'battle-stack-chip--undead'
        });
    }
    return chips;
}

function formatCompactStackValue(value) {
    const amount = Math.max(0, Math.floor(Number(value || 0)));
    if (amount >= 1000) return `${Math.floor(amount / 100) / 10}k`;
    return String(amount);
}

function getActionCountMeta(char) {
    const base = getBaseActionCount(char);
    const stored = getStoredActionCount(char);
    const pending = getPendingExtraActionCount(char);
    const remaining = getRemainingActionCount(char);
    const label = `${remaining}回`;
    const tooltip = pending > 0
        ? `このターンの残り行動: ${remaining}回（保持${stored}回 + 追加予約${pending}回 / 基本${base}回）`
        : `このターンの残り行動: ${remaining}回（基本${base}回）`;
    return { base, stored, pending, remaining, label, tooltip };
}

export function formatBattleProgressPanel(char) {
    const lb = getLimitBreakProgressMeta(char);
    const characterLevel = getCharacterLevel(char);
    const actionCount = getActionCountMeta(char);
    const chips = getBattleStackChips(char);
    const chipHtml = chips.length
        ? chips.map(chip => `<span class="battle-stack-chip ${escapeHtml(chip.className || '')}" data-tooltip="${escapeHtml(chip.tooltip)}">${escapeHtml(chip.label)}</span>`).join('')
        : '<span class="battle-stack-chip is-empty">STK</span>';

    return `
        <div class="battle-progress-side-panel">
            <div class="battle-progress-row" data-tooltip="${escapeHtml(lb.tooltip)}">
                <span class="battle-progress-label">${escapeHtml(lb.label)}</span>
                <span class="battle-progress-pips">${renderProgressPips(lb.current, lb.total, { forceFull: lb.forceFull })}</span>
            </div>
            <div class="battle-progress-row battle-progress-row--level" data-tooltip="${escapeHtml(`現在Lv${characterLevel}`)}">
                <span class="battle-progress-label">Lv</span>
                <strong>${characterLevel}</strong>
            </div>
            <div class="battle-progress-row battle-progress-row--actions ${actionCount.pending > 0 || actionCount.remaining > actionCount.base ? 'has-extra-actions' : ''}" data-tooltip="${escapeHtml(actionCount.tooltip)}">
                <span class="battle-progress-label">ACT</span>
                <strong>${escapeHtml(actionCount.label)}${actionCount.pending > 0 ? `<small>+${actionCount.pending}</small>` : ''}</strong>
            </div>
            <div class="battle-stack-row">${chipHtml}</div>
        </div>
    `;
}

// コマンド（ルーレット）の生成
export function generateCommands(prefix, charIdx, currentCommands) {
    if (!currentCommands || currentCommands.length === 0) return '';

    return currentCommands.map((id, i) => {
        const cmdName = getCommandName(id);
        const isActive = i === 0 ? 'active' : '';
        return `
            <div class="cmd-item battle-command ${isActive}" id="${prefix}-${charIdx}-c${i}">
                <span class="cmd-name">${escapeHtml(cmdName)}</span>
            </div>
        `;
    }).join('');
}

// マヒバッジの文字を黒にして視認性を向上
export function generateStatusBadges(statusList, character = null) {
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
        const stackCount = Math.max(1, Math.floor(Number(character?.statusStacks?.[statusId] || 1)));
        const stackText = stackCount > 1 ? ` x${stackCount}` : '';
        const tauntTurns = statusId === 'taunt' ? Math.max(0, Math.floor(Number(character?.tauntDuration || 0))) : 0;
        const durationText = tauntTurns > 0 ? ` ${tauntTurns}T` : '';
        const titleText = effect.desc
            ? `${effect.name}${stackText}${durationText} - ${effect.desc}${durationText ? `（残り${tauntTurns}ターン）` : ''}`
            : `${effect.name}${stackText}${durationText}`;
        return `
            <span class="status-badge" data-status-id="${escapeHtml(statusId)}" data-tooltip="${escapeHtml(titleText)}"
                  style="background-color: ${effect.color}; color: ${statusId === 'paralysis' ? '#1a1a1a' : '#ffffff'};">
                ${effect.name}${stackText}
                ${tauntTurns > 0 ? `<span class="status-badge-turns" aria-label="残り${tauntTurns}ターン">${tauntTurns}</span>` : ''}
            </span>
        `;
    }).join('');
}

