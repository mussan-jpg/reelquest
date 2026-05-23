// battle/setBonuses.js
import { getSlotCost } from '../partySlots.js';

export const SPECIES_BONUSES = {
    slime: {
        label: 'スライム族',
        name: 'ぷるぷる再生',
        threshold: 3,
        hpBonus: 20,
        regenPercent: 0.06,
        description: 'セット効果：最大HP+20、ターン開始時に最大HPの6%回復。'
    },
    human: {
        label: '人間族',
        name: '戦術連携',
        threshold: 3,
        startReelBonus: 1,
        description: 'セット効果：戦闘開始時のリールが1段階上がる。'
    },
    beast: {
        label: '獣族',
        name: '野生の勘',
        threshold: 3,
        spdBonus: 4,
        evasionBonus: 0.08,
        description: 'セット効果：SPD+4、回避発動率+8%。'
    },
    nature: {
        label: '自然族',
        name: '森の再生',
        threshold: 3,
        intBonus: 3,
        regenPercent: 0.08,
        description: 'セット効果：INT+3、ターン開始時に最大HPの8%回復。'
    },
    aquatic: {
        label: '水棲族',
        name: '流水回避',
        threshold: 3,
        hpBonus: 15,
        evasionBonus: 0.12,
        description: 'セット効果：最大HP+15、回避発動率+12%。'
    },
    undead: {
        label: '不死族',
        name: '不滅の執念',
        threshold: 3,
        atkBonus: 2,
        reviveOnce: true,
        description: 'セット効果：ATK+2、戦闘中1回だけHP1で踏みとどまる。'
    },
    demon: {
        label: '魔族',
        name: '魔力共鳴',
        threshold: 3,
        intBonus: 5,
        atkBonus: 2,
        description: 'セット効果：INT+5、ATK+2。'
    },
    dragon: {
        label: '竜族',
        name: '竜脈覚醒',
        threshold: 3,
        atkBonus: 4,
        intBonus: 4,
        hpBonus: 20,
        description: 'セット効果：最大HP+20、ATK+4、INT+4。'
    },
    construct: {
        label: '無機族',
        name: '堅牢装甲',
        threshold: 3,
        hpBonus: 30,
        damageTakenFactor: 0.9,
        description: 'セット効果：最大HP+30、受けるダメージを10%軽減。'
    }
};

function resetSpeciesBonuses(char) {
    if (!char) return;
    if (typeof char.baseMaxHp !== 'number') char.baseMaxHp = char.maxHp;
    char.maxHp = char.baseMaxHp;
    char.hp = Math.min(char.hp, char.maxHp);

    const activeBonus = char.activeSpeciesBonus || {};
    ['atk', 'int', 'spd'].forEach(stat => {
        const amount = activeBonus[`${stat}Bonus`] || 0;
        if (!amount) return;
        const baseKey = stat === 'atk' ? 'baseAtk' : stat === 'int' ? 'baseInt' : 'baseSpd';
        char[stat] = Math.max(1, char[stat] - amount);
        if (typeof char[baseKey] === 'number') {
            char[baseKey] = Math.max(1, char[baseKey] - amount);
        }
    });
    if (char.statBonuses) {
        ['atk', 'int', 'spd'].forEach(stat => {
            if (typeof char.statBonuses[stat] !== 'number') char.statBonuses[stat] = 0;
        });
    }
    char.activeSpeciesBonus = null;
}

function countSpeciesSlots(party) {
    return (party || []).reduce((counts, char) => {
        if (!char?.species || char.species === 'none') return counts;
        counts[char.species] = (counts[char.species] || 0) + getSlotCost(char);
        return counts;
    }, {});
}

function applyBonusToParty(party, sideLabel, options = {}) {
    const messages = [];
    (party || []).forEach(resetSpeciesBonuses);

    const speciesCounts = countSpeciesSlots(party);
    Object.entries(speciesCounts).forEach(([species, slots]) => {
        const bonus = SPECIES_BONUSES[species];
        if (!bonus || slots < bonus.threshold) return;

        (party || [])
            .filter(char => char.species === species)
            .forEach(char => {
                char.maxHp += bonus.hpBonus || 0;
                if (options.healToFull) {
                    char.hp = char.maxHp;
                } else {
                    char.hp = Math.min(char.maxHp, char.hp + (bonus.hpBonus || 0));
                }
                if (bonus.intBonus) {
                    char.int += bonus.intBonus;
                    if (typeof char.baseInt === 'number') {
                        char.baseInt += bonus.intBonus;
                    }
                }
                if (bonus.atkBonus) {
                    char.atk += bonus.atkBonus;
                    if (typeof char.baseAtk === 'number') {
                        char.baseAtk += bonus.atkBonus;
                    }
                }
                if (bonus.spdBonus) {
                    char.spd += bonus.spdBonus;
                    if (typeof char.baseSpd === 'number') {
                        char.baseSpd += bonus.spdBonus;
                    }
                }
                char.activeSpeciesBonus = {
                    species,
                    name: bonus.name,
                    hpBonus: bonus.hpBonus || 0,
                    atkBonus: bonus.atkBonus || 0,
                    intBonus: bonus.intBonus || 0,
                    spdBonus: bonus.spdBonus || 0,
                    evasionBonus: bonus.evasionBonus || 0,
                    damageTakenFactor: bonus.damageTakenFactor || 1,
                    regenPercent: bonus.regenPercent || 0,
                    reviveOnce: !!bonus.reviveOnce,
                    startReelBonus: bonus.startReelBonus || 0
                };
                char.speciesReviveUsed = false;
                if (bonus.startReelBonus && Array.isArray(char.commands?.[0])) {
                    char.currentReel = Math.min(char.commands.length - 1, (char.currentReel || 0) + bonus.startReelBonus);
                }
            });

        messages.push(`${sideLabel}: ${bonus.label}【${bonus.name}】発動！ ${bonus.description}`);
    });

    return messages;
}

export function applySpeciesSetBonuses(gameState, options = {}) {
    if (!gameState) return [];
    return [
        ...applyBonusToParty(gameState.players, '味方', options),
        ...applyBonusToParty(gameState.enemies, '敵', options)
    ];
}

export function applySpeciesTurnStartEffects(gameState, alertLog = () => {}) {
    if (!gameState) return;
    [...(gameState.players || []), ...(gameState.enemies || [])].forEach(char => {
        const regenPercent = char.activeSpeciesBonus?.regenPercent || 0;
        if (!regenPercent || char.hp <= 0) return;
        const heal = Math.max(1, Math.floor(char.maxHp * regenPercent));
        const before = char.hp;
        char.hp = Math.min(char.maxHp, char.hp + heal);
        if (char.hp > before) {
            alertLog(`${char.name}は【${char.activeSpeciesBonus.name}】で ${char.hp - before} 回復した！`);
        }
    });
}
