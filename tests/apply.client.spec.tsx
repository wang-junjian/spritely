/** Sprite overlay slot registration and its derived work-state source. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { DEFAULT_VEIL, apply, inject } from '@deepseek-ai/dsh-client-ui-sprite/client'
import type { SpriteMascotInjected } from '@deepseek-ai/dsh-client-ui-sprite/client'

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const sessions = {
    list: {
      getSnapshot: () => ({
        ids: [], byId: {}, current: undefined, phase: 'ready',
        subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
      }),
      subscribe: () => () => {},
    },
    binding: () => undefined,
  }
  const workspaces = { startSession: vi.fn() }
  ctx.provide('sessions', sessions as never)
  ctx.provide('workspaces', workspaces as never)
  ctx.provide('locale', new LocaleRuntime(ctx))
  const slots = ctx.get('slots') as SlotRegistry
  if (declare) {
    slots.register(
      { name: 'root', children: { 'shell.overlay': { kind: 'list', scope: 'root' } } } as never,
      () => null,
    )
  }
  return { ctx, slots, workspaces }
}

describe('ui-sprite apply', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'sessions', 'workspaces', 'locale'])
  })

  it('registers the mascot into the overlay slot with its work-state source and New Session action', async () => {
    const b = await bench()
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const entries = b.slots.entries('shell.overlay')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.options.id).toBe('sprite')
    expect(entries[0]!.locale).toBe('sprite')

    // Slot entries' `inject` is typed as `(...args: never[]) => Record<string, unknown>`
    // (the registrant contract); narrow through `unknown` to our concrete face.
    const injected = (entries[0]!.inject as unknown as () => SpriteMascotInjected)()
    expect(Object.keys(injected)).toEqual(['hooks', 'startSession', 'setBackground', 'setSpriteKind'])
    expect(typeof injected.hooks.sprite.getSnapshot).toBe('function')
    expect(typeof injected.hooks.sprite.subscribe).toBe('function')
    expect(injected.hooks.sprite.getSnapshot()).toEqual({ activity: 'idle', toolName: undefined })
    // The background source starts null (follow the theme) and flips on set.
    expect(typeof injected.hooks.background.getSnapshot).toBe('function')
    expect(injected.hooks.background.getSnapshot()).toBeNull()
    injected.setBackground({ kind: 'color', value: '#EAF3FB', fit: 'contain', veil: DEFAULT_VEIL })
    expect(injected.hooks.background.getSnapshot()).toEqual({ kind: 'color', value: '#EAF3FB', fit: 'contain', veil: DEFAULT_VEIL })
    // The mascot-kind source starts as blob and flips on set.
    expect(injected.hooks.spriteKind.getSnapshot()).toBe('blob')
    injected.setSpriteKind('cat')
    expect(injected.hooks.spriteKind.getSnapshot()).toBe('cat')
    // New Session delegates to the workspaces service's default-workspace flow.
    injected.startSession()
    expect(b.workspaces.startSession).toHaveBeenCalledWith()
  })

  it('waits for the overlay declaration instead of failing when it is absent', async () => {
    const b = await bench(false)
    await expect(b.ctx.plugin({ inject: [...inject], apply }).await()).resolves.toBeDefined()
    expect(b.slots.entries('shell.overlay')).toHaveLength(0)
  })

  it('removes the entry on teardown', async () => {
    const b = await bench()
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(b.slots.entries('shell.overlay')).toHaveLength(1)
    await fiber.dispose()
    expect(b.slots.entries('shell.overlay')).toHaveLength(0)
  })
})
