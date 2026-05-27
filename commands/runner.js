// commands/runner.js

function normalizeCommandEvent(event, ctx) {
    if (!event || typeof event !== 'object') {
        return {
            type: 'legacy',
            commandId: ctx.commandId,
            actor: ctx.actor,
            target: ctx.target,
            value: event
        };
    }

    return {
        commandId: ctx.commandId,
        actor: ctx.actor,
        target: ctx.target,
        ...event
    };
}

function callLegacyAction(effect, ctx) {
    if (typeof effect?.action !== 'function') return '';
    return effect.action(ctx.actor, ctx.target, ctx.gameState);
}

export function formatCommandEventDebug(event) {
    if (!event) return '';
    const actorName = event.actor?.name || '-';
    const targetName = event.target?.name || '-';
    const fields = [
        `actor=${actorName}`,
        `target=${targetName}`,
        `cmd=${event.commandId || '-'}`,
        event.damage ? `damage=${event.damage}` : '',
        event.heal ? `heal=${event.heal}` : '',
        event.shield ? `shield=${event.shield}` : '',
        event.status ? `status=${event.status}` : '',
        event.reelDelta ? `reelDelta=${event.reelDelta}` : ''
    ].filter(Boolean);

    return `ACTION ${fields.join(' ')}`;
}

export function runCommandEffect(options = {}) {
    const {
        commandId,
        effect,
        actor,
        target,
        gameState,
        commandEffects,
        skipLog = false
    } = options;

    const ctx = { commandId, effect, actor, target, gameState, commandEffects, skipLog };

    if (typeof effect?.apply === 'function') {
        const event = normalizeCommandEvent(effect.apply(ctx), ctx);
        const message = skipLog
            ? ''
            : typeof effect.formatLog === 'function'
                ? effect.formatLog(event, ctx)
                : formatCommandEventDebug(event);
        return { event, message };
    }

    const message = callLegacyAction(effect, ctx);
    return {
        event: {
            type: 'legacy',
            commandId,
            actor,
            target,
            message
        },
        message: skipLog ? '' : (message || '')
    };
}
