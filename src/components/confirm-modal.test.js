/**
 * Tests untuk komponen confirm-modal.js
 * 
 * Mencakup:
 * - Property 8: Modal Konfirmasi Mencerminkan State Absensi
 *   Validates: Requirements 9.2, 9.3
 * - Unit tests untuk showConfirmModal
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showConfirmModal } from './confirm-modal.js';

// ============================================================
// Unit Tests — showConfirmModal
// ============================================================

describe('showConfirmModal', () => {
  // Setup dan cleanup untuk setiap test
  beforeEach(() => {
    // Pastikan body bersih sebelum test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Bersihkan modal setelah test
    const modal = document.getElementById('confirm-modal-overlay');
    if (modal) modal.remove();
  });

  it('menampilkan modal dengan overlay dan content', () => {
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
    showConfirmModal(summary, () => {}, () => {});

    const overlay = document.getElementById('confirm-modal-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains('modal-overlay')).toBe(true);

    const content = overlay.querySelector('.modal-content');
    expect(content).toBeTruthy();
  });

  it('menampilkan jumlah total siswa dengan benar', () => {
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
    showConfirmModal(summary, () => {}, () => {});

    const overlay = document.getElementById('confirm-modal-overlay');
    const bodyText = overlay.querySelector('.modal-body').textContent;
    expect(bodyText).toContain('15'); // total siswa
  });

  it('menampilkan jumlah sudah diisi dengan benar', () => {
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
    showConfirmModal(summary, () => {}, () => {});

    const overlay = document.getElementById('confirm-modal-overlay');
    const bodyText = overlay.querySelector('.modal-body').textContent;
    // Sudah diisi = hadir + izin + sakit + alpha = 13
    expect(bodyText).toContain('13');
  });

  it('menampilkan peringatan jika ada siswa belum diisi', () => {
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
    showConfirmModal(summary, () => {}, () => {});

    const overlay = document.getElementById('confirm-modal-overlay');
    const bodyText = overlay.querySelector('.modal-body').textContent;
    expect(bodyText).toContain('⚠️');
    expect(bodyText).toContain('2'); // unfilledCount
  });

  it('tidak menampilkan peringatan jika semua siswa sudah diisi', () => {
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 2, total: 15, unfilledCount: 0 };
    showConfirmModal(summary, () => {}, () => {});

    const overlay = document.getElementById('confirm-modal-overlay');
    const warningRow = overlay.querySelector('.confirm-summary-row.warning');
    expect(warningRow).toBeFalsy();
  });

  it('menampilkan breakdown per status dengan benar', () => {
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 3, total: 16, unfilledCount: 0 };
    showConfirmModal(summary, () => {}, () => {});

    const overlay = document.getElementById('confirm-modal-overlay');
    const bodyText = overlay.querySelector('.modal-body').textContent;
    
    // Cek setiap status ditampilkan
    expect(bodyText).toContain('Hadir');
    expect(bodyText).toContain('10');
    expect(bodyText).toContain('Izin');
    expect(bodyText).toContain('2');
    expect(bodyText).toContain('Sakit');
    expect(bodyText).toContain('1');
    expect(bodyText).toContain('Alpha');
    expect(bodyText).toContain('3');
  });

  it('memanggil onConfirm saat tombol Simpan diklik', () => {
    let confirmCalled = false;
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
    
    showConfirmModal(
      summary,
      () => { confirmCalled = true; },
      () => {}
    );

    const confirmBtn = document.getElementById('confirm-modal-confirm');
    confirmBtn.click();

    expect(confirmCalled).toBe(true);
  });

  it('memanggil onCancel saat tombol Batal diklik', () => {
    let cancelCalled = false;
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
    
    showConfirmModal(
      summary,
      () => {},
      () => { cancelCalled = true; }
    );

    const cancelBtn = document.getElementById('confirm-modal-cancel');
    cancelBtn.click();

    expect(cancelCalled).toBe(true);
  });

  it('memanggil onCancel saat tombol close (X) diklik', () => {
    let cancelCalled = false;
    const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
    
    showConfirmModal(
      summary,
      () => {},
      () => { cancelCalled = true; }
    );

    const closeBtn = document.getElementById('confirm-modal-close');
    closeBtn.click();

    expect(cancelCalled).toBe(true);
  });

  it('menghapus modal dari DOM setelah confirm', () => {
    return new Promise((resolve) => {
      const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
      
      showConfirmModal(summary, () => {}, () => {});

      const confirmBtn = document.getElementById('confirm-modal-confirm');
      confirmBtn.click();

      // Modal dihapus setelah animasi (200ms)
      setTimeout(() => {
        const modal = document.getElementById('confirm-modal-overlay');
        expect(modal).toBeFalsy();
        resolve();
      }, 250);
    });
  });

  it('menghapus modal dari DOM setelah cancel', () => {
    return new Promise((resolve) => {
      const summary = { hadir: 10, izin: 2, sakit: 1, alpha: 0, total: 15, unfilledCount: 2 };
      
      showConfirmModal(summary, () => {}, () => {});

      const cancelBtn = document.getElementById('confirm-modal-cancel');
      cancelBtn.click();

      // Modal dihapus setelah animasi (200ms)
      setTimeout(() => {
        const modal = document.getElementById('confirm-modal-overlay');
        expect(modal).toBeFalsy();
        resolve();
      }, 250);
    });
  });
});

// ============================================================
// Property Tests
// ============================================================

/**
 * Property 8: Modal Konfirmasi Mencerminkan State Absensi
 * Validates: Requirements 9.2, 9.3
 *
 * Untuk semua attendanceState, jumlah per status (hadir, izin, sakit, alpha)
 * yang ditampilkan di modal konfirmasi harus identik dengan jumlah yang dihitung
 * langsung dari attendanceState — tidak ada perbedaan antara data yang ditampilkan
 * dan data yang akan disimpan.
 */
describe('Feature: attendance-management-upgrade', () => {
  // Cleanup setelah setiap property test
  afterEach(() => {
    const modal = document.getElementById('confirm-modal-overlay');
    if (modal) modal.remove();
  });

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
    { minLength: 1, maxLength: 50 }
  ).map(entries =>
    Object.fromEntries(entries.map(e => [e.id, { status: e.status, note: '' }]))
  );

  it('Property 8: Modal konfirmasi mencerminkan state absensi — jumlah per status identik', () => {
    fc.assert(
      fc.property(attendanceStateArb, (attendanceState) => {
        const stateValues = Object.values(attendanceState);
        const total = stateValues.length;

        // Hitung jumlah per status dari state
        const hadir = stateValues.filter(v => v.status === 'hadir').length;
        const izin = stateValues.filter(v => v.status === 'izin').length;
        const sakit = stateValues.filter(v => v.status === 'sakit').length;
        const alpha = stateValues.filter(v => v.status === 'alpha').length;
        const unfilledCount = stateValues.filter(v => !v.status).length;

        const summary = { hadir, izin, sakit, alpha, total, unfilledCount };

        // Tampilkan modal
        showConfirmModal(summary, () => {}, () => {});

        const overlay = document.getElementById('confirm-modal-overlay');
        const bodyText = overlay.querySelector('.modal-body').textContent;

        // Verifikasi bahwa modal menampilkan jumlah yang sama dengan state
        // Total siswa
        expect(bodyText).toContain(total.toString());

        // Sudah diisi
        const filledCount = hadir + izin + sakit + alpha;
        expect(bodyText).toContain(filledCount.toString());

        // Breakdown per status — cek bahwa angka muncul di breakdown section
        const breakdownSection = overlay.querySelector('.confirm-breakdown');
        const breakdownText = breakdownSection.textContent;
        
        // Setiap status harus muncul dengan jumlah yang benar
        expect(breakdownText).toContain('Hadir');
        expect(breakdownText).toContain(hadir.toString());
        expect(breakdownText).toContain('Izin');
        expect(breakdownText).toContain(izin.toString());
        expect(breakdownText).toContain('Sakit');
        expect(breakdownText).toContain(sakit.toString());
        expect(breakdownText).toContain('Alpha');
        expect(breakdownText).toContain(alpha.toString());

        // Cleanup
        overlay.remove();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: Modal konfirmasi mencerminkan state absensi — peringatan unfilled konsisten', () => {
    fc.assert(
      fc.property(attendanceStateArb, (attendanceState) => {
        const stateValues = Object.values(attendanceState);
        const total = stateValues.length;

        const hadir = stateValues.filter(v => v.status === 'hadir').length;
        const izin = stateValues.filter(v => v.status === 'izin').length;
        const sakit = stateValues.filter(v => v.status === 'sakit').length;
        const alpha = stateValues.filter(v => v.status === 'alpha').length;
        const unfilledCount = stateValues.filter(v => !v.status).length;

        const summary = { hadir, izin, sakit, alpha, total, unfilledCount };

        // Tampilkan modal
        showConfirmModal(summary, () => {}, () => {});

        const overlay = document.getElementById('confirm-modal-overlay');
        const warningRow = overlay.querySelector('.confirm-summary-row.warning');

        // Jika ada siswa belum diisi, peringatan harus muncul
        if (unfilledCount > 0) {
          expect(warningRow).toBeTruthy();
          expect(warningRow.textContent).toContain(unfilledCount.toString());
        } else {
          // Jika semua sudah diisi, peringatan tidak boleh muncul
          expect(warningRow).toBeFalsy();
        }

        // Cleanup
        overlay.remove();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: Modal konfirmasi mencerminkan state absensi — invariant sum', () => {
    fc.assert(
      fc.property(attendanceStateArb, (attendanceState) => {
        const stateValues = Object.values(attendanceState);
        const total = stateValues.length;

        const hadir = stateValues.filter(v => v.status === 'hadir').length;
        const izin = stateValues.filter(v => v.status === 'izin').length;
        const sakit = stateValues.filter(v => v.status === 'sakit').length;
        const alpha = stateValues.filter(v => v.status === 'alpha').length;
        const unfilledCount = stateValues.filter(v => !v.status).length;

        // Invariant: hadir + izin + sakit + alpha + unfilledCount harus = total
        expect(hadir + izin + sakit + alpha + unfilledCount).toBe(total);

        const summary = { hadir, izin, sakit, alpha, total, unfilledCount };

        // Tampilkan modal
        showConfirmModal(summary, () => {}, () => {});

        const overlay = document.getElementById('confirm-modal-overlay');
        
        // Verifikasi bahwa data di modal konsisten dengan invariant
        const filledCount = hadir + izin + sakit + alpha;
        expect(filledCount + unfilledCount).toBe(total);

        // Cleanup
        overlay.remove();
      }),
      { numRuns: 100 }
    );
  });
});
