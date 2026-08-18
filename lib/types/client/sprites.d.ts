/**
 * The selectable mascot roster. Each sprite is a distinct character with its
 * own body and eye style, but they all share the same pose grammar (the seven
 * live activity faces) and the cursor-following gaze, so switching sprites
 * never changes how the mascot reacts to the agent's work state.
 */
import type { ReactElement } from 'react';
import type { SpriteActivity } from './sprite-state.ts';
import type { SpriteKey } from './locales.ts';
/** Component pose: the six live activities plus the transient celebration. */
export type Pose = SpriteActivity | 'done';
/** The selectable mascot kinds. */
export type SpriteKind = 'blob' | 'bot' | 'cat' | 'ghost';
/** Cursor-following gaze offset, in SVG units. */
export interface Gaze {
    x: number;
    y: number;
}
/** One roster entry: kind plus its localized name key. */
export interface SpriteKindMeta {
    id: SpriteKind;
    nameKey: SpriteKey;
}
/** The roster, in selection-panel order. */
export declare const SPRITE_KINDS: readonly SpriteKindMeta[];
/** Render the selected sprite's full SVG content. */
export declare function renderSprite(kind: SpriteKind, pose: Pose, gaze: Gaze): ReactElement;
//# sourceMappingURL=sprites.d.ts.map