export function getBattleId(prefix, charIdx, part = 'section') {
    return `${prefix}-${part}-${charIdx}`;
}

export function getCommandId(prefix, charIdx, commandIdx) {
    return `${prefix}-${charIdx}-c${commandIdx}`;
}

export function getBattleElement(prefix, charIdx, part = 'section') {
    return document.getElementById(getBattleId(prefix, charIdx, part));
}

export function getCommandElement(prefix, charIdx, commandIdx) {
    return document.getElementById(getCommandId(prefix, charIdx, commandIdx));
}

export function getOrderIconId(side, index) {
    return `order-${side}-${index}`;
}

export function getOrderIconElement(side, index) {
    return document.getElementById(getOrderIconId(side, index));
}

export function getBattleRoot() {
    return document.getElementById('game-container');
}

export function getNextActionIconContainer() {
    return document.getElementById('next-action-icon');
}
