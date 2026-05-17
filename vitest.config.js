import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default environment untuk semua test
    environment: 'jsdom',
    // Konfigurasi global
    globals: false,
  },
});
