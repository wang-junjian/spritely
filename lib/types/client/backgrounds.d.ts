/**
 * Background presets: the concrete color / gradient swatches the background
 * panel offers, plus the value shapes the store persists. These are data
 * (user-selectable wallpapers), not theme-tied UI colors.
 */
/** One selectable solid-color background. */
export interface BackgroundColorPreset {
    /** Stable key for React lists and matching. */
    id: string;
    /** Display name. */
    name: string;
    /** CSS color value, applied as `background`. */
    value: string;
}
/** One selectable gradient background. */
export interface BackgroundGradientPreset {
    /** Stable key for React lists and matching. */
    id: string;
    /** Display name. */
    name: string;
    /** CSS gradient value, applied as `background`. */
    value: string;
}
/** Solid-color swatches in registration order. */
export declare const BACKGROUND_COLORS: readonly BackgroundColorPreset[];
/** Gradient swatches in registration order. */
export declare const BACKGROUND_GRADIENTS: readonly BackgroundGradientPreset[];
//# sourceMappingURL=backgrounds.d.ts.map