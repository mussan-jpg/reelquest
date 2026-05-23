// ui/index.js
import { setupTooltip } from './tooltip.js';
import { playEvasionEffect, playGuardEffect, showPopupEffect } from './effects.js';
import { generateCommands } from './components.js';
import { updateCommandsUI, render, updateAllHPBars, updateOrderIcons } from './render.js';

// 初期化時にツールチップをセットアップ
setupTooltip();

export {
    playEvasionEffect,
    playGuardEffect,
    showPopupEffect,
    generateCommands,
    updateCommandsUI,
    render,
    updateAllHPBars,
    updateOrderIcons
};
