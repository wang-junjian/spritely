/**
 * Background presets: the concrete color / gradient swatches the background
 * panel offers, plus the value shapes the store persists. These are data
 * (user-selectable wallpapers), not theme-tied UI colors.
 */
/** Solid-color swatches in registration order. */
export const BACKGROUND_COLORS = [
    { id: 'sky', name: '天空', value: '#EAF3FB' },
    { id: 'mint', name: '薄荷', value: '#EAF6EF' },
    { id: 'rose', name: '玫瑰', value: '#FBEDF2' },
    { id: 'cream', name: '奶油', value: '#FAF6EC' },
    { id: 'lavender', name: '薰衣草', value: '#F1EDFC' },
    { id: 'slate', name: '石板', value: '#1E293B' },
];
/** Gradient swatches in registration order. */
export const BACKGROUND_GRADIENTS = [
    { id: 'skyline', name: '天际', value: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' },
    { id: 'sunset', name: '黄昏', value: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)' },
    { id: 'ocean', name: '海洋', value: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)' },
    { id: 'berry', name: '莓果', value: 'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)' },
];
//# sourceMappingURL=backgrounds.js.map