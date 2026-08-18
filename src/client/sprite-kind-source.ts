/**
 * The selected-mascot source: a persisted `SpriteKind` backed by localStorage,
 * exposed through the sprite's inject `hooks` compartment. It rehydrates on
 * construction and collapses any unrecognized stored value back to the default
 * `blob` sprite.
 */
import {
  createSnapshotStore, type ObservableSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { SpriteKind } from './sprites.ts'

/** Persistence key for the chosen sprite kind (localStorage). */
const KIND_PERSIST_KEY = 'dsh.sprite.kind'

/** The valid sprite kinds (single source of truth). */
const KINDS: readonly SpriteKind[] = ['blob', 'bot', 'cat', 'ghost']

/** The read/write face the sprite's inject exposes for the mascot kind. */
export interface SpriteKindSource extends ObservableSnapshot<SpriteKind> {
  /** Set the active mascot kind. */
  set(kind: SpriteKind): void
}

/**
 * Create the persisted sprite-kind source. Rehydrates from localStorage on
 * construction (the same contract as the snapshot-store engine) and resets any
 * unrecognized value to `blob`.
 * @returns the source.
 */
export function createSpriteKindSource(): SpriteKindSource {
  const store = createSnapshotStore<SpriteKind>('blob', { persist: { name: KIND_PERSIST_KEY } })
  const current = store.getSnapshot()
  if (!KINDS.includes(current)) store.set('blob')
  return {
    getSnapshot: () => store.getSnapshot(),
    subscribe: fn => store.subscribe(fn),
    set: kind => { store.set(kind) },
  }
}
