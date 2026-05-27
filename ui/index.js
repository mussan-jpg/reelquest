// ui/index.js
import { setupTooltip } from './tooltip.js';
import { clearBattleEffects, flashStatusBadges, playAttackEffect, playEvasionEffect, playGuardEffect, playHealEffect, playHitEffect, playParalysisReleaseEffect, playParalysisStunEffect, playPoisonDamageEffect, playReelUpEffect, playRelicEffect, playSetBonusEffect, playSoulFollowupEffect, showSetPopupBatch, showSetPopupEffect, showSetValueEvents, playStatusApplyEffect, playStatusClearEffect, playSupportEffect, playTauntDrawEffect, playTauntStatusEffect, showPopupEffect, waitForSetApplicationInterval, waitForSetPopupEffects } from './effects.js';
import { generateCommands } from './components.js';
import { updateBattleHeader, updateCommandsUI, render, updateAllHPBars, updateOrderIcons } from './render.js';

// 初期化時にツールチップをセットアップ
setupTooltip();

export {
    playEvasionEffect,
    playGuardEffect,
    playAttackEffect,
    playHitEffect,
    playHealEffect,
    playParalysisReleaseEffect,
    playParalysisStunEffect,
    playPoisonDamageEffect,
    playStatusApplyEffect,
    playStatusClearEffect,
    flashStatusBadges,
    playSupportEffect,
    playReelUpEffect,
    playSetBonusEffect,
    playRelicEffect,
    playSoulFollowupEffect,
    playTauntDrawEffect,
    playTauntStatusEffect,
    showPopupEffect,
    showSetPopupBatch,
    showSetPopupEffect,
    showSetValueEvents,
    waitForSetApplicationInterval,
    waitForSetPopupEffects,
    clearBattleEffects,
    generateCommands,
    updateCommandsUI,
    render,
    updateBattleHeader,
    updateAllHPBars,
    updateOrderIcons
};
