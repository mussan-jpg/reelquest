import { describeSpeciesTier, SPECIES_BONUSES } from '../battle/setBonuses.js';
import { getOwnedRelics } from '../battle/relics.js';
import { getSpeciesIcon } from '../screens/shared.js';
import { renderBattlePartyCards } from './battleCharacterCard.js';
import { getOrderIconId } from './battleDom.js';
import { escapeHtml } from './tooltip.js';

function getOrderIconBackground(side) {
    return side === 'p'
        ? 'linear-gradient(135deg, #d5f4e6, #c8e6c9)'
        : 'linear-gradient(135deg, #fadbd8, #f5b7b1)';
}

function getActionOrder(gameState) {
    return [
        ...gameState.players.map((char, index) => ({ char, index, side: 'p' })),
        ...gameState.enemies.map((char, index) => ({ char, index, side: 'e' }))
    ].sort((a, b) => (b.char.spd || 0) - (a.char.spd || 0));
}

function renderSpeciesBonusNotice(party, sideClass) {
    const activeBonuses = new Map();
    (party || []).forEach(char => {
        const activeList = Array.isArray(char.activeSpeciesBonuses) ? char.activeSpeciesBonuses : [char.activeSpeciesBonus];
        activeList.forEach(active => {
            if (!active?.species || activeBonuses.has(active.species)) return;
            const bonus = SPECIES_BONUSES[active.species];
            if (!bonus) return;
            activeBonuses.set(active.species, {
                ...active,
                label: bonus.label
            });
        });
    });

    if (activeBonuses.size === 0) {
        return `<div class="battle-set-bonus-notice ${sideClass} is-empty" aria-label="セット効果なし"><strong class="battle-set-bonus-label" aria-label="セット効果">SET</strong><span class="battle-set-bonus-empty">発動なし</span></div>`;
    }

    const bonusTags = [...activeBonuses.entries()].map(([species, bonus]) => {
        const tierText = bonus.tier ? `TIER${bonus.tier}` : '';
        const effectText = describeSpeciesTier(bonus);
        const tooltip = `${bonus.label} ${tierText}\n効果: ${effectText}`;
        return `
            <span class="battle-set-bonus-tag" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${bonus.label} ${tierText}`)}">
                <span class="battle-set-bonus-icon">${getSpeciesIcon({ species })}</span>
                <span class="battle-set-bonus-name">${bonus.label}</span>
                ${tierText ? `<span class="battle-set-bonus-level">${tierText}</span>` : ''}
            </span>
        `;
    }).join('');

    return `<div class="battle-set-bonus-notice ${sideClass}"><strong class="battle-set-bonus-label" aria-label="セット効果">SET</strong> ${bonusTags}</div>`;
}

function getRelicGlyph(relic) {
    const glyphs = {
        relic_guardian_charm: '護',
        relic_tuning_fork: '律',
        relic_last_stand: '耐',
        relic_repair_kit: '修',
        relic_blue_core: '核',
        relic_ember_blade: '刃',
        relic_venom_vial: '毒',
        relic_stun_coil: '雷',
        relic_cracked_mask: '仮'
    };
    return glyphs[relic?.id] || '◇';
}

function renderRelicDock(gameState, side) {
    const relics = getOwnedRelics(gameState, side);
    if (relics.length === 0) return '';
    const sideClass = side === 'e' ? 'battle-relic-dock--enemies' : 'battle-relic-dock--allies';
    return `<div class="battle-relic-dock ${sideClass}" aria-label="レリック">${relics.map(relic => {
        const tooltip = `${relic.name}\n${relic.desc}`;
        return `
            <span class="battle-relic-icon" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(relic.name)}">
                ${relic.image
                    ? `<img src="${escapeHtml(relic.image)}" alt="" class="battle-relic-image">`
                    : `<span class="battle-relic-glyph">${escapeHtml(getRelicGlyph(relic))}</span>`}
            </span>
        `;
    }).join('')}</div>`;
}

export function renderOrderIconsFromQueue(actionQueue) {
    const orderHtml = actionQueue.map((item, idx) => `
        <div id="${getOrderIconId(item.side, item.index)}"
             class="order-icon${idx === 0 ? ' active' : ''}"
             data-side="${item.side}"
             data-idx="${item.index}"
             title="${item.char.name}"
             style="background: ${getOrderIconBackground(item.side)};">
            <img src="${item.char.image}" alt="${item.char.name}">
        </div>
    `).join('');

    return `<div class="order-icon-wrapper">${orderHtml}</div>`;
}

export function renderInitialOrderIcons(gameState) {
    return renderOrderIconsFromQueue(getActionOrder(gameState));
}

export function renderBattleField(gameState) {
    return `
        <div class="battle-layout">
            <div class="battle-teams-row">
                <div class="battle-team-panel battle-team-panel--allies">
                    <h2>
                        <span class="battle-team-title-main"><span>味方パーティ</span>${renderRelicDock(gameState, 'p')}</span>
                        <small>ALLIES</small>
                    </h2>
                    ${renderSpeciesBonusNotice(gameState.players, 'battle-set-bonus-notice--allies')}
                    ${renderBattlePartyCards(gameState.players, 'p')}
                </div>

                <div class="battle-team-panel battle-team-panel--enemies">
                    <h2>
                        <span class="battle-team-title-main"><span>敵パーティ</span>${renderRelicDock(gameState, 'e')}</span>
                        <small>ENEMIES</small>
                    </h2>
                    ${renderSpeciesBonusNotice(gameState.enemies, 'battle-set-bonus-notice--enemies')}
                    ${renderBattlePartyCards(gameState.enemies, 'e')}
                </div>
            </div>
        </div>
    `;
}
