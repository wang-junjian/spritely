/**
 * Sprite work-state derivation: a pure projection from the current session's
 * live facts (list row + conversation snapshot) into a compact activity the
 * mascot renders. `createSpriteStateSource` wraps that derivation in a bare
 * observable that follows the current session as the selection changes, so a
 * root-scoped overlay slot can read live session state without a session-scope
 * hook.
 */
import type {
  ConversationSnapshot, ISessions, SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'

/**
 * The mascot's activity: one pose per observable phase of an agent's work.
 * `idle` covers both "no session" and "session settled"; `waiting` is a
 * pending user interaction (permission/ask), and `error` is a failed turn.
 */
export type SpriteActivity = 'idle' | 'thinking' | 'writing' | 'working' | 'waiting' | 'error'

/** The compact, JSON-safe state the mascot renders from. */
export interface SpriteState {
  readonly activity: SpriteActivity
  /** Name of the in-flight tool call while `activity === 'working'`, else undefined. */
  readonly toolName: string | undefined
}

/** The idle baseline every session-less view falls back to. */
const IDLE: SpriteState = Object.freeze({ activity: 'idle', toolName: undefined })

/**
 * Project the current session's live facts into one {@link SpriteState}.
 * Pure: reads only the two supplied snapshots and returns a fresh value.
 *
 * Precedence: a pending interaction wins (the user must answer), then a
 * failed turn, then the running phase, then idle. While running, in-flight
 * tool calls rank first (`working`), then a streamed text block (`writing`),
 * then reasoning or the pre-first-token latency (`thinking`).
 *
 * @param list - the sessions list snapshot (current selection + row facts).
 * @param snapshot - the current session's conversation snapshot, or undefined when unresolvable.
 * @returns the derived state.
 */
export function deriveSpriteState(
  list: SessionListState,
  snapshot: ConversationSnapshot | undefined,
): SpriteState {
  const row = list.current === undefined ? undefined : list.byId[list.current]
  if (row?.pendingInteraction !== undefined) {
    return { activity: 'waiting', toolName: undefined }
  }
  if (snapshot === undefined) {
    return { activity: 'idle', toolName: undefined }
  }
  if (snapshot.lastAgentError !== null) {
    return { activity: 'error', toolName: undefined }
  }
  if (!snapshot.running) {
    return { activity: 'idle', toolName: undefined }
  }
  const calls = snapshot.runningCalls
  if (calls.length > 0) {
    return { activity: 'working', toolName: calls[calls.length - 1]?.name }
  }
  const blocks = snapshot.partial?.blocks ?? []
  if (blocks.some(block => block.kind === 'tool-call')) {
    return { activity: 'working', toolName: undefined }
  }
  if (blocks.some(block => block.kind === 'text')) {
    return { activity: 'writing', toolName: undefined }
  }
  // Reasoning-only partial, or running with no visible chunk yet.
  return { activity: 'thinking', toolName: undefined }
}

/** Reference equality for the projected state (flat, JSON-safe fields only). */
function sameState(a: SpriteState, b: SpriteState): boolean {
  return a.activity === b.activity && a.toolName === b.toolName
}

/**
 * A {@link SpriteState} observable that follows the current session, plus an
 * explicit teardown for its upstream subscriptions.
 */
export interface SpriteStateSource extends HostObservable<SpriteState> {
  /** Unsubscribe from the sessions list and the current session snapshot. */
  dispose(): void
}

/**
 * Build a bare observable that projects the CURRENT session's live work state.
 * It re-subscribes to the selected session whenever the current selection
 * moves, so the sprite tracks the session the user is looking at. `getSnapshot`
 * returns a stable reference between changes (the two-identity contract).
 *
 * @param sessions - the root sessions service (list + per-session bindings).
 * @returns the source; call `dispose()` when the owning plugin unloads.
 */
export function createSpriteStateSource(sessions: ISessions): SpriteStateSource {
  const listeners = new Set<() => void>()
  let current: SpriteState = IDLE
  let unsubscribeSession: (() => void) | undefined

  const refresh = (): void => {
    const list = sessions.list.getSnapshot()
    const id = list.current
    const binding = id === undefined ? undefined : sessions.binding(id)
    const snapshot = binding?.session.getSnapshot()
    const next = deriveSpriteState(list, snapshot)
    if (!sameState(current, next)) {
      current = next
      for (const fn of [...listeners]) fn()
    }
  }

  const follow = (): void => {
    unsubscribeSession?.()
    unsubscribeSession = undefined
    const id = sessions.list.getSnapshot().current
    const binding = id === undefined ? undefined : sessions.binding(id)
    if (binding !== undefined) {
      unsubscribeSession = binding.session.subscribe(refresh)
    }
    refresh()
  }

  const unsubscribeList = sessions.list.subscribe(follow)
  follow()

  return {
    getSnapshot: () => current,
    subscribe(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    dispose() {
      unsubscribeList()
      unsubscribeSession?.()
    },
  }
}
