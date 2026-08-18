/** Registers the floating mascot into the layout-owned overlay slot. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { createSpriteStateSource } from './sprite-state.ts'
import { BackgroundPresenter, createBackgroundSource } from './background-source.ts'
import { createSpriteKindSource } from './sprite-kind-source.ts'
import { SpriteMascot, type SpriteMascotInjected } from './SpriteMascot.tsx'
import { en, zh, type SpriteKey } from './locales.ts'

export type { SpriteActivity, SpriteState } from './sprite-state.ts'
export {
  DEFAULT_VEIL,
  type BackgroundKind,
  type BackgroundSource,
  type BackgroundState,
  type ImageFit,
} from './background-source.ts'
export type { SpriteKindSource } from './sprite-kind-source.ts'
export { SPRITE_KINDS, type Gaze, type Pose, type SpriteKind, type SpriteKindMeta } from './sprites.tsx'
export type { SpriteMascotInjected, SpriteMascotProps } from './SpriteMascot.tsx'
export type { SpriteKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The mascot's status copy. */
    sprite: SpriteKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'sprite'

/** Services required by the sprite plugin. */
export const inject = ['slots', 'sessions', 'workspaces', 'locale']

/**
 * Mount the mascot: register the dictionaries, then contribute the sprite
 * into `shell.overlay` once ui-layout declares it. The work-state observable
 * and the persisted background source are created per declaration lifetime and
 * disposed with the registration; the background presenter projects the source
 * onto the `--dsw-alias-bg-base` CSS variable (recoloring every surface layer).
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sprite: dictionaries')

  ctx.slots.inject('shell.overlay', () => {
    const source = createSpriteStateSource(ctx.sessions)
    const background = createBackgroundSource()
    const spriteKind = createSpriteKindSource()
    const presenter = new BackgroundPresenter()
    presenter.apply(background.getSnapshot())
    const unsubscribeBackground = background.subscribe(() => { presenter.apply(background.getSnapshot()) })
    const dispose = ctx.slots.register({
      name: 'shell.overlay',
      id: 'sprite',
      locale: NS,
      inject: (): SpriteMascotInjected => ({
        hooks: { sprite: source, background, spriteKind },
        startSession: () => { ctx.workspaces.startSession() },
        setBackground: value => { background.set(value) },
        setSpriteKind: kind => { spriteKind.set(kind) },
      }),
    }, SpriteMascot)
    return () => {
      dispose()
      source.dispose()
      unsubscribeBackground()
      presenter.dispose()
    }
  })
}
