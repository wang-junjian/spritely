/**
 * Polyfill the dsh client module loader for unit tests.
 *
 * The `@deepseek-ai/dsh-client-runtime/client` and sibling client bundles are
 * shipped as CJS artifacts that self-register through
 * `window.__ModuleLoader__.load(...)`. The real loader is injected by the dsh
 * host in the browser; tests need a minimal stand-in so these modules can be
 * imported under jsdom/Node.
 */
export function setupModuleLoader(): void {
  if (typeof window === 'undefined') return
  const modules = new Map<string, unknown>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__ModuleLoader__ = {
    load: ({ id, factory }: { id: string; factory: (require: (id: string) => unknown) => unknown }): void => {
      const requireFn = (depId: string): unknown => {
        if (modules.has(depId)) return modules.get(depId)
        // Fallback to Node's resolver for external packages (e.g. @deepseek-ai/cordis).
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require(depId)
        } catch {
          return undefined
        }
      }
      modules.set(id, factory(requireFn))
    },
  }
}

setupModuleLoader()
