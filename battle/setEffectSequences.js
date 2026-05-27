import {
    playHitEffect,
    showPopupEffect,
    showSetValueEvents,
    waitForSetApplicationInterval,
    waitForSetPopupEffects
} from '../ui/effects.js';
import { updateAllHPBars } from '../ui/render.js';

function getSetDamageTarget(gameState, prefix, index, options = {}) {
    if (options.target) return options.target;
    const party = prefix === 'p' ? gameState?.players : gameState?.enemies;
    return Array.isArray(party) ? party[index] : null;
}

function getSetDamagePresentation(hpDamage, target, options = {}) {
    const maxHp = Math.max(1, Number(target?.maxHp || target?.hp || 1));
    const hpRatio = hpDamage / maxHp;
    if (hpRatio >= 0.5) {
        return { color: options.color || '#dc2626', severity: options.severity || 'devastating', impact: options.impact || 'devastating', callout: options.callout || '壊滅的!' };
    }
    if (hpRatio >= 0.32) {
        return { color: options.color || '#ef4444', severity: options.severity || 'heavy', impact: options.impact || 'heavy', callout: options.callout || '大ダメージ!' };
    }
    const impact = hpRatio >= 0.12 ? 'light' : 'none';
    return { color: options.color || '#e74c3c', severity: options.severity || 'normal', impact: options.impact || impact, callout: options.callout || '' };
}

export function showSetDamagePopup(prefix, index, damage, options = {}) {
    const hpDamage = Math.max(0, Math.floor(Number(damage || 0)));
    if (hpDamage <= 0) return;
    const presentation = getSetDamagePresentation(hpDamage, options.target, options);
    showPopupEffect(prefix, index, {
        value: String(hpDamage),
        formula: options.formula || '固定',
        severity: presentation.severity,
        callout: presentation.callout,
        tags: Array.isArray(options.tags) ? options.tags : []
    }, 'damage-detail', presentation.color);
    playHitEffect(prefix, index, { impact: presentation.impact });
}

function showSetDamageEvents(gameState, events = []) {
    events.forEach(event => showSetDamagePopup(event.prefix, event.index, event.damage, {
        ...event,
        target: getSetDamageTarget(gameState, event.prefix, event.index, event)
    }));
}

function showSetShieldDamageEvents(events = []) {
    events.forEach(event => {
        const absorbed = Math.max(0, Math.floor(Number(event.absorbed || 0)));
        if (absorbed > 0) {
            showPopupEffect(event.prefix, event.index, {
                value: String(absorbed),
                formula: 'シールド',
                severity: 'normal'
            }, 'damage-detail', '#e74c3c');
        }
    });
}

export function waitSetEffectInterval() {
    return waitForSetApplicationInterval();
}

export async function settleSetEffectApplication(gameState, options = {}) {
    const refreshHpBars = options.refreshHpBars ?? true;
    const skipHpPopup = options.skipHpPopup ?? true;
    if (refreshHpBars) {
        updateAllHPBars(gameState, skipHpPopup ? { skipHpPopup: true } : {});
    }
    await waitSetEffectInterval();
}

export async function playSetValueSequence(gameState, showCue, events = [], type = 'buff', color = '#14b8a6', options = {}) {
    if (!events.length) return;
    showCue();
    await waitForSetPopupEffects();
    showSetValueEvents(events, type, color);
    await settleSetEffectApplication(gameState, options);
}

export async function playSetDamageSequence(gameState, showCue, damageEvents = [], options = {}) {
    const shieldDamageEvents = options.shieldDamageEvents || [];
    if (!damageEvents.length && !shieldDamageEvents.length) return;
    showCue();
    await waitForSetPopupEffects();
    showSetShieldDamageEvents(shieldDamageEvents);
    showSetDamageEvents(gameState, damageEvents);
    await settleSetEffectApplication(gameState, options);
}
