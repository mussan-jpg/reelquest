// battle/combat.js
import { commandEffects } from '../commands/index.js';
import { calculateAdjustedDamageBreakdown, getStatusDefenseMultiplier, syncAllStatusEffects } from '../commands/status.js';
import { createBattleSnapshot, recordActionStats, recordDamageMitigated } from './stats.js';
import { playEvasionEffect, playGuardEffect, showPopupEffect, updateAllHPBars, updateCommandsUI } from '../ui/index.js';
import { alertLog, updateDeathStates, sleep } from './core.js';

export function getStatusAttackMultiplier(attacker) {
    return 1; // 脱力は攻撃力の直接変更で表現されるため、ここでは追加の倍率を適用しません。
}

export function adjustStatusDamage(rawDamage, attacker, target) {
    const multiplier = getStatusAttackMultiplier(attacker) * getStatusDefenseMultiplier(target);
    return Math.max(0, Math.floor(rawDamage * multiplier));
}

export function calculateDamageWithBreakdown(rawDamage, attacker, target, options = {}) {
    const attackMultiplier = getStatusAttackMultiplier(attacker);
    const attackAdjustedDamage = Math.max(0, Math.floor(rawDamage * attackMultiplier));
    const adjustedBreakdown = calculateAdjustedDamageBreakdown(attackAdjustedDamage, target, {
        attacker,
        isAreaAttack: !!options.isAreaAttack
    });

    const breakdown = {
        base: rawDamage,
        attackMultiplier: attackMultiplier,
        defenseMultiplier: getStatusDefenseMultiplier(target),
        finalDamage: adjustedBreakdown.finalDamage,
        delta: adjustedBreakdown.finalDamage - rawDamage,
        mitigatedDamage: adjustedBreakdown.mitigatedDamage,
        guardTriggered: adjustedBreakdown.guardTriggered,
        guardMitigatedDamage: adjustedBreakdown.guardMitigatedDamage,
        evasionTriggered: adjustedBreakdown.evasionTriggered
    };

    return breakdown;
}

function shouldExpandDamageToArea(attacker, effect) {
    const attackerRarity = attacker?.rarity
        ?? (Array.isArray(attacker?.commands?.[0]) ? attacker.commands.length : 1);

    return (attacker?.slotCost || 1) >= 3
        && attackerRarity < 5
        && !effect.isAreaAttack
        && typeof effect.calcDamage === 'function'
        && Math.max(0, Math.floor(effect.calcDamage(attacker))) > 0;
}

function getOpposingTargets(gameState, attackerPrefix) {
    const targetPrefix = attackerPrefix === 'p' ? 'e' : 'p';
    const party = targetPrefix === 'p' ? gameState.players : gameState.enemies;
    return {
        targetPrefix,
        targets: party
            .map((char, index) => ({ char, index }))
            .filter(item => item.char.hp > 0)
    };
}

function buildDamagePopupText(rawDamage, adjustedDamage, attacker, target, breakdown) {
    const tags = [];
    if (attacker?.status?.includes('weak')) tags.push('脱力');
    if (target?.status?.includes('weakened')) tags.push('弱体');
    if (target?.status?.includes('hidden')) tags.push('隠密');
    if (breakdown.guardTriggered) tags.push('かばう');
    if (breakdown.evasionTriggered) tags.push('回避');

    if (rawDamage === adjustedDamage && tags.length === 0) {
        return { value: String(adjustedDamage), formula: '', tags: [] };
    }

    return {
        value: String(adjustedDamage),
        formula: `${adjustedDamage - rawDamage > 0 ? '+' : ''}${adjustedDamage - rawDamage}`,
        tags
    };
}

export function determineTarget(commandId, attackerIdx, currentSide, gameState) {
    const myParty = currentSide === 'p' ? gameState.players : gameState.enemies;
    const enemyParty = currentSide === 'p' ? gameState.enemies : gameState.players;
    const myPrefix = currentSide;
    const enemyPrefix = currentSide === 'p' ? 'e' : 'p';

    const supportReelUpCommands = ['misc_support_reel_up', 'misc_support_reel_up2'];
    if (supportReelUpCommands.includes(commandId)) {
        const canReelUp = (char) => {
            const maxReelIndex = Array.isArray(char.commands?.[0]) ? char.commands.length - 1 : 0;
            const currentReel = char.currentReel !== undefined ? char.currentReel : 0;
            return currentReel < maxReelIndex;
        };
        const aliveAllies = myParty
            .map((char, idx) => ({ data: char, prefix: myPrefix, index: idx }))
            .filter(item => item.data.hp > 0 && item.index !== attackerIdx && canReelUp(item.data));

        if (aliveAllies.length > 0) {
            return aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
        }

        return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
    }

    if (commandId.startsWith('cmd_up') || commandId.startsWith('cmd_down') || commandId.startsWith('misc') || commandId === 'cmd_cover') {
        return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
    }

    if (commandId.includes('heal')) {
        const aliveFriends = myParty
            .map((char, idx) => ({ data: char, prefix: myPrefix, index: idx }))
            .filter(item => item.data.hp > 0);

        if (aliveFriends.length === 0) {
            return { data: myParty[attackerIdx], prefix: myPrefix, index: attackerIdx };
        }
        return aliveFriends[Math.floor(Math.random() * aliveFriends.length)];
    }

    const aliveEnemies = enemyParty
        .map((char, idx) => ({ data: char, prefix: enemyPrefix, index: idx }))
        .filter(item => item.data.hp > 0);

    if (aliveEnemies.length === 0) return null;

    const tauntingEnemies = aliveEnemies.filter(item => item.data.status && item.data.status.includes("taunt"));
    if (tauntingEnemies.length > 0) {
        return tauntingEnemies[Math.floor(Math.random() * tauntingEnemies.length)];
    }

    return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
}

export async function execute(attacker, target, commandId, gameState, attackerPrefix, attackerIdx, targetPrefix, targetIdx) {
    const effect = commandEffects[commandId];
    if (!effect) return;

    syncAllStatusEffects(gameState);
    const beforeSnapshot = createBattleSnapshot(gameState);
    const initialTargetHp = target ? target.hp : 0;

    alertLog(`▶ ${attacker.name}の「${effect.name}」！`);
    showPopupEffect(attackerPrefix, attackerIdx, effect.name, 'system', '#34495e');
    await sleep(520);

    if (shouldExpandDamageToArea(attacker, effect)) {
        const { targetPrefix: areaTargetPrefix, targets } = getOpposingTargets(gameState, attackerPrefix);
        let message = `🌐 ${attacker.name}の「${effect.name}」！ 巨体の一撃が敵全体へ広がる！`;

        targets.forEach(({ char: areaTarget, index }) => {
            const initialHp = areaTarget.hp;
            const targetMessage = effect.action(attacker, areaTarget, gameState);
            syncAllStatusEffects(gameState);

            const hpLoss = Math.max(0, initialHp - areaTarget.hp);
            const rawDamage = typeof effect.calcDamage === 'function'
                ? Math.max(0, Math.floor(effect.calcDamage(attacker)))
                : hpLoss;
            const breakdown = calculateDamageWithBreakdown(rawDamage, attacker, areaTarget, { isAreaAttack: true });
            const adjustedDamage = breakdown.finalDamage;
            const mitigatedDamage = breakdown.mitigatedDamage;
            const increasedDamage = Math.max(0, adjustedDamage - rawDamage);

            areaTarget.hp = Math.max(0, initialHp - adjustedDamage);

            const damageText = adjustedDamage > 0
                ? buildDamagePopupText(rawDamage, adjustedDamage, attacker, areaTarget, breakdown)
                : 'Miss!';
            const damageColor = adjustedDamage > rawDamage ? '#ff6b6b' : adjustedDamage < rawDamage ? '#4299e1' : '#e74c3c';
            showPopupEffect(areaTargetPrefix, index, damageText, adjustedDamage > 0 ? 'damage-detail' : 'damage', damageColor);

            if (mitigatedDamage > 0) {
                recordDamageMitigated(gameState, areaTargetPrefix, index, mitigatedDamage);
            }

            message += `\n${targetMessage}`;
            if (adjustedDamage !== rawDamage) {
                const changeText = mitigatedDamage > 0
                    ? `軽減${mitigatedDamage}`
                    : `増加${increasedDamage}`;
                message += `\n※ ${areaTarget.name}へのダメージ補正: ${rawDamage} → ${adjustedDamage}（${changeText}）`;
            }
            if (breakdown.evasionTriggered) {
                playEvasionEffect(areaTargetPrefix, index, { showPopup: false });
                message += `\n※ ${areaTarget.name}は素早さを活かしてダメージを半分に受け流した！`;
            }
            if (breakdown.guardTriggered) {
                playGuardEffect(areaTargetPrefix, index, { showPopup: false });
                message += `\n※ ${areaTarget.name}はかばう構えでダメージを受け止めた！`;
            }
        });

        recordActionStats(gameState, beforeSnapshot, attackerPrefix, attackerIdx);
        alertLog(message);
        updateAllHPBars(gameState, { skipHpPopup: true });
        updateDeathStates(gameState);

        await sleep(400);
        if (attacker.hp <= 0) alertLog(`${attacker.name}は力尽きた！`);
        targets.forEach(({ char }) => {
            if (char.hp <= 0) alertLog(`${char.name}は力尽きた！`);
        });
        updateDeathStates(gameState);
        return;
    }

    let message = effect.action(attacker, target, gameState);
    syncAllStatusEffects(gameState);

    const hpLoss = target ? Math.max(0, initialTargetHp - target.hp) : 0;
    const calculatedDamage = typeof effect.calcDamage === 'function'
        ? Math.max(0, Math.floor(effect.calcDamage(attacker)))
        : 0;
    const rawDamage = calculatedDamage > 0 ? calculatedDamage : hpLoss;

    if (rawDamage > 0 && target && !effect.isAreaAttack) {
        const breakdown = calculateDamageWithBreakdown(rawDamage, attacker, target);
        const adjustedDamage = breakdown.finalDamage;
        const mitigatedDamage = breakdown.mitigatedDamage;
        const increasedDamage = Math.max(0, adjustedDamage - rawDamage);

        // ダメージポップアップを表示（修正後のダメージ）
        const damageText = adjustedDamage > 0
            ? buildDamagePopupText(rawDamage, adjustedDamage, attacker, target, breakdown)
            : 'Miss!';
        const damageColor = adjustedDamage > rawDamage ? '#ff6b6b' : adjustedDamage < rawDamage ? '#4299e1' : '#e74c3c';
        showPopupEffect(targetPrefix, targetIdx, damageText, adjustedDamage > 0 ? 'damage-detail' : 'damage', damageColor);

        if (mitigatedDamage > 0) {
            recordDamageMitigated(gameState, targetPrefix, targetIdx, mitigatedDamage);
        }
        if (adjustedDamage !== rawDamage) {
            const delta = adjustedDamage - rawDamage;
            target.hp = Math.max(0, initialTargetHp - adjustedDamage);
            const changeText = mitigatedDamage > 0
                ? `軽減${mitigatedDamage}`
                : `増加${increasedDamage}`;
            message += `\n※ ${target.name}へのダメージ補正: ${rawDamage} → ${adjustedDamage}（${changeText}）`;
        } else if (mitigatedDamage > 0) {
            message += `\n※ ${target.name}は防御効果で ${mitigatedDamage} ダメージを抑えた！`;
        }
        if (breakdown.evasionTriggered) {
            playEvasionEffect(targetPrefix, targetIdx, { showPopup: false });
            message += `\n※ ${target.name}は素早さを活かしてダメージを半分に受け流した！`;
        }
        if (breakdown.guardTriggered) {
            playGuardEffect(targetPrefix, targetIdx, { showPopup: false });
            message += `\n※ ${target.name}はかばう構えでダメージを受け止めた！`;
        }
    }

    recordActionStats(gameState, beforeSnapshot, attackerPrefix, attackerIdx);

    alertLog(message);

    const isReelUp = commandId.startsWith('cmd_up');
    const isReelDown = commandId.startsWith('cmd_down');
    const isMisc = commandId.startsWith('misc');
    const isSupportReelUp = commandId === 'misc_support_reel_up' || commandId === 'misc_support_reel_up2';

    updateAllHPBars(gameState, { skipHpPopup: rawDamage > 0 });
    updateDeathStates(gameState);

    // リール操作系コマンドならコマンドUIを更新
    if (isReelUp || isReelDown) {
        const nextReelIdx = attacker.currentReel !== undefined ? attacker.currentReel : 0;
        const nextCmds = (attacker.commands && Array.isArray(attacker.commands[0])) ? attacker.commands[nextReelIdx] : attacker.commands;
        updateCommandsUI(attackerPrefix, attackerIdx, nextCmds, nextReelIdx);
    }
    if (isSupportReelUp && target) {
        const nextReelIdx = target.currentReel !== undefined ? target.currentReel : 0;
        const nextCmds = (target.commands && Array.isArray(target.commands[0])) ? target.commands[nextReelIdx] : target.commands;
        updateCommandsUI(targetPrefix, targetIdx, nextCmds, nextReelIdx);
    }

    await sleep(400);

    if (attacker.hp <= 0) alertLog(`${attacker.name}は力尽きた！`);
    if (target.hp <= 0) alertLog(`${target.name}は力尽きた！`);
    updateDeathStates(gameState);
}
