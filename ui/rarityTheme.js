export const RARITY_THEME = {
    1: {
        label: '★1',
        bg: '#e5e7eb',
        border: '#6b7280',
        badgeStyle: 'background: linear-gradient(135deg, #4b5563, #9ca3af) !important; color: #fff !important; border: 1px solid #374151 !important;',
        statBarStart: 'rgba(107, 114, 128, 0.28)',
        statBarEnd: 'rgba(229, 231, 235, 0.66)',
        statBarBg: 'linear-gradient(90deg, rgba(107, 114, 128, 0.28), rgba(229, 231, 235, 0.66))',
        accentBg: '#6b7280',
        detailBorder: 'rgba(107, 114, 128, 0.55)'
    },
    2: {
        label: '★2',
        bg: '#dcfce7',
        border: '#16a34a',
        badgeStyle: 'background: linear-gradient(135deg, #16a34a, #86efac) !important; color: #fff !important; border: 1px solid #15803d !important; text-shadow: 1px 1px 1px rgba(0,0,0,0.22) !important;',
        statBarStart: 'rgba(34, 197, 94, 0.28)',
        statBarEnd: 'rgba(220, 252, 231, 0.68)',
        statBarBg: 'linear-gradient(90deg, rgba(34, 197, 94, 0.28), rgba(220, 252, 231, 0.68))',
        accentBg: '#16a34a',
        detailBorder: 'rgba(34, 197, 94, 0.55)'
    },
    3: {
        label: '★3',
        bg: '#dbeafe',
        border: '#2563eb',
        badgeStyle: 'background: linear-gradient(135deg, #2563eb, #60a5fa) !important; color: #fff !important; border: 1px solid #1d4ed8 !important; text-shadow: 1px 1px 1px rgba(0,0,0,0.24) !important;',
        statBarStart: 'rgba(59, 130, 246, 0.3)',
        statBarEnd: 'rgba(219, 234, 254, 0.7)',
        statBarBg: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3), rgba(219, 234, 254, 0.7))',
        accentBg: '#2563eb',
        detailBorder: 'rgba(59, 130, 246, 0.56)'
    },
    4: {
        label: '★4',
        bg: 'linear-gradient(135deg, #ede9fe, #f5e8ff)',
        border: '#7c3aed',
        badgeStyle: 'background: linear-gradient(135deg, #7c3aed, #a78bfa) !important; color: #fff !important; border: 1px solid #6d28d9 !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.36) !important;',
        statBarStart: 'rgba(139, 92, 246, 0.34)',
        statBarEnd: 'rgba(237, 233, 254, 0.74)',
        statBarBg: 'linear-gradient(90deg, rgba(139, 92, 246, 0.34), rgba(237, 233, 254, 0.74))',
        accentBg: '#7c3aed',
        detailBorder: 'rgba(139, 92, 246, 0.58)'
    },
    5: {
        label: '★5',
        bg: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
        border: '#ea580c',
        badgeStyle: 'background: linear-gradient(135deg, #ea580c, #fb923c) !important; color: #fff !important; border: 1px solid #c2410c !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.34) !important;',
        statBarStart: 'rgba(249, 115, 22, 0.38)',
        statBarEnd: 'rgba(254, 215, 170, 0.74)',
        statBarBg: 'linear-gradient(90deg, rgba(249, 115, 22, 0.38), rgba(254, 215, 170, 0.74))',
        accentBg: '#ea580c',
        detailBorder: 'rgba(249, 115, 22, 0.6)'
    },
    6: {
        label: '★6',
        bg: 'linear-gradient(135deg, #ffe4f1 0%, #fde68a 20%, #bbf7d0 42%, #bfdbfe 64%, #ddd6fe 84%, #fecdd3 100%)',
        border: '#a855f7',
        badgeStyle: 'background: linear-gradient(90deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #6366f1, #a855f7, #ec4899) !important; background-size: 320% 320% !important; animation: rainbow-bg 4s ease infinite !important; color: #fff !important; border: 1px solid rgba(88, 28, 135, 0.72) !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.48) !important;',
        statBarStart: 'rgba(168, 85, 247, 0.4)',
        statBarEnd: 'rgba(251, 207, 232, 0.76)',
        statBarBg: 'linear-gradient(90deg, rgba(239, 68, 68, 0.34) 0%, rgba(245, 158, 11, 0.34) 16%, rgba(234, 179, 8, 0.34) 30%, rgba(34, 197, 94, 0.34) 46%, rgba(6, 182, 212, 0.34) 62%, rgba(99, 102, 241, 0.34) 78%, rgba(168, 85, 247, 0.34) 90%, rgba(236, 72, 153, 0.34) 100%)',
        accentBg: 'linear-gradient(180deg, #ef4444 0%, #f59e0b 16%, #eab308 30%, #22c55e 46%, #06b6d4 62%, #6366f1 78%, #a855f7 90%, #ec4899 100%)',
        detailBorder: 'rgba(168, 85, 247, 0.66)'
    }
};

export const SET_TIER_THEME = {
    1: { statBarStart: RARITY_THEME[1].statBarStart, statBarEnd: 'rgba(242, 220, 201, 0.48)' },
    2: { statBarStart: RARITY_THEME[2].statBarStart, statBarEnd: RARITY_THEME[2].statBarEnd },
    3: { statBarStart: RARITY_THEME[3].statBarStart, statBarEnd: 'rgba(255, 233, 153, 0.52)' }
};

export function normalizeRarity(rarity) {
    return Math.max(1, Math.min(6, Number(rarity || 1)));
}

export function normalizeSetTier(tier) {
    return Math.max(1, Math.min(3, Number(tier || 1)));
}

export function getRarityTheme(rarity) {
    return RARITY_THEME[normalizeRarity(rarity)];
}

export function getRarityCssVars(rarity) {
    const theme = getRarityTheme(rarity);
    return `--statistics-bar-start:${theme.statBarStart};--statistics-bar-end:${theme.statBarEnd};--statistics-bar-bg:${theme.statBarBg};--statistics-rarity-border:${theme.border};--statistics-rarity-accent:${theme.accentBg};`;
}

export function getSetTierCssVars(tier) {
    const theme = SET_TIER_THEME[normalizeSetTier(tier)];
    return `--statistics-bar-start:${theme.statBarStart};--statistics-bar-end:${theme.statBarEnd};`;
}

export function getReelGradeStyle(reelIdx) {
    const theme = getRarityTheme(Number(reelIdx) + 1);
    return {
        text: theme.label,
        style: `--battle-reel-accent: ${theme.border}; --battle-reel-bg: ${theme.bg};`,
        cardBg: theme.bg
    };
}

export function getDetailReelStyle(reelIdx) {
    const theme = getRarityTheme(Number(reelIdx) + 1);
    return `background: ${theme.bg}; border-color: ${theme.detailBorder};`;
}
