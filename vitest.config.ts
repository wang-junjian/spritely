import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // Individual client specs opt into jsdom via the per-file
    // `@vitest-environment jsdom` pragma; the default stays Node.
  },
})
