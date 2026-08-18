window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-sprite",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/client/sprite-state.js
		/** The idle baseline every session-less view falls back to. */
		const IDLE = Object.freeze({
			activity: "idle",
			toolName: void 0
		});
		/**
		* Project the current session's live facts into one {@link SpriteState}.
		* Pure: reads only the two supplied snapshots and returns a fresh value.
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
		function deriveSpriteState(list, snapshot) {
			if ((list.current === void 0 ? void 0 : list.byId[list.current])?.pendingInteraction !== void 0) return {
				activity: "waiting",
				toolName: void 0
			};
			if (snapshot === void 0) return {
				activity: "idle",
				toolName: void 0
			};
			if (snapshot.lastAgentError !== null) return {
				activity: "error",
				toolName: void 0
			};
			if (!snapshot.running) return {
				activity: "idle",
				toolName: void 0
			};
			const calls = snapshot.runningCalls;
			if (calls.length > 0) return {
				activity: "working",
				toolName: calls[calls.length - 1]?.name
			};
			const blocks = snapshot.partial?.blocks ?? [];
			if (blocks.some((block) => block.kind === "tool-call")) return {
				activity: "working",
				toolName: void 0
			};
			if (blocks.some((block) => block.kind === "text")) return {
				activity: "writing",
				toolName: void 0
			};
			return {
				activity: "thinking",
				toolName: void 0
			};
		}
		/** Reference equality for the projected state (flat, JSON-safe fields only). */
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
		function createSpriteStateSource(sessions) {
			const listeners = /* @__PURE__ */ new Set();
			let current = IDLE;
			let unsubscribeSession;
			const refresh = () => {
				const list = sessions.list.getSnapshot();
				const id = list.current;
				const snapshot = (id === void 0 ? void 0 : sessions.binding(id))?.session.getSnapshot();
				const next = deriveSpriteState(list, snapshot);
				if (!sameState(current, next)) {
					current = next;
					for (const fn of [...listeners]) fn();
				}
			};
			const follow = () => {
				unsubscribeSession?.();
				unsubscribeSession = void 0;
				const id = sessions.list.getSnapshot().current;
				const binding = id === void 0 ? void 0 : sessions.binding(id);
				if (binding !== void 0) unsubscribeSession = binding.session.subscribe(refresh);
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
				}
			};
		}
		//#endregion
		//#region lib/types/client/background-source.js
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
		/** Persistence key for the chosen background (localStorage). */
		const BACKGROUND_PERSIST_KEY = "dsh.sprite.background";
		/**
		* The CSS variable every app surface layer resolves its background from.
		* Overriding it on `body` (inline) wins over the stylesheet definition without
		* touching any token the ThemePresenter owns (it only ever retracts the
		* alias-token overrides it wrote itself, and the built-in themes carry none).
		*/
		const BACKGROUND_VARIABLE = "--dsw-alias-bg-base";
		/**
		* The sidebar column and title-row fill. It is a separate token from
		* `--dsw-alias-bg-base`, so an image painted on `body` would otherwise be
		* clipped on the left by the opaque sidebar. Forcing it transparent lets the
		* image span the full viewport (centered), while color/gradient backgrounds
		* leave it untouched so the sidebar keeps its theme fill.
		*/
		const SIDEBAR_FILL_VARIABLE = "--dsw-specific-sidebar-fill";
		/**
		* The body attribute ThemePresenter toggles for the dark palette (its exported
		* `DARK_ATTRIBUTE`). The sprite reads it — rather than importing ui-layout's
		* runtime value — so the fade veil can follow the active theme without adding a
		* value dependency. Keep this string in sync with ui-layout's theme presenter.
		*/
		const DARK_ATTRIBUTE = "data-ds-dark-theme";
		/** Default veil (fade) for a freshly applied image: readable text, clear image. */
		const DEFAULT_VEIL = .5;
		/**
		* Normalize a persisted value into the structured shape. Accepts the current
		* object format and migrates the legacy raw-string format (a bare CSS
		* `background` value); anything else collapses to null (theme default).
		* @param raw - persisted value (unknown at runtime — storage is untrusted).
		* @returns the normalized selection, or null.
		*/
		function normalizeBackground(raw) {
			if (raw === null || raw === void 0) return null;
			if (typeof raw === "string") {
				if (raw.startsWith("url(\"") && raw.endsWith("\")")) return {
					kind: "image",
					value: raw.slice(5, -2),
					fit: "contain",
					veil: DEFAULT_VEIL
				};
				if (raw.includes("gradient")) return {
					kind: "gradient",
					value: raw,
					fit: "contain",
					veil: DEFAULT_VEIL
				};
				return {
					kind: "color",
					value: raw,
					fit: "contain",
					veil: DEFAULT_VEIL
				};
			}
			if (typeof raw === "object") {
				const candidate = raw;
				const { kind, value } = candidate;
				if ((kind === "color" || kind === "gradient" || kind === "image") && typeof value === "string") return {
					kind,
					value,
					fit: candidate.fit === "fill" ? "fill" : "contain",
					veil: typeof candidate.veil === "number" && candidate.veil >= 0 && candidate.veil <= 1 ? candidate.veil : DEFAULT_VEIL
				};
			}
			return null;
		}
		/**
		* Create the persisted background source. Rehydrates from localStorage on
		* construction (the same contract as the snapshot-store engine) and migrates a
		* legacy raw-string entry to the structured shape on first read.
		* @returns the source.
		*/
		function createBackgroundSource() {
			const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(null, { persist: { name: BACKGROUND_PERSIST_KEY } });
			const raw = store.getSnapshot();
			const normalized = normalizeBackground(raw);
			if (normalized !== raw) store.set(normalized);
			return {
				getSnapshot: () => store.getSnapshot(),
				subscribe: (fn) => store.subscribe(fn),
				set: (background) => {
					store.set(background);
				}
			};
		}
		/** Whether the dark palette is active on `body` (the ThemePresenter contract). */
		function isDarkTheme() {
			return typeof document !== "undefined" && document.body.hasAttribute(DARK_ATTRIBUTE);
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
			const size = state.fit === "fill" ? "100% 100%" : "contain";
			const image = `url("${state.value}") no-repeat center / ${size}`;
			if (state.veil <= 0) return image;
			const rgb = isDarkTheme() ? "0 0 0" : "255 255 255";
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
		var BackgroundPresenter = class {
			/** The current selection (null = follow the theme). */
			state = null;
			/** Re-renders the veil color when the dark palette flips. */
			observer = null;
			/** Start watching the dark-palette attribute for veil-color changes. */
			constructor() {
				if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
				this.observer = new MutationObserver(() => {
					this.render();
				});
				/* v8 ignore next 2 -- body exists by apply time; the guard is defensive. */
				if (document.body) this.observer.observe(document.body, {
					attributes: true,
					attributeFilter: [DARK_ATTRIBUTE]
				});
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
				if (typeof document === "undefined") return;
				document.body.style.removeProperty(BACKGROUND_VARIABLE);
				document.body.style.removeProperty(SIDEBAR_FILL_VARIABLE);
				document.body.style.background = "";
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
				if (typeof document === "undefined") return;
				document.body.style.removeProperty(BACKGROUND_VARIABLE);
				document.body.style.removeProperty(SIDEBAR_FILL_VARIABLE);
				document.body.style.background = "";
				if (this.state === null) return;
				if (this.state.kind === "image") {
					document.body.style.background = toImageCss(this.state);
					document.body.style.setProperty(BACKGROUND_VARIABLE, "transparent");
				} else document.body.style.setProperty(BACKGROUND_VARIABLE, this.state.value);
				document.body.style.setProperty(SIDEBAR_FILL_VARIABLE, "transparent");
			}
		};
		//#endregion
		//#region lib/types/client/sprite-kind-source.js
		/**
		* The selected-mascot source: a persisted `SpriteKind` backed by localStorage,
		* exposed through the sprite's inject `hooks` compartment. It rehydrates on
		* construction and collapses any unrecognized stored value back to the default
		* `blob` sprite.
		*/
		/** Persistence key for the chosen sprite kind (localStorage). */
		const KIND_PERSIST_KEY = "dsh.sprite.kind";
		/** The valid sprite kinds (single source of truth). */
		const KINDS = [
			"blob",
			"bot",
			"cat",
			"ghost"
		];
		/**
		* Create the persisted sprite-kind source. Rehydrates from localStorage on
		* construction (the same contract as the snapshot-store engine) and resets any
		* unrecognized value to `blob`.
		* @returns the source.
		*/
		function createSpriteKindSource() {
			const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)("blob", { persist: { name: KIND_PERSIST_KEY } });
			const current = store.getSnapshot();
			if (!KINDS.includes(current)) store.set("blob");
			return {
				getSnapshot: () => store.getSnapshot(),
				subscribe: (fn) => store.subscribe(fn),
				set: (kind) => {
					store.set(kind);
				}
			};
		}
		//#endregion
		//#region lib/types/client/backgrounds.js
		/**
		* Background presets: the concrete color / gradient swatches the background
		* panel offers, plus the value shapes the store persists. These are data
		* (user-selectable wallpapers), not theme-tied UI colors.
		*/
		/** Solid-color swatches in registration order. */
		const BACKGROUND_COLORS = [
			{
				id: "sky",
				name: "天空",
				value: "#EAF3FB"
			},
			{
				id: "mint",
				name: "薄荷",
				value: "#EAF6EF"
			},
			{
				id: "rose",
				name: "玫瑰",
				value: "#FBEDF2"
			},
			{
				id: "cream",
				name: "奶油",
				value: "#FAF6EC"
			},
			{
				id: "lavender",
				name: "薰衣草",
				value: "#F1EDFC"
			},
			{
				id: "slate",
				name: "石板",
				value: "#1E293B"
			}
		];
		/** Gradient swatches in registration order. */
		const BACKGROUND_GRADIENTS = [
			{
				id: "skyline",
				name: "天际",
				value: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)"
			},
			{
				id: "sunset",
				name: "黄昏",
				value: "linear-gradient(135deg, #F6D365 0%, #FDA085 100%)"
			},
			{
				id: "ocean",
				name: "海洋",
				value: "linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)"
			},
			{
				id: "berry",
				name: "莓果",
				value: "linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)"
			}
		];
		//#endregion
		//#region \0spritely-css:/Users/junjian/GitHub/wang-junjian/spritely/src/client/SpriteMascot.module.css.mjs
		const css = ".G-sUUq_anchor{pointer-events:auto;position:fixed;bottom:24px;right:24px}.G-sUUq_sprite{appearance:none;cursor:grab;-webkit-tap-highlight-color:transparent;transform-origin:50% 80%;touch-action:none;user-select:none;background:0 0;border:none;outline:none;width:96px;height:96px;padding:0}.G-sUUq_sprite:active{cursor:grabbing}.G-sUUq_sprite:focus-visible{outline:2px solid var(--dsw-static-blue-500,#3b82f6);outline-offset:4px;border-radius:50%}.G-sUUq_sprite svg{width:100%;height:100%;display:block;overflow:visible}.G-sUUq_sprite[data-pose=idle]{animation:3s ease-in-out infinite G-sUUq_float}.G-sUUq_sprite[data-pose=thinking]{animation:1.2s ease-in-out infinite G-sUUq_pulse}.G-sUUq_sprite[data-pose=writing]{animation:.7s ease-in-out infinite G-sUUq_wiggle}.G-sUUq_sprite[data-pose=working]{animation:.7s ease-in-out infinite G-sUUq_bounce}.G-sUUq_sprite[data-pose=waiting]{animation:1.6s ease-in-out infinite G-sUUq_sway}.G-sUUq_sprite[data-pose=error]{animation:.4s ease-in-out infinite G-sUUq_shake}.G-sUUq_sprite[data-pose=done]{animation:1.4s ease-in-out G-sUUq_celebrate}@keyframes G-sUUq_float{0%,to{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes G-sUUq_pulse{0%,to{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes G-sUUq_wiggle{0%,to{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}@keyframes G-sUUq_bounce{0%,to{transform:translateY(0)scale(1)}30%{transform:translateY(-10px)scale(.98,1.02)}50%{transform:translateY(0)scale(1.03,.97)}70%{transform:translateY(-4px)scale(1)}}@keyframes G-sUUq_sway{0%,to{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}@keyframes G-sUUq_shake{0%,to{transform:translate(0)}25%{transform:translate(-3px)}75%{transform:translate(3px)}}@keyframes G-sUUq_celebrate{0%{transform:translateY(0)rotate(0)scale(1)}30%{transform:translateY(-16px)rotate(-8deg)scale(1.05)}60%{transform:translateY(-6px)rotate(6deg)scale(1.08)}to{transform:translateY(0)rotate(0)scale(1)}}.G-sUUq_star{transform-origin:50%;transform-box:fill-box}.G-sUUq_sprite[data-pose=done] .G-sUUq_star{animation:.9s linear infinite G-sUUq_spin}@keyframes G-sUUq_spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.G-sUUq_gear{transform-origin:90px 44px}.G-sUUq_sprite[data-pose=working] .G-sUUq_gear{animation:1.2s linear infinite G-sUUq_spin}.G-sUUq_dots>circle{opacity:0}.G-sUUq_sprite[data-pose=thinking] .G-sUUq_dots>circle,.G-sUUq_sprite[data-pose=waiting] .G-sUUq_dots>circle{animation:1s ease-in-out infinite G-sUUq_blink}.G-sUUq_sprite[data-pose=thinking] .G-sUUq_dots>circle:nth-child(2),.G-sUUq_sprite[data-pose=waiting] .G-sUUq_dots>circle:nth-child(2){animation-delay:.2s}.G-sUUq_sprite[data-pose=thinking] .G-sUUq_dots>circle:nth-child(3),.G-sUUq_sprite[data-pose=waiting] .G-sUUq_dots>circle:nth-child(3){animation-delay:.4s}@keyframes G-sUUq_blink{0%,to{opacity:0}50%{opacity:1}}.G-sUUq_pencil{transform-origin:92px 60px;transform-box:fill-box}.G-sUUq_sprite[data-pose=writing] .G-sUUq_pencil{animation:.9s ease-in-out infinite G-sUUq_scribble}@keyframes G-sUUq_scribble{0%,to{transform:rotate(45deg)translate(0)}50%{transform:rotate(45deg)translate(2px,-2px)}}.G-sUUq_sweat{transform-origin:88px 59px;transform-box:fill-box}.G-sUUq_sprite[data-pose=error] .G-sUUq_sweat{animation:1.4s ease-in-out infinite G-sUUq_drip}@keyframes G-sUUq_drip{0%,to{opacity:.9;transform:translateY(0)}50%{opacity:.5;transform:translateY(4px)}}.G-sUUq_menu,.G-sUUq_backgroundPanel,.G-sUUq_spritePanel{color:#e0f2fe;background:#081020f5;border:1px solid #22d3ee80;border-radius:12px;animation:.15s ease-out G-sUUq_fade-in;position:absolute;top:calc(100% + 8px);right:0;box-shadow:0 0 18px #22d3ee38,0 8px 24px #00000073}.G-sUUq_anchor[data-vertical=top] .G-sUUq_menu,.G-sUUq_anchor[data-vertical=top] .G-sUUq_backgroundPanel,.G-sUUq_anchor[data-vertical=top] .G-sUUq_spritePanel{top:auto;bottom:calc(100% + 8px)}.G-sUUq_anchor[data-horizontal=start] .G-sUUq_menu,.G-sUUq_anchor[data-horizontal=start] .G-sUUq_backgroundPanel,.G-sUUq_anchor[data-horizontal=start] .G-sUUq_spritePanel{left:0;right:auto}.G-sUUq_menu{flex-direction:column;gap:4px;min-width:152px;padding:8px;display:flex}.G-sUUq_backgroundPanel{flex-direction:column;gap:8px;width:238px;padding:12px;display:flex}.G-sUUq_spritePanel{flex-direction:column;gap:8px;width:256px;padding:12px;display:flex}.G-sUUq_backgroundPanel:before,.G-sUUq_backgroundPanel:after{content:\"\";pointer-events:none;border:0 solid #22d3ee;width:12px;height:12px;position:absolute}.G-sUUq_backgroundPanel:before{border-top-width:2px;border-left-width:2px;border-top-left-radius:12px;top:-1px;left:-1px}.G-sUUq_backgroundPanel:after{border-bottom-width:2px;border-right-width:2px;border-bottom-right-radius:12px;bottom:-1px;right:-1px}.G-sUUq_menuItem{appearance:none;text-align:left;color:#e0f2fe;letter-spacing:.5px;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:9px;padding:7px 10px;font-size:13px;display:flex}.G-sUUq_menuItem:hover{color:#a5f3fc;background:#22d3ee1f;box-shadow:inset 0 0 0 1px #22d3ee59}.G-sUUq_menuItem:focus-visible{outline-offset:2px;outline:2px solid #22d3ee}.G-sUUq_menuIcon{color:#22d3ee;flex:none;width:15px;height:15px}.G-sUUq_panelHeader{border-bottom:1px solid #22d3ee40;justify-content:space-between;align-items:center;padding-bottom:8px;display:flex}.G-sUUq_panelTitle{letter-spacing:1px;color:#a5f3fc;align-items:center;gap:7px;font-size:13px;font-weight:500;display:flex}.G-sUUq_panelTitle:before{content:\"\";background:#22d3ee;border-radius:50%;width:7px;height:7px;animation:1.4s ease-in-out infinite G-sUUq_beacon;box-shadow:0 0 8px #22d3ee}.G-sUUq_panelBack{appearance:none;color:#7dd3fc;letter-spacing:.5px;cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 6px;font-size:12px}.G-sUUq_panelBack:hover{color:#a5f3fc;background:#22d3ee1f}.G-sUUq_sectionLabel{letter-spacing:1px;color:#7dd3fc;font-size:11px}.G-sUUq_swatches{flex-wrap:wrap;gap:8px;display:flex}.G-sUUq_swatch{appearance:none;cursor:pointer;border:1px solid #22d3ee66;border-radius:50%;width:26px;height:26px;padding:0;box-shadow:inset 0 0 0 1px #ffffff2e}.G-sUUq_swatch:hover{border-color:#22d3eecc}.G-sUUq_swatch[data-selected]{outline-offset:2px;border-color:#22d3ee;outline:2px solid #22d3ee;box-shadow:0 0 10px #22d3eeb3}.G-sUUq_imageRow{gap:6px;display:flex}.G-sUUq_imageInput{color:#e0f2fe;background:#0f1e37e6;border:1px solid #22d3ee66;border-radius:6px;flex:1;min-width:0;padding:5px 8px;font-size:12px}.G-sUUq_imageInput::placeholder{color:#7dd3fc;opacity:.7}.G-sUUq_imageInput:focus-visible{outline-offset:1px;outline:2px solid #22d3ee}.G-sUUq_imageApply{appearance:none;color:#062033;letter-spacing:1px;cursor:pointer;background:#22d3ee;border:none;border-radius:6px;padding:5px 12px;font-size:12px;box-shadow:0 0 10px #22d3ee73}.G-sUUq_imageApply:hover{background:#67e8f9}.G-sUUq_uploadButton{appearance:none;text-align:center;color:#7dd3fc;letter-spacing:1px;cursor:pointer;background:0 0;border:1px dashed #22d3ee80;border-radius:6px;padding:6px 8px;font-size:12px;display:block}.G-sUUq_uploadButton:hover{color:#a5f3fc;background:#22d3ee14;border-color:#22d3ee}.G-sUUq_fitRow{gap:6px;display:flex}.G-sUUq_fitButton{appearance:none;color:#7dd3fc;letter-spacing:.5px;cursor:pointer;background:0 0;border:1px solid #22d3ee4d;border-radius:6px;flex:1;padding:5px 8px;font-size:12px}.G-sUUq_fitButton:hover{color:#a5f3fc;border-color:#22d3eeb3}.G-sUUq_fitButton[data-selected]{color:#a5f3fc;background:#22d3ee1f;border-color:#22d3ee;box-shadow:0 0 10px #22d3ee4d}.G-sUUq_veilSlider{accent-color:#22d3ee;width:100%}.G-sUUq_reset{appearance:none;text-align:center;color:#7dd3fc;letter-spacing:1px;cursor:pointer;background:0 0;border:1px solid #22d3ee4d;border-radius:6px;padding:6px 8px;font-size:13px}.G-sUUq_reset:hover{color:#a5f3fc;background:#22d3ee14;border-color:#22d3eeb3}.G-sUUq_spriteGrid{grid-template-columns:1fr 1fr;gap:8px;display:grid}.G-sUUq_spriteOption{appearance:none;color:#7dd3fc;cursor:pointer;background:0 0;border:1px solid #22d3ee4d;border-radius:10px;flex-direction:column;align-items:center;gap:4px;padding:8px 4px 7px;display:flex}.G-sUUq_spriteOption:hover{border-color:#22d3eeb3}.G-sUUq_spriteOption[data-selected]{color:#a5f3fc;border-color:#22d3ee;box-shadow:0 0 12px #22d3ee59}.G-sUUq_spriteOption svg{width:56px;height:56px}.G-sUUq_spriteName{letter-spacing:.5px;font-size:12px}@keyframes G-sUUq_fade-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes G-sUUq_beacon{0%,to{opacity:1}50%{opacity:.35}}.G-sUUq_attentionDot{border:2px solid var(--dsw-alias-bg-layer-1);border-radius:50%;width:10px;height:10px;position:absolute;top:2px;right:2px}.G-sUUq_attentionDot[data-kind=waiting]{background:var(--dsw-alias-state-warn-primary)}.G-sUUq_attentionDot[data-kind=error]{background:var(--dsw-alias-state-error-primary)}";
		const tagId = "@deepseek-ai/dsh-client-ui-sprite/SpriteMascot.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-sprite";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SpriteMascot_module_css_default = {
			"beacon": "G-sUUq_beacon",
			"spriteName": "G-sUUq_spriteName",
			"attentionDot": "G-sUUq_attentionDot",
			"uploadButton": "G-sUUq_uploadButton",
			"wiggle": "G-sUUq_wiggle",
			"sweat": "G-sUUq_sweat",
			"sprite": "G-sUUq_sprite",
			"veilSlider": "G-sUUq_veilSlider",
			"spriteGrid": "G-sUUq_spriteGrid",
			"gear": "G-sUUq_gear",
			"backgroundPanel": "G-sUUq_backgroundPanel",
			"panelBack": "G-sUUq_panelBack",
			"panelTitle": "G-sUUq_panelTitle",
			"pencil": "G-sUUq_pencil",
			"float": "G-sUUq_float",
			"imageInput": "G-sUUq_imageInput",
			"imageApply": "G-sUUq_imageApply",
			"spritePanel": "G-sUUq_spritePanel",
			"blink": "G-sUUq_blink",
			"imageRow": "G-sUUq_imageRow",
			"pulse": "G-sUUq_pulse",
			"dots": "G-sUUq_dots",
			"star": "G-sUUq_star",
			"spin": "G-sUUq_spin",
			"drip": "G-sUUq_drip",
			"menu": "G-sUUq_menu",
			"shake": "G-sUUq_shake",
			"menuIcon": "G-sUUq_menuIcon",
			"sectionLabel": "G-sUUq_sectionLabel",
			"celebrate": "G-sUUq_celebrate",
			"fitButton": "G-sUUq_fitButton",
			"panelHeader": "G-sUUq_panelHeader",
			"reset": "G-sUUq_reset",
			"menuItem": "G-sUUq_menuItem",
			"fitRow": "G-sUUq_fitRow",
			"bounce": "G-sUUq_bounce",
			"spriteOption": "G-sUUq_spriteOption",
			"sway": "G-sUUq_sway",
			"swatch": "G-sUUq_swatch",
			"fade-in": "G-sUUq_fade-in",
			"swatches": "G-sUUq_swatches",
			"scribble": "G-sUUq_scribble",
			"anchor": "G-sUUq_anchor"
		};
		//#endregion
		//#region lib/types/client/sprites.js
		/** The roster, in selection-panel order. */
		const SPRITE_KINDS = [
			{
				id: "blob",
				nameKey: "sprite.blob"
			},
			{
				id: "bot",
				nameKey: "sprite.bot"
			},
			{
				id: "cat",
				nameKey: "sprite.cat"
			},
			{
				id: "ghost",
				nameKey: "sprite.ghost"
			}
		];
		/** Eye whites must read as white in every theme (the theme's brand invert is near-black). */
		const WHITE = "var(--dsw-static-neutral-bluish-50, #FFFFFF)";
		/** Pupils and face lines: a fixed deep ink so they never wash out. */
		const INK = "var(--dsw-static-blue-950, #0B1530)";
		/** Pupil shift from the gaze vector (zero → no transform). */
		function shiftOf(gaze) {
			return gaze.x === 0 && gaze.y === 0 ? void 0 : `translate(${gaze.x} ${gaze.y})`;
		}
		/** Render the selected sprite's full SVG content. */
		function renderSprite(kind, pose, gaze) {
			const shift = shiftOf(gaze);
			switch (kind) {
				case "blob": return (0, react_jsx_runtime.jsx)(Blob, {
					pose,
					shift
				});
				case "bot": return (0, react_jsx_runtime.jsx)(Bot, {
					pose,
					shift
				});
				case "cat": return (0, react_jsx_runtime.jsx)(Cat, {
					pose,
					shift
				});
				case "ghost": return (0, react_jsx_runtime.jsx)(Ghost, {
					pose,
					shift
				});
			}
		}
		/** Pupil center (cy) and radius per pose; null for the non-pupil faces. */
		function pupilSpec(pose) {
			switch (pose) {
				case "thinking": return {
					cy: 62,
					r: 3.5
				};
				case "writing": return {
					cy: 66,
					r: 3
				};
				case "working": return {
					cy: 67,
					r: 3.5
				};
				case "waiting": return {
					cy: 66,
					r: 2.5
				};
				case "idle": return {
					cy: 66,
					r: 3.5
				};
				default: return null;
			}
		}
		/** Cross-eyes for the error pose (shared by every sprite). */
		function CrossEyes() {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("path", {
				d: "M40 61 L52 71 M52 61 L40 71",
				stroke: INK,
				strokeWidth: "3",
				strokeLinecap: "round"
			}), (0, react_jsx_runtime.jsx)("path", {
				d: "M68 61 L80 71 M80 61 L68 71",
				stroke: INK,
				strokeWidth: "3",
				strokeLinecap: "round"
			})] });
		}
		/** Smiling arcs for the done pose (shared by every sprite). */
		function SmileEyes() {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("path", {
				d: "M40 64 Q46 57 52 64",
				fill: "none",
				stroke: INK,
				strokeWidth: "3",
				strokeLinecap: "round"
			}), (0, react_jsx_runtime.jsx)("path", {
				d: "M68 64 Q74 57 80 64",
				fill: "none",
				stroke: INK,
				strokeWidth: "3",
				strokeLinecap: "round"
			})] });
		}
		/** The mouth, expression per pose (shared: it sits centered on every body). */
		function Mouth({ pose }) {
			switch (pose) {
				case "thinking": return (0, react_jsx_runtime.jsx)("circle", {
					cx: "60",
					cy: "82",
					r: "3",
					fill: INK
				});
				case "writing":
				case "working": return (0, react_jsx_runtime.jsx)("path", {
					d: "M55 82 L65 82",
					stroke: INK,
					strokeWidth: "2.5",
					strokeLinecap: "round"
				});
				case "waiting": return (0, react_jsx_runtime.jsx)("circle", {
					cx: "60",
					cy: "82",
					r: "4",
					fill: INK
				});
				case "error": return (0, react_jsx_runtime.jsx)("path", {
					d: "M54 85 Q60 79 66 85",
					fill: "none",
					stroke: INK,
					strokeWidth: "2.5",
					strokeLinecap: "round"
				});
				case "done": return (0, react_jsx_runtime.jsx)("path", {
					d: "52 80 Q60 90 68 80",
					fill: INK,
					stroke: INK,
					strokeWidth: "2.5",
					strokeLinecap: "round"
				});
				default: return (0, react_jsx_runtime.jsx)("path", {
					d: "M54 81 Q60 86 66 81",
					fill: "none",
					stroke: INK,
					strokeWidth: "2.5",
					strokeLinecap: "round"
				});
			}
		}
		/** The per-pose accessory (animated by the module CSS). */
		function Accessory({ pose }) {
			switch (pose) {
				case "thinking": return (0, react_jsx_runtime.jsxs)("g", {
					className: SpriteMascot_module_css_default.dots,
					fill: "var(--dsw-alias-label-primary, #1F2937)",
					children: [
						(0, react_jsx_runtime.jsx)("circle", {
							cx: "88",
							cy: "24",
							r: "4"
						}),
						(0, react_jsx_runtime.jsx)("circle", {
							cx: "99",
							cy: "17",
							r: "3"
						}),
						(0, react_jsx_runtime.jsx)("circle", {
							cx: "109",
							cy: "27",
							r: "2.5"
						})
					]
				});
				case "writing": return (0, react_jsx_runtime.jsxs)("g", {
					className: SpriteMascot_module_css_default.pencil,
					transform: "rotate(45 92 60)",
					children: [(0, react_jsx_runtime.jsx)("rect", {
						x: "88",
						y: "54",
						width: "8",
						height: "20",
						rx: "2",
						fill: "var(--dsw-alias-label-primary, #1F2937)"
					}), (0, react_jsx_runtime.jsx)("path", {
						d: "M88 74 L92 74 L92 82 L89.5 86 L88 82 Z",
						fill: "var(--dsw-static-amber-500, #F59E0B)"
					})]
				});
				case "working": return (0, react_jsx_runtime.jsxs)("g", {
					className: SpriteMascot_module_css_default.gear,
					fill: "var(--dsw-alias-state-business-primary, #0EA5E9)",
					children: [(0, react_jsx_runtime.jsx)("circle", {
						cx: "90",
						cy: "44",
						r: "6"
					}), [
						0,
						60,
						120,
						180,
						240,
						300
					].map((angle) => (0, react_jsx_runtime.jsx)("rect", {
						x: "88.5",
						y: "32",
						width: "3",
						height: "8",
						rx: "1",
						transform: `rotate(${angle} 90 44)`
					}, angle))]
				});
				case "waiting": return (0, react_jsx_runtime.jsxs)("g", {
					className: SpriteMascot_module_css_default.dots,
					fill: "var(--dsw-alias-label-primary, #1F2937)",
					children: [
						(0, react_jsx_runtime.jsx)("circle", {
							cx: "90",
							cy: "30",
							r: "3"
						}),
						(0, react_jsx_runtime.jsx)("circle", {
							cx: "100",
							cy: "30",
							r: "3"
						}),
						(0, react_jsx_runtime.jsx)("circle", {
							cx: "110",
							cy: "30",
							r: "3"
						})
					]
				});
				case "error": return (0, react_jsx_runtime.jsx)("path", {
					className: SpriteMascot_module_css_default.sweat,
					d: "M88 52 q7 9 0 14 q-7 -5 0 -14 Z",
					fill: "var(--dsw-alias-state-error-primary, #EF4444)"
				});
				case "done": return (0, react_jsx_runtime.jsxs)("g", {
					fill: "var(--dsw-alias-state-success-primary, #22C55E)",
					children: [
						(0, react_jsx_runtime.jsx)("path", {
							className: SpriteMascot_module_css_default.star,
							d: "M96 22 Q97.5 26 101 27.5 Q97.5 29 96 33 Q94.5 29 91 27.5 Q94.5 26 96 22 Z"
						}),
						(0, react_jsx_runtime.jsx)("path", {
							className: SpriteMascot_module_css_default.star,
							d: "M30 24 Q31.5 28 35 29.5 Q31.5 31 30 35 Q28.5 31 25 29.5 Q28.5 28 30 24 Z"
						}),
						(0, react_jsx_runtime.jsx)("path", {
							className: SpriteMascot_module_css_default.star,
							d: "M112 48 Q113 50.5 115 51.5 Q113 52.5 112 55 Q111 52.5 109 51.5 Q111 50.5 112 48 Z"
						})
					]
				});
				default: return null;
			}
		}
		function Blob({ pose, shift }) {
			const pupil = pupilSpec(pose);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)("path", {
					d: "M60 32 Q64 20 56 12",
					fill: "none",
					stroke: "var(--dsw-alias-label-tertiary, #6B7280)",
					strokeWidth: "3",
					strokeLinecap: "round"
				}),
				(0, react_jsx_runtime.jsx)("path", {
					className: SpriteMascot_module_css_default.star,
					d: "M56 6 Q58 11 63 13 Q58 15 56 20 Q54 15 49 13 Q54 11 56 6 Z",
					fill: "var(--dsw-alias-state-warn-primary, #F59E0B)"
				}),
				(0, react_jsx_runtime.jsx)("circle", {
					cx: "60",
					cy: "70",
					r: "42",
					fill: "var(--dsw-static-blue-400, #60A5FA)",
					stroke: "var(--dsw-static-blue-500, #3B82F6)",
					strokeWidth: "1.5"
				}),
				(0, react_jsx_runtime.jsx)("ellipse", {
					cx: "47",
					cy: "52",
					rx: "16",
					ry: "10",
					fill: WHITE,
					opacity: "0.35"
				}),
				(0, react_jsx_runtime.jsx)("circle", {
					cx: "46",
					cy: "66",
					r: "8",
					fill: WHITE
				}),
				(0, react_jsx_runtime.jsx)("circle", {
					cx: "74",
					cy: "66",
					r: "8",
					fill: WHITE
				}),
				pose === "error" ? (0, react_jsx_runtime.jsx)(CrossEyes, {}) : pose === "done" ? (0, react_jsx_runtime.jsx)(SmileEyes, {}) : pupil !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("circle", {
					cx: "46",
					cy: pupil.cy,
					r: pupil.r,
					fill: INK,
					transform: shift
				}), (0, react_jsx_runtime.jsx)("circle", {
					cx: "74",
					cy: pupil.cy,
					r: pupil.r,
					fill: INK,
					transform: shift
				})] }),
				(0, react_jsx_runtime.jsx)(Mouth, { pose }),
				(0, react_jsx_runtime.jsx)("ellipse", {
					cx: "36",
					cy: "78",
					rx: "5",
					ry: "3",
					fill: "var(--dsw-static-amber-300, #FCD34D)",
					opacity: "0.6"
				}),
				(0, react_jsx_runtime.jsx)("ellipse", {
					cx: "84",
					cy: "78",
					rx: "5",
					ry: "3",
					fill: "var(--dsw-static-amber-300, #FCD34D)",
					opacity: "0.6"
				}),
				(0, react_jsx_runtime.jsx)(Accessory, { pose })
			] });
		}
		function Bot({ pose, shift }) {
			const pupil = pupilSpec(pose);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)("path", {
					d: "M60 28 V14",
					stroke: "#059669",
					strokeWidth: "3",
					strokeLinecap: "round"
				}),
				(0, react_jsx_runtime.jsx)("circle", {
					cx: "60",
					cy: "10",
					r: "5",
					fill: "#6EE7B7"
				}),
				(0, react_jsx_runtime.jsx)("rect", {
					x: "18",
					y: "28",
					width: "84",
					height: "84",
					rx: "14",
					fill: "#34D399",
					stroke: "#059669",
					strokeWidth: "1.5"
				}),
				(0, react_jsx_runtime.jsx)("rect", {
					x: "42",
					y: "40",
					width: "36",
					height: "5",
					rx: "2.5",
					fill: "#059669",
					opacity: "0.5"
				}),
				pose === "error" ? (0, react_jsx_runtime.jsx)(CrossEyes, {}) : pose === "done" ? (0, react_jsx_runtime.jsx)(SmileEyes, {}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					(0, react_jsx_runtime.jsx)("rect", {
						x: "36",
						y: "58",
						width: "22",
						height: "15",
						rx: "4",
						fill: "#6EE7B7"
					}),
					(0, react_jsx_runtime.jsx)("rect", {
						x: "62",
						y: "58",
						width: "22",
						height: "15",
						rx: "4",
						fill: "#6EE7B7"
					}),
					pupil !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("circle", {
						cx: "47",
						cy: pupil.cy,
						r: "4",
						fill: "#062033",
						transform: shift
					}), (0, react_jsx_runtime.jsx)("circle", {
						cx: "73",
						cy: pupil.cy,
						r: "4",
						fill: "#062033",
						transform: shift
					})] })
				] }),
				(0, react_jsx_runtime.jsx)("path", {
					d: "M55 88 L65 88",
					stroke: "#062033",
					strokeWidth: "3",
					strokeLinecap: "round"
				}),
				(0, react_jsx_runtime.jsx)("path", {
					d: "M60 74 V80",
					stroke: "#059669",
					strokeWidth: "1.5"
				}),
				(0, react_jsx_runtime.jsx)(Accessory, { pose })
			] });
		}
		function Cat({ pose, shift }) {
			const pupil = pupilSpec(pose);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)("path", {
					d: "M34 48 L40 20 L52 38 Z",
					fill: "var(--dsw-static-amber-400, #FBBF24)",
					stroke: "var(--dsw-static-amber-600, #D97706)",
					strokeWidth: "1.5"
				}),
				(0, react_jsx_runtime.jsx)("path", {
					d: "M68 38 L80 20 L86 48 Z",
					fill: "var(--dsw-static-amber-400, #FBBF24)",
					stroke: "var(--dsw-static-amber-600, #D97706)",
					strokeWidth: "1.5"
				}),
				(0, react_jsx_runtime.jsx)("circle", {
					cx: "60",
					cy: "72",
					r: "42",
					fill: "var(--dsw-static-amber-400, #FBBF24)",
					stroke: "var(--dsw-static-amber-600, #D97706)",
					strokeWidth: "1.5"
				}),
				(0, react_jsx_runtime.jsx)("path", {
					d: "M60 34 L55 44 M60 34 L65 44",
					stroke: "var(--dsw-static-amber-600, #D97706)",
					strokeWidth: "2",
					strokeLinecap: "round"
				}),
				pose === "error" ? (0, react_jsx_runtime.jsx)(CrossEyes, {}) : pose === "done" ? (0, react_jsx_runtime.jsx)(SmileEyes, {}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					(0, react_jsx_runtime.jsx)("ellipse", {
						cx: "46",
						cy: "66",
						rx: "7",
						ry: "10",
						fill: WHITE
					}),
					(0, react_jsx_runtime.jsx)("ellipse", {
						cx: "74",
						cy: "66",
						rx: "7",
						ry: "10",
						fill: WHITE
					}),
					pupil !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("ellipse", {
						cx: "46",
						cy: pupil.cy,
						rx: "3.5",
						ry: "6.5",
						fill: INK,
						transform: shift
					}), (0, react_jsx_runtime.jsx)("ellipse", {
						cx: "74",
						cy: pupil.cy,
						rx: "3.5",
						ry: "6.5",
						fill: INK,
						transform: shift
					})] })
				] }),
				(0, react_jsx_runtime.jsx)("path", {
					d: "M54 82 Q60 78 60 82 Q60 78 66 82",
					fill: "none",
					stroke: INK,
					strokeWidth: "2",
					strokeLinecap: "round"
				}),
				(0, react_jsx_runtime.jsx)("path", {
					d: "M36 74 H44 M76 74 H84",
					stroke: INK,
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				(0, react_jsx_runtime.jsx)("ellipse", {
					cx: "38",
					cy: "80",
					rx: "4",
					ry: "2.5",
					fill: "var(--dsw-static-amber-100, #FEF3C7)",
					opacity: "0.7"
				}),
				(0, react_jsx_runtime.jsx)("ellipse", {
					cx: "82",
					cy: "80",
					rx: "4",
					ry: "2.5",
					fill: "var(--dsw-static-amber-100, #FEF3C7)",
					opacity: "0.7"
				}),
				(0, react_jsx_runtime.jsx)(Accessory, { pose })
			] });
		}
		function Ghost({ pose, shift }) {
			const pupil = pupilSpec(pose);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)("path", {
					d: "M22 64 Q22 22 60 22 Q98 22 98 64 Q98 100 88 100 Q82 100 80 92 Q76 102 72 92 Q68 102 64 92 Q60 102 56 92 Q52 102 48 92 Q44 102 40 92 Q36 102 32 92 Q26 102 22 100 Q22 100 22 64 Z",
					fill: "var(--dsw-static-purple-400, #A78BFA)",
					stroke: "var(--dsw-static-purple-600, #7C3AED)",
					strokeWidth: "1.5"
				}),
				(0, react_jsx_runtime.jsx)("ellipse", {
					cx: "42",
					cy: "52",
					rx: "10",
					ry: "6",
					fill: WHITE,
					opacity: "0.3"
				}),
				pose === "error" ? (0, react_jsx_runtime.jsx)(CrossEyes, {}) : pose === "done" ? (0, react_jsx_runtime.jsx)(SmileEyes, {}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "46",
						cy: "66",
						r: "9",
						fill: WHITE
					}),
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "74",
						cy: "66",
						r: "9",
						fill: WHITE
					}),
					pupil !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("circle", {
						cx: "46",
						cy: pupil.cy,
						r: pupil.r + .5,
						fill: INK,
						transform: shift
					}), (0, react_jsx_runtime.jsx)("circle", {
						cx: "74",
						cy: pupil.cy,
						r: pupil.r + .5,
						fill: INK,
						transform: shift
					})] })
				] }),
				(0, react_jsx_runtime.jsx)(Mouth, { pose }),
				(0, react_jsx_runtime.jsx)(Accessory, { pose })
			] });
		}
		//#endregion
		//#region lib/types/client/SpriteMascot.js
		/**
		* SpriteMascot: the floating mascot rendered into the layout's `shell.overlay`
		* layer. Pure presentation — the work state arrives through the injected
		* `useSprite` selector hook; local state holds only the transient celebration
		* (a busy run settling into idle), the drag position, and the open menu. A
		* pointer gesture under the drag threshold counts as a click and toggles the
		* menu; beyond it, the sprite follows the pointer and can be reset to its
		* default corner.
		*/
		/** Activities that celebrate once they settle into idle. */
		const BUSY = /* @__PURE__ */ new Set([
			"thinking",
			"writing",
			"working"
		]);
		/** Celebration hold time before the mascot returns to its idle pose. */
		const CELEBRATE_MS = 1400;
		/** Distance a pointer must travel before a gesture counts as a drag rather than a click. */
		const DRAG_THRESHOLD_PX = 4;
		/** The gap between the mascot and its menu, reserved when measuring open space. */
		const MENU_GAP_PX = 8;
		/** Max pupil travel (in SVG units) when the eyes track the cursor. */
		const GAZE_MAX = 3;
		/** Max local image size accepted (bytes): keeps the data-URL under localStorage's quota. */
		const MAX_UPLOAD_BYTES = 2097152;
		/**
		* Render the floating mascot, its drag-to-move surface, and the click menu.
		* @param props - composed slot props (`useSprite`, `startSession`, `t`; the global hooks stay unused).
		* @returns the mascot element tree.
		*/
		function SpriteMascot({ useSprite, useBackground, useSpriteKind, startSession, setBackground, setSpriteKind, t }) {
			const state = useSprite((sel) => sel);
			const activity = state.activity;
			const background = useBackground((sel) => sel);
			const spriteKind = useSpriteKind((sel) => sel);
			const [celebrating, setCelebrating] = (0, react.useState)(false);
			const [panel, setPanel] = (0, react.useState)("closed");
			const [imageUrl, setImageUrl] = (0, react.useState)("");
			const [menuPlacement, setMenuPlacement] = (0, react.useState)({
				vertical: "bottom",
				horizontal: "end"
			});
			const [position, setPosition] = (0, react.useState)(null);
			const [gaze, setGaze] = (0, react.useState)({
				x: 0,
				y: 0
			});
			const previous = (0, react.useRef)(activity);
			const anchorRef = (0, react.useRef)(null);
			const popoverRef = (0, react.useRef)(null);
			const drag = (0, react.useRef)(null);
			const suppressClick = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				const before = previous.current;
				previous.current = activity;
				if (BUSY.has(before) && activity === "idle") {
					setCelebrating(true);
					const timer = window.setTimeout(() => {
						setCelebrating(false);
					}, CELEBRATE_MS);
					return () => {
						window.clearTimeout(timer);
					};
				}
			}, [activity]);
			(0, react.useEffect)(() => {
				let frame = 0;
				let latest = {
					x: 0,
					y: 0
				};
				const onMove = (event) => {
					const anchor = anchorRef.current;
					if (anchor === null) return;
					const rect = anchor.getBoundingClientRect();
					if (rect.width === 0 || rect.height === 0) return;
					const sx = (event.clientX - rect.left) / rect.width * 120;
					const sy = (event.clientY - rect.top) / rect.height * 120;
					const dx = sx - 60;
					const dy = sy - 66;
					const len = Math.hypot(dx, dy);
					latest = len < 1 ? {
						x: 0,
						y: 0
					} : {
						x: dx / len * GAZE_MAX,
						y: dy / len * GAZE_MAX
					};
					if (frame === 0) frame = window.requestAnimationFrame(() => {
						frame = 0;
						setGaze(latest);
					});
				};
				window.addEventListener("mousemove", onMove);
				return () => {
					window.removeEventListener("mousemove", onMove);
					if (frame !== 0) window.cancelAnimationFrame(frame);
				};
			}, []);
			const previousPanel = (0, react.useRef)(panel);
			(0, react.useEffect)(() => {
				const was = previousPanel.current;
				previousPanel.current = panel;
				if (panel === "background" && was !== "background" && background?.kind === "image") setImageUrl(background.value);
			}, [panel, background]);
			(0, react.useLayoutEffect)(() => {
				if (panel === "closed") return;
				const anchor = anchorRef.current;
				const popover = popoverRef.current;
				/* v8 ignore next 2 -- the panel only opens when both are mounted. */
				if (anchor === null || popover === null) return;
				const anchorRect = anchor.getBoundingClientRect();
				const popoverRect = popover.getBoundingClientRect();
				const neededHeight = popoverRect.height + MENU_GAP_PX;
				const vertical = window.innerHeight - anchorRect.bottom < neededHeight && anchorRect.top >= neededHeight ? "top" : "bottom";
				const horizontal = anchorRect.right - popoverRect.width < 0 && anchorRect.left + popoverRect.width <= window.innerWidth ? "start" : "end";
				setMenuPlacement({
					vertical,
					horizontal
				});
			}, [panel]);
			const pose = celebrating ? "done" : activity;
			const caption = activity === "working" && state.toolName !== void 0 ? `${t("state.working")} · ${state.toolName}` : t(`state.${activity}`);
			const onPointerDown = (event) => {
				if (event.button !== 0) return;
				const rect = anchorRef.current?.getBoundingClientRect();
				/* v8 ignore next -- the anchor always renders before the sprite is grabbable. */
				if (rect === void 0) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = {
					startX: event.clientX,
					startY: event.clientY,
					originLeft: rect.left,
					originTop: rect.top
				};
			};
			const onPointerMove = (event) => {
				const gesture = drag.current;
				if (gesture === null) return;
				const dx = event.clientX - gesture.startX;
				const dy = event.clientY - gesture.startY;
				if (!suppressClick.current && Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
				suppressClick.current = true;
				setPosition({
					x: gesture.originLeft + dx,
					y: gesture.originTop + dy
				});
			};
			const onPointerUp = () => {
				drag.current = null;
			};
			const onActivate = () => {
				if (suppressClick.current) {
					suppressClick.current = false;
					return;
				}
				setPanel((open) => open === "closed" ? "menu" : "closed");
			};
			const close = () => {
				setPanel("closed");
			};
			const applyImage = () => {
				const url = imageUrl.trim();
				if (url === "") return;
				setBackground({
					kind: "image",
					value: url,
					fit: "contain",
					veil: DEFAULT_VEIL
				});
			};
			/** Read a local image file to a data URL and apply it as the background. */
			const onUploadImage = (event) => {
				const file = event.target.files?.[0];
				event.target.value = "";
				if (file === void 0) return;
				if (file.size > MAX_UPLOAD_BYTES) return;
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === "string") setBackground({
						kind: "image",
						value: reader.result,
						fit: "contain",
						veil: DEFAULT_VEIL
					});
				};
				reader.readAsDataURL(file);
			};
			const isColorSelected = (value) => background?.kind === "color" && background.value === value;
			const isGradientSelected = (value) => background?.kind === "gradient" && background.value === value;
			/** The active image selection (non-null only when the current background is an image). */
			const activeImage = background?.kind === "image" ? background : null;
			/** Re-scale the active image (contain = fit + center, fill = stretch full-screen). */
			const setFit = (fit) => {
				if (activeImage !== null) setBackground({
					...activeImage,
					fit
				});
			};
			/** Fade the active image toward the theme base so foreground text stays legible. */
			const setVeil = (veil) => {
				if (activeImage !== null) setBackground({
					...activeImage,
					veil
				});
			};
			const style = position === null ? void 0 : {
				left: position.x,
				top: position.y,
				right: "auto",
				bottom: "auto"
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: anchorRef,
				className: SpriteMascot_module_css_default.anchor,
				"data-vertical": menuPlacement.vertical,
				"data-horizontal": menuPlacement.horizontal,
				style,
				children: [
					(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SpriteMascot_module_css_default.sprite,
						"data-activity": activity,
						"data-pose": pose,
						"aria-label": caption,
						"aria-haspopup": "menu",
						"aria-expanded": panel !== "closed",
						onClick: onActivate,
						onPointerDown,
						onPointerMove,
						onPointerUp,
						children: [(activity === "waiting" || activity === "error") && (0, react_jsx_runtime.jsx)("span", {
							className: SpriteMascot_module_css_default.attentionDot,
							"data-kind": activity,
							"aria-hidden": "true"
						}), (0, react_jsx_runtime.jsx)("svg", {
							viewBox: "0 0 120 120",
							"aria-hidden": "true",
							focusable: "false",
							children: renderSprite(spriteKind, pose, gaze)
						})]
					}),
					panel === "menu" && (0, react_jsx_runtime.jsxs)("div", {
						ref: popoverRef,
						className: SpriteMascot_module_css_default.menu,
						role: "menu",
						"aria-label": t("menu.label"),
						children: [
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "menuitem",
								className: SpriteMascot_module_css_default.menuItem,
								onClick: () => {
									startSession();
									close();
								},
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: SpriteMascot_module_css_default.menuIcon,
									"aria-hidden": "true",
									children: (0, react_jsx_runtime.jsx)("svg", {
										viewBox: "0 0 14 14",
										width: "15",
										height: "15",
										children: (0, react_jsx_runtime.jsx)("path", {
											d: "M7 2.5v9M2.5 7h9",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round"
										})
									})
								}), t("menu.newSession")]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "menuitem",
								className: SpriteMascot_module_css_default.menuItem,
								onClick: () => {
									setPosition(null);
									close();
								},
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: SpriteMascot_module_css_default.menuIcon,
									"aria-hidden": "true",
									children: (0, react_jsx_runtime.jsxs)("svg", {
										viewBox: "0 0 14 14",
										width: "15",
										height: "15",
										children: [(0, react_jsx_runtime.jsx)("path", {
											d: "M11.5 6.5a4.5 4.5 0 1 1-1.5-3.4",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round"
										}), (0, react_jsx_runtime.jsx)("path", {
											d: "M11.5 1.5v3.2h-3.2",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round",
											strokeLinejoin: "round"
										})]
									})
								}), t("menu.reset")]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "menuitem",
								className: SpriteMascot_module_css_default.menuItem,
								onClick: () => {
									setPanel("background");
								},
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: SpriteMascot_module_css_default.menuIcon,
									"aria-hidden": "true",
									children: (0, react_jsx_runtime.jsx)("svg", {
										viewBox: "0 0 14 14",
										width: "15",
										height: "15",
										children: (0, react_jsx_runtime.jsx)("path", {
											d: "M7 2l5 5-5 5-5-5z",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinejoin: "round"
										})
									})
								}), t("menu.background")]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "menuitem",
								className: SpriteMascot_module_css_default.menuItem,
								onClick: () => {
									setPanel("sprite");
								},
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: SpriteMascot_module_css_default.menuIcon,
									"aria-hidden": "true",
									children: (0, react_jsx_runtime.jsxs)("svg", {
										viewBox: "0 0 14 14",
										width: "15",
										height: "15",
										children: [(0, react_jsx_runtime.jsx)("circle", {
											cx: "7",
											cy: "5",
											r: "3",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5"
										}), (0, react_jsx_runtime.jsx)("path", {
											d: "M3 12c0-2.2 1.8-4 4-4s4 1.8 4 4",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round"
										})]
									})
								}), t("menu.sprite")]
							})
						]
					}),
					panel === "background" && (0, react_jsx_runtime.jsxs)("div", {
						ref: popoverRef,
						className: SpriteMascot_module_css_default.backgroundPanel,
						role: "dialog",
						"aria-label": t("background.title"),
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: SpriteMascot_module_css_default.panelHeader,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: SpriteMascot_module_css_default.panelTitle,
									children: t("background.title")
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SpriteMascot_module_css_default.panelBack,
									onClick: () => {
										setPanel("menu");
									},
									children: t("background.back")
								})]
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: SpriteMascot_module_css_default.sectionLabel,
								children: t("background.color")
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: SpriteMascot_module_css_default.swatches,
								children: BACKGROUND_COLORS.map((item) => (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SpriteMascot_module_css_default.swatch,
									"data-selected": isColorSelected(item.value) || void 0,
									"aria-label": item.name,
									style: { background: item.value },
									onClick: () => {
										setBackground({
											kind: "color",
											value: item.value,
											fit: "contain",
											veil: .5
										});
									}
								}, item.id))
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: SpriteMascot_module_css_default.sectionLabel,
								children: t("background.gradient")
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: SpriteMascot_module_css_default.swatches,
								children: BACKGROUND_GRADIENTS.map((item) => (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SpriteMascot_module_css_default.swatch,
									"data-selected": isGradientSelected(item.value) || void 0,
									"aria-label": item.name,
									style: { background: item.value },
									onClick: () => {
										setBackground({
											kind: "gradient",
											value: item.value,
											fit: "contain",
											veil: .5
										});
									}
								}, item.id))
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: SpriteMascot_module_css_default.sectionLabel,
								children: t("background.image")
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: SpriteMascot_module_css_default.imageRow,
								children: [(0, react_jsx_runtime.jsx)("input", {
									type: "text",
									className: SpriteMascot_module_css_default.imageInput,
									placeholder: t("background.image.placeholder"),
									value: imageUrl,
									onChange: (event) => {
										setImageUrl(event.target.value);
									}
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SpriteMascot_module_css_default.imageApply,
									onClick: applyImage,
									children: t("background.image.apply")
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: SpriteMascot_module_css_default.uploadButton,
								children: [t("background.image.upload"), (0, react_jsx_runtime.jsx)("input", {
									type: "file",
									accept: "image/*",
									hidden: true,
									onChange: onUploadImage
								})]
							}),
							activeImage !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								(0, react_jsx_runtime.jsx)("div", {
									className: SpriteMascot_module_css_default.sectionLabel,
									children: t("background.fit")
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: SpriteMascot_module_css_default.fitRow,
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SpriteMascot_module_css_default.fitButton,
										"data-selected": activeImage.fit === "contain" || void 0,
										onClick: () => {
											setFit("contain");
										},
										children: t("background.fit.contain")
									}), (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SpriteMascot_module_css_default.fitButton,
										"data-selected": activeImage.fit === "fill" || void 0,
										onClick: () => {
											setFit("fill");
										},
										children: t("background.fit.fill")
									})]
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: SpriteMascot_module_css_default.sectionLabel,
									children: t("background.veil")
								}),
								(0, react_jsx_runtime.jsx)("input", {
									type: "range",
									className: SpriteMascot_module_css_default.veilSlider,
									min: 0,
									max: 100,
									value: Math.round(activeImage.veil * 100),
									onChange: (event) => {
										setVeil(Number(event.target.value) / 100);
									}
								})
							] }),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SpriteMascot_module_css_default.reset,
								onClick: () => {
									setBackground(null);
								},
								children: t("background.reset")
							})
						]
					}),
					panel === "sprite" && (0, react_jsx_runtime.jsxs)("div", {
						ref: popoverRef,
						className: SpriteMascot_module_css_default.spritePanel,
						role: "dialog",
						"aria-label": t("sprite.title"),
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: SpriteMascot_module_css_default.panelHeader,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: SpriteMascot_module_css_default.panelTitle,
								children: t("sprite.title")
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SpriteMascot_module_css_default.panelBack,
								onClick: () => {
									setPanel("menu");
								},
								children: t("background.back")
							})]
						}), (0, react_jsx_runtime.jsx)("div", {
							className: SpriteMascot_module_css_default.spriteGrid,
							children: SPRITE_KINDS.map((kind) => (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: SpriteMascot_module_css_default.spriteOption,
								"data-selected": spriteKind === kind.id || void 0,
								onClick: () => {
									setSpriteKind(kind.id);
								},
								children: [(0, react_jsx_runtime.jsx)("svg", {
									viewBox: "0 0 120 120",
									"aria-hidden": "true",
									children: renderSprite(kind.id, "idle", {
										x: 0,
										y: 0
									})
								}), (0, react_jsx_runtime.jsx)("span", {
									className: SpriteMascot_module_css_default.spriteName,
									children: t(kind.nameKey)
								})]
							}, kind.id))
						})]
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `sprite` namespace dictionaries: the mascot's status copy. */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"state.idle": "待命",
			"state.thinking": "思考中",
			"state.writing": "正在撰写回复",
			"state.working": "正在调用工具",
			"state.waiting": "等你确认",
			"state.error": "出了点问题",
			"menu.label": "精灵菜单",
			"menu.newSession": "新会话",
			"menu.reset": "归位",
			"menu.background": "设置背景",
			"menu.sprite": "选择精灵",
			"sprite.title": "选择精灵",
			"sprite.blob": "蓝球",
			"sprite.bot": "机器人",
			"sprite.cat": "猫咪",
			"sprite.ghost": "幽灵",
			"background.title": "设置背景",
			"background.color": "纯色",
			"background.gradient": "渐变",
			"background.image": "壁纸",
			"background.image.placeholder": "输入图片 URL",
			"background.image.apply": "应用",
			"background.image.upload": "上传图片",
			"background.fit": "缩放方式",
			"background.fit.contain": "等比居中",
			"background.fit.fill": "全屏拉伸",
			"background.veil": "背景淡化",
			"background.reset": "恢复默认",
			"background.back": "返回"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"state.idle": "Idle",
			"state.thinking": "Thinking",
			"state.writing": "Writing a reply",
			"state.working": "Running a tool",
			"state.waiting": "Waiting on you",
			"state.error": "Something went wrong",
			"menu.label": "Sprite menu",
			"menu.newSession": "New session",
			"menu.reset": "Reset position",
			"menu.background": "Set background",
			"menu.sprite": "Switch sprite",
			"sprite.title": "Choose sprite",
			"sprite.blob": "Blob",
			"sprite.bot": "Bot",
			"sprite.cat": "Cat",
			"sprite.ghost": "Ghost",
			"background.title": "Set background",
			"background.color": "Color",
			"background.gradient": "Gradient",
			"background.image": "Image",
			"background.image.placeholder": "Paste an image URL",
			"background.image.apply": "Apply",
			"background.image.upload": "Upload image",
			"background.fit": "Scale",
			"background.fit.contain": "Fit (contain)",
			"background.fit.fill": "Stretch (fill)",
			"background.veil": "Fade",
			"background.reset": "Reset to default",
			"background.back": "Back"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "sprite";
		/** Services required by the sprite plugin. */
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"locale"
		];
		/**
		* Mount the mascot: register the dictionaries, then contribute the sprite
		* into `shell.overlay` once ui-layout declares it. The work-state observable
		* and the persisted background source are created per declaration lifetime and
		* disposed with the registration; the background presenter projects the source
		* onto the `--dsw-alias-bg-base` CSS variable (recoloring every surface layer).
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-sprite: dictionaries");
			ctx.slots.inject("shell.overlay", () => {
				const source = createSpriteStateSource(ctx.sessions);
				const background = createBackgroundSource();
				const spriteKind = createSpriteKindSource();
				const presenter = new BackgroundPresenter();
				presenter.apply(background.getSnapshot());
				const unsubscribeBackground = background.subscribe(() => {
					presenter.apply(background.getSnapshot());
				});
				const dispose = ctx.slots.register({
					name: "shell.overlay",
					id: "sprite",
					locale: NS,
					inject: () => ({
						hooks: {
							sprite: source,
							background,
							spriteKind
						},
						startSession: () => {
							ctx.workspaces.startSession();
						},
						setBackground: (value) => {
							background.set(value);
						},
						setSpriteKind: (kind) => {
							spriteKind.set(kind);
						}
					})
				}, SpriteMascot);
				return () => {
					dispose();
					source.dispose();
					unsubscribeBackground();
					presenter.dispose();
				};
			});
		}
		//#endregion
		exports.DEFAULT_VEIL = DEFAULT_VEIL;
		exports.SPRITE_KINDS = SPRITE_KINDS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map