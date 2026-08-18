/**
 * SpriteMascot: the floating mascot rendered into the layout's `shell.overlay`
 * layer. Pure presentation — the work state arrives through the injected
 * `useSprite` selector hook; local state holds only the transient celebration
 * (a busy run settling into idle), the drag position, and the open menu. A
 * pointer gesture under the drag threshold counts as a click and toggles the
 * menu; beyond it, the sprite follows the pointer and can be reset to its
 * default corner.
 */
import {
  useEffect, useLayoutEffect, useRef, useState,
  type ChangeEvent as ReactChangeEvent, type PointerEvent as ReactPointerEvent, type ReactElement,
} from 'react'
import type {
  InjectFace, PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-layout's SlotMap merge so PropsRuntime<'shell.overlay'> resolves.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { SpriteActivity, SpriteState } from './sprite-state.ts'
import { BACKGROUND_COLORS, BACKGROUND_GRADIENTS } from './backgrounds.ts'
import { DEFAULT_VEIL, type BackgroundState, type ImageFit } from './background-source.ts'
import { SPRITE_KINDS, renderSprite, type Pose, type SpriteKind } from './sprites.tsx'
import css from './SpriteMascot.module.css'

/** Registrant inject face: the work-state, background, and mascot-kind sources plus actions. */
export interface SpriteMascotInjected {
  hooks: {
    sprite: import('@deepseek-ai/dsh-client-ui-slots').HostObservable<SpriteState>
    background: import('@deepseek-ai/dsh-client-ui-slots').HostObservable<BackgroundState | null>
    spriteKind: import('@deepseek-ai/dsh-client-ui-slots').HostObservable<SpriteKind>
  }
  /** Start a New Session through the workspaces service (default-workspace flow). */
  startSession: () => void
  /** Apply a background selection to the app (null restores the theme default). */
  setBackground: (background: BackgroundState | null) => void
  /** Switch the active mascot kind. */
  setSpriteKind: (kind: SpriteKind) => void
}

/** Full composed props: runtime share + bound inject share + locale seat. */
export type SpriteMascotProps =
  & PropsRuntime<'shell.overlay'>
  & InjectFace<SpriteMascotInjected>
  & PropsLocale<'sprite'>

/** Activities that celebrate once they settle into idle. */
const BUSY: ReadonlySet<SpriteActivity> = new Set(['thinking', 'writing', 'working'])

/** Celebration hold time before the mascot returns to its idle pose. */
const CELEBRATE_MS = 1400

/** Distance a pointer must travel before a gesture counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 4

/** The gap between the mascot and its menu, reserved when measuring open space. */
const MENU_GAP_PX = 8

/** Max pupil travel (in SVG units) when the eyes track the cursor. */
const GAZE_MAX = 3

/** Max local image size accepted (bytes): keeps the data-URL under localStorage's quota. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

/** Vertical side of the mascot the menu opens onto, chosen from available space. */
type MenuVertical = 'bottom' | 'top'

/** Horizontal alignment: 'end' pins the menu's right edge to the mascot, 'start' its left edge. */
type MenuHorizontal = 'end' | 'start'

/** The menu's two-axis placement, chosen from the space around the mascot. */
interface MenuPlacement {
  vertical: MenuVertical
  horizontal: MenuHorizontal
}

/** Which floating surface is open beside the mascot. */
type Panel = 'closed' | 'menu' | 'background' | 'sprite'

/** A dragged (left, top) viewport position; null keeps the default bottom-right corner. */
interface SpritePosition {
  x: number
  y: number
}

/** One in-flight drag gesture: pointer origin plus the anchor's layout position at grab time. */
interface DragGesture {
  startX: number
  startY: number
  originLeft: number
  originTop: number
}

/**
 * Render the floating mascot, its drag-to-move surface, and the click menu.
 * @param props - composed slot props (`useSprite`, `startSession`, `t`; the global hooks stay unused).
 * @returns the mascot element tree.
 */
export function SpriteMascot({ useSprite, useBackground, useSpriteKind, startSession, setBackground, setSpriteKind, t }: SpriteMascotProps): ReactElement {
  const state = useSprite(sel => sel)
  const activity = state.activity
  const background = useBackground(sel => sel)
  const spriteKind = useSpriteKind(sel => sel)
  const [celebrating, setCelebrating] = useState(false)
  const [panel, setPanel] = useState<Panel>('closed')
  const [imageUrl, setImageUrl] = useState('')
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>({ vertical: 'bottom', horizontal: 'end' })
  const [position, setPosition] = useState<SpritePosition | null>(null)
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  const previous = useRef(activity)
  const anchorRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragGesture | null>(null)
  // A drag's trailing click must not toggle the menu; this flag suppresses it once.
  const suppressClick = useRef(false)

  // Celebrate once when a busy run settles into idle.
  useEffect(() => {
    const before = previous.current
    previous.current = activity
    if (BUSY.has(before) && activity === 'idle') {
      setCelebrating(true)
      const timer = window.setTimeout(() => { setCelebrating(false) }, CELEBRATE_MS)
      return () => { window.clearTimeout(timer) }
    }
  }, [activity])

  // Track the cursor and nudge the pupils toward it, rAF-throttled to one
  // update per frame. The cursor is projected into the SVG viewBox (120×120)
  // so the gaze vector is already in SVG units.
  useEffect(() => {
    let frame = 0
    let latest = { x: 0, y: 0 }
    const onMove = (event: MouseEvent): void => {
      const anchor = anchorRef.current
      if (anchor === null) return
      const rect = anchor.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const sx = ((event.clientX - rect.left) / rect.width) * 120
      const sy = ((event.clientY - rect.top) / rect.height) * 120
      const dx = sx - 60
      const dy = sy - 66
      const len = Math.hypot(dx, dy)
      latest = len < 1 ? { x: 0, y: 0 } : { x: (dx / len) * GAZE_MAX, y: (dy / len) * GAZE_MAX }
      if (frame === 0) {
        frame = window.requestAnimationFrame(() => {
          frame = 0
          setGaze(latest)
        })
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [])

  // Re-seed the image URL field from the active image when the background panel
  // opens, so an applied URL survives closing and reopening the panel. The
  // previous-panel guard keeps later `background` changes (e.g. the fade slider)
  // from stomping a URL the user is mid-edit.
  const previousPanel = useRef(panel)
  useEffect(() => {
    const was = previousPanel.current
    previousPanel.current = panel
    if (panel === 'background' && was !== 'background' && background?.kind === 'image') {
      setImageUrl(background.value)
    }
  }, [panel, background])

  // Choose the open panel's side per axis from the space around the mascot:
  // flip it above when the space below is too tight, and left-align it when a
  // right-aligned panel would overflow the left edge. The layout effect
  // measures the real panel box before paint, so the flip never flashes.
  useLayoutEffect(() => {
    if (panel === 'closed') return
    const anchor = anchorRef.current
    const popover = popoverRef.current
    /* v8 ignore next 2 -- the panel only opens when both are mounted. */
    if (anchor === null || popover === null) return
    const anchorRect = anchor.getBoundingClientRect()
    const popoverRect = popover.getBoundingClientRect()
    const neededHeight = popoverRect.height + MENU_GAP_PX
    const vertical: MenuVertical = window.innerHeight - anchorRect.bottom < neededHeight
      && anchorRect.top >= neededHeight ? 'top' : 'bottom'
    const horizontal: MenuHorizontal = anchorRect.right - popoverRect.width < 0
      && anchorRect.left + popoverRect.width <= window.innerWidth ? 'start' : 'end'
    setMenuPlacement({ vertical, horizontal })
  }, [panel])

  const pose: Pose = celebrating ? 'done' : activity
  const caption = activity === 'working' && state.toolName !== undefined
    ? `${t('state.working')} · ${state.toolName}`
    : t(`state.${activity}`)

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return
    const rect = anchorRef.current?.getBoundingClientRect()
    /* v8 ignore next -- the anchor always renders before the sprite is grabbable. */
    if (rect === undefined) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const gesture = drag.current
    if (gesture === null) return
    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    if (!suppressClick.current
      && Math.abs(dx) < DRAG_THRESHOLD_PX
      && Math.abs(dy) < DRAG_THRESHOLD_PX) return
    suppressClick.current = true
    setPosition({ x: gesture.originLeft + dx, y: gesture.originTop + dy })
  }

  const onPointerUp = (): void => {
    drag.current = null
  }

  const onActivate = (): void => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    setPanel(open => open === 'closed' ? 'menu' : 'closed')
  }

  const close = (): void => { setPanel('closed') }

  const applyImage = (): void => {
    const url = imageUrl.trim()
    if (url === '') return
    setBackground({ kind: 'image', value: url, fit: 'contain', veil: DEFAULT_VEIL })
  }

  /** Read a local image file to a data URL and apply it as the background. */
  const onUploadImage = (event: ReactChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    // Reset the input so re-selecting the same file re-fires change.
    event.target.value = ''
    if (file === undefined) return
    if (file.size > MAX_UPLOAD_BYTES) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBackground({ kind: 'image', value: reader.result, fit: 'contain', veil: DEFAULT_VEIL })
      }
    }
    reader.readAsDataURL(file)
  }

  const isColorSelected = (value: string): boolean => background?.kind === 'color' && background.value === value
  const isGradientSelected = (value: string): boolean => background?.kind === 'gradient' && background.value === value
  /** The active image selection (non-null only when the current background is an image). */
  const activeImage = background?.kind === 'image' ? background : null

  /** Re-scale the active image (contain = fit + center, fill = stretch full-screen). */
  const setFit = (fit: ImageFit): void => {
    if (activeImage !== null) setBackground({ ...activeImage, fit })
  }

  /** Fade the active image toward the theme base so foreground text stays legible. */
  const setVeil = (veil: number): void => {
    if (activeImage !== null) setBackground({ ...activeImage, veil })
  }

  const style = position === null
    ? undefined
    : { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }

  return (
    <div
      ref={anchorRef}
      className={css.anchor}
      data-vertical={menuPlacement.vertical}
      data-horizontal={menuPlacement.horizontal}
      style={style}
    >
      <button
        type="button"
        className={css.sprite}
        data-activity={activity}
        data-pose={pose}
        aria-label={caption}
        aria-haspopup="menu"
        aria-expanded={panel !== 'closed'}
        onClick={onActivate}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {(activity === 'waiting' || activity === 'error') && (
          <span className={css.attentionDot} data-kind={activity} aria-hidden="true" />
        )}
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          {renderSprite(spriteKind, pose, gaze)}
        </svg>
      </button>
      {panel === 'menu' && (
        <div ref={popoverRef} className={css.menu} role="menu" aria-label={t('menu.label')}>
          <button
            type="button"
            role="menuitem"
            className={css.menuItem}
            onClick={() => { startSession(); close() }}
          >
            <span className={css.menuIcon} aria-hidden="true">
              <svg viewBox="0 0 14 14" width="15" height="15">
                <path d="M7 2.5v9M2.5 7h9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            {t('menu.newSession')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={css.menuItem}
            onClick={() => { setPosition(null); close() }}
          >
            <span className={css.menuIcon} aria-hidden="true">
              <svg viewBox="0 0 14 14" width="15" height="15">
                <path d="M11.5 6.5a4.5 4.5 0 1 1-1.5-3.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M11.5 1.5v3.2h-3.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {t('menu.reset')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={css.menuItem}
            onClick={() => { setPanel('background') }}
          >
            <span className={css.menuIcon} aria-hidden="true">
              <svg viewBox="0 0 14 14" width="15" height="15">
                <path d="M7 2l5 5-5 5-5-5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
            {t('menu.background')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={css.menuItem}
            onClick={() => { setPanel('sprite') }}
          >
            <span className={css.menuIcon} aria-hidden="true">
              <svg viewBox="0 0 14 14" width="15" height="15">
                <circle cx="7" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 12c0-2.2 1.8-4 4-4s4 1.8 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            {t('menu.sprite')}
          </button>
        </div>
      )}
      {panel === 'background' && (
        <div ref={popoverRef} className={css.backgroundPanel} role="dialog" aria-label={t('background.title')}>
          <div className={css.panelHeader}>
            <span className={css.panelTitle}>{t('background.title')}</span>
            <button
              type="button"
              className={css.panelBack}
              onClick={() => { setPanel('menu') }}
            >
              {t('background.back')}
            </button>
          </div>
          <div className={css.sectionLabel}>{t('background.color')}</div>
          <div className={css.swatches}>
            {BACKGROUND_COLORS.map(item => (
              <button
                key={item.id}
                type="button"
                className={css.swatch}
                data-selected={isColorSelected(item.value) || undefined}
                aria-label={item.name}
                style={{ background: item.value }}
                onClick={() => { setBackground({ kind: 'color', value: item.value, fit: 'contain', veil: DEFAULT_VEIL }) }}
              />
            ))}
          </div>
          <div className={css.sectionLabel}>{t('background.gradient')}</div>
          <div className={css.swatches}>
            {BACKGROUND_GRADIENTS.map(item => (
              <button
                key={item.id}
                type="button"
                className={css.swatch}
                data-selected={isGradientSelected(item.value) || undefined}
                aria-label={item.name}
                style={{ background: item.value }}
                onClick={() => { setBackground({ kind: 'gradient', value: item.value, fit: 'contain', veil: DEFAULT_VEIL }) }}
              />
            ))}
          </div>
          <div className={css.sectionLabel}>{t('background.image')}</div>
          <div className={css.imageRow}>
            <input
              type="text"
              className={css.imageInput}
              placeholder={t('background.image.placeholder')}
              value={imageUrl}
              onChange={event => { setImageUrl(event.target.value) }}
            />
            <button
              type="button"
              className={css.imageApply}
              onClick={applyImage}
            >
              {t('background.image.apply')}
            </button>
          </div>
          <label className={css.uploadButton}>
            {t('background.image.upload')}
            <input type="file" accept="image/*" hidden onChange={onUploadImage} />
          </label>
          {activeImage !== null && (
            <>
              <div className={css.sectionLabel}>{t('background.fit')}</div>
              <div className={css.fitRow}>
                <button
                  type="button"
                  className={css.fitButton}
                  data-selected={activeImage.fit === 'contain' || undefined}
                  onClick={() => { setFit('contain') }}
                >
                  {t('background.fit.contain')}
                </button>
                <button
                  type="button"
                  className={css.fitButton}
                  data-selected={activeImage.fit === 'fill' || undefined}
                  onClick={() => { setFit('fill') }}
                >
                  {t('background.fit.fill')}
                </button>
              </div>
              <div className={css.sectionLabel}>{t('background.veil')}</div>
              <input
                type="range"
                className={css.veilSlider}
                min={0}
                max={100}
                value={Math.round(activeImage.veil * 100)}
                onChange={event => { setVeil(Number(event.target.value) / 100) }}
              />
            </>
          )}
          <button
            type="button"
            className={css.reset}
            onClick={() => { setBackground(null) }}
          >
            {t('background.reset')}
          </button>
        </div>
      )}
      {panel === 'sprite' && (
        <div ref={popoverRef} className={css.spritePanel} role="dialog" aria-label={t('sprite.title')}>
          <div className={css.panelHeader}>
            <span className={css.panelTitle}>{t('sprite.title')}</span>
            <button
              type="button"
              className={css.panelBack}
              onClick={() => { setPanel('menu') }}
            >
              {t('background.back')}
            </button>
          </div>
          <div className={css.spriteGrid}>
            {SPRITE_KINDS.map(kind => (
              <button
                key={kind.id}
                type="button"
                className={css.spriteOption}
                data-selected={spriteKind === kind.id || undefined}
                onClick={() => { setSpriteKind(kind.id) }}
              >
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  {renderSprite(kind.id, 'idle', { x: 0, y: 0 })}
                </svg>
                <span className={css.spriteName}>{t(kind.nameKey)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
