# Spritely

> *Your spritely work companion* — a floating mascot for the dsh web UI that reacts to the agent's live work state.

Spritely (formerly the `ui-sprite` plugin) is a dsh client plugin that drops a small, animated character into the corner of the web interface. It watches the agent's activity — idle, thinking, writing, running tools, waiting on you, erroring, or finishing a run — and plays a matching pose, tracks your cursor with its eyes, and can be dragged anywhere.

<p align="center"><em>Four characters: Blob · Bot · Cat · Ghost</em></p>

## Features

- **Four switchable characters** — Blob (blue ball), Bot (mint robot), Cat (amber kitty), Ghost (violet specter), each with its own body and eye style.
- **Live work-state poses** — idle, thinking, writing, working, waiting, error, and a brief celebration when a run settles.
- **Cursor-tracking eyes** — pupils follow the mouse (rAF-throttled).
- **Draggable** — grab and move the mascot anywhere; reset returns it to the corner.
- **Customizable background** — solid colors, gradients, image URLs, and local image upload, with fit (contain / stretch) and a fade veil for legibility.
- **Sci-fi HUD styling** — the menu and panels use a fixed dark holographic palette with a cyan neon frame.
- **Persisted** — your character, background, and position survive reloads.

## Install

Spritely is a dsh client plugin. Add it to your dsh web composition's plugin roster and install the package:

```bash
npm install @deepseek-ai/dsh-client-ui-sprite
```

Then register it in your bundle's `cordis.patch.yml` browser plugin roster:

```yaml
- id: ui-sprite
  name: '@deepseek-ai/dsh-client-ui-sprite'
```

The plugin declares its own `dsh.client` metadata (`platform: web`), so the host Loader picks it up and serves its client bundle automatically.

## Usage

Click the mascot to open its menu:

- **New session** — start a new session (default workspace flow).
- **Reset position** — return the mascot to its default corner.
- **Set background** — open the background console (colors, gradients, image URL, local upload, scale, fade).
- **Switch sprite** — pick one of the four characters.

## Characters

| Character | Look | Palette |
|---|---|---|
| Blob | round ball + antenna star | blue |
| Bot | rounded head + LED eyes | mint green |
| Cat | triangular ears + vertical pupils + whiskers | amber |
| Ghost | wavy hem + big round eyes | violet |

## Development

```bash
npm install          # installs dsh peer dependencies + dev tooling
npm run build        # tsc (types) + tsdown (node-half lib + browser client bundle)
npm test             # vitest
npm run watch        # tsdown --watch
```

The build emits the node-half library (`lib/index.js`, `lib/invariant.js`) and the browser client bundle (`lib/client.js`) in dsh's `__ModuleLoader__` closure-factory format, with CSS Modules inlined by lightningcss.

## License

[MIT](./LICENSE)
