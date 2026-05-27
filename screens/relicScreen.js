import { addRelic, getRelicChoices } from '../battle/relics.js';
import { escapeHtml } from '../ui/tooltip.js';

export function showRelicSelection(gameState, clearedFloor) {
    return new Promise(resolve => {
        const screen = document.getElementById('relic-screen');
        const list = document.getElementById('relic-choice-list');
        const description = document.getElementById('relic-description');
        if (!screen || !list || !description) {
            resolve(null);
            return;
        }

        const choices = getRelicChoices(gameState, 3);
        if (choices.length === 0) {
            resolve(null);
            return;
        }

        document.getElementById('battle-screen')?.classList.add('hidden');
        document.getElementById('result-screen')?.classList.add('hidden');
        description.textContent = `${clearedFloor}F突破報酬: 冒険中に効果を発揮するレリックを1つ選んでください。`;
        list.innerHTML = '';

        choices.forEach(relic => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'relic-choice-card';
            button.innerHTML = `
                <img src="${escapeHtml(relic.image || 'images/relic_default.svg')}" alt="" class="relic-choice-image">
                <strong>${escapeHtml(relic.name)}</strong>
                <span>${escapeHtml(relic.desc)}</span>
            `;
            button.addEventListener('click', () => {
                addRelic(gameState, relic.id);
                screen.classList.add('hidden');
                document.getElementById('battle-screen')?.classList.remove('hidden');
                resolve(relic);
            });
            list.appendChild(button);
        });

        screen.classList.remove('hidden');
    });
}
