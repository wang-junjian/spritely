/**
 * The sprite anchor position capability: a persisted (x, y) viewport offset
 * backed by localStorage. `null` means "use the default corner"; any non-null
 * value is applied as inline `left`/`top` on the anchor.
 */
import {
  createSnapshotStore, type ObservableSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'

/** Persistence key for the dragged anchor position (localStorage). */
const POSITION_PERSIST_KEY = 'dsh.sprite.position'

/** A dragged (left, top) viewport position. */
export interface SpritePosition {
  /** Distance from the viewport left edge, in CSS pixels. */
  x: number
  /** Distance from the viewport top edge, in CSS pixels. */
  y: number
}

/** The read/write face the sprite's inject exposes for the anchor position. */
export interface SpritePositionSource extends ObservableSnapshot<SpritePosition | null> {
  /** Set the anchor position (null restores the default corner). */
  set(position: SpritePosition | null): void
}

/**
 * Normalize a persisted value into the structured shape. Accepts only plain
 * objects with finite numeric `x` and `y` fields; anything else collapses to
 * null (default corner).
 * @param raw - persisted value (unknown at runtime — storage is untrusted).
 * @returns the normalized position, or null.
 */
function normalizePosition(raw: unknown): SpritePosition | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'object') {
    const candidate = raw as Partial<SpritePosition>
    const { x, y } = candidate
    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) {
      return { x, y }
    }
  }
  return null
}

/**
 * Create the persisted anchor-position source. Rehydrates from localStorage on
 * construction and resets any malformed stored value to null.
 * @returns the source.
 */
export function createSpritePositionSource(): SpritePositionSource {
  const store = createSnapshotStore<SpritePosition | null>(null, { persist: { name: POSITION_PERSIST_KEY } })
  const raw: unknown = store.getSnapshot()
  const normalized = normalizePosition(raw)
  if (normalized !== raw) store.set(normalized)
  return {
    getSnapshot: () => store.getSnapshot(),
    subscribe: fn => store.subscribe(fn),
    set: position => { store.set(position) },
  }
}
