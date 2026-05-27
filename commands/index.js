// commands/index.js

import { attackCommands } from './attacks.js';
import { statusCommands } from './status.js';
import { healCommands } from './heal.js';
import { miscCommands } from './misc.js';
import { grade1Commands } from './grade1.js';
import { speciesSynergyCommands } from './speciesSynergy.js';
import { getCommandFlags } from '../battle/commandContext.js';
import { getCommandPowerMultiplier } from '../battle/setBonuses.js';
import { getSlotEffectMultiplier } from './effectScaling.js';

// 各コマンド定義では commandEffects 自身を参照する必要がある箇所があるため、
// 結合済みのオブジェクトを各 action 関数へ渡せるように修正しています。
// 既存の実装との互換性を保つため、プロキシまたは直接マージを用います。

const mergedCommands = {
    ...attackCommands,
    ...statusCommands,
    ...healCommands,
    ...miscCommands,
    ...grade1Commands,
    ...speciesSynergyCommands
};

const commandCategories = {
    atk01: '物理',
    atk02: '物理',
    atk03: '物理',
    atk05: '物理',
    atk04: '物理',
    atk_paralyze: '物理',
    atk_guard_break: '物理',
    atk_sumihaki: '物理',
    atk_kamitsuki: '物理',
    atk_hikaki: '物理',
    atk_taiatari: '物理',
    cmd_sweep: '物理',
    cmd_earthquake: '物理',
    cmd_predator_pounce: '物理',
    cmd_hamstring_claw: '物理',
    cmd_feral_dash: '物理',
    cmd_counter_howl: '物理',
    cmd_coordinated_slash: '物理',
    cmd_suppressive_shot: '物理',
    cmd_first_aid_strike: '物理',
    cmd_shield: '防御',
    cmd_barrier: '防御',
    cmd_team_barrier: '防御',
    cmd_aegis_deploy: '防御',
    cmd_aegis_fortress: '防御',

    mgc01: '魔法',
    mgc02: '魔法',
    atk_hinoko: '魔法',
    atk_scream: '魔法',
    atk_weaken: '魔法',
    atk_weakened: '魔法',
    cmd_starfall: '魔法',
    cmd_explosion: '魔法',
    cmd_demon_whisper: '魔法',
    cmd_root_guard: '魔法',
    cmd_cleansing_thorn: '魔法',
    cmd_lifebloom_bolt: '魔法',
    cmd_mucus_mend: '魔法',
    cmd_split_foam: '魔法',
    cmd_grave_pact: '魔法',
    cmd_soul_siphon: '魔法',
    cmd_ancient_roar: '魔法',

    atk_fire: '混合',
    cmd_wing_ascent: '物理',
    cmd_piston_bulwark: '物理',
    cmd_anchor_guard: '物理',
    cmd_core_knuckle: '混合',
    cmd_last_grasp: '混合',
    cmd_drake_surge: '混合',
    cmd_jelly_rebound: '混合',
    atk_prank: '混合',
    misc_focus: 'その他',
    misc_quickstep: 'その他',
    misc_wingbeat: 'その他',
    misc_mana_charge: 'その他',
    misc_fighting_spirit: 'その他'
};

function getCommandCategory(commandId, command) {
    if (command.category) return command.category;
    return commandCategories[commandId] || 'その他';
}

function applyCommandOutputMultipliers(value, actor) {
    return Math.max(0, Math.floor(
        Number(value || 0)
        * getSlotEffectMultiplier(actor)
        * getCommandPowerMultiplier(actor)
    ));
}

// 元々の `commands.js` は action(attacker, target, gameState) で呼ばれており、
// 内部で commandEffects を参照していました。
// 先ほど分割したファイルでは、第3または第4引数として commandEffects を受け取るように変更しています。
// 元の呼び出し元（battle.js, ui.js 等）がエラーにならないように、関数をラップします。

export const commandEffects = {};

for (const [key, cmd] of Object.entries(mergedCommands)) {
    commandEffects[key] = {
        name: cmd.name,
        desc: cmd.desc,
        category: getCommandCategory(key, cmd),
        isAreaAttack: !!cmd.isAreaAttack,
        calcDamage: typeof cmd.calcDamage === 'function'
            ? (actor) => applyCommandOutputMultipliers(cmd.calcDamage(actor), actor)
            : cmd.calcDamage,
        calcHeal: typeof cmd.calcHeal === 'function'
            ? (actor) => applyCommandOutputMultipliers(cmd.calcHeal(actor), actor)
            : cmd.calcHeal,
        calcShield: typeof cmd.calcShield === 'function'
            ? (actor) => applyCommandOutputMultipliers(cmd.calcShield(actor), actor)
            : cmd.calcShield,
        apply: typeof cmd.apply === 'function'
            ? (ctx = {}) => cmd.apply({ ...ctx, commandEffects })
            : undefined,
        formatLog: typeof cmd.formatLog === 'function'
            ? (event, ctx = {}) => cmd.formatLog(event, { ...ctx, commandEffects })
            : undefined,
        action: function(actr, tgt, gameState) {
            if (typeof cmd.action !== 'function') {
                if (typeof cmd.apply !== 'function') return;
                const event = cmd.apply({
                    commandId: key,
                    effect: commandEffects[key],
                    actor: actr,
                    target: tgt,
                    gameState,
                    commandEffects
                });
                return typeof cmd.formatLog === 'function'
                    ? cmd.formatLog({ commandId: key, actor: actr, target: tgt, ...event }, { commandEffects, gameState })
                    : '';
            }
            // 呼び出し側の実装差分に対応：
            // - 新実装: (attacker, target, gameState, commandEffects)
            // - 旧実装: (attacker, target, commandEffects)
            // - それ以外: 呼び出し可能な引数数に合わせて呼ぶ
            const arity = cmd.action.length;
            if (arity >= 4) {
                return cmd.action(actr, tgt, gameState, commandEffects);
            }
            if (arity === 3) {
                return cmd.action(actr, tgt, commandEffects);
            }
            return cmd.action(actr, tgt);
        }
    };
    Object.assign(commandEffects[key], getCommandFlags(key, commandEffects[key]));
}
