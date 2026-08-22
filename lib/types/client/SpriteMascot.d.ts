/**
 * SpriteMascot: the floating mascot rendered into the layout's `shell.overlay`
 * layer. Pure presentation — the work state arrives through the injected
 * `useSprite` selector hook; local state holds only the transient celebration
 * (a busy run settling into idle), the drag position, and the open menu. A
 * pointer gesture under the drag threshold counts as a click and toggles the
 * menu; beyond it, the sprite follows the pointer and can be reset to its
 * default corner.
 */
import { type ReactElement } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SpriteState } from './sprite-state.ts';
import { type BackgroundState } from './background-source.ts';
import { type SpriteKind } from './sprites.tsx';
import { type SpritePosition } from './sprite-position-source.ts';
/** Registrant inject face: the work-state, background, mascot-kind, and position sources plus actions. */
export interface SpriteMascotInjected {
    hooks: {
        sprite: import('@deepseek-ai/dsh-client-ui-slots').HostObservable<SpriteState>;
        background: import('@deepseek-ai/dsh-client-ui-slots').HostObservable<BackgroundState | null>;
        spriteKind: import('@deepseek-ai/dsh-client-ui-slots').HostObservable<SpriteKind>;
        position: import('@deepseek-ai/dsh-client-ui-slots').HostObservable<SpritePosition | null>;
    };
    /** Start a New Session through the workspaces service (default-workspace flow). */
    startSession: () => void;
    /** Apply a background selection to the app (null restores the theme default). */
    setBackground: (background: BackgroundState | null) => void;
    /** Switch the active mascot kind. */
    setSpriteKind: (kind: SpriteKind) => void;
    /** Move the anchor to a dragged position (null restores the default corner). */
    setPosition: (position: SpritePosition | null) => void;
}
/** Full composed props: runtime share + bound inject share + locale seat. */
export type SpriteMascotProps = PropsRuntime<'shell.overlay'> & InjectFace<SpriteMascotInjected> & PropsLocale<'sprite'>;
/**
 * Render the floating mascot, its drag-to-move surface, and the click menu.
 * @param props - composed slot props (`useSprite`, `startSession`, `t`; the global hooks stay unused).
 * @returns the mascot element tree.
 */
export declare function SpriteMascot({ useSprite, useBackground, useSpriteKind, usePosition, startSession, setBackground, setSpriteKind, setPosition, t }: SpriteMascotProps): ReactElement;
//# sourceMappingURL=SpriteMascot.d.ts.map