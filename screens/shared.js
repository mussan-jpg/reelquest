// screens/shared.js
import { masterCharacters } from '../data/characters/index.js';
import { commandEffects } from '../commands/index.js';
import { SPECIES_BONUSES } from '../battle/setBonuses.js';

export function getCharacterRarity(char) {
    return char?.rarity || normalizeCommandReels(char.commands).length;
}

export function getCharacterRarityClass(char) {
    const rarity = Math.max(1, Math.min(6, getCharacterRarity(char)));
    return `rarity-${rarity}`;
}

export function normalizeCommandReels(commands) {
    if (typeof commands === 'string') {
        return [commands.split(',').map(command => command.trim()).filter(Boolean)];
    }
    if (!Array.isArray(commands)) {
        return [[]];
    }
    return Array.isArray(commands[0]) ? commands : [commands];
}

export function buildCommandTooltip(cmd, charData) {
    if (!cmd) return '効果: 詳細なし';

    let tooltip = `${cmd.name}\n分類: ${cmd.category || 'その他'}\n効果: ${cmd.desc || '詳細なし'}`;
    if (typeof cmd.calcDamage === 'function') {
        const calculatedDmg = cmd.calcDamage(charData);
        if (calculatedDmg > 0) {
            tooltip += `\n予測ダメージ: ${calculatedDmg}`;
        }
    }
    if (typeof cmd.calcHeal === 'function') {
        const calculatedHeal = cmd.calcHeal(charData);
        if (calculatedHeal > 0) {
            tooltip += `\n予測回復量: ${calculatedHeal}`;
        }
    }

    return tooltip;
}

const CHARACTER_TYPE_META = {
    attack: {
        label: '攻撃型',
        icon: '⚔️',
        className: 'type-attack',
        description: 'ダメージを出すことを得意とする'
    },
    support: {
        label: '支援型',
        icon: '💚',
        className: 'type-support',
        description: '回復やリール支援で味方を助ける'
    },
    disrupt: {
        label: '妨害型',
        icon: '😈',
        className: 'type-disrupt',
        description: '毒・マヒ・弱体などで相手を崩す'
    },
    guard: {
        label: '守護型',
        icon: '🛡️',
        className: 'type-guard',
        description: '攻撃を引きつけて味方を守る'
    },
    allrounder: {
        label: '万能型',
        icon: '✨',
        className: 'type-allrounder',
        description: '複数の役割をこなせる'
    }
};

const SPECIES_ICON_META = {
    slime: '💧',
    human: '🧍',
    beast: '🐾',
    nature: '🌿',
    aquatic: '🌊',
    undead: '💀',
    demon: '😈',
    dragon: '🐉',
    construct: '🪨'
};

export function formatCharacterTypeLabel(characterType) {
    return `${characterType.icon || ''} ${characterType.label}`.trim();
}

export function getSpeciesIcon(charData) {
    return SPECIES_ICON_META[charData?.species] || '';
}

export function formatSpeciesLabel(charData) {
    const speciesBonus = SPECIES_BONUSES[charData?.species];
    if (!speciesBonus) return '種族なし';
    return `${getSpeciesIcon(charData)} ${speciesBonus.label}`.trim();
}

export function getSpeciesTooltip(charData) {
    const speciesBonus = SPECIES_BONUSES[charData?.species];
    if (!speciesBonus) return '種族効果なし';
    return `${speciesBonus.label}\n${speciesBonus.name}\n${speciesBonus.description}`;
}

export function getCharacterType(charData) {
    const scores = { attack: 0, support: 0, disrupt: 0, guard: 0 };
    const reels = normalizeCommandReels(charData.commands);
    const flatCommands = reels.flat();
    const disruptCommands = new Set([
        'atk04',
        'atk_paralyze',
        'atk_weaken',
        'atk_weakened',
        'atk_guard_break',
        'atk_prank',
        'atk_sumihaki'
    ]);
    const guardCommands = new Set(['misc_guard', 'cmd_cover']);
    const supportCommands = new Set([
        'heal01',
        'heal02',
        'heal_cure',
        'cmd_healing_rain',
        'misc_support_reel_up',
        'misc_support_reel_up2'
    ]);
    const selfBuffCommands = new Set(['misc01', 'misc02', 'misc_focus', 'misc_quickstep', 'misc_wingbeat', 'misc_mana_charge']);

    flatCommands.forEach(commandId => {
        const cmd = commandEffects[commandId];
        if (!cmd) return;

        if (typeof cmd.calcDamage === 'function' && cmd.calcDamage(charData) > 0) {
            scores.attack += 1;
        }
        if (supportCommands.has(commandId)) {
            scores.support += 1.2;
        }
        if (selfBuffCommands.has(commandId)) {
            scores.support += 0.5;
        }
        if (disruptCommands.has(commandId)) {
            scores.disrupt += 1.25;
        }
        if (guardCommands.has(commandId)) {
            scores.guard += 1.5;
        }
    });

    const activeRoles = Object.entries(scores)
        .filter(([, score]) => score >= 2)
        .sort((a, b) => b[1] - a[1]);
    const topScore = activeRoles[0]?.[1] || 0;
    const isBroadRole = activeRoles.length >= 3 && activeRoles[1][1] >= topScore * 0.55;
    const isGuardSpecialist = scores.guard >= 3 && scores.guard >= topScore * 0.75;
    const isDisruptSpecialist = scores.disrupt >= 3.5 && scores.disrupt >= scores.attack * 0.65;
    const typeKey = isGuardSpecialist
        ? 'guard'
        : isDisruptSpecialist
            ? 'disrupt'
            : isBroadRole ? 'allrounder' : (activeRoles[0]?.[0] || 'attack');

    return {
        ...CHARACTER_TYPE_META[typeKey],
        scores
    };
}

// 💡 全画面共通のキャラクター詳細ポップアップ表示ロジック
export function showCharacterDetail(charId) {
    const charData = masterCharacters.find(c => c.id === charId);
    if (!charData) return;

    const modal = document.getElementById('detail-modal');
    const infoContainer = document.getElementById('modal-char-info');
    if (!modal || !infoContainer) return;

    const escapeHtml = (text = '') => String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const rarity = Math.max(1, Math.min(6, getCharacterRarity(charData)));
    const rarityClass = `rarity-${rarity}`;
    const getReelStyle = (idx) => {
        switch (idx) {
            case 0: return "background: #e6cdb8; border-color: rgba(160, 90, 44, 0.5);";
            case 1: return "background: #d8e1e6; border-color: rgba(104, 121, 130, 0.5);";
            case 2: return "background: #ffe08a; border-color: rgba(173, 122, 0, 0.5);";
            case 3:
                return "background: #d7d2ff; border-color: rgba(91, 110, 225, 0.52);";
            case 4:
                return "background: linear-gradient(135deg, #cbbdff, #aebdff, #91e7cf); border-color: rgba(76, 29, 149, 0.58);";
            case 5:
                return "background: linear-gradient(135deg, rgba(255, 196, 170, 0.92), rgba(255, 224, 122, 0.92), rgba(164, 234, 216, 0.92), rgba(196, 201, 255, 0.92)); border-color: rgba(108, 92, 231, 0.58);";
            default: return "background: #e2e8ee; border-color: rgba(45, 52, 54, 0.26);";
        }
    };
    const characterType = getCharacterType(charData);
    const speciesBonus = SPECIES_BONUSES[charData.species];
    const speciesText = speciesBonus
        ? speciesBonus.label
        : 'なし';
    const speciesTooltip = speciesBonus
        ? `${speciesBonus.label}\n${speciesBonus.name}\n${speciesBonus.description}`
        : '種族効果なし';

    let reelsHtml = '';
    if (Array.isArray(charData.commands)) {
        const reels = Array.isArray(charData.commands[0]) ? charData.commands : [charData.commands];

        reels.forEach((reel, idx) => {
            const style = getReelStyle(idx);
            const cmdItems = reel.map(cmdId => {
                const cmd = commandEffects[cmdId];
                const cmdName = cmd ? cmd.name : cmdId;
                const tooltip = buildCommandTooltip(cmd, charData);

                return `
                    <div class="detail-command-chip" data-tooltip="${escapeHtml(tooltip)}">
                        ${escapeHtml(cmdName)}
                    </div>
                `;
            }).join('');

            reelsHtml += `
                <div class="detail-reel-row" style="${style}">
                    ${cmdItems}
                </div>
            `;
        });
    }

    infoContainer.className = `char-detail ${rarityClass}`;
    infoContainer.innerHTML = `
        <div class="char-detail-header">
            <div class="char-detail-image">
                <img src="${charData.image}" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div>
                <h2>${charData.name}</h2>
                <div class="char-detail-species" data-tooltip="${speciesTooltip}">
                    <span>${formatSpeciesLabel(charData)}</span>
                </div>
                <div class="char-detail-type ${characterType.className}" data-tooltip="${escapeHtml(characterType.description)}">
                    <span>${formatCharacterTypeLabel(characterType)}</span>
                </div>
            </div>
        </div>
        <div class="char-detail-stats">
            <div>HP: ${charData.maxHp || charData.hp}</div>
            <div>ATK: ${charData.atk}</div>
            <div>INT: ${charData.int}</div>
            <div>SPD: ${charData.spd}</div>
            <div data-tooltip="${escapeHtml(speciesTooltip)}">種族: ${speciesText}</div>
            <div>消費枠: ${charData.slotCost || 1}</div>
            <div>${charData.isSpecialOnly ? '特殊入手専用' : '通常入手可'}</div>
        </div>
        <p class="char-detail-description">
            ${escapeHtml(charData.description || '詳細不明。本人もまだ自己紹介を考え中。')}
        </p>
        <div>
            ${reelsHtml}
        </div>
    `;

    modal.classList.remove('hidden');
}
