// screens/libraryScreen.js
import { masterCharacters } from '../data/characters/index.js';
import { formatCharacterTypeLabel, formatSpeciesLabel, getCharacterRarity, getCharacterType, getSpeciesTooltip, showCharacterDetail } from './shared.js';
import { SPECIES_BONUSES } from '../battle/setBonuses.js';

function getRarityMeta(rarity) {
    const normalizedRarity = Math.max(1, Math.min(6, rarity));
    const meta = {
        1: { label: '★1 ノーマル', cardClass: 'rarity-1', description: '基本性能が扱いやすいキャラクター' },
        2: { label: '★★ レア', cardClass: 'rarity-2', description: 'リールが増えて戦術が広がるキャラクター' },
        3: { label: '★★★ スーパーレア', cardClass: 'rarity-3', description: '高い能力や強力なコマンドを持つキャラクター' },
        4: { label: '★★★★ エピック', cardClass: 'rarity-4', description: '上位のリールと強い個性を持つキャラクター' },
        5: { label: '★★★★★ ミシック', cardClass: 'rarity-5', description: '特殊な力や複数枠の存在感を持つキャラクター' },
        6: { label: '★★★★★★ レジェンド', cardClass: 'rarity-6', description: '最上位のリールと伝説級の力を持つキャラクター' }
    };
    return meta[normalizedRarity];
}

export function setupLibraryScreen() {
    const list = document.getElementById('library-list');
    if (!list) return;
    list.innerHTML = '';

    const groupedCharacters = [1, 2, 3, 4, 5, 6].map(rarity => ({
        rarity,
        characters: masterCharacters
            .filter(char => Math.max(1, Math.min(6, getCharacterRarity(char))) === rarity)
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    }));

    groupedCharacters.forEach(group => {
        if (group.characters.length === 0) return;

        const rarityMeta = getRarityMeta(group.rarity);
        const section = document.createElement('section');
        section.className = `library-section ${rarityMeta.cardClass}`;

        const header = document.createElement('div');
        header.className = 'library-section-header';

        const title = document.createElement('h2');
        title.innerText = rarityMeta.label;

        const count = document.createElement('span');
        count.innerText = `${group.characters.length}体`;

        const description = document.createElement('p');
        description.innerText = rarityMeta.description;

        header.appendChild(title);
        header.appendChild(count);
        section.appendChild(header);
        section.appendChild(description);

        const grid = document.createElement('div');
        grid.className = 'library-grid';

        group.characters.forEach(char => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `library-card ${rarityMeta.cardClass}`;

            const image = document.createElement('img');
            image.src = char.image;
            image.alt = char.name;
            image.className = 'library-card-image';

            const name = document.createElement('div');
            name.className = 'library-card-name';
            name.innerText = char.name;

            const characterType = getCharacterType(char);
            const typeLabel = document.createElement('div');
            typeLabel.className = `library-card-type ${characterType.className}`;
            typeLabel.innerText = formatCharacterTypeLabel(characterType);

            const speciesBonus = SPECIES_BONUSES[char.species];
            const speciesLabel = document.createElement('div');
            speciesLabel.className = 'library-card-species';
            speciesLabel.innerText = formatSpeciesLabel(char);
            if (speciesBonus) {
                speciesLabel.dataset.tooltip = getSpeciesTooltip(char);
            }

            const stats = document.createElement('div');
            stats.className = 'library-card-stats';
            stats.innerText = `HP ${char.maxHp} / ATK ${char.atk} / INT ${char.int} / SPD ${char.spd}`;

            const descriptionText = document.createElement('div');
            descriptionText.className = 'library-card-description';
            const specialText = char.isSpecialOnly ? '【特殊入手専用】' : '';
            const slotText = (char.slotCost || 1) > 1 ? `【${char.slotCost}枠】` : '';
            descriptionText.innerText = `${specialText}${slotText}${char.description || '詳細不明。本人もまだ自己紹介を考え中。'}`;

            card.appendChild(image);
            card.appendChild(name);
            card.appendChild(speciesLabel);
            card.appendChild(typeLabel);
            card.appendChild(stats);
            card.appendChild(descriptionText);

            card.addEventListener('click', () => showCharacterDetail(char.id));
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showCharacterDetail(char.id);
            });

            grid.appendChild(card);
        });

        section.appendChild(grid);
        list.appendChild(section);
    });
}
