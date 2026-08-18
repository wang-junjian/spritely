// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { SpriteState } from '../src/client/sprite-state.ts'
import { DEFAULT_VEIL, type BackgroundState } from '../src/client/background-source.ts'
import type { SpriteKind } from '../src/client/sprites.tsx'
import { SpriteMascot, type SpriteMascotProps } from '../src/client/SpriteMascot.tsx'
import { en } from '../src/client/locales.ts'

const t: SpriteMascotProps['t'] = key => (en as Record<string, string>)[key] ?? key

beforeAll(() => {
  // jsdom ships no pointer-capture API; the drag gesture calls setPointerCapture.
  Element.prototype.setPointerCapture = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// The mascot never reads the global hooks; stub them as never-called.
const neverHook = (() => { throw new Error('mascot must not read global hooks') }) as never

function mount(initial: SpriteState, initialBackground: BackgroundState | null = null) {
  const store = createSnapshotStore<SpriteState>(initial)
  const useSprite: SnapshotSelectorHook<SpriteState> = <S,>(sel: (s: SpriteState) => S): S => {
    const snap = useSyncExternalStore(store.subscribe, store.getSnapshot)
    return sel(snap)
  }
  const bgStore = createSnapshotStore<BackgroundState | null>(initialBackground)
  const useBackground: SnapshotSelectorHook<BackgroundState | null> = <S,>(sel: (s: BackgroundState | null) => S): S => {
    const snap = useSyncExternalStore(bgStore.subscribe, bgStore.getSnapshot)
    return sel(snap)
  }
  const kindStore = createSnapshotStore<SpriteKind>('blob')
  const useSpriteKind: SnapshotSelectorHook<SpriteKind> = <S,>(sel: (s: SpriteKind) => S): S => {
    const snap = useSyncExternalStore(kindStore.subscribe, kindStore.getSnapshot)
    return sel(snap)
  }
  const startSession = vi.fn()
  const setBackground = vi.fn((value: BackgroundState | null) => { bgStore.set(value) })
  const setSpriteKind = vi.fn((kind: SpriteKind) => { kindStore.set(kind) })
  const view = render(
    <SpriteMascot
      useSprite={useSprite}
      useBackground={useBackground}
      useSpriteKind={useSpriteKind}
      useSessions={neverHook}
      useWorkspaces={neverHook}
      startSession={startSession}
      setBackground={setBackground}
      setSpriteKind={setSpriteKind}
      t={t}
    />,
  )
  return { store, startSession, setBackground, setSpriteKind, view }
}

/** A pointer gesture past the drag threshold, from the origin to (dx, dy). */
function drag(button: HTMLElement, dx: number, dy: number): void {
  fireEvent.pointerDown(button, { button: 0, clientX: 0, clientY: 0 })
  fireEvent.pointerMove(button, { clientX: dx, clientY: dy })
  fireEvent.pointerUp(button)
}

describe('SpriteMascot', () => {
  it('renders idle without a menu', () => {
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    expect(button.getAttribute('data-activity')).toBe('idle')
    expect(button.getAttribute('data-pose')).toBe('idle')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('shows the per-activity pose and caption', () => {
    mount({ activity: 'working', toolName: 'bash' })
    const button = screen.getByRole('button', { name: 'Running a tool · bash' })
    expect(button.getAttribute('data-activity')).toBe('working')
    expect(button.getAttribute('data-pose')).toBe('working')
  })

  it('opens and closes the menu on click', () => {
    mount({ activity: 'thinking', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Thinking' })
    fireEvent.click(button)
    expect(screen.getByRole('menu')).not.toBeNull()
    // Four actions: New session, Reset position, Set background, Switch sprite.
    expect(screen.getAllByRole('menuitem')).toHaveLength(4)
    fireEvent.click(button)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('flips the menu above the mascot when there is no room below', () => {
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    const anchor = button.parentElement!
    // Anchor pinned near the bottom edge: space below is too tight, above is ample.
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      top: 660, bottom: 764, left: 0, right: 96, width: 96, height: 96, x: 0, y: 660,
      toJSON: () => ({}),
    } as DOMRect)
    fireEvent.click(button)
    expect(anchor.getAttribute('data-vertical')).toBe('top')
  })

  it('keeps the menu below when there is room', () => {
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    fireEvent.click(button)
    expect(button.parentElement!.getAttribute('data-vertical')).toBe('bottom')
  })

  it('left-aligns the menu when a right-aligned one would overflow the left edge', () => {
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    const anchor = button.parentElement!
    // The mascot sits against the left edge; the open menu is 128px wide, so a
    // right-aligned menu (pinned to the mascot's right edge) would clip off-screen.
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      top: 200, bottom: 296, left: 0, right: 96, width: 96, height: 96, x: 0, y: 200,
      toJSON: () => ({}),
    } as DOMRect)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 0, bottom: 66, left: 0, right: 128, width: 128, height: 66, x: 0, y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    fireEvent.click(button)
    expect(anchor.getAttribute('data-horizontal')).toBe('start')
  })

  it('keeps the menu right-aligned when there is room on the left', () => {
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    fireEvent.click(button)
    expect(button.parentElement!.getAttribute('data-horizontal')).toBe('end')
  })

  it('starts a New Session from the menu and closes it', () => {
    const { startSession } = mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'New session' }))
    expect(startSession).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens the background panel from the menu', () => {
    mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    expect(screen.getByRole('dialog')).not.toBeNull()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens the sprite panel and switches the mascot', () => {
    const { setSpriteKind } = mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Switch sprite' }))
    expect(screen.getByRole('dialog')).not.toBeNull()
    // The roster lists all four sprites by name.
    expect(screen.getByRole('button', { name: 'Blob' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Bot' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Cat' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Ghost' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cat' }))
    expect(setSpriteKind).toHaveBeenCalledWith('cat')
  })

  it('applies a solid color and keeps the panel open', () => {
    const { setBackground } = mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    fireEvent.click(screen.getByRole('button', { name: '天空' }))
    expect(setBackground).toHaveBeenCalledWith({ kind: 'color', value: '#EAF3FB', fit: 'contain', veil: DEFAULT_VEIL })
    expect(screen.getByRole('dialog')).not.toBeNull()
  })

  it('applies a gradient', () => {
    const { setBackground } = mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    fireEvent.click(screen.getByRole('button', { name: '黄昏' }))
    expect(setBackground).toHaveBeenCalledWith({ kind: 'gradient', value: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)', fit: 'contain', veil: DEFAULT_VEIL })
  })

  it('applies an image URL with contain fit and a default fade', () => {
    const { setBackground } = mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    fireEvent.change(screen.getByPlaceholderText('Paste an image URL'), { target: { value: 'https://example.com/bg.png' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(setBackground).toHaveBeenCalledWith({ kind: 'image', value: 'https://example.com/bg.png', fit: 'contain', veil: DEFAULT_VEIL })
  })

  it('applies a local image via upload as a data URL', async () => {
    const { setBackground } = mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake-image-bytes'], 'bg.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(setBackground).toHaveBeenCalled())
    const arg = setBackground.mock.calls[0]![0] as BackgroundState
    expect(arg).toEqual(expect.objectContaining({ kind: 'image', fit: 'contain' }))
    expect(arg.value).toMatch(/^data:image\/png;base64,/)
  })

  it('shows the scale and fade controls only after an image is applied', () => {
    mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    // No image selected yet — the image-specific controls are hidden.
    expect(screen.queryByRole('button', { name: 'Fit (contain)' })).toBeNull()
    expect(screen.queryByRole('slider')).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('Paste an image URL'), { target: { value: 'https://example.com/bg.png' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByRole('button', { name: 'Fit (contain)' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Stretch (fill)' })).not.toBeNull()
    expect(screen.getByRole('slider')).not.toBeNull()
  })

  it('switches the image to full-screen stretch', () => {
    const { setBackground } = mount({ activity: 'idle', toolName: undefined }, { kind: 'image', value: 'x.png', fit: 'contain', veil: DEFAULT_VEIL })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stretch (fill)' }))
    expect(setBackground).toHaveBeenCalledWith({ kind: 'image', value: 'x.png', fit: 'fill', veil: DEFAULT_VEIL })
  })

  it('re-seeds the image URL field when the background panel reopens', () => {
    mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    const urlInput = () => screen.getByPlaceholderText('Paste an image URL') as HTMLInputElement
    fireEvent.change(urlInput(), { target: { value: 'https://example.com/bg.png' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    // Close back to the menu, then reopen the background panel.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    expect(urlInput().value).toBe('https://example.com/bg.png')
  })

  it('adjusts the image fade via the slider', () => {
    const { setBackground } = mount({ activity: 'idle', toolName: undefined }, { kind: 'image', value: 'x.png', fit: 'contain', veil: DEFAULT_VEIL })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } })
    expect(setBackground).toHaveBeenCalledWith({ kind: 'image', value: 'x.png', fit: 'contain', veil: 0.7 })
  })

  it('resets the background to the theme default', () => {
    const { setBackground } = mount({ activity: 'idle', toolName: undefined }, { kind: 'color', value: '#EAF3FB', fit: 'contain', veil: DEFAULT_VEIL })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }))
    expect(setBackground).toHaveBeenCalledWith(null)
  })

  it('returns from the background panel to the menu', () => {
    mount({ activity: 'idle', toolName: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set background' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('menu')).not.toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('drags to a new position and does not toggle the menu on the trailing click', () => {
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    drag(button, 120, 80)
    expect(button.parentElement!.style.left).toBe('120px')
    expect(button.parentElement!.style.top).toBe('80px')
    // The drag's trailing click is suppressed — the menu stays closed.
    fireEvent.click(button)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('resets to the default corner from the menu', () => {
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    drag(button, 120, 80)
    // Consume the suppressed trailing click, then open the menu for real.
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset position' }))
    expect(screen.queryByRole('menu')).toBeNull()
    expect(button.parentElement!.style.left).toBe('')
    expect(button.parentElement!.style.top).toBe('')
  })

  it('shows the attention dot while waiting or in error', () => {
    mount({ activity: 'waiting', toolName: undefined })
    expect(document.querySelector('[data-kind="waiting"]')).not.toBeNull()

    cleanup()
    mount({ activity: 'error', toolName: undefined })
    expect(document.querySelector('[data-kind="error"]')).not.toBeNull()
  })

  it('celebrates briefly when a busy run settles into idle', () => {
    vi.useFakeTimers()
    const { store } = mount({ activity: 'working', toolName: 'bash' })
    const button = () => screen.getByRole('button')

    act(() => { store.set({ activity: 'idle', toolName: undefined }) })
    expect(button().getAttribute('data-pose')).toBe('done')

    act(() => { vi.advanceTimersByTime(1400) })
    expect(button().getAttribute('data-pose')).toBe('idle')
  })

  it('does not celebrate when an error surfaces', () => {
    vi.useFakeTimers()
    const { store } = mount({ activity: 'working', toolName: 'bash' })
    act(() => { store.set({ activity: 'error', toolName: undefined }) })
    expect(screen.getByRole('button').getAttribute('data-pose')).toBe('error')
  })

  it('nudges the pupils toward the cursor', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1 })
    mount({ activity: 'idle', toolName: undefined })
    const button = screen.getByRole('button', { name: 'Idle' })
    const anchor = button.parentElement!
    // The anchor box maps 1:1 to the 120×120 viewBox for this assertion.
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      top: 0, bottom: 120, left: 0, right: 120, width: 120, height: 120, x: 0, y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    // Cursor to the bottom-right of the sprite → pupils shift +x/+y.
    fireEvent.mouseMove(window, { clientX: 120, clientY: 120 })
    const pupils = Array.from(document.querySelectorAll('circle'))
      .filter(c => c.getAttribute('fill') === 'var(--dsw-static-blue-950, #0B1530)')
    expect(pupils).toHaveLength(2)
    expect(pupils[0]!.getAttribute('transform')).toContain('translate')
    expect(pupils[1]!.getAttribute('transform')).toContain('translate')
  })
})
