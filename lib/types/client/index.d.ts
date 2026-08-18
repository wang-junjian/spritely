/** Registers the floating mascot into the layout-owned overlay slot. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type SpriteKey } from './locales.ts';
export type { SpriteActivity, SpriteState } from './sprite-state.ts';
export { DEFAULT_VEIL, type BackgroundKind, type BackgroundSource, type BackgroundState, type ImageFit, } from './background-source.ts';
export type { SpriteKindSource } from './sprite-kind-source.ts';
export { SPRITE_KINDS, type Gaze, type Pose, type SpriteKind, type SpriteKindMeta } from './sprites.tsx';
export type { SpriteMascotInjected, SpriteMascotProps } from './SpriteMascot.tsx';
export type { SpriteKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The mascot's status copy. */
        sprite: SpriteKey;
    }
}
/** Services required by the sprite plugin. */
export declare const inject: string[];
/**
 * Mount the mascot: register the dictionaries, then contribute the sprite
 * into `shell.overlay` once ui-layout declares it. The work-state observable
 * and the persisted background source are created per declaration lifetime and
 * disposed with the registration; the background presenter projects the source
 * onto the `--dsw-alias-bg-base` CSS variable (recoloring every surface layer).
 * @param ctx - Client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map