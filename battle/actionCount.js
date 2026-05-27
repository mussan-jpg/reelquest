const DEFAULT_ACTION_COUNT = 1;
const MAX_ACTION_COUNT = 4;

function clampInteger(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value || 0))));
}

export function getBaseActionCount(actor) {
    return clampInteger(actor?.actionsPerTurn || DEFAULT_ACTION_COUNT, DEFAULT_ACTION_COUNT, MAX_ACTION_COUNT);
}

export function getActionLimit(actor) {
    return getBaseActionCount(actor) + getPendingExtraActionCount(actor);
}

export function getAdditionalActionLabel(actor, completedActionCount) {
    return completedActionCount < getBaseActionCount(actor) ? '特性' : '種族効果';
}

export function getPendingExtraActionCount(actor) {
    return Math.max(0, Math.floor(Number(actor?.pendingExtraActions || 0)));
}

export function getStoredActionCount(actor) {
    return Math.max(0, Math.floor(Number(actor?.remainingActions || 0)));
}

export function getRemainingActionCount(actor) {
    return getStoredActionCount(actor) + getPendingExtraActionCount(actor);
}

export function absorbPendingExtraActions(actor) {
    if (!actor) return 0;
    const pending = getPendingExtraActionCount(actor);
    if (pending <= 0) return getStoredActionCount(actor);
    actor.remainingActions = getStoredActionCount(actor) + pending;
    actor.pendingExtraActions = 0;
    return getStoredActionCount(actor);
}

export function grantTurnActions(actor) {
    if (!actor) return 0;
    if (actor.hp <= 0) {
        clearRemainingActions(actor);
        return 0;
    }
    absorbPendingExtraActions(actor);
    actor.remainingActions = getStoredActionCount(actor) + getBaseActionCount(actor);
    return getStoredActionCount(actor);
}

export function grantExtraActions(actor, amount = 1) {
    if (!actor || actor.hp <= 0) return 0;
    const gain = Math.max(0, Math.floor(Number(amount || 0)));
    if (gain <= 0) return getRemainingActionCount(actor);
    absorbPendingExtraActions(actor);
    actor.remainingActions = getStoredActionCount(actor) + gain;
    return getStoredActionCount(actor);
}

export function consumeAction(actor) {
    if (!actor) return 0;
    absorbPendingExtraActions(actor);
    actor.remainingActions = Math.max(0, getStoredActionCount(actor) - 1);
    return getStoredActionCount(actor);
}

export function clearRemainingActions(actor) {
    if (!actor) return;
    actor.remainingActions = 0;
    actor.pendingExtraActions = 0;
}
