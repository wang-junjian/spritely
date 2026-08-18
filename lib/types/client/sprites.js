import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import css from './SpriteMascot.module.css';
/** The roster, in selection-panel order. */
export const SPRITE_KINDS = [
    { id: 'blob', nameKey: 'sprite.blob' },
    { id: 'bot', nameKey: 'sprite.bot' },
    { id: 'cat', nameKey: 'sprite.cat' },
    { id: 'ghost', nameKey: 'sprite.ghost' },
];
/** Eye whites must read as white in every theme (the theme's brand invert is near-black). */
const WHITE = 'var(--dsw-static-neutral-bluish-50, #FFFFFF)';
/** Pupils and face lines: a fixed deep ink so they never wash out. */
const INK = 'var(--dsw-static-blue-950, #0B1530)';
/** Pupil shift from the gaze vector (zero → no transform). */
function shiftOf(gaze) {
    return gaze.x === 0 && gaze.y === 0 ? undefined : `translate(${gaze.x} ${gaze.y})`;
}
/** Render the selected sprite's full SVG content. */
export function renderSprite(kind, pose, gaze) {
    const shift = shiftOf(gaze);
    switch (kind) {
        case 'blob':
            return _jsx(Blob, { pose: pose, shift: shift });
        case 'bot':
            return _jsx(Bot, { pose: pose, shift: shift });
        case 'cat':
            return _jsx(Cat, { pose: pose, shift: shift });
        case 'ghost':
            return _jsx(Ghost, { pose: pose, shift: shift });
    }
}
/** Pupil center (cy) and radius per pose; null for the non-pupil faces. */
function pupilSpec(pose) {
    switch (pose) {
        case 'thinking':
            return { cy: 62, r: 3.5 };
        case 'writing':
            return { cy: 66, r: 3 };
        case 'working':
            return { cy: 67, r: 3.5 };
        case 'waiting':
            return { cy: 66, r: 2.5 };
        case 'idle':
            return { cy: 66, r: 3.5 };
        default:
            return null;
    }
}
/** Cross-eyes for the error pose (shared by every sprite). */
function CrossEyes() {
    return (_jsxs(_Fragment, { children: [_jsx("path", { d: "M40 61 L52 71 M52 61 L40 71", stroke: INK, strokeWidth: "3", strokeLinecap: "round" }), _jsx("path", { d: "M68 61 L80 71 M80 61 L68 71", stroke: INK, strokeWidth: "3", strokeLinecap: "round" })] }));
}
/** Smiling arcs for the done pose (shared by every sprite). */
function SmileEyes() {
    return (_jsxs(_Fragment, { children: [_jsx("path", { d: "M40 64 Q46 57 52 64", fill: "none", stroke: INK, strokeWidth: "3", strokeLinecap: "round" }), _jsx("path", { d: "M68 64 Q74 57 80 64", fill: "none", stroke: INK, strokeWidth: "3", strokeLinecap: "round" })] }));
}
/** The mouth, expression per pose (shared: it sits centered on every body). */
function Mouth({ pose }) {
    switch (pose) {
        case 'thinking':
            return _jsx("circle", { cx: "60", cy: "82", r: "3", fill: INK });
        case 'writing':
        case 'working':
            return _jsx("path", { d: "M55 82 L65 82", stroke: INK, strokeWidth: "2.5", strokeLinecap: "round" });
        case 'waiting':
            return _jsx("circle", { cx: "60", cy: "82", r: "4", fill: INK });
        case 'error':
            return _jsx("path", { d: "M54 85 Q60 79 66 85", fill: "none", stroke: INK, strokeWidth: "2.5", strokeLinecap: "round" });
        case 'done':
            return _jsx("path", { d: "52 80 Q60 90 68 80", fill: INK, stroke: INK, strokeWidth: "2.5", strokeLinecap: "round" });
        default:
            return _jsx("path", { d: "M54 81 Q60 86 66 81", fill: "none", stroke: INK, strokeWidth: "2.5", strokeLinecap: "round" });
    }
}
/** The per-pose accessory (animated by the module CSS). */
function Accessory({ pose }) {
    switch (pose) {
        case 'thinking':
            return (_jsxs("g", { className: css.dots, fill: "var(--dsw-alias-label-primary, #1F2937)", children: [_jsx("circle", { cx: "88", cy: "24", r: "4" }), _jsx("circle", { cx: "99", cy: "17", r: "3" }), _jsx("circle", { cx: "109", cy: "27", r: "2.5" })] }));
        case 'writing':
            return (_jsxs("g", { className: css.pencil, transform: "rotate(45 92 60)", children: [_jsx("rect", { x: "88", y: "54", width: "8", height: "20", rx: "2", fill: "var(--dsw-alias-label-primary, #1F2937)" }), _jsx("path", { d: "M88 74 L92 74 L92 82 L89.5 86 L88 82 Z", fill: "var(--dsw-static-amber-500, #F59E0B)" })] }));
        case 'working':
            return (_jsxs("g", { className: css.gear, fill: "var(--dsw-alias-state-business-primary, #0EA5E9)", children: [_jsx("circle", { cx: "90", cy: "44", r: "6" }), [0, 60, 120, 180, 240, 300].map(angle => (_jsx("rect", { x: "88.5", y: "32", width: "3", height: "8", rx: "1", transform: `rotate(${angle} 90 44)` }, angle)))] }));
        case 'waiting':
            return (_jsxs("g", { className: css.dots, fill: "var(--dsw-alias-label-primary, #1F2937)", children: [_jsx("circle", { cx: "90", cy: "30", r: "3" }), _jsx("circle", { cx: "100", cy: "30", r: "3" }), _jsx("circle", { cx: "110", cy: "30", r: "3" })] }));
        case 'error':
            return (_jsx("path", { className: css.sweat, d: "M88 52 q7 9 0 14 q-7 -5 0 -14 Z", fill: "var(--dsw-alias-state-error-primary, #EF4444)" }));
        case 'done':
            return (_jsxs("g", { fill: "var(--dsw-alias-state-success-primary, #22C55E)", children: [_jsx("path", { className: css.star, d: "M96 22 Q97.5 26 101 27.5 Q97.5 29 96 33 Q94.5 29 91 27.5 Q94.5 26 96 22 Z" }), _jsx("path", { className: css.star, d: "M30 24 Q31.5 28 35 29.5 Q31.5 31 30 35 Q28.5 31 25 29.5 Q28.5 28 30 24 Z" }), _jsx("path", { className: css.star, d: "M112 48 Q113 50.5 115 51.5 Q113 52.5 112 55 Q111 52.5 109 51.5 Q111 50.5 112 48 Z" })] }));
        default:
            return null;
    }
}
/* ── Blob: a vivid blue ball with an antenna star ────────────────────────── */
function Blob({ pose, shift }) {
    const pupil = pupilSpec(pose);
    return (_jsxs(_Fragment, { children: [_jsx("path", { d: "M60 32 Q64 20 56 12", fill: "none", stroke: "var(--dsw-alias-label-tertiary, #6B7280)", strokeWidth: "3", strokeLinecap: "round" }), _jsx("path", { className: css.star, d: "M56 6 Q58 11 63 13 Q58 15 56 20 Q54 15 49 13 Q54 11 56 6 Z", fill: "var(--dsw-alias-state-warn-primary, #F59E0B)" }), _jsx("circle", { cx: "60", cy: "70", r: "42", fill: "var(--dsw-static-blue-400, #60A5FA)", stroke: "var(--dsw-static-blue-500, #3B82F6)", strokeWidth: "1.5" }), _jsx("ellipse", { cx: "47", cy: "52", rx: "16", ry: "10", fill: WHITE, opacity: "0.35" }), _jsx("circle", { cx: "46", cy: "66", r: "8", fill: WHITE }), _jsx("circle", { cx: "74", cy: "66", r: "8", fill: WHITE }), pose === 'error' ? _jsx(CrossEyes, {}) : pose === 'done' ? _jsx(SmileEyes, {}) : pupil !== null && (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "46", cy: pupil.cy, r: pupil.r, fill: INK, transform: shift }), _jsx("circle", { cx: "74", cy: pupil.cy, r: pupil.r, fill: INK, transform: shift })] })), _jsx(Mouth, { pose: pose }), _jsx("ellipse", { cx: "36", cy: "78", rx: "5", ry: "3", fill: "var(--dsw-static-amber-300, #FCD34D)", opacity: "0.6" }), _jsx("ellipse", { cx: "84", cy: "78", rx: "5", ry: "3", fill: "var(--dsw-static-amber-300, #FCD34D)", opacity: "0.6" }), _jsx(Accessory, { pose: pose })] }));
}
/* ── Bot: a rounded robot head with LED eyes ─────────────────────────────── */
function Bot({ pose, shift }) {
    const pupil = pupilSpec(pose);
    return (_jsxs(_Fragment, { children: [_jsx("path", { d: "M60 28 V14", stroke: "#059669", strokeWidth: "3", strokeLinecap: "round" }), _jsx("circle", { cx: "60", cy: "10", r: "5", fill: "#6EE7B7" }), _jsx("rect", { x: "18", y: "28", width: "84", height: "84", rx: "14", fill: "#34D399", stroke: "#059669", strokeWidth: "1.5" }), _jsx("rect", { x: "42", y: "40", width: "36", height: "5", rx: "2.5", fill: "#059669", opacity: "0.5" }), pose === 'error' ? (_jsx(CrossEyes, {})) : pose === 'done' ? (_jsx(SmileEyes, {})) : (_jsxs(_Fragment, { children: [_jsx("rect", { x: "36", y: "58", width: "22", height: "15", rx: "4", fill: "#6EE7B7" }), _jsx("rect", { x: "62", y: "58", width: "22", height: "15", rx: "4", fill: "#6EE7B7" }), pupil !== null && (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "47", cy: pupil.cy, r: "4", fill: "#062033", transform: shift }), _jsx("circle", { cx: "73", cy: pupil.cy, r: "4", fill: "#062033", transform: shift })] }))] })), _jsx("path", { d: "M55 88 L65 88", stroke: "#062033", strokeWidth: "3", strokeLinecap: "round" }), _jsx("path", { d: "M60 74 V80", stroke: "#059669", strokeWidth: "1.5" }), _jsx(Accessory, { pose: pose })] }));
}
/* ── Cat: an amber kitty with ears and whiskers ──────────────────────────── */
function Cat({ pose, shift }) {
    const pupil = pupilSpec(pose);
    return (_jsxs(_Fragment, { children: [_jsx("path", { d: "M34 48 L40 20 L52 38 Z", fill: "var(--dsw-static-amber-400, #FBBF24)", stroke: "var(--dsw-static-amber-600, #D97706)", strokeWidth: "1.5" }), _jsx("path", { d: "M68 38 L80 20 L86 48 Z", fill: "var(--dsw-static-amber-400, #FBBF24)", stroke: "var(--dsw-static-amber-600, #D97706)", strokeWidth: "1.5" }), _jsx("circle", { cx: "60", cy: "72", r: "42", fill: "var(--dsw-static-amber-400, #FBBF24)", stroke: "var(--dsw-static-amber-600, #D97706)", strokeWidth: "1.5" }), _jsx("path", { d: "M60 34 L55 44 M60 34 L65 44", stroke: "var(--dsw-static-amber-600, #D97706)", strokeWidth: "2", strokeLinecap: "round" }), pose === 'error' ? (_jsx(CrossEyes, {})) : pose === 'done' ? (_jsx(SmileEyes, {})) : (_jsxs(_Fragment, { children: [_jsx("ellipse", { cx: "46", cy: "66", rx: "7", ry: "10", fill: WHITE }), _jsx("ellipse", { cx: "74", cy: "66", rx: "7", ry: "10", fill: WHITE }), pupil !== null && (_jsxs(_Fragment, { children: [_jsx("ellipse", { cx: "46", cy: pupil.cy, rx: "3.5", ry: "6.5", fill: INK, transform: shift }), _jsx("ellipse", { cx: "74", cy: pupil.cy, rx: "3.5", ry: "6.5", fill: INK, transform: shift })] }))] })), _jsx("path", { d: "M54 82 Q60 78 60 82 Q60 78 66 82", fill: "none", stroke: INK, strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M36 74 H44 M76 74 H84", stroke: INK, strokeWidth: "1.5", strokeLinecap: "round" }), _jsx("ellipse", { cx: "38", cy: "80", rx: "4", ry: "2.5", fill: "var(--dsw-static-amber-100, #FEF3C7)", opacity: "0.7" }), _jsx("ellipse", { cx: "82", cy: "80", rx: "4", ry: "2.5", fill: "var(--dsw-static-amber-100, #FEF3C7)", opacity: "0.7" }), _jsx(Accessory, { pose: pose })] }));
}
/* ── Ghost: a violet specter with a wavy hem ─────────────────────────────── */
function Ghost({ pose, shift }) {
    const pupil = pupilSpec(pose);
    return (_jsxs(_Fragment, { children: [_jsx("path", { d: "M22 64 Q22 22 60 22 Q98 22 98 64 Q98 100 88 100 Q82 100 80 92 Q76 102 72 92 Q68 102 64 92 Q60 102 56 92 Q52 102 48 92 Q44 102 40 92 Q36 102 32 92 Q26 102 22 100 Q22 100 22 64 Z", fill: "var(--dsw-static-purple-400, #A78BFA)", stroke: "var(--dsw-static-purple-600, #7C3AED)", strokeWidth: "1.5" }), _jsx("ellipse", { cx: "42", cy: "52", rx: "10", ry: "6", fill: WHITE, opacity: "0.3" }), pose === 'error' ? (_jsx(CrossEyes, {})) : pose === 'done' ? (_jsx(SmileEyes, {})) : (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "46", cy: "66", r: "9", fill: WHITE }), _jsx("circle", { cx: "74", cy: "66", r: "9", fill: WHITE }), pupil !== null && (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "46", cy: pupil.cy, r: pupil.r + 0.5, fill: INK, transform: shift }), _jsx("circle", { cx: "74", cy: pupil.cy, r: pupil.r + 0.5, fill: INK, transform: shift })] }))] })), _jsx(Mouth, { pose: pose }), _jsx(Accessory, { pose: pose })] }));
}
//# sourceMappingURL=sprites.js.map