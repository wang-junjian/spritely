/**
 * Sprite work-state derivation: a pure projection from the current session's
 * live facts (list row + conversation snapshot) into a compact activity the
 * mascot renders. `createSpriteStateSource` wraps that derivation in a bare
 * observable that follows the current session as the selection changes, so a
 * root-scoped overlay slot can read live session state without a session-scope
 * hook.
 */
import type { ConversationSnapshot, ISessions, SessionListState } from '@deepseek-ai/dsh-client-runtime/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
/**
 * The mascot's activity: one pose per observable phase of an agent's work.
 * `idle` covers both "no session" and "session settled"; `waiting` is a
 * pending user interaction (permission/ask), and `error` is a failed turn.
 */
export type SpriteActivity = 'idle' | 'thinking' | 'writing' | 'working' | 'waiting' | 'error';
/** The compact, JSON-safe state the mascot renders from. */
export interface SpriteState {
    readonly activity: SpriteActivity;
    /** Name of the in-flight tool call while `activity === 'working'`, else undefined. */
    readonly toolName: string | undefined;
}
/**
 * Project the current session's live facts into one {@link SpriteState}.
 * Pure: reads only the supplied snapshots and returns a fresh value.
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
export declare function deriveSpriteState(list: SessionListState, snapshot: ConversationSnapshot | undefined): SpriteState;
/**
 * A {@link SpriteState} observable that follows the current session, plus an
 * explicit teardown for its upstream subscriptions.
 */
export interface SpriteStateSource extends HostObservable<SpriteState> {
    /** Unsubscribe from the sessions list and the current session snapshot. */
    dispose(): void;
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
export declare function createSpriteStateSource(sessions: ISessions): SpriteStateSource;
//# sourceMappingURL=sprite-state.d.ts.map