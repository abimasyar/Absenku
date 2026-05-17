/**
 * Progress Bar Component
 * Komponen untuk menampilkan progress bar dengan berbagai warna
 */

/**
 * Render progress bar dengan persentase
 * @param {number} value - Nilai saat ini
 * @param {number} max - Nilai maksimum
 * @param {string} color - Warna progress bar ('primary', 'hadir', 'izin', 'sakit', 'alpha')
 * @returns {string} HTML string untuk progress bar
 */
export function renderProgressBar(value, max, color = 'primary') {
  // Hitung persentase
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  
  return `
    <div class="progress-bar-container">
      <div class="progress-bar">
        <div class="progress-fill progress-fill-${color}" 
             style="width: ${percentage}%"
             data-value="${percentage}"></div>
      </div>
      <span class="progress-label">${percentage}%</span>
    </div>
  `;
}

/**
 * Render quick stats untuk halaman absensi
 * @param {Object} attendanceState - State absensi siswa { studentId: { status, note } }
 * @param {number} totalStudents - Total jumlah siswa
 * @returns {string} HTML string untuk quick stats bar
 */
export function renderQuickStats(attendanceState, totalStudents) {
  // Hitung statistik
  const stateValues = Object.values(attendanceState);
  const filled = stateValues.filter(s => s.status).length;
  const hadir = stateValues.filter(s => s.status === 'hadir').length;
  const izin = stateValues.filter(s => s.status === 'izin').length;
  const sakit = stateValues.filter(s => s.status === 'sakit').length;
  const alpha = stateValues.filter(s => s.status === 'alpha').length;
  
  // Hitung persentase kehadiran
  const attendanceRate = totalStudents > 0 ? Math.round((hadir / totalStudents) * 100) : 0;
  
  // Hitung persentase filled untuk progress bar
  const filledPercentage = totalStudents > 0 ? Math.round((filled / totalStudents) * 100) : 0;
  
  return `
    <div class="quick-stats">
      <div class="quick-stats-progress">
        <div class="progress-bar">
          <div class="progress-fill progress-fill-primary" 
               style="width: ${filledPercentage}%"></div>
        </div>
        <span>${filled}/${totalStudents} diisi</span>
      </div>
      <div class="quick-stats-breakdown">
        <div class="quick-stats-stat hadir">
          <span class="dot"></span>
          <span>Hadir: ${hadir}</span>
        </div>
        <div class="quick-stats-stat izin">
          <span class="dot"></span>
          <span>Izin: ${izin}</span>
        </div>
        <div class="quick-stats-stat sakit">
          <span class="dot"></span>
          <span>Sakit: ${sakit}</span>
        </div>
        <div class="quick-stats-stat alpha">
          <span class="dot"></span>
          <span>Alpha: ${alpha}</span>
        </div>
        <div class="quick-stats-stat" style="color: var(--text-secondary);">
          <span>Kehadiran: ${attendanceRate}%</span>
        </div>
      </div>
    </div>
  `;
}
