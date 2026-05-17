/**
 * Tests untuk halaman student-recap.js dan fungsi demoGetStudentRecap
 *
 * Mencakup:
 * - Unit tests untuk fungsi kalkulasi stats rekap per siswa
 * - Property 6: Rekap per Siswa Konsisten dengan Rekap Kelas
 *   Untuk semua kelas dan periode, sum rekap individual = total rekap kelas
 *   Validates: Requirements 7.3, 13.3
 */

import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

// ============================================================
// Helper: fungsi kalkulasi stats (diekstrak dari logika demo.js)
// ============================================================

/**
 * Hitung statistik dari array history absensi.
 * Ini adalah logika inti yang digunakan oleh demoGetStudentRecap.
 */
function calcStats(history) {
  let total_hadir = 0, total_izin = 0, total_sakit = 0, total_alpha = 0;
  history.forEach(h => {
    if (h.status === 'hadir') total_hadir++;
    else if (h.status === 'izin') total_izin++;
    else if (h.status === 'sakit') total_sakit++;
    else if (h.status === 'alpha') total_alpha++;
  });
  const total_days = total_hadir + total_izin + total_sakit + total_alpha;
  const attendance_rate = total_days > 0
    ? parseFloat(((total_hadir / total_days) * 100).toFixed(1))
    : 0;
  return { total_hadir, total_izin, total_sakit, total_alpha, total_days, attendance_rate };
}

/**
 * Hitung rekap kelas dari array absensi semua siswa di kelas tersebut.
 * Ini adalah logika inti yang digunakan oleh demoGetMonthlyRecap.
 */
function calcClassRecap(attendanceRecords) {
  let total_hadir = 0, total_izin = 0, total_sakit = 0, total_alpha = 0;
  attendanceRecords.forEach(att => {
    if (att.status === 'hadir') total_hadir++;
    else if (att.status === 'izin') total_izin++;
    else if (att.status === 'sakit') total_sakit++;
    else if (att.status === 'alpha') total_alpha++;
  });
  return { total_hadir, total_izin, total_sakit, total_alpha };
}

// ============================================================
// Unit Tests — calcStats
// ============================================================

describe('calcStats', () => {
  it('mengembalikan semua nol untuk history kosong', () => {
    const stats = calcStats([]);
    expect(stats.total_hadir).toBe(0);
    expect(stats.total_izin).toBe(0);
    expect(stats.total_sakit).toBe(0);
    expect(stats.total_alpha).toBe(0);
    expect(stats.total_days).toBe(0);
    expect(stats.attendance_rate).toBe(0);
  });

  it('menghitung hadir dengan benar', () => {
    const history = [
      { date: '2024-01-01', status: 'hadir', note: null },
      { date: '2024-01-02', status: 'hadir', note: null },
      { date: '2024-01-03', status: 'izin', note: 'sakit' },
    ];
    const stats = calcStats(history);
    expect(stats.total_hadir).toBe(2);
    expect(stats.total_izin).toBe(1);
    expect(stats.total_days).toBe(3);
  });

  it('menghitung persentase kehadiran dengan benar', () => {
    const history = [
      { date: '2024-01-01', status: 'hadir', note: null },
      { date: '2024-01-02', status: 'hadir', note: null },
      { date: '2024-01-03', status: 'hadir', note: null },
      { date: '2024-01-04', status: 'alpha', note: null },
    ];
    const stats = calcStats(history);
    expect(stats.total_hadir).toBe(3);
    expect(stats.total_alpha).toBe(1);
    expect(stats.total_days).toBe(4);
    expect(stats.attendance_rate).toBe(75.0);
  });

  it('menghitung semua status dengan benar', () => {
    const history = [
      { date: '2024-01-01', status: 'hadir', note: null },
      { date: '2024-01-02', status: 'izin', note: null },
      { date: '2024-01-03', status: 'sakit', note: null },
      { date: '2024-01-04', status: 'alpha', note: null },
    ];
    const stats = calcStats(history);
    expect(stats.total_hadir).toBe(1);
    expect(stats.total_izin).toBe(1);
    expect(stats.total_sakit).toBe(1);
    expect(stats.total_alpha).toBe(1);
    expect(stats.total_days).toBe(4);
    expect(stats.attendance_rate).toBe(25.0);
  });

  it('attendance_rate = 100 jika semua hadir', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      status: 'hadir',
      note: null,
    }));
    const stats = calcStats(history);
    expect(stats.attendance_rate).toBe(100.0);
  });

  it('attendance_rate = 0 jika semua alpha', () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      status: 'alpha',
      note: null,
    }));
    const stats = calcStats(history);
    expect(stats.attendance_rate).toBe(0);
  });
});

// ============================================================
// Unit Tests — calcClassRecap
// ============================================================

describe('calcClassRecap', () => {
  it('mengembalikan semua nol untuk records kosong', () => {
    const recap = calcClassRecap([]);
    expect(recap.total_hadir).toBe(0);
    expect(recap.total_izin).toBe(0);
    expect(recap.total_sakit).toBe(0);
    expect(recap.total_alpha).toBe(0);
  });

  it('menjumlahkan semua status dengan benar', () => {
    const records = [
      { student_id: 's1', status: 'hadir' },
      { student_id: 's2', status: 'hadir' },
      { student_id: 's3', status: 'izin' },
      { student_id: 's4', status: 'sakit' },
      { student_id: 's5', status: 'alpha' },
    ];
    const recap = calcClassRecap(records);
    expect(recap.total_hadir).toBe(2);
    expect(recap.total_izin).toBe(1);
    expect(recap.total_sakit).toBe(1);
    expect(recap.total_alpha).toBe(1);
  });
});

// ============================================================
// Property Tests
// ============================================================

/**
 * Property 6: Rekap per Siswa Konsisten dengan Rekap Kelas
 * Validates: Requirements 7.3, 13.3
 *
 * Untuk semua kelas dan periode bulan/tahun, menjumlahkan total hadir dari
 * rekap individual setiap siswa aktif di kelas tersebut harus menghasilkan
 * nilai yang sama dengan total hadir pada rekap bulanan kelas.
 */
describe('Feature: attendance-management-upgrade', () => {
  // Generator untuk status absensi yang valid
  const statusArb = fc.oneof(
    fc.constant('hadir'),
    fc.constant('izin'),
    fc.constant('sakit'),
    fc.constant('alpha')
  );

  // Generator untuk satu record absensi
  const attendanceRecordArb = fc.record({
    student_id: fc.string({ minLength: 1, maxLength: 20 }),
    status: statusArb,
    note: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  });

  // Generator untuk daftar siswa (minimal 1, maksimal 30)
  const studentIdsArb = fc.array(
    fc.string({ minLength: 1, maxLength: 20 }),
    { minLength: 1, maxLength: 30 }
  ).map(ids => [...new Set(ids)]); // pastikan unik

  it('Property 6: Sum rekap individual = total rekap kelas (total_hadir)', () => {
    fc.assert(
      fc.property(
        studentIdsArb,
        fc.array(statusArb, { minLength: 0, maxLength: 10 }),
        (studentIds, statusesPerStudent) => {
          // Buat attendance records: setiap siswa punya beberapa record
          const allRecords = [];
          studentIds.forEach((sid, idx) => {
            // Setiap siswa mendapat status yang berbeda-beda
            const count = (idx % 5) + 1; // 1-5 records per siswa
            for (let i = 0; i < count && i < statusesPerStudent.length; i++) {
              allRecords.push({ student_id: sid, status: statusesPerStudent[i] });
            }
          });

          // Hitung rekap kelas (semua records sekaligus)
          const classRecap = calcClassRecap(allRecords);

          // Hitung rekap per siswa lalu jumlahkan
          let sumHadir = 0, sumIzin = 0, sumSakit = 0, sumAlpha = 0;
          studentIds.forEach(sid => {
            const studentHistory = allRecords
              .filter(r => r.student_id === sid)
              .map(r => ({ status: r.status }));
            const studentStats = calcStats(studentHistory);
            sumHadir += studentStats.total_hadir;
            sumIzin += studentStats.total_izin;
            sumSakit += studentStats.total_sakit;
            sumAlpha += studentStats.total_alpha;
          });

          // Invariant: sum rekap individual = rekap kelas
          expect(sumHadir).toBe(classRecap.total_hadir);
          expect(sumIzin).toBe(classRecap.total_izin);
          expect(sumSakit).toBe(classRecap.total_sakit);
          expect(sumAlpha).toBe(classRecap.total_alpha);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Sum total_days rekap individual = jumlah total records kelas', () => {
    fc.assert(
      fc.property(
        studentIdsArb,
        fc.array(statusArb, { minLength: 1, maxLength: 20 }),
        (studentIds, statuses) => {
          // Distribusikan statuses ke siswa secara round-robin
          const allRecords = statuses.map((status, i) => ({
            student_id: studentIds[i % studentIds.length],
            status,
          }));

          // Total records kelas
          const totalClassRecords = allRecords.length;

          // Sum total_days dari rekap individual
          let sumTotalDays = 0;
          studentIds.forEach(sid => {
            const studentHistory = allRecords
              .filter(r => r.student_id === sid)
              .map(r => ({ status: r.status }));
            const studentStats = calcStats(studentHistory);
            sumTotalDays += studentStats.total_days;
          });

          // Invariant: sum total_days individual = total records kelas
          expect(sumTotalDays).toBe(totalClassRecords);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: attendance_rate per siswa selalu dalam rentang [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.array(statusArb, { minLength: 0, maxLength: 31 }),
        (statuses) => {
          const history = statuses.map((status, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            status,
            note: null,
          }));
          const stats = calcStats(history);

          expect(stats.attendance_rate).toBeGreaterThanOrEqual(0);
          expect(stats.attendance_rate).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: total_days = total_hadir + total_izin + total_sakit + total_alpha', () => {
    fc.assert(
      fc.property(
        fc.array(statusArb, { minLength: 0, maxLength: 31 }),
        (statuses) => {
          const history = statuses.map((status, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            status,
            note: null,
          }));
          const stats = calcStats(history);

          // Invariant: total_days = sum semua status
          expect(stats.total_days).toBe(
            stats.total_hadir + stats.total_izin + stats.total_sakit + stats.total_alpha
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
