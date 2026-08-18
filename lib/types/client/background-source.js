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
import { createSnapshotStore, } from '@deepseek-ai/dsh-client-runtime/client';
/** Persistence key for the chosen background (localStorage). */
const BACKGROUND_PERSIST_KEY = 'dsh.sprite.background';
/**
 * The CSS variable every app surface layer resolves its background from.
 * Overriding it on `body` (inline) wins over the stylesheet definition without
 * touching any token the ThemePresenter owns (it only ever retracts the
 * alias-token overrides it wrote itself, and the built-in themes carry none).
 */
const BACKGROUND_VARIABLE = '--dsw-alias-bg-base';
/**
 * The sidebar column and title-row fill. It is a separate token from
 * `--dsw-alias-bg-base`, so an image painted on `body` would otherwise be
 * clipped on the left by the opaque sidebar. Forcing it transparent lets the
 * image span the full viewport (centered), while color/gradient backgrounds
 * leave it untouched so the sidebar keeps its theme fill.
 */
const SIDEBAR_FILL_VARIABLE = '--dsw-specific-sidebar-fill';
/**
 * The body attribute ThemePresenter toggles for the dark palette (its exported
 * `DARK_ATTRIBUTE`). The sprite reads it — rather than importing ui-layout's
 * runtime value — so the fade veil can follow the active theme without adding a
 * value dependency. Keep this string in sync with ui-layout's theme presenter.
 */
const DARK_ATTRIBUTE = 'data-ds-dark-theme';
/** Default veil (fade) for a freshly applied image: readable text, clear image. */
export const DEFAULT_VEIL = 0.5;
/**
 * Normalize a persisted value into the structured shape. Accepts the current
 * object format and migrates the legacy raw-string format (a bare CSS
 * `background` value); anything else collapses to null (theme default).
 * @param raw - persisted value (unknown at runtime — storage is untrusted).
 * @returns the normalized selection, or null.
 */
function normalizeBackground(raw) {
    if (raw === null || raw === undefined)
        return null;
    // Legacy format: the pre-structured raw CSS background string.
    if (typeof raw === 'string') {
        if (raw.startsWith('url("') && raw.endsWith('")')) {
            return { kind: 'image', value: raw.slice(5, -2), fit: 'contain', veil: DEFAULT_VEIL };
        }
        if (raw.includes('gradient'))
            return { kind: 'gradient', value: raw, fit: 'contain', veil: DEFAULT_VEIL };
        return { kind: 'color', value: raw, fit: 'contain', veil: DEFAULT_VEIL };
    }
    if (typeof raw === 'object') {
        const candidate = raw;
        const { kind, value } = candidate;
        if ((kind === 'color' || kind === 'gradient' || kind === 'image') && typeof value === 'string') {
            return {
                kind,
                value,
                fit: candidate.fit === 'fill' ? 'fill' : 'contain',
                veil: typeof candidate.veil === 'number' && candidate.veil >= 0 && candidate.veil <= 1
                    ? candidate.veil : DEFAULT_VEIL,
            };
        }
    }
    return null;
}
/**
 * Create the persisted background source. Rehydrates from localStorage on
 * construction (the same contract as the snapshot-store engine) and migrates a
 * legacy raw-string entry to the structured shape on first read.
 * @returns the source.
 */
export function createBackgroundSource() {
    const store = createSnapshotStore(null, { persist: { name: BACKGROUND_PERSIST_KEY } });
    const raw = store.getSnapshot();
    const normalized = normalizeBackground(raw);
    if (normalized !== raw)
        store.set(normalized);
    return {
        getSnapshot: () => store.getSnapshot(),
        subscribe: fn => store.subscribe(fn),
        set: background => { store.set(background); },
    };
}
/** Whether the dark palette is active on `body` (the ThemePresenter contract). */
function isDarkTheme() {
    return typeof document !== 'undefined' && document.body.hasAttribute(DARK_ATTRIBUTE);
}
/**
 * Assemble the CSS `background` value for an image selection: `no-repeat`
 * (never tiled) with the chosen scaling, and a fade veil layered on top — a
 * theme-matched translucent gradient that washes the image out toward the base
 * background so foreground text stays legible.
 * @param state - an image selection.
 * @returns the full `background` value.
 */
function toImageCss(state) {
    const size = state.fit === 'fill' ? '100% 100%' : 'contain';
    const image = `url("${state.value}") no-repeat center / ${size}`;
    if (state.veil <= 0)
        return image;
    const rgb = isDarkTheme() ? '0 0 0' : '255 255 255';
    return `linear-gradient(rgb(${rgb} / ${state.veil}), rgb(${rgb} / ${state.veil})), ${image}`;
}
/**
 * Project a background selection onto the document by overriding the
 * `--dsw-alias-bg-base` variable on `body`. Because every app surface layer
 * resolves its background from that token, one inline variable recolors them
 * all; null removes the override, restoring the theme default. The fade veil's
 * color follows the active theme, so the presenter re-renders when the dark
 * attribute flips. Pure DOM writes — no React, no per-layer traversal.
 */
export class BackgroundPresenter {
    /** The current selection (null = follow the theme). */
    state = null;
    /** Re-renders the veil color when the dark palette flips. */
    observer = null;
    /** Start watching the dark-palette attribute for veil-color changes. */
    constructor() {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined')
            return;
        this.observer = new MutationObserver(() => { this.render(); });
        /* v8 ignore next 2 -- body exists by apply time; the guard is defensive. */
        if (document.body) {
            this.observer.observe(document.body, { attributes: true, attributeFilter: [DARK_ATTRIBUTE] });
        }
    }
    /**
     * Apply a selection. Setting it writes the `--dsw-alias-bg-base` inline
     * variable (winning over the stylesheet definition); null clears it,
     * restoring the theme default. Browser-only: in non-DOM runs (node tests)
     * this is a no-op.
     * @param background - the background selection, or null for the theme default.
     */
    apply(background) {
        this.state = background;
        this.render();
    }
    /** Retract the background the presenter owns (plugin unload). */
    dispose() {
        this.observer?.disconnect();
        this.observer = null;
        if (typeof document === 'undefined')
            return;
        document.body.style.removeProperty(BACKGROUND_VARIABLE);
        document.body.style.removeProperty(SIDEBAR_FILL_VARIABLE);
        document.body.style.background = '';
    }
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
    render() {
        if (typeof document === 'undefined')
            return;
        document.body.style.removeProperty(BACKGROUND_VARIABLE);
        document.body.style.removeProperty(SIDEBAR_FILL_VARIABLE);
        document.body.style.background = '';
        if (this.state === null)
            return;
        if (this.state.kind === 'image') {
            document.body.style.background = toImageCss(this.state);
            document.body.style.setProperty(BACKGROUND_VARIABLE, 'transparent');
        }
        else {
            document.body.style.setProperty(BACKGROUND_VARIABLE, this.state.value);
        }
        document.body.style.setProperty(SIDEBAR_FILL_VARIABLE, 'transparent');
    }
}
//# sourceMappingURL=background-source.js.map