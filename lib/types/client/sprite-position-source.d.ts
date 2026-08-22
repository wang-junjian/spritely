/**
 * The sprite anchor position capability: a persisted (x, y) viewport offset
 * backed by localStorage. `null` means "use the default corner"; any non-null
 * value is applied as inline `left`/`top` on the anchor.
 */
import { type ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
/** A dragged (left, top) viewport position. */
export interface SpritePosition {
    /** Distance from the viewport left edge, in CSS pixels. */
    x: number;
    /** Distance from the viewport top edge, in CSS pixels. */
    y: number;
}
/** The read/write face the sprite's inject exposes for the anchor position. */
export interface SpritePositionSource extends ObservableSnapshot<SpritePosition | null> {
    /** Set the anchor position (null restores the default corner). */
    set(position: SpritePosition | null): void;
}
/**
 * Create the persisted anchor-position source. Rehydrates from localStorage on
 * construction and resets any malformed stored value to null.
 * @returns the source.
 */
export declare function createSpritePositionSource(): SpritePositionSource;
//# sourceMappingURL=sprite-position-source.d.ts.map