// ui/effects.js
import { statusEffects } from '../statusEffects.js';

const POPUP_STAGGER_MS = 580;
const POPUP_DURATION_MS = 800;
const popupQueues = new Map();
const globalPopupQueues = new Map();

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
    buff: '#00b894',
    debuff: '#e17055'
};

const CHIP_TYPES = new Set(['status', 'status-remove', 'buff', 'debuff', 'system']);

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
    const sectionEl = document.getElementById(`${prefix}-section-${charIdx}`);
    if (!sectionEl) return;

    const popup = document.createElement('div');
    popup.className = `battle-float battle-float--${type}`;
    if (type === 'damage-detail' && text && typeof text === 'object') {
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
    } else {
        popup.textContent = text;
    }

    const accent = customColor || POPUP_ACCENT[type] || POPUP_ACCENT.damage;
    popup.style.setProperty('--popup-accent', accent);
    if (CHIP_TYPES.has(type)) {
        applyChipColors(popup, accent);
    }

    getFloatLayer(sectionEl).appendChild(popup);

    setTimeout(() => {
        popup.remove();
        const layer = sectionEl.querySelector('.battle-float-layer');
        if (layer && layer.childElementCount === 0) {
            layer.remove();
        }
    }, POPUP_DURATION_MS);
}

function drainPopupQueue(key) {
    const queue = getPopupQueue(key);
    if (queue.items.length === 0) {
        queue.timerId = null;
        return;
    }

    const item = queue.items.shift();
    renderPopup(item.prefix, item.charIdx, item.text, item.type, item.customColor);

    queue.timerId = setTimeout(() => drainPopupQueue(key), POPUP_STAGGER_MS);
}

function enqueueCharacterPopup(prefix, charIdx, text, type, customColor = null) {
    const key = `${prefix}-${charIdx}`;
    const queue = getPopupQueue(key);
    queue.items.push({ prefix, charIdx, text, type, customColor });

    if (queue.timerId === null) {
        drainPopupQueue(key);
    }
}

function drainGlobalPopupQueue(key) {
    const queue = getGlobalPopupQueue(key);
    if (queue.items.length === 0) {
        queue.timerId = null;
        return;
    }

    const item = queue.items.shift();
    enqueueCharacterPopup(item.prefix, item.charIdx, item.text, item.type, item.customColor);

    queue.timerId = setTimeout(() => drainGlobalPopupQueue(key), POPUP_STAGGER_MS);
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
    if (type === 'status-remove' || text === '解除') {
        showGlobalQueuedPopup(prefix, charIdx, text, type, customColor, 'status-remove');
        return;
    }

    enqueueCharacterPopup(prefix, charIdx, text, type, customColor);
}

export function flashCharacterEffect(prefix, charIdx, color) {
    const sectionEl = document.getElementById(`${prefix}-section-${charIdx}`);
    if (!sectionEl) return;

    const flash = document.createElement('div');
    flash.className = 'character-effect-flash';
    flash.style.background = color;
    sectionEl.style.position = 'relative';
    sectionEl.insertBefore(flash, sectionEl.firstChild);

    setTimeout(() => flash.remove(), 520);
}

export function playEvasionEffect(prefix, charIdx, options = {}) {
    const sectionEl = document.getElementById(`${prefix}-section-${charIdx}`);
    if (!sectionEl) return;

    sectionEl.classList.remove('is-evading');
    void sectionEl.offsetWidth;
    sectionEl.classList.add('is-evading');
    if (options.showPopup !== false) {
        showPopupEffect(prefix, charIdx, '回避！', 'evasion', '#38bdf8');
    }

    setTimeout(() => {
        sectionEl.classList.remove('is-evading');
    }, 620);
}

export function playGuardEffect(prefix, charIdx, options = {}) {
    const sectionEl = document.getElementById(`${prefix}-section-${charIdx}`);
    if (!sectionEl) return;

    sectionEl.classList.remove('is-guarding-hit');
    void sectionEl.offsetWidth;
    sectionEl.classList.add('is-guarding-hit');
    if (options.showPopup !== false) {
        showPopupEffect(prefix, charIdx, 'かばう！', 'guard', '#f59e0b');
    }

    setTimeout(() => {
        sectionEl.classList.remove('is-guarding-hit');
    }, 680);
}

export function getStatusEffectColor(statusId) {
    return statusEffects?.[statusId]?.color || '#9b59b6';
}
