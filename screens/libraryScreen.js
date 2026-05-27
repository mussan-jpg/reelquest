// screens/libraryScreen.js
import { masterCharacters } from '../data/characters/index.js';
import { resolveCharacterRefs } from '../data/characters/descriptions.js';
import { formatCharacterTypeLabel, formatSpeciesLabel, getCharacterRarity, getCharacterType, getSpeciesTooltip, showCharacterDetail } from './shared.js';
import { describeSpeciesTierUnlock, SPECIES_BONUSES } from '../battle/setBonuses.js';
import { RELICS } from '../battle/relics.js';
import { getSpeciesPoints } from '../partySlots.js';

let activeLibrarySort = 'rarity';
let activeLibraryGradeOrder = 'asc';
let activeLibraryView = 'characters';
let librarySectionLinks = [];

const LIBRARY_SORT_OPTIONS = [
    { id: 'rarity', label: 'レア度', description: 'レア度ごとに表示' },
    { id: 'species', label: '種族', description: '種族ごとに表示' },
    { id: 'type', label: '型', description: '役割ごとに表示' },
    { id: 'name', label: '名前', description: '五十音順' },
    { id: 'hp', label: 'HP', description: 'HPが高い順' },
    { id: 'atk', label: 'ATK', description: 'ATKが高い順' },
    { id: 'int', label: 'INT', description: 'INTが高い順' },
    { id: 'spd', label: 'SPD', description: 'SPDが高い順' },
    { id: 'slot', label: '枠数', description: '消費枠が大きい順' }
];

function getCharacterName(id) {
    return masterCharacters.find(char => char.id === id)?.name || id;
}

function getRarityMeta(rarity) {
    const normalizedRarity = Math.max(1, Math.min(6, rarity));
    const meta = {
        1: { label: '★ コモン', cardClass: 'rarity-1', description: '基本性能が扱いやすいキャラクター' },
        2: { label: '★ アンコモン', cardClass: 'rarity-2', description: 'リールが増えて戦術が広がるキャラクター' },
        3: { label: '★ レア', cardClass: 'rarity-3', description: '高い能力や強力なコマンドを持つキャラクター' },
        4: { label: '★ エピック', cardClass: 'rarity-4', description: '上位リールと強い個性を持つキャラクター' },
        5: { label: '★ チャレンジャー', cardClass: 'rarity-5', description: '強い個性と上位性能で高難度に挑むキャラクター' },
        6: { label: '★ レジェンド', cardClass: 'rarity-6', description: '最上位リールと伝説級の力を持つキャラクター' }
    };
    return meta[normalizedRarity];
}

function getSortValue(char, sortId) {
    switch (sortId) {
        case 'hp': return char.maxHp || char.hp || 0;
        case 'atk': return char.atk || 0;
        case 'int': return char.int || 0;
        case 'spd': return char.spd || 0;
        case 'slot': return char.slotCost || 1;
        default: return 0;
    }
}

function sortByName(characters) {
    return [...characters].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function sortByNumeric(characters, sortId) {
    return [...characters].sort((a, b) => {
        const diff = getSortValue(b, sortId) - getSortValue(a, sortId);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'ja');
    });
}

function getOrderedRarities() {
    const rarities = [1, 2, 3, 4, 5, 6];
    return activeLibraryGradeOrder === 'desc' ? rarities.reverse() : rarities;
}

function sortByGradeThenName(characters) {
    const direction = activeLibraryGradeOrder === 'desc' ? -1 : 1;
    return [...characters].sort((a, b) => {
        const rarityDiff = (getCharacterRarity(a) - getCharacterRarity(b)) * direction;
        if (rarityDiff !== 0) return rarityDiff;
        return a.name.localeCompare(b.name, 'ja');
    });
}

function makeSectionId(text) {
    return `library-section-${String(text)
        .replace(/\s+/g, '-')
        .replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]/g, '')}`;
}

function createLibraryCard(char) {
    const rarity = Math.max(1, Math.min(6, getCharacterRarity(char)));
    const rarityMeta = getRarityMeta(rarity);
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
    stats.innerText = `HP ${char.maxHp} / ATK ${char.atk} / INT ${char.int} / SPD ${char.spd} / 種族${getSpeciesPoints(char)}pt`;

    const descriptionText = document.createElement('div');
    descriptionText.className = 'library-card-description';
    const specialText = char.isSpecialOnly ? '【特殊入手専用】' : '';
    const slotText = (char.slotCost || 1) > 1 ? `【${char.slotCost}枠】` : '';
    descriptionText.innerText = `${specialText}${slotText}${resolveCharacterRefs(
        char.description || '詳細不明。本人もまだ自己紹介を考え中。',
        getCharacterName
    )}`;

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

    return card;
}

function createRelicLibraryCard(relic) {
    const card = document.createElement('article');
    card.className = 'library-relic-card';

    const image = document.createElement('img');
    image.src = relic.image || 'images/relic_default.svg';
    image.alt = relic.name;
    image.className = 'library-relic-image';

    const body = document.createElement('div');
    body.className = 'library-relic-body';

    const name = document.createElement('strong');
    name.innerText = relic.name;

    const description = document.createElement('span');
    description.innerText = relic.desc;

    body.appendChild(name);
    body.appendChild(description);
    card.appendChild(image);
    card.appendChild(body);

    return card;
}

function createSpeciesSetSummary(bonus) {
    const wrapper = document.createElement('div');
    wrapper.className = 'library-species-set-summary';

    const title = document.createElement('div');
    title.className = 'library-species-set-title';
    title.innerText = 'セット効果';
    wrapper.appendChild(title);

    Object.entries(bonus?.tiers || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([tier]) => {
            const row = document.createElement('div');
            row.className = 'library-species-set-row';

            const level = document.createElement('span');
            level.innerText = `T${tier}`;

            const effect = document.createElement('em');
            effect.innerText = describeSpeciesTierUnlock(bonus, Number(tier));

            row.appendChild(level);
            row.appendChild(effect);
            wrapper.appendChild(row);
        });

    return wrapper;
}

function renderLibrarySection(list, titleText, descriptionText, items, cardClass = '', options = {}) {
    if (items.length === 0) return;
    const sectionId = makeSectionId(titleText);
    const countSuffix = options.countSuffix || '体';
    librarySectionLinks.push({ id: sectionId, label: titleText, count: items.length, countLabel: `${items.length}${countSuffix}` });

    const section = document.createElement('section');
    section.className = `library-section ${cardClass}`.trim();
    section.id = sectionId;

    const header = document.createElement('div');
    header.className = 'library-section-header';

    const title = document.createElement('h2');
    title.innerText = titleText;

    const count = document.createElement('span');
    count.innerText = `${items.length}${countSuffix}`;

    const description = document.createElement('div');
    description.className = 'library-section-description';
    if (descriptionText instanceof HTMLElement) {
        description.appendChild(descriptionText);
    } else {
        description.innerText = descriptionText;
    }

    header.appendChild(title);
    header.appendChild(count);
    section.appendChild(header);
    section.appendChild(description);

    const grid = document.createElement('div');
    grid.className = options.gridClassName || 'library-grid';
    items.forEach(item => grid.appendChild(options.renderItem ? options.renderItem(item) : createLibraryCard(item)));

    section.appendChild(grid);
    list.appendChild(section);
}

function renderLibrarySortControls() {
    const controls = document.getElementById('library-sort-controls');
    if (!controls) return;

    controls.innerHTML = `
        <div class="library-sort-title">表示</div>
        <div class="library-view-toggle" aria-label="図鑑表示切り替え">
            <button type="button" class="${activeLibraryView === 'characters' ? 'active' : ''}" data-library-view="characters">
                キャラ
            </button>
            <button type="button" class="${activeLibraryView === 'relics' ? 'active' : ''}" data-library-view="relics">
                レリック
            </button>
        </div>
        <div class="library-sort-title">並び替え</div>
        <div class="library-grade-order${activeLibraryView === 'relics' ? ' hidden' : ''}" aria-label="グレード表示順">
            <button type="button" class="${activeLibraryGradeOrder === 'asc' ? 'active' : ''}" data-library-grade-order="asc">
                昇順
            </button>
            <button type="button" class="${activeLibraryGradeOrder === 'desc' ? 'active' : ''}" data-library-grade-order="desc">
                降順
            </button>
        </div>
        ${activeLibraryView === 'characters' ? LIBRARY_SORT_OPTIONS.map(option => `
            <button type="button" class="${activeLibrarySort === option.id ? 'active' : ''}" data-library-sort="${option.id}">
                <strong>${option.label}</strong>
                <small>${option.description}</small>
            </button>
        `).join('') : `
            <div class="library-sort-note">
                レリックは入手候補に出る種類を一覧表示します。
            </div>
        `}
    `;

    controls.querySelectorAll('[data-library-view]').forEach(button => {
        button.addEventListener('click', () => {
            activeLibraryView = button.dataset.libraryView;
            setupLibraryScreen();
        });
    });

    controls.querySelectorAll('[data-library-sort]').forEach(button => {
        button.addEventListener('click', () => {
            activeLibrarySort = button.dataset.librarySort;
            setupLibraryScreen();
        });
    });

    controls.querySelectorAll('[data-library-grade-order]').forEach(button => {
        button.addEventListener('click', () => {
            activeLibraryGradeOrder = button.dataset.libraryGradeOrder;
            setupLibraryScreen();
        });
    });
}

function renderLibrarySectionJumps() {
    const container = document.getElementById('library-jump-controls');
    if (!container) return;
    if (!librarySectionLinks.length) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="library-jump-title">ジャンプ</div>
        <div class="library-section-jumps-list">
            ${librarySectionLinks.map(section => `
                <button type="button" data-library-section-target="${section.id}">
                    <span>${section.label}</span>
                    <small>${section.countLabel || `${section.count}体`}</small>
                </button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('[data-library-section-target]').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById(button.dataset.librarySectionTarget)
                ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
    });
}

function renderRaritySortedLibrary(list) {
    const groupedCharacters = getOrderedRarities().map(rarity => ({
        rarity,
        characters: masterCharacters
            .filter(char => Math.max(1, Math.min(6, getCharacterRarity(char))) === rarity)
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    }));

    groupedCharacters.forEach(group => {
        if (group.characters.length === 0) return;

        const rarityMeta = getRarityMeta(group.rarity);
        renderLibrarySection(list, rarityMeta.label, rarityMeta.description, group.characters, rarityMeta.cardClass);
    });
}

function renderSpeciesSortedLibrary(list) {
    Object.entries(SPECIES_BONUSES).forEach(([species, bonus]) => {
        const characters = sortByGradeThenName(masterCharacters.filter(char => char.species === species));
        renderLibrarySection(list, formatSpeciesLabel({ species }), createSpeciesSetSummary(bonus), characters);
    });
}

function renderTypeSortedLibrary(list) {
    const typeGroups = new Map();
    masterCharacters.forEach(char => {
        const characterType = getCharacterType(char);
        const key = characterType.label;
        if (!typeGroups.has(key)) {
            typeGroups.set(key, { characterType, characters: [] });
        }
        typeGroups.get(key).characters.push(char);
    });

    [...typeGroups.values()]
        .sort((a, b) => a.characterType.label.localeCompare(b.characterType.label, 'ja'))
        .forEach(group => {
            renderLibrarySection(
                list,
                formatCharacterTypeLabel(group.characterType),
                group.characterType.description,
                sortByGradeThenName(group.characters)
            );
        });
}

function renderFlatSortedLibrary(list, sortId) {
    const option = LIBRARY_SORT_OPTIONS.find(item => item.id === sortId);
    getOrderedRarities().forEach(rarity => {
        const rarityMeta = getRarityMeta(rarity);
        const characters = masterCharacters.filter(char => Math.max(1, Math.min(6, getCharacterRarity(char))) === rarity);
        const sortedCharacters = sortId === 'name'
            ? sortByName(characters)
            : sortByNumeric(characters, sortId);
        renderLibrarySection(
            list,
            `${rarityMeta.label} / ${option?.label || '一覧'}順`,
            option?.description || 'キャラクター一覧',
            sortedCharacters,
            rarityMeta.cardClass
        );
    });
}

function renderSlotSortedLibrary(list) {
    [1, 2, 3, 4].forEach(slotCost => {
        const characters = masterCharacters
            .filter(char => (char.slotCost || 1) === slotCost)
            .sort((a, b) => {
                const rarityDiff = (getCharacterRarity(a) - getCharacterRarity(b)) * (activeLibraryGradeOrder === 'desc' ? -1 : 1);
                if (rarityDiff !== 0) return rarityDiff;
                return a.name.localeCompare(b.name, 'ja');
            });
        renderLibrarySection(
            list,
            `${slotCost}枠`,
            `${slotCost}枠を使うキャラクター`,
            characters
        );
    });
}

function renderRelicLibrary(list) {
    renderLibrarySection(
        list,
        'レリック一覧',
        '冒険中に獲得できる装備効果。防御だけでなく、攻撃・状態異常・戦闘開始時の妨害も含まれます。',
        RELICS,
        'library-section--relics',
        {
            countSuffix: '個',
            gridClassName: 'library-relic-grid',
            renderItem: createRelicLibraryCard
        }
    );
}

export function setupLibraryScreen() {
    const list = document.getElementById('library-list');
    if (!list) return;
    list.innerHTML = '';
    librarySectionLinks = [];
    renderLibrarySortControls();

    if (activeLibraryView === 'relics') {
        renderRelicLibrary(list);
    } else if (activeLibrarySort === 'rarity') {
        renderRaritySortedLibrary(list);
    } else if (activeLibrarySort === 'species') {
        renderSpeciesSortedLibrary(list);
    } else if (activeLibrarySort === 'type') {
        renderTypeSortedLibrary(list);
    } else if (activeLibrarySort === 'slot') {
        renderSlotSortedLibrary(list);
    } else {
        renderFlatSortedLibrary(list, activeLibrarySort);
    }
    renderLibrarySectionJumps();
}
