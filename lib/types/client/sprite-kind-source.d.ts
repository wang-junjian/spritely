/**
 * The selected-mascot source: a persisted `SpriteKind` backed by localStorage,
 * exposed through the sprite's inject `hooks` compartment. It rehydrates on
 * construction and collapses any unrecognized stored value back to the default
 * `blob` sprite.
 */
import { type ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { SpriteKind } from './sprites.ts';
/** The read/write face the sprite's inject exposes for the mascot kind. */
export interface SpriteKindSource extends ObservableSnapshot<SpriteKind> {
    /** Set the active mascot kind. */
    set(kind: SpriteKind): void;
}
/**
 * Create the persisted sprite-kind source. Rehydrates from localStorage on
 * construction (the same contract as the snapshot-store engine) and resets any
 * unrecognized value to `blob`.
 * @returns the source.
 */
export declare function createSpriteKindSource(): SpriteKindSource;
//# sourceMappingURL=sprite-kind-source.d.ts.map