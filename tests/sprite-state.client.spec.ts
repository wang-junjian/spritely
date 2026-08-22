// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  EMPTY_CHAT_SNAPSHOT, EMPTY_CONVERSATION_VIEWS,
  type ConversationSnapshot, type RunningToolCall, type SessionId, type SessionListState, type SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'
import { createSpriteStateSource, deriveSpriteState } from '../src/client/sprite-state.ts'

/** The branded-id cast every fixture uses (zero runtime cost). */
const sid = (id: string): SessionId => id as SessionId

function row(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return { id: sid('s1'), displayTitle: 'S1', running: false, blank: false, updatedAt: 0, ...overrides }
}

function list(overrides: Partial<SessionListState> = {}): SessionListState {
  return {
    ids: [sid('s1')],
    byId: { [sid('s1')]: row() },
    current: sid('s1'),
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
    ...overrides,
  }
}

function snapshot(overrides: Partial<ConversationSnapshot> = {}): ConversationSnapshot {
  return {
    sessionId: sid('s1'),
    views: EMPTY_CONVERSATION_VIEWS,
    chat: EMPTY_CHAT_SNAPSHOT,
    nodes: [],
    turnTimings: new Map(),
    turnEnds: new Map(),
    partial: null,
    runningCalls: [],
    pending: [],
    queue: [],
    running: false,
    subagent: null,
    composerPhase: 'active',
    removed: false,
    openState: 'open',
    openError: null,
    hasMore: false,
    loadingOlder: false,
    promptError: null,
    blank: false,
    lastAgentError: null,
    ...overrides,
  }
}

function call(name: string): RunningToolCall {
  return { callId: 'c1', name, argsRaw: '{}', turn: 1, step: 1, time: 0, callView: null, subCalls: [] }
}

describe('deriveSpriteState', () => {
  it('is idle when no session is resolvable', () => {
    expect(deriveSpriteState(list({ current: undefined }), undefined))
      .toEqual({ activity: 'idle', toolName: undefined })
  })

  it('ranks a pending interaction above everything else', () => {
    const withPending = list({ byId: { [sid('s1')]: row({ pendingInteraction: 'approval' }) } })
    expect(deriveSpriteState(withPending, snapshot({ running: true, runningCalls: [call('bash')] })))
      .toEqual({ activity: 'waiting', toolName: undefined })
  })

  it('reports a failed turn before an idle or running one', () => {
    expect(deriveSpriteState(list(), snapshot({ lastAgentError: 'boom' })))
      .toEqual({ activity: 'error', toolName: undefined })
  })

  it('is idle when the session is settled', () => {
    expect(deriveSpriteState(list(), snapshot({ running: false })))
      .toEqual({ activity: 'idle', toolName: undefined })
  })

  it('reports working with the most recent in-flight tool name', () => {
    expect(deriveSpriteState(list(), snapshot({ running: true, runningCalls: [call('read'), call('bash')] })))
      .toEqual({ activity: 'working', toolName: 'bash' })
  })

  it('reports working while a tool-call block is streaming', () => {
    expect(deriveSpriteState(list(), snapshot({
      running: true,
      partial: { turn: 1, step: 1, blocks: [{ kind: 'tool-call', callId: 'c1', name: 'bash', argsRaw: '' }] },
    }))).toEqual({ activity: 'working', toolName: undefined })
  })

  it('reports writing while a text block is streaming', () => {
    expect(deriveSpriteState(list(), snapshot({
      running: true,
      partial: { turn: 1, step: 1, blocks: [{ kind: 'text', text: 'hello' }] },
    }))).toEqual({ activity: 'writing', toolName: undefined })
  })

  it('reports thinking for reasoning or pre-first-token latency', () => {
    expect(deriveSpriteState(list(), snapshot({
      running: true,
      partial: { turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: 'hmm' }] },
    }))).toEqual({ activity: 'thinking', toolName: undefined })

    expect(deriveSpriteState(list(), snapshot({ running: true })))
      .toEqual({ activity: 'thinking', toolName: undefined })
  })
})

describe('createSpriteStateSource', () => {
  function makeSessions() {
    let listSnapshot: SessionListState = list({ current: undefined, ids: [], byId: {} })
    let sessionSnapshot: ConversationSnapshot = snapshot({ running: false })
    const listListeners = new Set<() => void>()
    const sessionListeners = new Set<() => void>()
    const sessions = {
      list: {
        getSnapshot: () => listSnapshot,
        subscribe: (fn: () => void) => { listListeners.add(fn); return () => { listListeners.delete(fn) } },
      },
      binding: (id: unknown) => (id === undefined ? undefined : {
        session: {
          getSnapshot: () => sessionSnapshot,
          subscribe: (fn: () => void) => { sessionListeners.add(fn); return () => { sessionListeners.delete(fn) } },
        },
      }),
    }
    return {
      sessions,
      setList(next: SessionListState): void {
        listSnapshot = next
        for (const fn of [...listListeners]) fn()
      },
      setSession(next: ConversationSnapshot): void {
        sessionSnapshot = next
        for (const fn of [...sessionListeners]) fn()
      },
    }
  }

  it('starts idle and follows the current session as the selection moves', () => {
    const m = makeSessions()
    const source = createSpriteStateSource(m.sessions as never)
    expect(source.getSnapshot()).toEqual({ activity: 'idle', toolName: undefined })

    m.setList(list({ current: sid('s1'), byId: { [sid('s1')]: row({ running: true }) } }))
    m.setSession(snapshot({ running: true, runningCalls: [call('bash')] }))
    expect(source.getSnapshot()).toEqual({ activity: 'working', toolName: 'bash' })
    source.dispose()
  })

  it('notifies subscribers only when the projected state actually changes', () => {
    const m = makeSessions()
    const source = createSpriteStateSource(m.sessions as never)
    const listener = vi.fn()
    source.subscribe(listener)

    // A list republish of the same idle state must not fire.
    m.setList(list({ current: undefined, ids: [], byId: {} }))
    expect(listener).not.toHaveBeenCalled()

    m.setList(list({ current: sid('s1'), byId: { [sid('s1')]: row() } }))
    m.setSession(snapshot({ running: true, runningCalls: [call('bash')] }))
    expect(listener).toHaveBeenCalledTimes(1)
    source.dispose()
  })

  it('stops notifying after dispose', () => {
    const m = makeSessions()
    const source = createSpriteStateSource(m.sessions as never)
    const listener = vi.fn()
    source.subscribe(listener)
    source.dispose()

    m.setList(list({ current: sid('s1'), byId: { [sid('s1')]: row() } }))
    m.setSession(snapshot({ running: true }))
    expect(listener).not.toHaveBeenCalled()
  })
})
