import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.js'],
    environment: 'node',
    globals: true,
    isolate: true,
    root: '/pixel/scripts',
    reporters: 'default',
    watch: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['utilities/**/*.js', 'monitoring/**/*.js', '*.js'],
      exclude: [
        '**/*.test.js',
        '**/node_modules/**',
      ],
      reportsDirectory: './coverage',
      all: false,
    },
  },
});
