/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-sprite`.
 * @module @deepseek-ai/dsh-client-ui-sprite/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-sprite'

/** Cordis companion plugin name. */
export const name = 'client-ui-sprite-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a pure-consumer plugin deriving its rows in-component
 * from the standard sessions service (a derived observable over the current
 * session's conversation snapshot) — it emits no cordis events and owns no
 * cross-plugin mutable state; derivation and interaction behavior are asserted
 * directly by this package's state/component specs.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
