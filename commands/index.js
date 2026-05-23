// commands/index.js

import { attackCommands } from './attacks.js';
import { statusCommands } from './status.js';
import { healCommands } from './heal.js';
import { miscCommands } from './misc.js';
import { grade1Commands } from './grade1.js';

// 各コマンド定義では commandEffects 自身を参照する必要がある箇所があるため、
// 結合済みのオブジェクトを各 action 関数へ渡せるように修正しています。
// 既存の実装との互換性を保つため、プロキシまたは直接マージを用います。

const mergedCommands = {
    ...attackCommands,
    ...statusCommands,
    ...healCommands,
    ...miscCommands,
    ...grade1Commands
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

    mgc01: '魔法',
    mgc02: '魔法',
    atk_hinoko: '魔法',
    atk_scream: '魔法',
    atk_weaken: '魔法',
    atk_weakened: '魔法',
    cmd_starfall: '魔法',
    cmd_explosion: '魔法',

    atk_fire: '混合',
    atk_prank: '混合',
    misc_focus: 'その他',
    misc_quickstep: 'その他',
    misc_wingbeat: 'その他',
    misc_mana_charge: 'その他'
};

function getCommandCategory(commandId, command) {
    if (command.category) return command.category;
    return commandCategories[commandId] || 'その他';
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
        calcDamage: cmd.calcDamage,
        calcHeal: cmd.calcHeal,
        action: function(actr, tgt, gameState) {
            if (typeof cmd.action !== 'function') return;
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
}
