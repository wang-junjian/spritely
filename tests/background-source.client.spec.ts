// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BackgroundPresenter, DEFAULT_VEIL, createBackgroundSource,
} from '../src/client/background-source.ts'
import type { BackgroundState } from '../src/client/background-source.ts'

const VARIABLE = '--dsw-alias-bg-base'
const SIDEBAR_VARIABLE = '--dsw-specific-sidebar-fill'

afterEach(() => {
  // The source persists under a fixed key; clear storage so tests stay isolated.
  localStorage.clear()
  document.body.removeAttribute('data-ds-dark-theme')
  document.body.style.removeProperty(VARIABLE)
  document.body.style.removeProperty(SIDEBAR_VARIABLE)
  document.body.style.removeProperty('background')
})

function color(value: string): BackgroundState {
  return { kind: 'color', value, fit: 'contain', veil: DEFAULT_VEIL }
}

describe('createBackgroundSource', () => {
  it('starts null (follow the theme) and flips on set', () => {
    const source = createBackgroundSource()
    expect(source.getSnapshot()).toBeNull()
    source.set(color('#EAF3FB'))
    expect(source.getSnapshot()).toEqual(color('#EAF3FB'))
    source.set(null)
    expect(source.getSnapshot()).toBeNull()
  })

  it('notifies subscribers on change', () => {
    const source = createBackgroundSource()
    const listener = vi.fn()
    source.subscribe(listener)
    source.set(color('#EAF3FB'))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('migrates a legacy raw string entry to the structured shape', () => {
    localStorage.setItem('dsh.sprite.background', JSON.stringify('#EAF3FB'))
    const source = createBackgroundSource()
    expect(source.getSnapshot()).toEqual(color('#EAF3FB'))
  })
})

describe('BackgroundPresenter', () => {
  it('writes a color as the bg-base variable and leaves body.background clear', () => {
    const presenter = new BackgroundPresenter()
    presenter.apply(color('#EAF3FB'))
    expect(document.body.style.getPropertyValue(VARIABLE)).toBe('#EAF3FB')
    expect(document.body.style.getPropertyValue(SIDEBAR_VARIABLE)).toBe('transparent')
    expect(document.body.style.background).toBe('')
    presenter.apply(null)
    expect(document.body.style.getPropertyValue(VARIABLE)).toBe('')
    expect(document.body.style.getPropertyValue(SIDEBAR_VARIABLE)).toBe('')
    presenter.dispose()
  })

  it('paints an image only on body with contain sizing, no-repeat, and a fade veil', () => {
    const presenter = new BackgroundPresenter()
    presenter.apply({ kind: 'image', value: 'https://example.com/bg.png', fit: 'contain', veil: 0.4 })
    const image = document.body.style.background
    expect(image).toContain('url("https://example.com/bg.png")')
    expect(image).toContain('contain')
    expect(image).toContain('no-repeat')
    expect(image).toContain('rgba(255, 255, 255, 0.4)')
    // Surface tokens go transparent so no other layer re-draws or clips the image.
    expect(document.body.style.getPropertyValue(VARIABLE)).toBe('transparent')
    expect(document.body.style.getPropertyValue(SIDEBAR_VARIABLE)).toBe('transparent')
    presenter.dispose()
  })

  it('renders a fill image stretched full-screen without a veil at zero', () => {
    const presenter = new BackgroundPresenter()
    presenter.apply({ kind: 'image', value: 'x.png', fit: 'fill', veil: 0 })
    expect(document.body.style.background).toContain('url("x.png")')
    expect(document.body.style.background).toContain('100% 100%')
    expect(document.body.style.getPropertyValue(VARIABLE)).toBe('transparent')
    expect(document.body.style.getPropertyValue(SIDEBAR_VARIABLE)).toBe('transparent')
    presenter.dispose()
  })

  it('uses a dark veil when the dark palette is active', () => {
    document.body.setAttribute('data-ds-dark-theme', '')
    const presenter = new BackgroundPresenter()
    presenter.apply({ kind: 'image', value: 'x.png', fit: 'contain', veil: 0.4 })
    expect(document.body.style.background).toContain('rgba(0, 0, 0, 0.4)')
    presenter.dispose()
  })

  it('clears the body image when switching back to a color', () => {
    const presenter = new BackgroundPresenter()
    presenter.apply({ kind: 'image', value: 'x.png', fit: 'contain', veil: 0 })
    expect(document.body.style.background).not.toBe('')
    presenter.apply(color('#EAF3FB'))
    expect(document.body.style.background).toBe('')
    expect(document.body.style.getPropertyValue(VARIABLE)).toBe('#EAF3FB')
    presenter.dispose()
  })

  it('dispose clears everything it owns', () => {
    const presenter = new BackgroundPresenter()
    presenter.apply({ kind: 'image', value: 'x.png', fit: 'contain', veil: 0.4 })
    presenter.dispose()
    expect(document.body.style.getPropertyValue(VARIABLE)).toBe('')
    expect(document.body.style.background).toBe('')
  })
})
