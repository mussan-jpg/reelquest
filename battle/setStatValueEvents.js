export function formatSetStatChange(values = {}, options = {}) {
    const signed = !!options.signed;
    const stats = options.stats || [
        ['atk', 'ATK'],
        ['int', 'INT'],
        ['spd', 'SPD']
    ];
    return stats
        .map(([key, label]) => ({ label, value: Math.floor(Number(values[key] || 0)) }))
        .filter(item => signed ? item.value !== 0 : item.value > 0)
        .map(item => `${item.label}${item.value >= 0 ? '+' : ''}${item.value}`)
        .join('/');
}

export function buildSetStatValueEvent(prefix, index, statValues = {}, options = {}) {
    const resultText = options.resultText || formatSetStatChange(statValues, options);
    if (!resultText) return null;
    if (options.char) options.char.suppressNextStatPopup = true;
    return { prefix, index, resultText };
}
