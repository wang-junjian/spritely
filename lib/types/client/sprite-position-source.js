/**
 * The sprite anchor position capability: a persisted (x, y) viewport offset
 * backed by localStorage. `null` means "use the default corner"; any non-null
 * value is applied as inline `left`/`top` on the anchor.
 */
import { createSnapshotStore, } from '@deepseek-ai/dsh-client-runtime/client';
/** Persistence key for the dragged anchor position (localStorage). */
const POSITION_PERSIST_KEY = 'dsh.sprite.position';
/**
 * Normalize a persisted value into the structured shape. Accepts only plain
 * objects with finite numeric `x` and `y` fields; anything else collapses to
 * null (default corner).
 * @param raw - persisted value (unknown at runtime — storage is untrusted).
 * @returns the normalized position, or null.
 */
function normalizePosition(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'object') {
        const candidate = raw;
        const { x, y } = candidate;
        if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) {
            return { x, y };
        }
    }
    return null;
}
/**
 * Create the persisted anchor-position source. Rehydrates from localStorage on
 * construction and resets any malformed stored value to null.
 * @returns the source.
 */
export function createSpritePositionSource() {
    const store = createSnapshotStore(null, { persist: { name: POSITION_PERSIST_KEY } });
    const raw = store.getSnapshot();
    const normalized = normalizePosition(raw);
    if (normalized !== raw)
        store.set(normalized);
    return {
        getSnapshot: () => store.getSnapshot(),
        subscribe: fn => store.subscribe(fn),
        set: position => { store.set(position); },
    };
}
//# sourceMappingURL=sprite-position-source.js.map