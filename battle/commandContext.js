const REEL_UP_COMMANDS = new Set(['misc_support_reel_up', 'misc_support_reel_up2']);
const SHIELD_COMMANDS = new Set([
    'cmd_shield',
    'cmd_barrier',
    'cmd_team_barrier',
    'cmd_aegis_deploy',
    'cmd_aegis_fortress',
    'cmd_piston_bulwark',
    'cmd_anchor_guard',
    'cmd_core_knuckle',
    'cmd_jelly_cushion',
    'cmd_leaping_watch',
    'cmd_tidal_screen',
    'cmd_brine_net',
    'cmd_scale_charge',
    'cmd_patch_frame'
]);
const BUFF_COMMANDS = new Set(['misc01', 'misc02', 'misc_focus', 'misc_quickstep', 'misc_wingbeat', 'misc_mana_charge', 'cmd_rally_banner']);
const DEBUFF_COMMANDS = new Set([
    'atk_paralyze',
    'atk_guard_break',
    'atk_sumihaki',
    'atk_scream',
    'atk_weaken',
    'atk_weakened',
    'cmd_pack_mark',
    'cmd_spore_lance',
    'cmd_tidal_screen',
    'cmd_brine_net',
    'cmd_doom_spark',
    'cmd_skyline_roar'
]);

export function isReelUpCommand(commandId) {
    return typeof commandId === 'string' && (commandId.startsWith('cmd_up') || REEL_UP_COMMANDS.has(commandId));
}

export function isReelDownCommand(commandId) {
    return typeof commandId === 'string' && commandId.startsWith('cmd_down');
}

export function getCommandFlags(commandId, effect = {}) {
    const category = effect.category || 'その他';
    const isHeal = typeof effect.calcHeal === 'function' || String(commandId).includes('heal');
    const isShield = typeof effect.calcShield === 'function' || SHIELD_COMMANDS.has(commandId);
    const isBuff = BUFF_COMMANDS.has(commandId) || category === '強化';
    const isDebuff = DEBUFF_COMMANDS.has(commandId) || category === '弱体';
    const isAttack = ['物理', '魔法', '混合'].includes(category)
        || (!isHeal && !isShield && !isBuff && typeof effect.calcDamage === 'function');
    return {
        category,
        isReelUp: isReelUpCommand(commandId),
        isReelDown: isReelDownCommand(commandId),
        isAttack,
        isHeal,
        isShield,
        isBuff,
        isDebuff,
        isSupport: isHeal || isShield || isBuff
    };
}

export function getCharacterSide(gameState, actor) {
    if ((gameState?.players || []).includes(actor)) return 'p';
    if ((gameState?.enemies || []).includes(actor)) return 'e';
    return 'p';
}

export function getPartyForSide(gameState, side) {
    return side === 'e' ? (gameState?.enemies || []) : (gameState?.players || []);
}

export function getEnemyPartyForSide(gameState, side) {
    return side === 'p' ? (gameState?.enemies || []) : (gameState?.players || []);
}

export function buildCommandContext({ gameState, actor, target, commandId, effect, consume = true } = {}) {
    const side = getCharacterSide(gameState, actor);
    const enemies = getEnemyPartyForSide(gameState, side);
    const flags = getCommandFlags(commandId, effect);
    const active = actor?.activeSpeciesBonus || {};

    const context = {
        commandId,
        category: flags.category,
        targetMode: 'single',
        ignoreShield: false,
        extraFixedDamage: 0,
        directFixedDamage: 0,
        extraActions: 0,
        messages: [],
        ...flags
    };

    if (actor?.pendingFixedDamage && flags.isAttack) {
        context.extraFixedDamage += Math.max(0, Math.floor(actor.pendingFixedDamage));
        if (consume) actor.pendingFixedDamage = 0;
    }

    if (actor?.isMimicAction && flags.isAttack) {
        context.targetMode = 'all';
    }

    return context;
}

export function setActiveCommandContext(actor, context) {
    if (actor) actor.__commandContext = context;
}

export function clearActiveCommandContext(actor) {
    if (actor) delete actor.__commandContext;
}

