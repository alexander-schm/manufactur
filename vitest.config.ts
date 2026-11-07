import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  test: {
    include: ['test/shared/**/*.test.ts', 'test/client/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
