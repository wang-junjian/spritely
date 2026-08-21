/** The idle baseline every session-less view falls back to. */
const IDLE = Object.freeze({ activity: 'idle', toolName: undefined });
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
export function deriveSpriteState(list, snapshot) {
    const row = list.current === undefined ? undefined : list.byId[list.current];
    if (row?.pendingInteraction !== undefined) {
        return { activity: 'waiting', toolName: undefined };
    }
    if (snapshot === undefined) {
        return { activity: 'idle', toolName: undefined };
    }
    if (snapshot.lastAgentError !== null) {
        return { activity: 'error', toolName: undefined };
    }
    if (!snapshot.running) {
        return { activity: 'idle', toolName: undefined };
    }
    const calls = snapshot.runningCalls;
    if (calls.length > 0) {
        return { activity: 'working', toolName: calls[calls.length - 1]?.name };
    }
    const blocks = snapshot.partial?.blocks ?? [];
    if (blocks.some(block => block.kind === 'tool-call')) {
        return { activity: 'working', toolName: undefined };
    }
    if (blocks.some(block => block.kind === 'text')) {
        return { activity: 'writing', toolName: undefined };
    }
    // Reasoning-only partial, or running with no visible chunk yet.
    return { activity: 'thinking', toolName: undefined };
}
/** Deep-enough equality for the projected state. */
function sameState(a, b) {
    return a.activity === b.activity && a.toolName === b.toolName;
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
export function createSpriteStateSource(sessions) {
    const listeners = new Set();
    let current = IDLE;
    let unsubscribeSession;
    const refresh = () => {
        const list = sessions.list.getSnapshot();
        const id = list.current;
        const binding = id === undefined ? undefined : sessions.binding(id);
        const snapshot = binding?.session.getSnapshot();
        const next = deriveSpriteState(list, snapshot);
        if (!sameState(current, next)) {
            current = next;
            for (const fn of [...listeners])
                fn();
        }
    };
    const follow = () => {
        unsubscribeSession?.();
        unsubscribeSession = undefined;
        const id = sessions.list.getSnapshot().current;
        const binding = id === undefined ? undefined : sessions.binding(id);
        if (binding !== undefined) {
            unsubscribeSession = binding.session.subscribe(refresh);
        }
        refresh();
    };
    const unsubscribeList = sessions.list.subscribe(follow);
    follow();
    return {
        getSnapshot: () => current,
        subscribe(fn) {
            listeners.add(fn);
            return () => {
                listeners.delete(fn);
            };
        },
        dispose() {
            unsubscribeList();
            unsubscribeSession?.();
        },
    };
}
//# sourceMappingURL=sprite-state.js.map