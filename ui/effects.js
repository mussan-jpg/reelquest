// ui/effects.js
import { statusEffects } from '../statusEffects.js';
import { getBattleElement } from './battleDom.js';

const POPUP_STAGGER_MS = 580;
const POPUP_DURATION_MS = 980;
const SET_CUE_DURATION_MS = 1100;
const SET_APPLY_DELAY_MS = 900;
const SET_POPUP_DURATION_MS = 1180;
const popupQueues = new Map();
const globalPopupQueues = new Map();
const effectTimers = new Set();
const elementEffectTimers = new WeakMap();
let setEffectSequence = Promise.resolve();
let queuedSetEffectCount = 0;
let effectQueueEpoch = 0;

const CHARACTER_EFFECTS = {
    attack: { className: 'is-attacking', duration: 460 },
    hit: { className: 'is-hit-damage', duration: 520 },
    heavyHit: { className: 'is-hit-heavy', duration: 720 },
    devastatingHit: { className: 'is-hit-devastating', duration: 860 },
    heal: { className: 'is-healed', duration: 560 },
    supportCast: { className: 'is-support-casting', duration: 620 },
    supportReceive: { className: 'is-support-receiving', duration: 720 },
    reelUp: { className: 'is-reel-supported', duration: 820 },
    setBonus: { className: 'is-set-bonus-activating', duration: 780 },
    relic: { className: 'is-relic-activating', duration: 780 },
    paralysisStun: { className: 'is-paralysis-stunned', duration: 780 },
    paralysisRelease: { className: 'is-paralysis-releasing', duration: 620 },
    statusApply: { className: 'is-status-applying', duration: 640 },
    statusClear: { className: 'is-status-clearing', duration: 620 },
    tauntDraw: { className: 'is-taunt-drawing', duration: 900 },
    evasion: { className: 'is-evading', duration: 620 },
    guard: { className: 'is-guarding-hit', duration: 680 },
    poisonDamage: { className: 'is-poison-damaged', duration: 760 },
    soulFollowup: { className: 'is-soul-followup', duration: 1450 }
};

const SET_SPECIES_ICONS = {
    slime: '💧',
    human: '👤',
    beast: '🐾',
    nature: '🌿',
    aquatic: '🌊',
    undead: '💀',
    demon: '😈',
    dragon: '🐉',
    construct: '🪨'
};

function getSetSpeciesIcon(setInfo) {
    return SET_SPECIES_ICONS[setInfo?.species] || '✦';
}

const CHARACTER_EFFECT_CLASSES = Object.values(CHARACTER_EFFECTS)
    .map(effect => effect.className);

function getBattleSpeedMultiplier() {
    const speedEl = document.getElementById('battle-speed');
    const activeButton = speedEl?.querySelector?.('.battle-speed-btn.active');
    const speed = Number(activeButton?.dataset.speed || speedEl?.dataset.speed || 1);
    return [1, 3, 10].includes(speed) ? speed : 1;
}

function getScaledEffectDuration(durationMs, minDurationMs = 120) {
    const speed = getBattleSpeedMultiplier();
    return Math.max(minDurationMs, Math.round(durationMs / speed));
}

function scheduleEffectTimer(callback, durationMs) {
    const timerId = setTimeout(() => {
        effectTimers.delete(timerId);
        callback();
    }, durationMs);
    effectTimers.add(timerId);
    return timerId;
}

function waitForScaledEffect(durationMs, minDurationMs = 80) {
    return new Promise(resolve => {
        scheduleEffectTimer(resolve, getScaledEffectDuration(durationMs, minDurationMs));
    });
}

function clearElementEffectTimer(sectionEl, key) {
    const timers = elementEffectTimers.get(sectionEl);
    const timerId = timers?.[key];
    if (!timerId) return;
    clearTimeout(timerId);
    effectTimers.delete(timerId);
    delete timers[key];
}

function setElementEffectTimer(sectionEl, key, callback, durationMs) {
    clearElementEffectTimer(sectionEl, key);
    const timers = elementEffectTimers.get(sectionEl) || {};
    timers[key] = scheduleEffectTimer(() => {
        delete timers[key];
        callback();
    }, durationMs);
    elementEffectTimers.set(sectionEl, timers);
}

function getPopupQueue(key) {
    if (!popupQueues.has(key)) {
        popupQueues.set(key, { items: [], timerId: null });
    }
    return popupQueues.get(key);
}

function getGlobalPopupQueue(key) {
    if (!globalPopupQueues.has(key)) {
        globalPopupQueues.set(key, { items: [], timerId: null });
    }
    return globalPopupQueues.get(key);
}

const POPUP_ACCENT = {
    damage: '#e74c3c',
    heal: '#27ae60',
    system: '#3498db',
    status: '#9b59b6',
    'status-remove': '#3498db',
    'paralysis-stun': '#facc15',
    'paralysis-release': '#facc15',
    shield: '#38bdf8',
    buff: '#00b894',
    debuff: '#e17055',
    reel: '#f59e0b',
    set: '#14b8a6',
    relic: '#60a5fa'
};

const CHIP_TYPES = new Set(['status', 'status-remove', 'shield', 'buff', 'debuff', 'system', 'reel', 'set', 'relic']);

function parseHexColor(hex) {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!match) return { r: 155, g: 89, b: 182 };
    const value = match[1];
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
}

function applyChipColors(popup, accentHex) {
    const { r, g, b } = parseHexColor(accentHex);
    const tint = (channel) => Math.round(channel + (255 - channel) * 0.06);
    const shade = (channel) => Math.round(channel * 0.78);
    const bgR = tint(r);
    const bgG = tint(g);
    const bgB = tint(b);
    const luminance = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255;

    popup.style.setProperty('--popup-accent', accentHex);
    popup.style.setProperty('--popup-bg', `rgb(${bgR}, ${bgG}, ${bgB})`);
    popup.style.setProperty('--popup-border', `rgb(${shade(r)}, ${shade(g)}, ${shade(b)})`);
    popup.style.setProperty('--popup-shadow', `rgba(${shade(r)}, ${shade(g)}, ${shade(b)}, 0.5)`);
    popup.style.setProperty('--popup-text', luminance > 0.62 ? '#1a1a1a' : '#ffffff');
}

function escapeSelectorValue(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
}

function getFloatLayer(sectionEl) {
    let layer = sectionEl.querySelector('.battle-float-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.className = 'battle-float-layer';
        sectionEl.style.position = 'relative';
        sectionEl.appendChild(layer);
    }
    return layer;
}

function renderPopup(prefix, charIdx, text, type, customColor) {
    const sectionEl = getBattleElement(prefix, charIdx, 'section');
    if (!sectionEl) return;

    const popup = document.createElement('div');
    popup.className = `battle-float battle-float--${type}`;
    if (type === 'damage-detail' && text && typeof text === 'object') {
        if (text.severity) {
            popup.classList.add(`battle-float--damage-${text.severity}`);
        }

        if (text.callout) {
            const callout = document.createElement('div');
            callout.className = 'battle-damage-callout';
            callout.textContent = text.callout;
            popup.appendChild(callout);
        }

        const main = document.createElement('div');
        main.className = 'battle-damage-main';
        main.textContent = text.value;

        const sub = document.createElement('div');
        sub.className = 'battle-damage-sub';
        sub.textContent = text.formula;

        popup.appendChild(main);
        popup.appendChild(sub);

        if (Array.isArray(text.tags) && text.tags.length > 0) {
            const tagRow = document.createElement('div');
            tagRow.className = 'battle-damage-tags';
            text.tags.forEach(tag => {
                const chip = document.createElement('span');
                chip.textContent = tag;
                tagRow.appendChild(chip);
            });
            popup.appendChild(tagRow);
        }
    } else if (type === 'set' && text && typeof text === 'object') {
        popup.classList.add('battle-float--set-combo');
        const title = document.createElement('div');
        title.className = 'battle-set-popup-title';
        if (text.icon) {
            const icon = document.createElement('span');
            icon.className = 'battle-set-popup-icon';
            icon.textContent = text.icon;
            title.appendChild(icon);
        }
        const titleText = document.createElement('span');
        titleText.className = 'battle-set-popup-title-text';
        titleText.textContent = text.title || 'セット効果';
        title.appendChild(titleText);
        popup.appendChild(title);

    } else {
        popup.textContent = text;
    }

    const accent = customColor || POPUP_ACCENT[type] || POPUP_ACCENT.damage;
    popup.style.setProperty('--popup-accent', accent);
    if (CHIP_TYPES.has(type)) {
        applyChipColors(popup, accent);
    }

    getFloatLayer(sectionEl).appendChild(popup);

    const popupDuration = type === 'set' ? SET_POPUP_DURATION_MS : POPUP_DURATION_MS;
    scheduleEffectTimer(() => {
        popup.remove();
        const layer = sectionEl.querySelector('.battle-float-layer');
        if (layer && layer.childElementCount === 0) {
            layer.remove();
        }
    }, getScaledEffectDuration(popupDuration, 260));
}

function renderCenterSetCue(setInfo, resultText, customColor = null, options = {}) {
    const host = document.getElementById('battle-screen') || document.body;
    if (!host) return;

    const layer = document.createElement('div');
    layer.className = 'battle-set-cue-layer';
    const cue = document.createElement('div');
    cue.className = 'battle-set-cue';
    const accent = customColor || POPUP_ACCENT.set;
    cue.style.setProperty('--popup-accent', accent);

    const label = document.createElement('div');
    label.className = 'battle-set-cue-label';
    label.textContent = setInfo?.name || 'SET EFFECT';
    cue.appendChild(label);

    const title = document.createElement('div');
    title.className = 'battle-set-cue-title';
    const icon = document.createElement('span');
    icon.className = 'battle-set-cue-icon';
    icon.textContent = getSetSpeciesIcon(setInfo);
    title.appendChild(icon);

    const titleText = document.createElement('span');
    titleText.className = 'battle-set-cue-title-text';
    titleText.textContent = resultText || options.effectName || 'セット効果';
    title.appendChild(titleText);
    cue.appendChild(title);

    layer.appendChild(cue);
    host.appendChild(layer);
    scheduleEffectTimer(() => layer.remove(), getScaledEffectDuration(SET_CUE_DURATION_MS, 180));
}

function drainPopupQueue(key) {
    const queue = getPopupQueue(key);
    if (queue.items.length === 0) {
        queue.timerId = null;
        return;
    }

    const item = queue.items.shift();
    renderPopup(item.prefix, item.charIdx, item.text, item.type, item.customColor);

    queue.timerId = scheduleEffectTimer(() => drainPopupQueue(key), getScaledEffectDuration(POPUP_STAGGER_MS, 80));
}

function enqueueCharacterPopup(prefix, charIdx, text, type, customColor = null) {
    const key = `${prefix}-${charIdx}`;
    const queue = getPopupQueue(key);
    queue.items.push({ prefix, charIdx, text, type, customColor });

    if (queue.timerId === null) {
        drainPopupQueue(key);
    }
}

function queueSetVisualBatch(entries = [], setInfo = null, resultText = '', customColor = null, options = {}) {
    const targets = entries.filter(entry => entry && entry.prefix != null && (entry.charIdx != null || entry.index != null));
    if (targets.length === 0) return setEffectSequence;

    queuedSetEffectCount += 1;
    setEffectSequence = setEffectSequence
        .catch(() => {})
        .then(async () => {
            try {
                const effectName = options.effectName || resultText || options.cueText || targets[0]?.effectName || 'セット効果';
                renderCenterSetCue(setInfo || targets[0]?.setInfo, effectName, customColor || targets[0]?.customColor, options);
                await waitForScaledEffect(SET_APPLY_DELAY_MS, 80);
            } finally {
                queuedSetEffectCount = Math.max(0, queuedSetEffectCount - 1);
            }
        });
    return setEffectSequence;
}

function drainGlobalPopupQueue(key) {
    const queue = getGlobalPopupQueue(key);
    if (queue.items.length === 0) {
        queue.timerId = null;
        return;
    }

    const item = queue.items.shift();
    enqueueCharacterPopup(item.prefix, item.charIdx, item.text, item.type, item.customColor);

    queue.timerId = scheduleEffectTimer(() => drainGlobalPopupQueue(key), getScaledEffectDuration(POPUP_STAGGER_MS, 80));
}

function showGlobalQueuedPopup(prefix, charIdx, text, type, customColor = null, queueKey = 'default') {
    const queue = getGlobalPopupQueue(queueKey);
    queue.items.push({ prefix, charIdx, text, type, customColor });

    if (queue.timerId === null) {
        drainGlobalPopupQueue(queueKey);
    }
}

// 同一キャラへのポップアップを順番に表示（ダメージと状態異常の重なり防止）
export function showPopupEffect(prefix, charIdx, text, type, customColor = null) {
    if (type !== 'set' && queuedSetEffectCount > 0) {
        const epoch = effectQueueEpoch;
        setEffectSequence
            .catch(() => {})
            .then(() => {
                if (epoch === effectQueueEpoch) showPopupEffect(prefix, charIdx, text, type, customColor);
            });
        return;
    }

    if (type === 'status-remove' || text === '解除') {
        showGlobalQueuedPopup(prefix, charIdx, text, type, customColor, 'status-remove');
        return;
    }

    enqueueCharacterPopup(prefix, charIdx, text, type, customColor);
}

export function showSetPopupEffect(prefix, charIdx, setInfo, resultText, customColor = null, options = {}) {
    if (options.delayMs) {
        scheduleEffectTimer(() => {
            showSetPopupEffect(prefix, charIdx, setInfo, resultText, customColor, {
                ...options,
                delayMs: 0
            });
        }, getScaledEffectDuration(options.delayMs, 80));
        return setEffectSequence;
    }
    return queueSetVisualBatch([{ prefix, charIdx, setInfo, resultText, customColor }], setInfo, resultText, customColor, options);
}

export function showSetPopupBatch(entries = [], setInfo, resultText = '', customColor = null, options = {}) {
    return queueSetVisualBatch(entries, setInfo, resultText, customColor, options);
}

export function showSetValueEvents(events = [], type = 'buff', color = '#14b8a6') {
    const validEvents = events.filter(event => {
        const prefix = event?.prefix;
        const charIdx = event?.charIdx ?? event?.index;
        const text = event?.resultText ?? event?.result;
        return prefix != null && charIdx != null && !!text;
    });
    if (validEvents.length === 0) return setEffectSequence;

    const renderEvents = () => {
        validEvents.forEach(event => {
            const prefix = event.prefix;
            const charIdx = event.charIdx ?? event.index;
            const text = event.resultText ?? event.result;
            enqueueCharacterPopup(prefix, charIdx, text, event.type || type, event.color || color);
        });
    };

    if (queuedSetEffectCount > 0) {
        setEffectSequence = setEffectSequence
            .catch(() => {})
            .then(async () => {
                renderEvents();
                await waitForScaledEffect(SET_APPLY_DELAY_MS, 80);
            });
        return setEffectSequence;
    }

    renderEvents();
    return setEffectSequence;
}

export function waitForSetPopupEffects() {
    return setEffectSequence.catch(() => {});
}

export function waitForSetApplicationInterval() {
    return waitForScaledEffect(SET_APPLY_DELAY_MS, 80);
}

export function clearBattleEffects() {
    setEffectSequence = Promise.resolve();
    queuedSetEffectCount = 0;
    effectQueueEpoch += 1;
    effectTimers.forEach(timerId => clearTimeout(timerId));
    effectTimers.clear();
    popupQueues.forEach(queue => {
        if (queue.timerId !== null) clearTimeout(queue.timerId);
        queue.items = [];
        queue.timerId = null;
    });
    globalPopupQueues.forEach(queue => {
        if (queue.timerId !== null) clearTimeout(queue.timerId);
        queue.items = [];
        queue.timerId = null;
    });

    document.querySelectorAll('.battle-float-layer, .battle-float, .character-effect-flash').forEach(el => el.remove());
    document.querySelectorAll('.battle-set-cue-layer').forEach(el => el.remove());
    document.querySelectorAll('.status-badge.is-status-badge-flashing').forEach(el => {
        el.classList.remove('is-status-badge-flashing');
    });
    document.querySelectorAll(CHARACTER_EFFECT_CLASSES.map(className => `.character-section.${className}`).join(',')).forEach(el => {
        el.classList.remove(...CHARACTER_EFFECT_CLASSES);
    });
}

export function flashCharacterEffect(prefix, charIdx, color) {
    const sectionEl = getBattleElement(prefix, charIdx, 'section');
    if (!sectionEl) return;

    const flash = document.createElement('div');
    flash.className = 'character-effect-flash';
    flash.style.background = color;
    sectionEl.style.position = 'relative';
    sectionEl.insertBefore(flash, sectionEl.firstChild);

    scheduleEffectTimer(() => flash.remove(), getScaledEffectDuration(520, 120));
}

function replayClass(prefix, charIdx, className, durationMs, options = {}) {
    const sectionEl = getBattleElement(prefix, charIdx, 'section');
    if (!sectionEl) return;
    const cleanupKey = `class:${className}`;
    clearElementEffectTimer(sectionEl, cleanupKey);
    sectionEl.classList.remove(className);
    void sectionEl.offsetWidth;
    sectionEl.classList.add(className);
    setElementEffectTimer(sectionEl, cleanupKey, () => {
        sectionEl.classList.remove(className);
        if (options.clearColor) {
            sectionEl.style.removeProperty('--battle-effect-color');
        }
    }, getScaledEffectDuration(durationMs, options.minDuration || 120));
}

function playCharacterEffect(prefix, charIdx, effectKey) {
    const effect = CHARACTER_EFFECTS[effectKey];
    if (!effect) return;
    replayClass(prefix, charIdx, effect.className, effect.duration);
}

function replayClassWithColor(prefix, charIdx, className, durationMs, color) {
    const sectionEl = getBattleElement(prefix, charIdx, 'section');
    if (!sectionEl) return;
    sectionEl.style.setProperty('--battle-effect-color', color);
    replayClass(prefix, charIdx, className, durationMs, { clearColor: true });
}

export function playAttackEffect(prefix, charIdx) {
    // 攻撃者側の点滅は被弾側のダメージ演出と競合するため出さない。
    // 行動の開始はステータスログとコマンド名ポップアップで伝える。
}

export function playHitEffect(prefix, charIdx, options = {}) {
    const impact = options.impact || (options.heavy ? 'heavy' : 'light');
    if (impact === 'none') return;
    if (impact === 'devastating') {
        playCharacterEffect(prefix, charIdx, 'devastatingHit');
        return;
    }
    playCharacterEffect(prefix, charIdx, impact === 'heavy' ? 'heavyHit' : 'hit');
}

export function playPoisonDamageEffect(prefix, charIdx, damage) {
    playCharacterEffect(prefix, charIdx, 'poisonDamage');
    showPopupEffect(prefix, charIdx, {
        value: `-${damage}`,
        formula: '毒',
        severity: 'poison'
    }, 'damage-detail', '#8b5cf6');
}

export function playHealEffect(prefix, charIdx) {
    playCharacterEffect(prefix, charIdx, 'heal');
}

export function playSupportEffect(prefix, charIdx, role = 'cast') {
    playCharacterEffect(prefix, charIdx, role === 'receive' ? 'supportReceive' : 'supportCast');
}

export function playReelUpEffect(prefix, charIdx, amount = 1, label = 'REEL') {
    playCharacterEffect(prefix, charIdx, 'reelUp');
    showPopupEffect(prefix, charIdx, `${label} +${Math.max(1, Number(amount) || 1)}`, 'reel', '#f59e0b');
}

export function playSetBonusEffect(prefix, charIdx, label = 'セット効果', color = '#14b8a6') {
    const effect = CHARACTER_EFFECTS.setBonus;
    replayClassWithColor(prefix, charIdx, effect.className, effect.duration, color);
    showPopupEffect(prefix, charIdx, label, 'set', color);
}

export function playSoulFollowupEffect(prefix, charIdx, label = '魂追撃') {
    const effect = CHARACTER_EFFECTS.soulFollowup;
    replayClassWithColor(prefix, charIdx, effect.className, effect.duration, '#a78bfa');
    showPopupEffect(prefix, charIdx, label, 'set', '#a78bfa');
}

export function playRelicEffect(prefix, charIdx, label = 'レリック', color = '#60a5fa') {
    const effect = CHARACTER_EFFECTS.relic;
    replayClassWithColor(prefix, charIdx, effect.className, effect.duration, color);
    showPopupEffect(prefix, charIdx, label, 'relic', color);
}

export function playParalysisReleaseEffect(prefix, charIdx) {
    playCharacterEffect(prefix, charIdx, 'paralysisRelease');
}

export function playParalysisStunEffect(prefix, charIdx) {
    playCharacterEffect(prefix, charIdx, 'paralysisStun');
    showPopupEffect(prefix, charIdx, 'マヒ', 'paralysis-stun', '#facc15');
}

export function playStatusApplyEffect(prefix, charIdx, color = '#9b59b6') {
    const effect = CHARACTER_EFFECTS.statusApply;
    replayClassWithColor(prefix, charIdx, effect.className, effect.duration, color);
}

export function playStatusClearEffect(prefix, charIdx, color = '#3498db') {
    const effect = CHARACTER_EFFECTS.statusClear;
    replayClassWithColor(prefix, charIdx, effect.className, effect.duration, color);
}

export function flashStatusBadges(prefix, charIdx, statusIds = []) {
    const sectionEl = getBattleElement(prefix, charIdx, 'section');
    if (!sectionEl || !Array.isArray(statusIds) || statusIds.length === 0) return;

    [...new Set(statusIds)].forEach(statusId => {
        const badge = sectionEl.querySelector(`.status-badge[data-status-id="${escapeSelectorValue(statusId)}"]`);
        if (!badge) return;

        const cleanupKey = `status-badge:${statusId}`;
        clearElementEffectTimer(badge, cleanupKey);
        badge.classList.remove('is-status-badge-flashing');
        void badge.offsetWidth;
        badge.classList.add('is-status-badge-flashing');
        setElementEffectTimer(badge, cleanupKey, () => {
            badge.classList.remove('is-status-badge-flashing');
        }, getScaledEffectDuration(760, 160));
    });
}

export function playTauntDrawEffect(prefix, charIdx) {
    playCharacterEffect(prefix, charIdx, 'tauntDraw');
}

export function playTauntStatusEffect(prefix, charIdx, label = '挑発付与') {
    playStatusApplyEffect(prefix, charIdx, '#db2777');
    playTauntDrawEffect(prefix, charIdx);
    showPopupEffect(prefix, charIdx, label, 'status', '#db2777');
}

export function playEvasionEffect(prefix, charIdx, options = {}) {
    playCharacterEffect(prefix, charIdx, 'evasion');
    if (options.showPopup !== false) {
        showPopupEffect(prefix, charIdx, '回避！', 'evasion', '#38bdf8');
    }
}

export function playGuardEffect(prefix, charIdx, options = {}) {
    playCharacterEffect(prefix, charIdx, 'guard');
    if (options.showPopup !== false) {
        showPopupEffect(prefix, charIdx, 'かばう！', 'guard', '#f59e0b');
    }
}

export function getStatusEffectColor(statusId) {
    return statusEffects?.[statusId]?.color || '#9b59b6';
}

export function previewStatusEffect(prefix, charIdx, statusId, options = {}) {
    const statusIds = Object.keys(statusEffects || {});
    const targetIds = statusId === 'all' ? statusIds : [statusId];
    const color = getStatusEffectColor(targetIds[0]);

    flashStatusBadges(prefix, charIdx, targetIds);

    if (statusId === 'poison') {
        playPoisonDamageEffect(prefix, charIdx, options.poisonDamage || 18);
        return;
    }

    if (statusId === 'paralysis') {
        playParalysisStunEffect(prefix, charIdx);
        return;
    }

    if (statusId === 'taunt') {
        playTauntStatusEffect(prefix, charIdx);
        return;
    }

    if (statusId === 'all') {
        playStatusClearEffect(prefix, charIdx, '#14b8a6');
        showPopupEffect(prefix, charIdx, '全状態確認', 'status', '#14b8a6');
        return;
    }

    playStatusApplyEffect(prefix, charIdx, color);
    showPopupEffect(prefix, charIdx, `${statusEffects?.[statusId]?.name || statusId}付与`, 'status', color);
}
