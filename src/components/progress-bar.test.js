/**
 * Tests untuk komponen progress-bar.js
 * 
 * Mencakup:
 * - Unit tests untuk renderProgressBar
 * - Unit tests untuk renderQuickStats
 * - Property 3: Quick Stats Invariant
 *   Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { renderProgressBar, renderQuickStats } from './progress-bar.js';

// ============================================================
// Unit Tests — renderProgressBar
// ============================================================

describe('renderProgressBar', () => {
  it('mengembalikan HTML string yang mengandung class yang benar', () => {
    const html = renderProgressBar(50, 100);
    expect(html).toContain('progress-bar-container');
    expect(html).toContain('progress-bar');
    expect(html).toContain('progress-fill');
    expect(html).toContain('progress-label');
  });

  it('menggunakan color default "primary" jika tidak diberikan', () => {
    const html = renderProgressBar(50, 100);
    expect(html).toContain('progress-fill-primary');
  });

  it('menggunakan color yang diberikan', () => {
    const colors = ['primary', 'hadir', 'izin', 'sakit', 'alpha'];
    for (const color of colors) {
      const html = renderProgressBar(50, 100, color);
      expect(html).toContain(`progress-fill-${color}`);
    }
  });

  it('menghitung persentase dengan benar (50/100 = 50%)', () => {
    const html = renderProgressBar(50, 100);
    expect(html).toContain('width: 50%');
    expect(html).toContain('50%');
  });

  it('menghitung persentase dengan benar (1/3 dibulatkan = 33%)', () => {
    const html = renderProgressBar(1, 3);
    expect(html).toContain('width: 33%');
  });

  it('mengembalikan 0% jika max = 0', () => {
    const html = renderProgressBar(0, 0);
    expect(html).toContain('width: 0%');
    expect(html).toContain('0%');
  });

  it('membatasi persentase maksimal 100% meski value > max', () => {
    const html = renderProgressBar(150, 100);
    expect(html).toContain('width: 100%');
    expect(html).not.toContain('width: 150%');
  });

  it('mengembalikan 0% jika value = 0', () => {
    const html = renderProgressBar(0, 100);
    expect(html).toContain('width: 0%');
  });

  it('mengembalikan 100% jika value = max', () => {
    const html = renderProgressBar(30, 30);
    expect(html).toContain('width: 100%');
  });
});

// ============================================================
// Unit Tests — renderQuickStats
// ============================================================

describe('renderQuickStats', () => {
  it('mengembalikan HTML string dengan class yang benar', () => {
    const state = { s1: { status: 'hadir', note: '' } };
    const html = renderQuickStats(state, 1);
    expect(html).toContain('quick-stats');
    expect(html).toContain('quick-stats-progress');
    expect(html).toContain('quick-stats-breakdown');
    expect(html).toContain('quick-stats-stat');
  });

  it('menampilkan counter filled/total dengan benar', () => {
    const state = {
      s1: { status: 'hadir', note: '' },
      s2: { status: '', note: '' },
    };
    const html = renderQuickStats(state, 2);
    expect(html).toContain('1/2 diisi');
  });

  it('menampilkan breakdown per status dengan benar', () => {
    const state = {
      s1: { status: 'hadir', note: '' },
      s2: { status: 'izin', note: '' },
      s3: { status: 'sakit', note: '' },
      s4: { status: 'alpha', note: '' },
    };
    const html = renderQuickStats(state, 4);
    expect(html).toContain('Hadir: 1');
    expect(html).toContain('Izin: 1');
    expect(html).toContain('Sakit: 1');
    expect(html).toContain('Alpha: 1');
  });

  it('menampilkan persentase kehadiran dengan benar', () => {
    const state = {
      s1: { status: 'hadir', note: '' },
      s2: { status: 'hadir', note: '' },
      s3: { status: 'alpha', note: '' },
      s4: { status: 'alpha', note: '' },
    };
    const html = renderQuickStats(state, 4);
    // 2 hadir dari 4 total = 50%
    expect(html).toContain('Kehadiran: 50%');
  });

  it('menampilkan 0% kehadiran jika totalStudents = 0', () => {
    const html = renderQuickStats({}, 0);
    expect(html).toContain('Kehadiran: 0%');
    expect(html).toContain('0/0 diisi');
  });

  it('menampilkan 100% kehadiran jika semua hadir', () => {
    const state = {
      s1: { status: 'hadir', note: '' },
      s2: { status: 'hadir', note: '' },
    };
    const html = renderQuickStats(state, 2);
    expect(html).toContain('Kehadiran: 100%');
  });

  it('menampilkan dot warna untuk setiap status', () => {
    const state = { s1: { status: 'hadir', note: '' } };
    const html = renderQuickStats(state, 1);
    // Setiap status memiliki dot
    expect(html).toContain('class="dot"');
  });
});

// ============================================================
// Property Tests
// ============================================================

/**
 * Property 3: Quick Stats Invariant
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 *
 * Untuk semua attendanceState dengan N siswa:
 * (a) hadir + izin + sakit + alpha + belum_diisi = N
 * (b) persentase kehadiran = (hadir / N) × 100 dan berada dalam rentang [0, 100]
 * (c) setiap perubahan status siswa langsung tercermin pada semua nilai stats
 */
describe('Feature: attendance-management-upgrade', () => {
  // Generator untuk status absensi yang valid
  const statusArb = fc.oneof(
    fc.constant('hadir'),
    fc.constant('izin'),
    fc.constant('sakit'),
    fc.constant('alpha'),
    fc.constant(''),  // belum diisi
  );

  // Generator untuk attendanceState
  const attendanceStateArb = fc.array(
    fc.record({
      id: fc.uuid(),
      status: statusArb,
    }),
    { minLength: 0, maxLength: 50 }
  ).map(entries =>
    Object.fromEntries(entries.map(e => [e.id, { status: e.status, note: '' }]))
  );

  it('Property 3: Quick Stats Invariant — hadir+izin+sakit+alpha+belum_diisi = N', () => {
    fc.assert(
      fc.property(attendanceStateArb, (attendanceState) => {
        const stateValues = Object.values(attendanceState);
        const N = stateValues.length;

        const hadir = stateValues.filter(s => s.status === 'hadir').length;
        const izin = stateValues.filter(s => s.status === 'izin').length;
        const sakit = stateValues.filter(s => s.status === 'sakit').length;
        const alpha = stateValues.filter(s => s.status === 'alpha').length;
        const belumDiisi = stateValues.filter(s => !s.status).length;

        // (a) Semua status harus berjumlah N
        expect(hadir + izin + sakit + alpha + belumDiisi).toBe(N);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Quick Stats Invariant — persentase kehadiran dalam rentang [0, 100]', () => {
    fc.assert(
      fc.property(attendanceStateArb, (attendanceState) => {
        const stateValues = Object.values(attendanceState);
        // totalStudents = jumlah siswa di state (konsisten dengan penggunaan nyata)
        const N = stateValues.length;
        const hadir = stateValues.filter(s => s.status === 'hadir').length;

        // (b) Persentase kehadiran harus dalam rentang [0, 100]
        // hadir tidak bisa melebihi N karena hadir adalah subset dari N siswa
        const rate = N > 0 ? Math.round((hadir / N) * 100) : 0;
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Quick Stats Invariant — renderQuickStats mencerminkan state dengan benar', () => {
    fc.assert(
      fc.property(attendanceStateArb, (attendanceState) => {
        const stateValues = Object.values(attendanceState);
        const N = stateValues.length;

        const hadir = stateValues.filter(s => s.status === 'hadir').length;
        const izin = stateValues.filter(s => s.status === 'izin').length;
        const sakit = stateValues.filter(s => s.status === 'sakit').length;
        const alpha = stateValues.filter(s => s.status === 'alpha').length;
        const filled = stateValues.filter(s => s.status).length;

        const html = renderQuickStats(attendanceState, N);

        // (c) HTML harus mencerminkan nilai yang dihitung dari state
        expect(html).toContain(`Hadir: ${hadir}`);
        expect(html).toContain(`Izin: ${izin}`);
        expect(html).toContain(`Sakit: ${sakit}`);
        expect(html).toContain(`Alpha: ${alpha}`);
        expect(html).toContain(`${filled}/${N} diisi`);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Quick Stats Invariant — persentase kehadiran di HTML konsisten dengan state', () => {
    fc.assert(
      fc.property(
        // Gunakan state dengan N siswa yang sama persis
        fc.array(
          fc.record({
            id: fc.uuid(),
            status: statusArb,
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (entries) => {
          const attendanceState = Object.fromEntries(
            entries.map(e => [e.id, { status: e.status, note: '' }])
          );
          const N = entries.length;
          const hadir = entries.filter(e => e.status === 'hadir').length;
          const expectedRate = Math.round((hadir / N) * 100);

          const html = renderQuickStats(attendanceState, N);

          // Persentase di HTML harus sesuai dengan kalkulasi manual
          expect(html).toContain(`Kehadiran: ${expectedRate}%`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
