import { createSpriteStateSource } from "./sprite-state.js";
import { BackgroundPresenter, createBackgroundSource } from "./background-source.js";
import { createSpriteKindSource } from "./sprite-kind-source.js";
import { SpriteMascot } from "./SpriteMascot.js";
import { en, zh } from "./locales.js";
export { DEFAULT_VEIL, } from "./background-source.js";
export { SPRITE_KINDS } from "./sprites.js";
/** Dictionary namespace owned by this plugin. */
const NS = 'sprite';
/** Services required by the sprite plugin. */
export const inject = ['slots', 'sessions', 'workspaces', 'locale'];
/**
 * Mount the mascot: register the dictionaries, then contribute the sprite
 * into `shell.overlay` once ui-layout declares it. The work-state observable
 * and the persisted background source are created per declaration lifetime and
 * disposed with the registration; the background presenter projects the source
 * onto the `--dsw-alias-bg-base` CSS variable (recoloring every surface layer).
 * @param ctx - Client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sprite: dictionaries');
    ctx.slots.inject('shell.overlay', () => {
        const source = createSpriteStateSource(ctx.sessions);
        const background = createBackgroundSource();
        const spriteKind = createSpriteKindSource();
        const presenter = new BackgroundPresenter();
        presenter.apply(background.getSnapshot());
        const unsubscribeBackground = background.subscribe(() => { presenter.apply(background.getSnapshot()); });
        const dispose = ctx.slots.register({
            name: 'shell.overlay',
            id: 'sprite',
            locale: NS,
            inject: () => ({
                hooks: { sprite: source, background, spriteKind },
                startSession: () => { ctx.workspaces.startSession(); },
                setBackground: value => { background.set(value); },
                setSpriteKind: kind => { spriteKind.set(kind); },
            }),
        }, SpriteMascot);
        return () => {
            dispose();
            source.dispose();
            unsubscribeBackground();
            presenter.dispose();
        };
    });
}
//# sourceMappingURL=index.js.map