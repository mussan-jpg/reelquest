// screens/shared.js
import { masterCharacters } from '../data/characters/index.js';
import { CHARACTER_REF_PATTERN } from '../data/characters/descriptions.js';
import { commandEffects } from '../commands/index.js';
import { describeSpeciesTierUnlock, SPECIES_BONUSES } from '../battle/setBonuses.js';
import { FUSION_RULES } from './specialEventScreen.js';
import { getDetailReelStyle } from '../ui/rarityTheme.js';
import { getSlotCost } from '../partySlots.js';

export function getCharacterRarity(char) {
    return char?.rarity || normalizeCommandReels(char.commands).length;
}

export function getCharacterRarityClass(char) {
    const rarity = Math.max(1, Math.min(6, getCharacterRarity(char)));
    return `rarity-${rarity}`;
}

export function bindCharacterDetailTrigger(element, characterId, selector = '.candidate-img') {
    const target = selector ? element?.querySelector?.(selector) : element;
    if (!target || !characterId) return;
    target.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showCharacterDetail(characterId);
    });
}

export function createCharacterCard(charData, options = {}) {
    const card = document.createElement(options.tagName || 'div');
    const slotCost = getSlotCost(charData);
    const characterType = getCharacterType(charData);
    const extraClass = options.extraClass || '';
    card.className = `candidate-card ${getCharacterRarityClass(charData)} ${extraClass}`.trim();
    if (options.title !== false) card.title = options.title || charData.name;
    if (options.characterId !== false) card.dataset.characterId = charData.id;
    if (options.cursor) card.style.cursor = options.cursor;

    const nameHtml = options.showName === false
        ? ''
        : `<div class="candidate-name ${options.nameClass || 'party-select-card-name'}">${charData.name}</div>`;
    const sourceBadge = options.sourceMeta
        ? `<div class="replacement-source-badge ${options.sourceMeta.className}">${options.sourceMeta.label}</div>`
        : '';

    card.innerHTML = `
        ${sourceBadge}
        <div class="candidate-img" style="${options.imageStyle || 'cursor: pointer;'}" data-tooltip="右クリックで詳細表示">
            <img src="${charData.image}" alt="${charData.name}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        ${nameHtml}
        ${options.starsHtml || ''}
        <div class="library-card-species party-select-card-species species-${charData.species || 'none'} ${options.speciesClass || ''}" data-tooltip="${getSpeciesTooltip(charData)}">${formatSpeciesLabel(charData)}</div>
        <div class="library-card-type party-select-card-type ${options.typeClass || ''} ${characterType.className}">${formatCharacterTypeLabel(characterType)}</div>
        ${slotCost > 1 ? `<div class="slot-cost-badge">${slotCost}枠</div>` : ''}
    `;
    bindCharacterDetailTrigger(card, charData.id);
    return card;
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
    if (typeof cmd.calcShield === 'function') {
        const calculatedShield = cmd.calcShield(charData);
        if (calculatedShield > 0) {
            tooltip += `\n予測シールド付与量: ${calculatedShield}`;
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
        icon: '⚡',
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
    human: '👤',
    beast: '🐾',
    nature: '🌿',
    aquatic: '🌊',
    undead: '💀',
    demon: '😈',
    dragon: '🐉',
    construct: '🪨'
};

let characterDetailHistory = [];

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
    const tierLines = Object.entries(speciesBonus.tiers || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([tier]) => `TIER${tier} (${Number(tier) + 1}枠): ${describeSpeciesTierUnlock(speciesBonus, Number(tier))}`);
    return [
        `${speciesBonus.label} セット`,
        '同じ種族の合計枠数でTIERが上がります。',
        ...tierLines
    ].join('\n');
}

function buildSpeciesTierRowsHtml(speciesBonus, rowClassName) {
    return Object.entries(speciesBonus?.tiers || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([tier]) => `
            <div class="${rowClassName}">
                <span>T${escapeHtml(tier)}</span>
                <em>${escapeHtml(describeSpeciesTierUnlock(speciesBonus, Number(tier)))}</em>
            </div>
        `).join('');
}

function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRegExp(text = '') {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCharacterName(id) {
    return masterCharacters.find(char => char.id === id)?.name || id;
}

function renderCharacterLink(id, label = getCharacterName(id)) {
    return `<button type="button" class="char-detail-text-link" data-detail-link-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
}

function getFusionRecipeHtml(charData) {
    const rule = FUSION_RULES.find(item => item.resultId === charData.id);
    if (!rule) return charData.isSpecialOnly ? '特殊イベントで入手' : '';
    if (rule.sourceConditions) {
        return `合成レシピ: ${rule.sourceConditions.map(condition => escapeHtml(condition.label || '特殊素材')).join(' + ')}`;
    }
    if (rule.sourceSpecies) {
        const speciesName = SPECIES_BONUSES[rule.sourceSpecies]?.label || rule.sourceSpecies;
        return `合成レシピ: ${escapeHtml(speciesName)} ${rule.requiredSlots || 3}枠分`;
    }
    return `合成レシピ: ${rule.sourceIds
        .map(id => renderCharacterLink(id))
        .join('<span class="char-detail-recipe-plus">+</span>')}`;
}

function getDetailDescription(charData) {
    return (charData.description || '詳細不明。本人もまだ自己紹介を考え中。')
        .replace(/合成レシピ.*?(。|$)/g, '')
        .trim();
}

function linkCharacterNames(text, currentId) {
    const linkableCharacters = masterCharacters
        .filter(char => char.id !== currentId && char.name)
        .sort((a, b) => b.name.length - a.name.length);
    const byName = new Map(linkableCharacters.map(char => [char.name, char.id]));

    const linkPlainText = (plainText) => {
        if (!linkableCharacters.length) return escapeHtml(plainText);

        const namePattern = linkableCharacters.map(char => escapeRegExp(char.name)).join('|');
        const regex = new RegExp(namePattern, 'g');
        let html = '';
        let lastIndex = 0;

        String(plainText).replace(regex, (name, index) => {
            html += escapeHtml(String(plainText).slice(lastIndex, index));
            html += renderCharacterLink(byName.get(name), name);
            lastIndex = index + name.length;
            return name;
        });

        html += escapeHtml(String(plainText).slice(lastIndex));
        return html;
    };

    let html = '';
    let lastIndex = 0;
    String(text).replace(CHARACTER_REF_PATTERN, (match, id, index) => {
        html += linkPlainText(String(text).slice(lastIndex, index));
        html += id === currentId ? escapeHtml(getCharacterName(id)) : renderCharacterLink(id);
        lastIndex = index + match.length;
        return match;
    });
    html += linkPlainText(String(text).slice(lastIndex));
    return html;
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
        'atk_sumihaki',
        'cmd_pack_mark',
        'cmd_spore_lance',
        'cmd_tidal_screen',
        'cmd_brine_net',
        'cmd_doom_spark',
        'cmd_skyline_roar'
    ]);
    const guardCommands = new Set([
        'misc_guard',
        'cmd_cover',
        'cmd_jelly_cushion',
        'cmd_leaping_watch',
        'cmd_tidal_screen',
        'cmd_brine_net',
        'cmd_scale_charge',
        'cmd_patch_frame'
    ]);
    const supportCommands = new Set([
        'heal01',
        'heal02',
        'heal_cure',
        'cmd_healing_rain',
        'misc_support_reel_up',
        'misc_support_reel_up2',
        'cmd_gel_chorus',
        'cmd_rally_banner',
        'cmd_verdant_pulse',
        'cmd_grave_echo',
        'cmd_patch_frame'
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
    const hintedTypeKey = CHARACTER_TYPE_META[charData?.typeHint] ? charData.typeHint : typeKey;

    return {
        ...CHARACTER_TYPE_META[hintedTypeKey],
        scores
    };
}

// 全画面共通のキャラクター詳細ポップアップ表示ロジック
export function showCharacterDetail(charId, options = {}) {
    const charData = masterCharacters.find(c => c.id === charId);
    if (!charData) return;

    if (options.pushHistory && options.fromId && options.fromId !== charId) {
        characterDetailHistory.push(options.fromId);
    } else if (!options.keepHistory) {
        characterDetailHistory = [];
    }

    const modal = document.getElementById('detail-modal');
    const infoContainer = document.getElementById('modal-char-info');
    if (!modal || !infoContainer) return;

    const rarity = Math.max(1, Math.min(6, getCharacterRarity(charData)));
    const rarityClass = `rarity-${rarity}`;
    const getReelStyle = getDetailReelStyle;
    const characterType = getCharacterType(charData);
    const speciesBonus = SPECIES_BONUSES[charData.species];
    const speciesTooltip = getSpeciesTooltip(charData);
    const recipeHtml = getFusionRecipeHtml(charData);
    const descriptionText = getDetailDescription(charData);
    const speciesTierHtml = speciesBonus ? buildSpeciesTierRowsHtml(speciesBonus, 'char-detail-set-tier-row') : '';

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
        ${characterDetailHistory.length ? `
            <div class="char-detail-nav">
                <button type="button" class="char-detail-back-btn" data-detail-back>
                    ← 前のキャラに戻る
                </button>
            </div>
        ` : ''}
        <div class="char-detail-header">
            <div class="char-detail-visual">
                <div class="char-detail-image">
                    <img src="${charData.image}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="char-detail-stats">
                    <div>HP: ${charData.maxHp || charData.hp}</div>
                    <div>ATK: ${charData.atk}</div>
                    <div>INT: ${charData.int}</div>
                    <div>SPD: ${charData.spd}</div>
                </div>
            </div>
            <div class="char-detail-main">
                <h2>${charData.name}</h2>
                <div class="char-detail-badges">
                    <div class="char-detail-species" data-tooltip="${escapeHtml(speciesTooltip)}">
                        <span>${formatSpeciesLabel(charData)}</span>
                    </div>
                    <div class="char-detail-type ${characterType.className}" data-tooltip="${escapeHtml(characterType.description)}">
                        <span>${formatCharacterTypeLabel(characterType)}</span>
                    </div>
                </div>
                ${speciesTierHtml ? `
                    <div class="char-detail-set-tiers" aria-label="${escapeHtml(speciesBonus.label)}のセット効果">
                        <div class="char-detail-set-tiers-title">セット効果</div>
                        ${speciesTierHtml}
                    </div>
                ` : ''}
                <div class="char-detail-meta">
                    <span>消費枠: ${charData.slotCost || 1}</span>
                    <span>${charData.isSpecialOnly ? '特殊入手専用' : '通常入手可'}</span>
                </div>
                ${recipeHtml ? `<div class="char-detail-recipe">${recipeHtml}</div>` : ''}
            </div>
        </div>
        <div class="char-detail-description">
            ${linkCharacterNames(descriptionText, charData.id)}
        </div>
        <div>
            ${reelsHtml}
        </div>
    `;
    infoContainer.querySelectorAll('[data-detail-link-id]').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            showCharacterDetail(button.dataset.detailLinkId, {
                pushHistory: true,
                fromId: charData.id
            });
        });
    });
    infoContainer.querySelector('[data-detail-back]')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const previousId = characterDetailHistory.pop();
        if (previousId) showCharacterDetail(previousId, { keepHistory: true });
    });

    modal.classList.remove('hidden');
}
