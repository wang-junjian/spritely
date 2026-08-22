// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

/** Minimal in-memory snapshot store with localStorage persistence. */
function createSnapshotStore<T>(initial: T, options?: { persist?: { name: string } }): {
  getSnapshot: () => T
  subscribe: (fn: () => void) => () => void
  set: (value: T) => void
} {
  const key = options?.persist?.name
  const stored = key ? localStorage.getItem(key) : null
  let current: T = stored !== null ? JSON.parse(stored) : initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => current,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    set: (value) => {
      current = value
      if (key) localStorage.setItem(key, JSON.stringify(value))
      for (const fn of [...listeners]) fn()
    },
  }
}

vi.mock('@deepseek-ai/dsh-client-runtime/client', () => ({
  createSnapshotStore,
}))

import { createSpritePositionSource } from '../src/client/sprite-position-source.ts'

afterEach(() => {
  // The source persists under a fixed key; clear storage so tests stay isolated.
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('createSpritePositionSource', () => {
  it('starts null (default corner) and flips on set', () => {
    const source = createSpritePositionSource()
    expect(source.getSnapshot()).toBeNull()
    source.set({ x: 120, y: 80 })
    expect(source.getSnapshot()).toEqual({ x: 120, y: 80 })
    source.set(null)
    expect(source.getSnapshot()).toBeNull()
  })

  it('notifies subscribers on change', () => {
    const source = createSpritePositionSource()
    const listener = vi.fn()
    source.subscribe(listener)
    source.set({ x: 10, y: 20 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('persists the position to localStorage and rehydrates it', () => {
    const first = createSpritePositionSource()
    first.set({ x: 42, y: 99 })

    const second = createSpritePositionSource()
    expect(second.getSnapshot()).toEqual({ x: 42, y: 99 })
  })

  it('resets an invalid stored value to null', () => {
    localStorage.setItem('dsh.sprite.position', JSON.stringify({ x: 'not-a-number', y: 80 }))
    const source = createSpritePositionSource()
    expect(source.getSnapshot()).toBeNull()
  })

  it('resets a non-object stored value to null', () => {
    localStorage.setItem('dsh.sprite.position', JSON.stringify('120,80'))
    const source = createSpritePositionSource()
    expect(source.getSnapshot()).toBeNull()
  })

  it('ignores infinite or NaN coordinates', () => {
    localStorage.setItem('dsh.sprite.position', JSON.stringify({ x: Infinity, y: 80 }))
    const source = createSpritePositionSource()
    expect(source.getSnapshot()).toBeNull()
  })
})
