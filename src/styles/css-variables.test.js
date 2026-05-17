/**
 * Unit tests untuk CSS variables design system
 * Validates: Requirements 2.1
 *
 * Karena test berjalan di Node.js (bukan browser), kita verifikasi
 * keberadaan CSS custom properties dengan membaca file CSS secara langsung.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const indexCSS = readFileSync(resolve(__dirname, 'index.css'), 'utf-8');
const componentsCSS = readFileSync(resolve(__dirname, 'components.css'), 'utf-8');
const pagesCSS = readFileSync(resolve(__dirname, 'pages.css'), 'utf-8');

describe('CSS Design System — Variables & Classes', () => {
  // ---- index.css: CSS custom properties ----
  describe('index.css — CSS custom properties', () => {
    const requiredTokens = [
      // Core tokens (sudah ada)
      '--bg-primary',
      '--bg-secondary',
      '--bg-surface',
      '--color-primary',
      '--color-hadir',
      '--color-izin',
      '--color-sakit',
      '--color-alpha',
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--transition-fast',
      '--transition-base',
      '--sidebar-width',
      '--navbar-height',
      // Token baru — progress bar
      '--progress-height',
      '--progress-bg',
      '--progress-fill',
      // Token baru — quick stats
      '--quick-stats-bg',
      '--quick-stats-border',
      '--quick-stats-radius',
      // Token baru — sidebar user
      '--sidebar-user-bg',
      '--sidebar-user-border',
      '--sidebar-user-radius',
    ];

    requiredTokens.forEach((token) => {
      it(`mendefinisikan ${token}`, () => {
        expect(indexCSS).toContain(token);
      });
    });
  });

  // ---- components.css: class selectors ----
  describe('components.css — class selectors', () => {
    const requiredClasses = [
      // Progress bar
      '.progress-bar-container',
      '.progress-bar',
      '.progress-fill',
      '.progress-fill-hadir',
      '.progress-fill-izin',
      '.progress-fill-sakit',
      '.progress-fill-alpha',
      '.progress-fill-primary',
      '.progress-label',
      // Note input
      '.note-input',
      // Quick stats
      '.quick-stats',
      '.quick-stats-progress',
      '.quick-stats-breakdown',
      '.quick-stats-stat',
      // Sidebar user
      '.sidebar-user',
      '.sidebar-user-info',
      '.sidebar-user-name',
    ];

    requiredClasses.forEach((cls) => {
      it(`mendefinisikan class ${cls}`, () => {
        expect(componentsCSS).toContain(cls);
      });
    });
  });

  // ---- pages.css: layout classes ----
  describe('pages.css — layout classes', () => {
    const requiredClasses = [
      // Management page
      '.management-page',
      '.management-tabs',
      '.management-tab',
      '.management-tab.active',
      '.management-section',
      // Student recap page
      '.student-recap-page',
    ];

    requiredClasses.forEach((cls) => {
      it(`mendefinisikan class ${cls}`, () => {
        expect(pagesCSS).toContain(cls);
      });
    });

    it('memiliki responsive media query untuk mobile (max-width: 768px)', () => {
      // Hitung berapa kali media query muncul — harus ada minimal 2 (yang lama + yang baru)
      const matches = pagesCSS.match(/@media \(max-width: 768px\)/g);
      expect(matches).not.toBeNull();
      expect(matches && matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---- Konsistensi antar file ----
  describe('Konsistensi design system', () => {
    it('progress-fill menggunakan var(--progress-fill) sebagai default', () => {
      expect(componentsCSS).toContain('background: var(--progress-fill)');
    });

    it('note-input memiliki maxlength yang diatur via CSS (maxlength di HTML, focus style di CSS)', () => {
      expect(componentsCSS).toContain('.note-input:focus');
    });

    it('management-tab.active memiliki background color', () => {
      // Pastikan ada styling untuk active state
      const activeIdx = pagesCSS.indexOf('.management-tab.active');
      expect(activeIdx).toBeGreaterThan(-1);
      const snippet = pagesCSS.slice(activeIdx, activeIdx + 200);
      expect(snippet).toContain('background');
    });
  });
});
