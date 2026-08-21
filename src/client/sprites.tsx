/**
 * The selectable mascot roster. Each sprite is a distinct character with its
 * own body and eye style, but they all share the same pose grammar (the seven
 * live activity faces) and the cursor-following gaze, so switching sprites
 * never changes how the mascot reacts to the agent's work state.
 */
import type { ReactElement } from 'react'
import type { SpriteActivity } from './sprite-state.ts'
import type { SpriteKey } from './locales.ts'
import css from './SpriteMascot.module.css'

/** Component pose: the six live activities plus the transient celebration. */
export type Pose = SpriteActivity | 'done'

/** The selectable mascot kinds. */
export type SpriteKind = 'blob' | 'bot' | 'cat' | 'ghost'

/** Cursor-following gaze offset, in SVG units. */
export interface Gaze {
  x: number
  y: number
}

/** One roster entry: kind plus its localized name key. */
export interface SpriteKindMeta {
  id: SpriteKind
  nameKey: SpriteKey
}

/** The roster, in selection-panel order. */
export const SPRITE_KINDS: readonly SpriteKindMeta[] = [
  { id: 'blob', nameKey: 'sprite.blob' },
  { id: 'bot', nameKey: 'sprite.bot' },
  { id: 'cat', nameKey: 'sprite.cat' },
  { id: 'ghost', nameKey: 'sprite.ghost' },
]

/** Eye whites must read as white in every theme (the theme's brand invert is near-black). */
const WHITE = 'var(--dsw-static-neutral-bluish-50, #FFFFFF)'
/** Pupils and face lines: a fixed deep ink so they never wash out. */
const INK = 'var(--dsw-static-blue-950, #0B1530)'

/** Pupil shift from the gaze vector (zero → no transform). */
function shiftOf(gaze: Gaze): string | undefined {
  return gaze.x === 0 && gaze.y === 0 ? undefined : `translate(${gaze.x} ${gaze.y})`
}

/** Render the selected sprite's full SVG content. */
export function renderSprite(kind: SpriteKind, pose: Pose, gaze: Gaze): ReactElement {
  const shift = shiftOf(gaze)
  switch (kind) {
    case 'blob':
      return <Blob pose={pose} shift={shift} />
    case 'bot':
      return <Bot pose={pose} shift={shift} />
    case 'cat':
      return <Cat pose={pose} shift={shift} />
    case 'ghost':
      return <Ghost pose={pose} shift={shift} />
  }
}

/** Pupil center (cy) and radius per pose; null for the non-pupil faces. */
function pupilSpec(pose: Pose): { cy: number; r: number } | null {
  switch (pose) {
    case 'thinking':
      return { cy: 62, r: 3.5 }
    case 'writing':
      return { cy: 66, r: 3 }
    case 'working':
      return { cy: 67, r: 3.5 }
    case 'waiting':
      return { cy: 66, r: 2.5 }
    case 'idle':
      return { cy: 66, r: 3.5 }
    default:
      return null
  }
}

/** Cross-eyes for the error pose (shared by every sprite). */
function CrossEyes(): ReactElement {
  return (
    <>
      <path d="M40 61 L52 71 M52 61 L40 71" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M68 61 L80 71 M80 61 L68 71" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </>
  )
}

/** Smiling arcs for the done pose (shared by every sprite). */
function SmileEyes(): ReactElement {
  return (
    <>
      <path d="M40 64 Q46 57 52 64" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M68 64 Q74 57 80 64" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </>
  )
}

/** The mouth, expression per pose (shared: it sits centered on every body). */
function Mouth({ pose }: { pose: Pose }): ReactElement {
  switch (pose) {
    case 'thinking':
      return <circle cx="60" cy="82" r="3" fill={INK} />
    case 'writing':
    case 'working':
      return <path d="M55 82 L65 82" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    case 'waiting':
      return <circle cx="60" cy="82" r="4" fill={INK} />
    case 'error':
      return <path d="M54 85 Q60 79 66 85" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    case 'done':
      return <path d="M52 80 Q60 90 68 80" fill={INK} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    default:
      return <path d="M54 81 Q60 86 66 81" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
  }
}

/** The per-pose accessory (animated by the module CSS). */
function Accessory({ pose }: { pose: Pose }): ReactElement | null {
  switch (pose) {
    case 'thinking':
      return (
        <g className={css.dots} fill="var(--dsw-alias-label-primary, #1F2937)">
          <circle cx="88" cy="24" r="4" />
          <circle cx="99" cy="17" r="3" />
          <circle cx="109" cy="27" r="2.5" />
        </g>
      )
    case 'working':
      return (
        <g className={css.gear} fill="var(--dsw-alias-state-business-primary, #0EA5E9)">
          <circle cx="90" cy="44" r="6" />
          {[0, 60, 120, 180, 240, 300].map(angle => (
            <rect key={angle} x="88.5" y="32" width="3" height="8" rx="1" transform={`rotate(${angle} 90 44)`} />
          ))}
        </g>
      )
    case 'waiting':
      return (
        <g className={css.dots} fill="var(--dsw-alias-label-primary, #1F2937)">
          <circle cx="90" cy="30" r="3" />
          <circle cx="100" cy="30" r="3" />
          <circle cx="110" cy="30" r="3" />
        </g>
      )
    case 'error':
      return (
        <path className={css.sweat} d="M88 52 q7 9 0 14 q-7 -5 0 -14 Z" fill="var(--dsw-alias-state-error-primary, #EF4444)" />
      )
    case 'done':
      return (
        <g fill="var(--dsw-alias-state-success-primary, #22C55E)">
          <path className={css.star} d="M96 22 Q97.5 26 101 27.5 Q97.5 29 96 33 Q94.5 29 91 27.5 Q94.5 26 96 22 Z" />
          <path className={css.star} d="M30 24 Q31.5 28 35 29.5 Q31.5 31 30 35 Q28.5 31 25 29.5 Q28.5 28 30 24 Z" />
          <path className={css.star} d="M112 48 Q113 50.5 115 51.5 Q113 52.5 112 55 Q111 52.5 109 51.5 Q111 50.5 112 48 Z" />
        </g>
      )
    default:
      return null
  }
}

interface SpriteProps {
  pose: Pose
  shift: string | undefined
}

/* ── Shared head-worn pencil used by Blob, Bot, Ghost and Cat in writing ─── */

function HeadPencil({ className }: { className: string | undefined }): ReactElement {
  return (
    <g className={className}>
      <rect x="66" y="2" width="8" height="24" rx="2" fill="var(--dsw-alias-label-primary, #1F2937)" transform="rotate(45 70 18)" />
      <path d="M66 26 L70 26 L70 34 L68 38 L66 34 Z" fill="var(--dsw-static-amber-500, #F59E0B)" transform="rotate(45 70 18)" />
    </g>
  )
}

/* ── Blob: a vivid blue ball with an antenna star ────────────────────────── */

function Blob({ pose, shift }: SpriteProps): ReactElement {
  const pupil = pupilSpec(pose)
  const showRegularEyes = pose !== 'error' && pose !== 'done'
  return (
    <g className={css.blob}>
      <g className={css.blobAntenna}>
        <path d="M60 32 Q64 20 56 12" fill="none" stroke="var(--dsw-alias-label-tertiary, #6B7280)" strokeWidth="3" strokeLinecap="round" />
        <path className={css.star} d="M56 6 Q58 11 63 13 Q58 15 56 20 Q54 15 49 13 Q54 11 56 6 Z" fill="var(--dsw-alias-state-warn-primary, #F59E0B)" />
      </g>
      <g className={css.blobBody}>
        <circle cx="60" cy="70" r="42" fill="var(--dsw-static-blue-400, #60A5FA)" stroke="var(--dsw-static-blue-500, #3B82F6)" strokeWidth="1.5" />
        <ellipse cx="47" cy="52" rx="16" ry="10" fill={WHITE} opacity="0.35" />
      </g>
      {showRegularEyes ? (
        <g className={css.blobEyes}>
          <g className={css.blobEyeLeft}>
            <circle cx="46" cy="66" r="8" fill={WHITE} />
            {pupil !== null && (
              <circle cx="46" cy={pupil.cy} r={pupil.r} fill={INK} transform={shift} />
            )}
            <path className={css.blobEyelid} d="M38 66 Q46 58 54 66 Q46 74 38 66 Z" fill={WHITE} stroke={INK} strokeWidth="1" />
          </g>
          <g className={css.blobEyeRight}>
            <circle cx="74" cy="66" r="8" fill={WHITE} />
            {pupil !== null && (
              <circle cx="74" cy={pupil.cy} r={pupil.r} fill={INK} transform={shift} />
            )}
            <path className={css.blobEyelid} d="M66 66 Q74 58 82 66 Q74 74 66 66 Z" fill={WHITE} stroke={INK} strokeWidth="1" />
          </g>
        </g>
      ) : pose === 'error' ? (
        <CrossEyes />
      ) : (
        <SmileEyes />
      )}
      <g className={css.blobFace}>
        <Mouth pose={pose} />
      </g>
      <g className={css.blobCheeks}>
        <ellipse cx="36" cy="78" rx="5" ry="3" fill="var(--dsw-static-amber-300, #FCD34D)" opacity="0.6" />
        <ellipse cx="84" cy="78" rx="5" ry="3" fill="var(--dsw-static-amber-300, #FCD34D)" opacity="0.6" />
      </g>
      {pose === 'writing' ? <HeadPencil className={css.headPencil} /> : <Accessory pose={pose} />}
    </g>
  )
}

/* ── Bot: a rounded robot head with LED eyes ─────────────────────────────── */

function Bot({ pose, shift }: SpriteProps): ReactElement {
  const pupil = pupilSpec(pose)
  const showRegularEyes = pose !== 'error' && pose !== 'done'
  return (
    <g className={css.bot}>
      <defs>
        <linearGradient id="botScanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className={css.botAntenna}>
        <path d="M60 28 V14" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="10" r="5" fill="#6EE7B7" />
      </g>
      <g className={css.botHead}>
        <rect x="18" y="28" width="84" height="84" rx="14" fill="#34D399" stroke="#059669" strokeWidth="1.5" />
        <rect x="42" y="40" width="36" height="5" rx="2.5" fill="#059669" opacity="0.5" />
      </g>
      {showRegularEyes ? (
        <g className={css.botEyes}>
          <g className={css.botEyeLeft}>
            <rect x="36" y="58" width="22" height="15" rx="4" fill="#6EE7B7" />
            {pupil !== null && (
              <circle cx="47" cy={pupil.cy} r="4" fill="#062033" transform={shift} />
            )}
            <rect className={css.botScan} x="36" y="58" width="22" height="15" rx="4" fill="url(#botScanGradient)" opacity="0.4" />
          </g>
          <g className={css.botEyeRight}>
            <rect x="62" y="58" width="22" height="15" rx="4" fill="#6EE7B7" />
            {pupil !== null && (
              <circle cx="73" cy={pupil.cy} r="4" fill="#062033" transform={shift} />
            )}
            <rect className={css.botScan} x="62" y="58" width="22" height="15" rx="4" fill="url(#botScanGradient)" opacity="0.4" />
          </g>
        </g>
      ) : pose === 'error' ? (
        <CrossEyes />
      ) : (
        <SmileEyes />
      )}
      <g className={css.botMouth}>
        <path d="M55 88 L65 88" stroke="#062033" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 74 V80" stroke="#059669" strokeWidth="1.5" />
      </g>
      {pose === 'writing' ? <HeadPencil className={css.headPencil} /> : <Accessory pose={pose} />}
    </g>
  )
}

/* ── Cat: an amber kitty with ears, tail, paws and a lively face ─────────── */

/** Cat-specific accessories, drawn near the body so they read as held/worn. */
function CatAccessory({ pose }: { pose: Pose }): ReactElement | null {
  switch (pose) {
    case 'thinking':
      return (
        <g className={css.catThought} fill="var(--dsw-alias-label-primary, #1F2937)">
          <circle cx="58" cy="16" r="3.5" />
          <circle cx="68" cy="9" r="5" />
          <circle cx="80" cy="13" r="3" />
        </g>
      )
    case 'writing':
      return (
        <g className={css.catPencil}>
          <rect x="66" y="2" width="8" height="24" rx="2" fill="var(--dsw-alias-label-primary, #1F2937)" transform="rotate(45 70 18)" />
          <path d="M66 26 L70 26 L70 34 L68 38 L66 34 Z" fill="var(--dsw-static-amber-500, #F59E0B)" transform="rotate(45 70 18)" />
        </g>
      )
    case 'working':
      return (
        <g className={css.catHeadGear}>
          <line x1="60" y1="28" x2="60" y2="12" stroke="var(--dsw-static-amber-600, #D97706)" strokeWidth="3" strokeLinecap="round" />
          <g transform="translate(60 6)">
            <circle r="5" fill="var(--dsw-alias-state-business-primary, #0EA5E9)" />
            {[0, 60, 120, 180, 240, 300].map(angle => (
              <rect key={angle} x="-1.5" y="-9" width="3" height="6" rx="1" fill="var(--dsw-alias-state-business-primary, #0EA5E9)" transform={`rotate(${angle})`} />
            ))}
          </g>
        </g>
      )
    case 'waiting':
      return (
        <g className={css.catSpeech}>
          <ellipse cx="92" cy="54" rx="14" ry="10" fill={WHITE} stroke={INK} strokeWidth="1" />
          <path d="M80 60 L72 66 L82 62" fill={WHITE} stroke={INK} strokeWidth="1" />
          <g fill={INK}>
            <circle cx="88" cy="54" r="1.5" />
            <circle cx="94" cy="54" r="1.5" />
            <circle cx="100" cy="54" r="1.5" />
          </g>
        </g>
      )
    case 'error':
      return (
        <path className={css.catSweat} d="M48 44 q5 7 0 12 q-5 -5 0 -12 Z" fill="var(--dsw-alias-state-error-primary, #EF4444)" />
      )
    case 'done':
      return (
        <g className={css.catStars} fill="var(--dsw-alias-state-success-primary, #22C55E)">
          <path className={css.star} d="M60 10 Q62 15 67 17 Q62 19 60 24 Q58 19 53 17 Q58 15 60 10 Z" />
          <path className={css.star} d="M28 28 Q30 32 34 34 Q30 36 28 40 Q26 36 22 34 Q26 32 28 28 Z" />
          <path className={css.star} d="M96 30 Q98 33 101 35 Q98 37 96 40 Q94 37 91 35 Q94 33 96 30 Z" />
        </g>
      )
    default:
      return null
  }
}

function Cat({ pose, shift }: SpriteProps): ReactElement {
  const pupil = pupilSpec(pose)
  const showRegularEyes = pose !== 'error' && pose !== 'done'
  return (
    <g className={css.cat}>
      <g className={css.catTail}>
        <path
          d="M76 90 Q94 84 96 66 Q98 48 84 46 Q76 44 78 54 Q82 64 88 68 Q90 82 76 90"
          fill="var(--dsw-static-amber-400, #FBBF24)"
          stroke="var(--dsw-static-amber-600, #D97706)"
          strokeWidth="1.5"
        />
      </g>
      <g className={css.catBody}>
        <circle cx="60" cy="72" r="42" fill="var(--dsw-static-amber-400, #FBBF24)" stroke="var(--dsw-static-amber-600, #D97706)" strokeWidth="1.5" />
      </g>
      <g className={css.catEars}>
        <g className={css.catEarLeft}>
          <path d="M32 46 L40 18 L54 38 Z" fill="var(--dsw-static-amber-400, #FBBF24)" stroke="var(--dsw-static-amber-600, #D97706)" strokeWidth="1.5" />
          <path d="M37 40 L40 26 L50 36 Z" fill="var(--dsw-static-amber-300, #FCD34D)" />
        </g>
        <g className={css.catEarRight}>
          <path d="M66 38 L80 18 L88 46 Z" fill="var(--dsw-static-amber-400, #FBBF24)" stroke="var(--dsw-static-amber-600, #D97706)" strokeWidth="1.5" />
          <path d="M70 36 L80 26 L83 40 Z" fill="var(--dsw-static-amber-300, #FCD34D)" />
        </g>
      </g>
      <g className={css.catFace}>
        <path d="M60 34 L55 44 M60 34 L65 44" stroke="var(--dsw-static-amber-600, #D97706)" strokeWidth="2" strokeLinecap="round" />
        {showRegularEyes ? (
          <g className={css.catEyes}>
            <g className={css.catEyeLeft}>
              <ellipse cx="46" cy="66" rx="7" ry="10" fill={WHITE} />
              {pupil !== null && (
                <ellipse cx="46" cy={pupil.cy} rx="3.5" ry="6.5" fill={INK} transform={shift} />
              )}
              <path className={css.catEyelid} d="M39 66 Q46 56 53 66 Q46 76 39 66 Z" fill={WHITE} stroke={INK} strokeWidth="1" />
            </g>
            <g className={css.catEyeRight}>
              <ellipse cx="74" cy="66" rx="7" ry="10" fill={WHITE} />
              {pupil !== null && (
                <ellipse cx="74" cy={pupil.cy} rx="3.5" ry="6.5" fill={INK} transform={shift} />
              )}
              <path className={css.catEyelid} d="M67 66 Q74 56 81 66 Q74 76 67 66 Z" fill={WHITE} stroke={INK} strokeWidth="1" />
            </g>
          </g>
        ) : pose === 'error' ? (
          <CrossEyes />
        ) : (
          <SmileEyes />
        )}
        <g className={css.catWhiskers}>
          <path d="M34 74 H44" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M32 78 H43" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M76 74 H86" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M77 78 H88" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <path d="M58 78 L62 78 L60 81 Z" fill="var(--dsw-static-amber-600, #D97706)" />
        <Mouth pose={pose} />
        <ellipse cx="38" cy="80" rx="4" ry="2.5" fill="var(--dsw-static-amber-100, #FEF3C7)" opacity="0.7" />
        <ellipse cx="82" cy="80" rx="4" ry="2.5" fill="var(--dsw-static-amber-100, #FEF3C7)" opacity="0.7" />
      </g>
      <g className={css.catPaws}>
        <ellipse cx="44" cy="108" rx="7" ry="4" fill="var(--dsw-static-amber-100, #FEF3C7)" stroke="var(--dsw-static-amber-600, #D97706)" strokeWidth="1" />
        <ellipse cx="76" cy="108" rx="7" ry="4" fill="var(--dsw-static-amber-100, #FEF3C7)" stroke="var(--dsw-static-amber-600, #D97706)" strokeWidth="1" />
      </g>
      <CatAccessory pose={pose} />
    </g>
  )
}

/* ── Ghost: a violet specter with a wavy hem ─────────────────────────────── */

function Ghost({ pose, shift }: SpriteProps): ReactElement {
  const pupil = pupilSpec(pose)
  const showRegularEyes = pose !== 'error' && pose !== 'done'
  return (
    <g className={css.ghost}>
      <g className={css.ghostBody}>
        <path
          d="M22 64 Q22 22 60 22 Q98 22 98 64 L98 82 Q80 76 60 82 Q40 76 22 82 Z"
          fill="var(--dsw-static-purple-400, #A78BFA)"
          stroke="var(--dsw-static-purple-600, #7C3EDD)"
          strokeWidth="1.5"
        />
        <ellipse cx="42" cy="52" rx="10" ry="6" fill={WHITE} opacity="0.3" />
      </g>
      <g className={css.ghostHem}>
        <path
          d="M22 82 Q40 76 60 82 Q80 76 98 82 L98 100 Q82 100 80 92 Q76 102 72 92 Q68 102 64 92 Q60 102 56 92 Q52 102 48 92 Q44 102 40 92 Q36 102 32 92 Q26 102 22 100 Z"
          fill="var(--dsw-static-purple-400, #A78BFA)"
          stroke="var(--dsw-static-purple-600, #7C3EDD)"
          strokeWidth="1.5"
        />
      </g>
      {showRegularEyes ? (
        <g className={css.ghostEyes}>
          <g className={css.ghostEyeLeft}>
            <circle cx="46" cy="66" r="9" fill={WHITE} />
            {pupil !== null && (
              <circle cx="46" cy={pupil.cy} r={pupil.r + 0.5} fill={INK} transform={shift} />
            )}
            <path className={css.ghostEyelid} d="M37 66 Q46 57 55 66 Q46 75 37 66 Z" fill={WHITE} stroke={INK} strokeWidth="1" />
          </g>
          <g className={css.ghostEyeRight}>
            <circle cx="74" cy="66" r="9" fill={WHITE} />
            {pupil !== null && (
              <circle cx="74" cy={pupil.cy} r={pupil.r + 0.5} fill={INK} transform={shift} />
            )}
            <path className={css.ghostEyelid} d="M65 66 Q74 57 83 66 Q74 75 65 66 Z" fill={WHITE} stroke={INK} strokeWidth="1" />
          </g>
        </g>
      ) : pose === 'error' ? (
        <CrossEyes />
      ) : (
        <SmileEyes />
      )}
      <g className={css.ghostFace}>
        <Mouth pose={pose} />
      </g>
      <g className={css.ghostCheeks}>
        <ellipse cx="36" cy="78" rx="4" ry="2.5" fill="var(--dsw-static-purple-200, #DDD6FE)" opacity="0.5" />
        <ellipse cx="84" cy="78" rx="4" ry="2.5" fill="var(--dsw-static-purple-200, #DDD6FE)" opacity="0.5" />
      </g>
      {pose === 'writing' ? <HeadPencil className={css.headPencil} /> : <Accessory pose={pose} />}
    </g>
  )
}
