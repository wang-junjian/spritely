import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SpriteMascot: the floating mascot rendered into the layout's `shell.overlay`
 * layer. Pure presentation — the work state arrives through the injected
 * `useSprite` selector hook; local state holds only the transient celebration
 * (a busy run settling into idle), the drag position, and the open menu. A
 * pointer gesture under the drag threshold counts as a click and toggles the
 * menu; beyond it, the sprite follows the pointer and can be reset to its
 * default corner.
 */
import { memo, useEffect, useLayoutEffect, useRef, useState, } from 'react';
import { BACKGROUND_COLORS, BACKGROUND_GRADIENTS } from './backgrounds.js';
import { DEFAULT_VEIL } from './background-source.js';
import { SPRITE_KINDS, renderSprite } from './sprites.js';
import css from './SpriteMascot.module.css';
/** Activities that celebrate once they settle into idle. */
const BUSY = new Set(['thinking', 'writing', 'working']);
/** Celebration hold time before the mascot returns to its idle pose. */
const CELEBRATE_MS = 1400;
/** Distance a pointer must travel before a gesture counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 4;
/** The gap between the mascot and its menu, reserved when measuring open space. */
const MENU_GAP_PX = 8;
/** Max pupil travel (in SVG units) when the eyes track the cursor. */
const GAZE_MAX = 3;
/** Max local image size accepted (bytes): keeps the data-URL under localStorage's quota. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
/**
 * Memoised sprite SVG: only re-renders when the mascot kind, pose, or gaze
 * changes. This keeps the surrounding HUD (menu, panels) from re-evaluating
 * on every cursor-tracking frame.
 */
const SpriteSvg = memo(function SpriteSvg({ kind, pose, gaze }) {
    return (_jsx("svg", { viewBox: "0 0 120 120", "aria-hidden": "true", focusable: "false", children: renderSprite(kind, pose, gaze) }));
});
/**
 * Render the floating mascot, its drag-to-move surface, and the click menu.
 * @param props - composed slot props (`useSprite`, `startSession`, `t`; the global hooks stay unused).
 * @returns the mascot element tree.
 */
export function SpriteMascot({ useSprite, useBackground, useSpriteKind, usePosition, startSession, setBackground, setSpriteKind, setPosition, t }) {
    const state = useSprite(sel => sel);
    const activity = state.activity;
    const background = useBackground(sel => sel);
    const spriteKind = useSpriteKind(sel => sel);
    const [celebrating, setCelebrating] = useState(false);
    const [panel, setPanel] = useState('closed');
    const [imageUrl, setImageUrl] = useState('');
    const [menuPlacement, setMenuPlacement] = useState({ vertical: 'bottom', horizontal: 'end' });
    const position = usePosition(sel => sel);
    const [gaze, setGaze] = useState({ x: 0, y: 0 });
    const previous = useRef(activity);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);
    const drag = useRef(null);
    // A drag's trailing click must not toggle the menu; this flag suppresses it once.
    const suppressClick = useRef(false);
    // Celebrate once when a busy run settles into idle.
    useEffect(() => {
        const before = previous.current;
        previous.current = activity;
        if (BUSY.has(before) && activity === 'idle') {
            setCelebrating(true);
            const timer = window.setTimeout(() => { setCelebrating(false); }, CELEBRATE_MS);
            return () => { window.clearTimeout(timer); };
        }
    }, [activity]);
    // Close any open panel with Escape for keyboard accessibility.
    useEffect(() => {
        if (panel === 'closed')
            return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setPanel('closed');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => { window.removeEventListener('keydown', onKeyDown); };
    }, [panel]);
    // Track the cursor and nudge the pupils toward it, rAF-throttled to one
    // update per frame. The cursor is projected into the SVG viewBox (120×120)
    // so the gaze vector is already in SVG units.
    useEffect(() => {
        let frame = 0;
        let latest = { x: 0, y: 0 };
        const onMove = (event) => {
            const anchor = anchorRef.current;
            if (anchor === null)
                return;
            const rect = anchor.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0)
                return;
            const sx = ((event.clientX - rect.left) / rect.width) * 120;
            const sy = ((event.clientY - rect.top) / rect.height) * 120;
            const dx = sx - 60;
            const dy = sy - 66;
            const len = Math.hypot(dx, dy);
            latest = len < 1 ? { x: 0, y: 0 } : { x: (dx / len) * GAZE_MAX, y: (dy / len) * GAZE_MAX };
            if (frame === 0) {
                frame = window.requestAnimationFrame(() => {
                    frame = 0;
                    setGaze(latest);
                });
            }
        };
        const onLeave = () => {
            latest = { x: 0, y: 0 };
            setGaze(latest);
        };
        window.addEventListener('mousemove', onMove);
        document.documentElement.addEventListener('mouseleave', onLeave);
        return () => {
            window.removeEventListener('mousemove', onMove);
            document.documentElement.removeEventListener('mouseleave', onLeave);
            if (frame !== 0)
                window.cancelAnimationFrame(frame);
        };
    }, []);
    // Re-seed the image URL field from the active image when the background panel
    // opens, so an applied URL survives closing and reopening the panel. The
    // previous-panel guard keeps later `background` changes (e.g. the fade slider)
    // from stomping a URL the user is mid-edit.
    const previousPanel = useRef(panel);
    useEffect(() => {
        const was = previousPanel.current;
        previousPanel.current = panel;
        if (panel === 'background' && was !== 'background' && background?.kind === 'image') {
            setImageUrl(background.value);
        }
    }, [panel, background]);
    // Choose the open panel's side per axis from the space around the mascot:
    // flip it above when the space below is too tight, and left-align it when a
    // right-aligned panel would overflow the left edge. The layout effect
    // measures the real panel box before paint, so the flip never flashes.
    useLayoutEffect(() => {
        if (panel === 'closed')
            return;
        const anchor = anchorRef.current;
        const popover = popoverRef.current;
        /* v8 ignore next 2 -- the panel only opens when both are mounted. */
        if (anchor === null || popover === null)
            return;
        const anchorRect = anchor.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const neededHeight = popoverRect.height + MENU_GAP_PX;
        const vertical = window.innerHeight - anchorRect.bottom < neededHeight
            && anchorRect.top >= neededHeight ? 'top' : 'bottom';
        const horizontal = anchorRect.right - popoverRect.width < 0
            && anchorRect.left + popoverRect.width <= window.innerWidth ? 'start' : 'end';
        setMenuPlacement({ vertical, horizontal });
    }, [panel]);
    const pose = celebrating ? 'done' : activity;
    const caption = activity === 'working' && state.toolName !== undefined
        ? `${t('state.working')} · ${state.toolName}`
        : t(`state.${activity}`);
    const onPointerDown = (event) => {
        if (event.button !== 0)
            return;
        const rect = anchorRef.current?.getBoundingClientRect();
        /* v8 ignore next -- the anchor always renders before the sprite is grabbable. */
        if (rect === undefined)
            return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
            startX: event.clientX,
            startY: event.clientY,
            originLeft: rect.left,
            originTop: rect.top,
        };
    };
    const onPointerMove = (event) => {
        const gesture = drag.current;
        if (gesture === null)
            return;
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        if (!suppressClick.current
            && Math.abs(dx) < DRAG_THRESHOLD_PX
            && Math.abs(dy) < DRAG_THRESHOLD_PX)
            return;
        suppressClick.current = true;
        setPosition({ x: gesture.originLeft + dx, y: gesture.originTop + dy });
    };
    const onPointerUp = () => {
        drag.current = null;
    };
    const onActivate = () => {
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        setPanel(open => open === 'closed' ? 'menu' : 'closed');
    };
    const close = () => { setPanel('closed'); };
    const applyImage = () => {
        const url = imageUrl.trim();
        if (url === '')
            return;
        setBackground({ kind: 'image', value: url, fit: 'contain', veil: DEFAULT_VEIL });
    };
    /** Read a local image file to a data URL and apply it as the background. */
    const onUploadImage = (event) => {
        const file = event.target.files?.[0];
        // Reset the input so re-selecting the same file re-fires change.
        event.target.value = '';
        if (file === undefined)
            return;
        if (file.size > MAX_UPLOAD_BYTES)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setBackground({ kind: 'image', value: reader.result, fit: 'contain', veil: DEFAULT_VEIL });
            }
        };
        reader.readAsDataURL(file);
    };
    const isColorSelected = (value) => background?.kind === 'color' && background.value === value;
    const isGradientSelected = (value) => background?.kind === 'gradient' && background.value === value;
    /** The active image selection (non-null only when the current background is an image). */
    const activeImage = background?.kind === 'image' ? background : null;
    /** Re-scale the active image (contain = fit + center, fill = stretch full-screen). */
    const setFit = (fit) => {
        if (activeImage !== null)
            setBackground({ ...activeImage, fit });
    };
    /** Fade the active image toward the theme base so foreground text stays legible. */
    const setVeil = (veil) => {
        if (activeImage !== null)
            setBackground({ ...activeImage, veil });
    };
    const style = position === null
        ? undefined
        : { left: position.x, top: position.y, right: 'auto', bottom: 'auto' };
    return (_jsxs("div", { ref: anchorRef, className: css.anchor, "data-vertical": menuPlacement.vertical, "data-horizontal": menuPlacement.horizontal, style: style, children: [_jsxs("button", { type: "button", className: css.sprite, "data-activity": activity, "data-pose": pose, "aria-label": caption, "aria-haspopup": "menu", "aria-expanded": panel !== 'closed', onClick: onActivate, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, children: [(activity === 'waiting' || activity === 'error') && (_jsx("span", { className: css.attentionDot, "data-kind": activity, "aria-hidden": "true" })), _jsx("span", { className: css.spriteBody, children: _jsx(SpriteSvg, { kind: spriteKind, pose: pose, gaze: gaze }) })] }), panel === 'menu' && (_jsxs("div", { ref: popoverRef, className: css.menu, role: "menu", "aria-label": t('menu.label'), children: [_jsxs("div", { className: css.menuStatus, "aria-live": "polite", children: [_jsx("span", { className: css.menuStatusDot, "data-activity": activity, "aria-hidden": "true" }), _jsx("span", { className: css.menuStatusText, children: caption })] }), _jsxs("button", { type: "button", role: "menuitem", className: css.menuItem, onClick: () => { startSession(); close(); }, children: [_jsx("span", { className: css.menuIcon, "aria-hidden": "true", children: _jsx("svg", { viewBox: "0 0 14 14", width: "15", height: "15", children: _jsx("path", { d: "M7 2.5v9M2.5 7h9", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }) }) }), t('menu.newSession')] }), _jsxs("button", { type: "button", role: "menuitem", className: css.menuItem, onClick: () => { setPosition(null); close(); }, children: [_jsx("span", { className: css.menuIcon, "aria-hidden": "true", children: _jsxs("svg", { viewBox: "0 0 14 14", width: "15", height: "15", children: [_jsx("path", { d: "M11.5 6.5a4.5 4.5 0 1 1-1.5-3.4", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), _jsx("path", { d: "M11.5 1.5v3.2h-3.2", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }) }), t('menu.reset')] }), _jsxs("button", { type: "button", role: "menuitem", className: css.menuItem, onClick: () => { setPanel('background'); }, children: [_jsx("span", { className: css.menuIcon, "aria-hidden": "true", children: _jsx("svg", { viewBox: "0 0 14 14", width: "15", height: "15", children: _jsx("path", { d: "M7 2l5 5-5 5-5-5z", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" }) }) }), t('menu.background')] }), _jsxs("button", { type: "button", role: "menuitem", className: css.menuItem, onClick: () => { setPanel('sprite'); }, children: [_jsx("span", { className: css.menuIcon, "aria-hidden": "true", children: _jsxs("svg", { viewBox: "0 0 14 14", width: "15", height: "15", children: [_jsx("circle", { cx: "7", cy: "5", r: "3", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }), _jsx("path", { d: "M3 12c0-2.2 1.8-4 4-4s4 1.8 4 4", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })] }) }), t('menu.sprite')] })] })), panel === 'background' && (_jsxs("div", { ref: popoverRef, className: css.backgroundPanel, role: "dialog", "aria-modal": "true", "aria-label": t('background.title'), children: [_jsxs("div", { className: css.panelHeader, children: [_jsx("span", { className: css.panelTitle, children: t('background.title') }), _jsx("button", { type: "button", className: css.panelBack, onClick: () => { setPanel('menu'); }, children: t('background.back') })] }), _jsx("div", { className: css.sectionLabel, children: t('background.color') }), _jsx("div", { className: css.swatches, children: BACKGROUND_COLORS.map(item => (_jsx("button", { type: "button", className: css.swatch, "data-selected": isColorSelected(item.value) || undefined, "aria-label": item.name, style: { background: item.value }, onClick: () => { setBackground({ kind: 'color', value: item.value, fit: 'contain', veil: DEFAULT_VEIL }); } }, item.id))) }), _jsx("div", { className: css.sectionLabel, children: t('background.gradient') }), _jsx("div", { className: css.swatches, children: BACKGROUND_GRADIENTS.map(item => (_jsx("button", { type: "button", className: css.swatch, "data-selected": isGradientSelected(item.value) || undefined, "aria-label": item.name, style: { background: item.value }, onClick: () => { setBackground({ kind: 'gradient', value: item.value, fit: 'contain', veil: DEFAULT_VEIL }); } }, item.id))) }), _jsx("div", { className: css.sectionLabel, children: t('background.image') }), _jsxs("div", { className: css.imageRow, children: [_jsx("input", { type: "text", className: css.imageInput, placeholder: t('background.image.placeholder'), value: imageUrl, onChange: event => { setImageUrl(event.target.value); } }), _jsx("button", { type: "button", className: css.imageApply, onClick: applyImage, children: t('background.image.apply') })] }), _jsxs("label", { className: css.uploadButton, children: [t('background.image.upload'), _jsx("input", { type: "file", accept: "image/*", hidden: true, onChange: onUploadImage })] }), activeImage !== null && (_jsxs(_Fragment, { children: [_jsx("div", { className: css.sectionLabel, children: t('background.fit') }), _jsxs("div", { className: css.fitRow, children: [_jsx("button", { type: "button", className: css.fitButton, "data-selected": activeImage.fit === 'contain' || undefined, onClick: () => { setFit('contain'); }, children: t('background.fit.contain') }), _jsx("button", { type: "button", className: css.fitButton, "data-selected": activeImage.fit === 'fill' || undefined, onClick: () => { setFit('fill'); }, children: t('background.fit.fill') })] }), _jsx("div", { className: css.sectionLabel, children: t('background.veil') }), _jsx("input", { type: "range", className: css.veilSlider, min: 0, max: 100, value: Math.round(activeImage.veil * 100), onChange: event => { setVeil(Number(event.target.value) / 100); } })] })), _jsx("button", { type: "button", className: css.reset, onClick: () => { setBackground(null); }, children: t('background.reset') })] })), panel === 'sprite' && (_jsxs("div", { ref: popoverRef, className: css.spritePanel, role: "dialog", "aria-modal": "true", "aria-label": t('sprite.title'), children: [_jsxs("div", { className: css.panelHeader, children: [_jsx("span", { className: css.panelTitle, children: t('sprite.title') }), _jsx("button", { type: "button", className: css.panelBack, onClick: () => { setPanel('menu'); }, children: t('background.back') })] }), _jsx("div", { className: css.spriteGrid, children: SPRITE_KINDS.map(kind => (_jsxs("button", { type: "button", className: css.spriteOption, "data-selected": spriteKind === kind.id || undefined, onClick: () => { setSpriteKind(kind.id); }, children: [_jsx("svg", { viewBox: "0 0 120 120", "aria-hidden": "true", children: renderSprite(kind.id, 'idle', { x: 0, y: 0 }) }), _jsx("span", { className: css.spriteName, children: t(kind.nameKey) })] }, kind.id))) })] }))] }));
}
//# sourceMappingURL=SpriteMascot.js.map