import {
    buildCommandTooltip,
    formatHpValue,
    formatBattleProgressPanel,
    formatShieldValue,
    formatSetStatRail,
    formatStatValue,
    generateCommands,
    generateStatusBadges,
    getReelGradeStyle,
    renderCommandForecast
} from './components.js';
import { escapeHtml } from './tooltip.js';
import {
    formatCharacterTypeLabel,
    formatSpeciesLabel,
    getCharacterType,
    getSpeciesTooltip
} from '../screens/shared.js';
import { getBattleId, getCommandElement } from './battleDom.js';

function getBattleRarityClass(char) {
    return `rarity-${getBattleRarity(char)}`;
}

function getBattleRarity(char) {
    const fallbackRarity = Array.isArray(char.commands?.[0]) ? char.commands.length : 1;
    return Math.max(1, Math.min(6, char.rarity || fallbackRarity));
}

function renderBattleRarityMark(char) {
    const rarity = getBattleRarity(char);
    return rarity >= 4
        ? `<span class="battle-rarity-mark battle-rarity-mark--${rarity}" aria-hidden="true"></span>`
        : '';
}

function getActiveCommands(char) {
    const activeReelIdx = char.currentReel !== undefined ? char.currentReel : 0;
    const commands = Array.isArray(char.commands?.[0])
        ? char.commands[activeReelIdx]
        : char.commands;
    return { activeReelIdx, commands };
}

function getCardThemeStyle(char, isDead) {
    if (isDead) return '';

    const maxReelIdx = Array.isArray(char.commands?.[0]) ? char.commands.length - 1 : 0;
    const maxGrade = getReelGradeStyle(maxReelIdx);
    const declarations = [`--battle-card-bg: ${maxGrade.cardBg}`];

    if (maxGrade.cardAnimation) {
        declarations.push('--battle-card-bg-size: 400% 400%');
        declarations.push(`--battle-card-animation: ${maxGrade.cardAnimation}`);
    }

    return ` style="${declarations.join('; ')};"`;
}

export function renderBattleCharacterCard(char, prefix, index) {
    const { activeReelIdx, commands } = getActiveCommands(char);
    const isDead = char.hp <= 0;
    const isParalyzed = char.status?.includes('paralysis');
    const slotCost = Math.max(1, Math.min(4, char.slotCost || 1));
    const characterType = getCharacterType(char);
    const currentGrade = getReelGradeStyle(activeReelIdx);

    return `
        <div class="character-section battle-character-card ${getBattleRarityClass(char)} ${isDead ? 'is-dead' : ''}${isParalyzed ? ' is-paralyzed' : ''}"
             id="${getBattleId(prefix, index, 'section')}"${getCardThemeStyle(char, isDead)}>
            ${renderBattleRarityMark(char)}
            <div class="battle-character-main">
                <div class="battle-character-title-row">
                    <span class="battle-character-name">${char.name}</span>
                    <span id="${getBattleId(prefix, index, 'reel-badge')}" class="battle-reel-badge" style="${currentGrade.style}">${currentGrade.text}</span>
                </div>
                <div id="${getBattleId(prefix, index, 'status')}" class="battle-status-row battle-status-row--build-slot">${generateStatusBadges(char.status)}</div>

                <div class="battle-hp-row">
                    <span>HP</span>
                    <span class="hp-text" id="${getBattleId(prefix, index, 'hp-text')}">${formatHpValue(char)}</span>
                    <span class="shield-text" id="${getBattleId(prefix, index, 'shield-text')}">${formatShieldValue(char)}</span>
                </div>
                <div class="hp-bar-container battle-hp-bar-container">
                    <div class="hp-bar" id="${getBattleId(prefix, index, 'hp-bar')}" style="width: ${(char.hp / char.maxHp) * 100}%;"></div>
                    <div class="shield-bar" id="${getBattleId(prefix, index, 'shield-bar')}" style="left: ${Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100))}%; width: ${Math.max(0, Math.min(100 - Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100)), (Math.max(0, Number(char.shield || 0)) / char.maxHp) * 100))}%;"></div>
                </div>

                <div class="battle-character-summary">
                    <div class="character-image battle-character-image"
                         oncontextmenu="event.preventDefault(); window.showCharacterDetail('${char.id}')"
                         data-tooltip="右クリックで全リール表示">
                        <img src="${char.image}" alt="${char.name}">
                    </div>
                    <div id="${getBattleId(prefix, index, 'stats')}" class="stat-list battle-stat-list">
                        ${formatStatValue('⚔️', char.atk, char.baseAtk ?? char.atk, { setBonus: char.activeSpeciesBonus?.atkBonus })}
                        ${formatStatValue('🔮', char.int, char.baseInt ?? char.int, { setBonus: char.activeSpeciesBonus?.intBonus })}
                        ${formatStatValue('👟', char.spd, char.baseSpd ?? char.spd, { setBonus: char.activeSpeciesBonus?.spdBonus })}
                    </div>
                    <div id="${getBattleId(prefix, index, 'set-stats')}" class="battle-set-stat-rail" aria-label="セット補正">
                        ${formatSetStatRail(char)}
                    </div>
                </div>
            </div>

            <div id="${getBattleId(prefix, index, 'progress-panel')}" class="battle-progress-panel-slot">
                <div class="battle-progress-panel-stack">
                    ${formatBattleProgressPanel(char)}
                    ${slotCost > 1 ? `
                        <span class="slot-cost-badge slot-cost-badge--battle" aria-label="${slotCost}枠モンスター" data-tooltip="${slotCost}枠モンスター">
                            ${slotCost}枠
                        </span>
                    ` : ''}
                </div>
            </div>

            <div class="battle-reel-stack">
                <div class="battle-card-tabs">
                    <div class="library-card-type battle-card-type ${characterType.className}">
                        <span class="battle-card-tag-label">${formatCharacterTypeLabel(characterType)}</span>
                    </div>
                    <div class="library-card-type battle-card-type battle-card-species" data-tooltip="${escapeHtml(getSpeciesTooltip(char))}">
                        <span class="battle-card-tag-label">${formatSpeciesLabel(char)}</span>
                    </div>
                </div>
                <div class="roulette battle-roulette" id="${getBattleId(prefix, index, 'roulette')}">
                    ${generateCommands(prefix, index, commands)}
                </div>
            </div>
        </div>
    `;
}

export function renderBattlePartyCards(characters, prefix) {
    return characters.map((char, index) => renderBattleCharacterCard(char, prefix, index)).join('');
}

export function applyCommandTooltips(char, prefix, index, commandEffects) {
    const { commands } = getActiveCommands(char);
    if (!commands) return;

    commands.forEach((cmdId, cmdIdx) => {
        const cmdEl = getCommandElement(prefix, index, cmdIdx);
        if (!cmdEl) return;

        cmdEl.style.backgroundColor = 'white';
        cmdEl.style.color = 'black';

        const effect = commandEffects[cmdId];
        if (effect) {
            cmdEl.removeAttribute('title');
            cmdEl.setAttribute('data-tooltip', buildCommandTooltip(effect, char));
            cmdEl.innerHTML = `
                <span class="cmd-name">${escapeHtml(effect.name || cmdId)}</span>
                ${renderCommandForecast(effect, char)}
            `;
        }
    });
}
