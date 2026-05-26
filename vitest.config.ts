import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/main/**/*.ts'],
      exclude: ['src/main/main.ts'], // Entry file excluded — tested via integration
    },
  },
})
