/**
 * The application-background capability: a persisted, structured background
 * selection (solid color, gradient, or image with fit + fade) plus a pure DOM
 * applier. The source is a snapshot store backed by localStorage, exposed
 * through the sprite's inject `hooks` compartment; the presenter runs in apply
 * and projects the selection onto the document in one of two ways:
 *
 * - **color / gradient** override the `--dsw-alias-bg-base` CSS variable on
 *   `body`. Every app surface layer (body, AppRoot, the layout frame, the
 *   conversation root, the details panel, …) reads its background from that
 *   token, so one inline variable recolors them all at once.
 * - **image** paints only on `body` (`body.style.background`) and forces the
 *   variable to `transparent`. An image must be drawn exactly once at the base
 *   layer — drawing it through the shared token would re-render it on every
 *   surface layer at different sizes, stacking multiple offset copies.
 */
import { type ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
/** Default veil (fade) for a freshly applied image: readable text, clear image. */
export declare const DEFAULT_VEIL = 0.5;
/** Which visual kind the background selection is. */
export type BackgroundKind = 'color' | 'gradient' | 'image';
/** Image scaling mode: `contain` fits proportionally and centers; `fill` stretches to fill. */
export type ImageFit = 'contain' | 'fill';
/**
 * A structured background selection. `value` holds the color, gradient, or
 * image URL by kind; `fit` and `veil` apply only to images (kept present for a
 * uniform shape — they are ignored for color/gradient).
 */
export interface BackgroundState {
    /** The background kind. */
    kind: BackgroundKind;
    /** Color value / gradient value / image URL, matching `kind`. */
    value: string;
    /** Image scaling: `contain` (fit + center) or `fill` (stretch full-screen). */
    fit: ImageFit;
    /** Fade veil strength 0..1 (0 = crisp image, 1 = fully washed out to the theme base). */
    veil: number;
}
/** The read/write face the sprite's inject exposes for the background. */
export interface BackgroundSource extends ObservableSnapshot<BackgroundState | null> {
    /** Set the background selection (null restores the theme default). */
    set(background: BackgroundState | null): void;
}
/**
 * Create the persisted background source. Rehydrates from localStorage on
 * construction (the same contract as the snapshot-store engine) and migrates a
 * legacy raw-string entry to the structured shape on first read.
 * @returns the source.
 */
export declare function createBackgroundSource(): BackgroundSource;
/**
 * Project a background selection onto the document by overriding the
 * `--dsw-alias-bg-base` variable on `body`. Because every app surface layer
 * resolves its background from that token, one inline variable recolors them
 * all; null removes the override, restoring the theme default. The fade veil's
 * color follows the active theme, so the presenter re-renders when the dark
 * attribute flips. Pure DOM writes — no React, no per-layer traversal.
 */
export declare class BackgroundPresenter {
    /** The current selection (null = follow the theme). */
    private state;
    /** Re-renders the veil color when the dark palette flips. */
    private observer;
    /** Start watching the dark-palette attribute for veil-color changes. */
    constructor();
    /**
     * Apply a selection. Setting it writes the `--dsw-alias-bg-base` inline
     * variable (winning over the stylesheet definition); null clears it,
     * restoring the theme default. Browser-only: in non-DOM runs (node tests)
     * this is a no-op.
     * @param background - the background selection, or null for the theme default.
     */
    apply(background: BackgroundState | null): void;
    /** Retract the background the presenter owns (plugin unload). */
    dispose(): void;
    /**
     * Write the current selection onto the document. Color and gradient override
     * the shared `--dsw-alias-bg-base` variable (every surface layer follows);
     * an image paints only on `body` and turns the surface variables transparent
     * so the image is drawn exactly once across the full viewport, centered. The
     * sidebar fill is forced transparent for every kind so the sidebar column
     * follows the base background instead of keeping its own theme fill. Each
     * pass clears every write site first, so switching between kinds never
     * leaves a stale value behind.
     */
    private render;
}
//# sourceMappingURL=background-source.d.ts.map