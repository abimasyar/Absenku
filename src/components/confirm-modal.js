/**
 * Confirm Modal Component
 * Modal konfirmasi sebelum menyimpan absensi
 */

/**
 * Tampilkan modal konfirmasi dengan ringkasan data absensi
 * @param {Object} summary - Ringkasan data { hadir, izin, sakit, alpha, total, unfilledCount }
 * @param {Function} onConfirm - Callback saat user mengkonfirmasi
 * @param {Function} onCancel - Callback saat user membatalkan
 */
export function showConfirmModal(summary, onConfirm, onCancel) {
  const { hadir, izin, sakit, alpha, total, unfilledCount } = summary;
  const filledCount = hadir + izin + sakit + alpha;
  
  // Buat modal overlay
  const modalHTML = `
    <div class="modal-overlay" id="confirm-modal-overlay">
      <div class="modal-content animate-fade-in-up">
        <div class="modal-header">
          <h3>Konfirmasi Simpan Absensi</h3>
          <button class="modal-close" id="confirm-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">
            Pastikan data absensi sudah benar sebelum disimpan.
          </p>
          
          <div class="confirm-summary">
            <div class="confirm-summary-row">
              <span class="confirm-summary-label">Total Siswa:</span>
              <span class="confirm-summary-value"><strong>${total}</strong></span>
            </div>
            <div class="confirm-summary-row">
              <span class="confirm-summary-label">Sudah Diisi:</span>
              <span class="confirm-summary-value"><strong>${filledCount}</strong></span>
            </div>
            ${unfilledCount > 0 ? `
              <div class="confirm-summary-row warning">
                <span class="confirm-summary-label">⚠️ Belum Diisi:</span>
                <span class="confirm-summary-value"><strong>${unfilledCount}</strong></span>
              </div>
            ` : ''}
          </div>
          
          <div class="confirm-breakdown">
            <h4 style="margin-bottom: 0.75rem; font-size: 0.9rem; color: var(--text-secondary);">
              Rincian Status:
            </h4>
            <div class="confirm-breakdown-grid">
              <div class="confirm-breakdown-item hadir">
                <span class="confirm-breakdown-icon">✅</span>
                <span class="confirm-breakdown-label">Hadir</span>
                <span class="confirm-breakdown-value">${hadir}</span>
              </div>
              <div class="confirm-breakdown-item izin">
                <span class="confirm-breakdown-icon">📝</span>
                <span class="confirm-breakdown-label">Izin</span>
                <span class="confirm-breakdown-value">${izin}</span>
              </div>
              <div class="confirm-breakdown-item sakit">
                <span class="confirm-breakdown-icon">🏥</span>
                <span class="confirm-breakdown-label">Sakit</span>
                <span class="confirm-breakdown-value">${sakit}</span>
              </div>
              <div class="confirm-breakdown-item alpha">
                <span class="confirm-breakdown-icon">❌</span>
                <span class="confirm-breakdown-label">Alpha</span>
                <span class="confirm-breakdown-value">${alpha}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-modal-cancel">
            Batal
          </button>
          <button class="btn btn-primary" id="confirm-modal-confirm">
            💾 Simpan Absensi
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Tambahkan modal ke body
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Event listeners
  const overlay = document.getElementById('confirm-modal-overlay');
  const closeBtn = document.getElementById('confirm-modal-close');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const confirmBtn = document.getElementById('confirm-modal-confirm');
  
  // Fungsi untuk menutup modal
  function closeModal() {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.remove();
    }, 200);
  }
  
  // Close button
  closeBtn.addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });
  
  // Confirm button
  confirmBtn.addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
  
  // Close on overlay click (outside modal content)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
      if (onCancel) onCancel();
    }
  });
  
  // Close on ESC key
  function handleEscape(e) {
    if (e.key === 'Escape') {
      closeModal();
      if (onCancel) onCancel();
      document.removeEventListener('keydown', handleEscape);
    }
  }
  document.addEventListener('keydown', handleEscape);
}
