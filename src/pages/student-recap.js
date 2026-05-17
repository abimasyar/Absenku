/**
 * Student Recap Page — History absensi individual per siswa
 * Route: #/recap/student/:studentId
 */
import { supabase } from '../supabase.js';
import { renderAppShell } from '../main.js';
import { showToast } from '../components/toast.js';
import { getStudentRecap } from '../utils/api.js';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/date.js';
import { isDemoMode, demoQueryClasses, demoQueryStudents } from '../demo.js';

/**
 * Render badge HTML untuk status absensi
 */
function renderStatusBadge(status) {
  const map = {
    hadir: '<span class="badge badge-hadir">Hadir</span>',
    izin: '<span class="badge badge-izin">Izin</span>',
    sakit: '<span class="badge badge-sakit">Sakit</span>',
    alpha: '<span class="badge badge-alpha">Alpha</span>',
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

/**
 * Format tanggal ke format Indonesia: "Senin, 1 Januari 2024"
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Render halaman rekap per siswa
 * @param {Object} params - Route params, berisi studentId
 */
export async function renderStudentRecapPage(params) {
  const app = document.getElementById('app');
  await renderAppShell(app, 'Rekap per Siswa');
  const content = document.getElementById('page-content');

  const studentId = params?.studentId || null;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Baca bulan/tahun dari sessionStorage jika ada (dikirim dari picker page)
  const savedMonth = sessionStorage.getItem('recap_month');
  const savedYear = sessionStorage.getItem('recap_year');
  sessionStorage.removeItem('recap_month');
  sessionStorage.removeItem('recap_year');

  const currentMonth = savedMonth ? parseInt(savedMonth) : getCurrentMonth();
  const currentYear = savedYear ? parseInt(savedYear) : getCurrentYear();

  // Jika tidak ada studentId, tampilkan halaman pilih siswa
  if (!studentId) {
    await renderStudentPickerPage(content, months, currentMonth, currentYear);
    return;
  }

  // Render skeleton loading
  content.innerHTML = `
    <div class="animate-fade-in-up student-recap-page">
      <div class="student-recap-header">
        <div class="student-recap-info">
          <h2>Memuat data siswa...</h2>
          <p>Mohon tunggu</p>
        </div>
      </div>
    </div>
  `;

  // Muat data rekap
  await loadAndRenderRecap(content, studentId, currentMonth, currentYear, months);
}

/**
 * Render halaman pilih siswa (ketika tidak ada studentId di URL)
 */
async function renderStudentPickerPage(content, months, currentMonth, currentYear) {
  // Muat daftar kelas
  const { data: classes } = isDemoMode()
    ? demoQueryClasses()
    : await supabase.from('classes').select('id, name, grade_level').order('name');

  content.innerHTML = `
    <div class="animate-fade-in-up">
      <div class="recap-page-header">
        <div class="recap-page-title-group">
          <h2 class="recap-page-title">👤 Rekap per Siswa</h2>
          <p class="recap-page-subtitle">Pilih kelas dan siswa untuk melihat history kehadiran individual</p>
        </div>
        <a class="btn btn-outline btn-sm" href="#/recap">← Kembali ke Rekap Bulanan</a>
      </div>

      <div class="card" style="padding: 1.5rem">
        <div class="student-recap-filters">
          <div class="form-group">
            <label class="form-label" for="picker-class">Kelas</label>
            <select class="form-select" id="picker-class" style="min-width:160px">
              <option value="">Pilih kelas...</option>
              ${(classes || []).map(c => `<option value="${c.id}">Kelas ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="picker-student">Siswa</label>
            <select class="form-select" id="picker-student" style="min-width:200px" disabled>
              <option value="">Pilih kelas terlebih dahulu</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="picker-month">Bulan</label>
            <select class="form-select" id="picker-month" style="min-width:140px">
              ${months.map(m => `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${getMonthName(m)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="picker-year">Tahun</label>
            <input class="form-input" type="number" id="picker-year" value="${currentYear}" min="2000" max="2099" style="width:100px" />
          </div>
          <div class="form-group" style="justify-content:flex-end">
            <label class="form-label">&nbsp;</label>
            <button class="btn btn-primary btn-sm" id="btn-view-recap" disabled>👤 Lihat Rekap</button>
          </div>
        </div>
      </div>

      <div class="empty-state" id="picker-empty">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-title">Pilih Siswa</div>
        <div class="empty-state-text">Pilih kelas dan siswa untuk melihat rekap kehadiran individual.</div>
      </div>
    </div>
  `;

  const classSelect = document.getElementById('picker-class');
  const studentSelect = document.getElementById('picker-student');
  const btnView = document.getElementById('btn-view-recap');

  // Ketika kelas dipilih, muat daftar siswa
  classSelect.addEventListener('change', async () => {
    const classId = classSelect.value;
    if (!classId) {
      studentSelect.innerHTML = '<option value="">Pilih kelas terlebih dahulu</option>';
      studentSelect.disabled = true;
      btnView.disabled = true;
      return;
    }

    studentSelect.innerHTML = '<option value="">Memuat siswa...</option>';
    studentSelect.disabled = true;
    btnView.disabled = true;

    try {
      let students;
      if (isDemoMode()) {
        students = demoQueryStudents(classId).data;
      } else {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, nis')
          .eq('class_id', classId)
          .eq('status', 'aktif')
          .order('name');
        if (error) throw error;
        students = data || [];
      }

      if (students.length === 0) {
        studentSelect.innerHTML = '<option value="">Tidak ada siswa aktif</option>';
        studentSelect.disabled = true;
      } else {
        studentSelect.innerHTML = `
          <option value="">Pilih siswa...</option>
          ${students.map(s => `<option value="${s.id}">${s.name} (${s.nis})</option>`).join('')}
        `;
        studentSelect.disabled = false;
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat daftar siswa: ' + err.message, 'error');
      studentSelect.innerHTML = '<option value="">Gagal memuat siswa</option>';
    }
  });

  // Aktifkan tombol ketika siswa dipilih
  studentSelect.addEventListener('change', () => {
    btnView.disabled = !studentSelect.value;
  });

  // Navigasi ke halaman rekap siswa
  btnView.addEventListener('click', () => {
    const sid = studentSelect.value;
    const month = document.getElementById('picker-month').value;
    const year = document.getElementById('picker-year').value;
    if (sid) {
      // Simpan bulan & tahun di sessionStorage agar bisa dibaca setelah navigasi
      sessionStorage.setItem('recap_month', month);
      sessionStorage.setItem('recap_year', year);
      // Gunakan router.navigate agar hashchange ter-trigger dengan benar
      window.location.hash = `/recap/student/${sid}`;
    }
  });
}

/**
 * Muat dan render data rekap untuk studentId tertentu
 */
async function loadAndRenderRecap(content, studentId, month, year, months) {
  try {
    const data = await getStudentRecap(studentId, month, year);
    const { student, stats, history: attendanceHistory } = data;

    const total = stats.total_days;
    const hadirRate = total > 0
      ? ((stats.total_hadir / total) * 100).toFixed(1)
      : '0';

    content.innerHTML = `
      <div class="animate-fade-in-up student-recap-page">

        <!-- Header -->
        <div class="student-recap-header">
          <div class="student-recap-info">
            <h2>${student.name}</h2>
            <p>
              NIS: <strong>${student.nis}</strong>
              &nbsp;·&nbsp;
              Kelas: <strong>${student.class_name}</strong>
              &nbsp;·&nbsp;
              ${student.gender === 'L' ? '👦 Laki-laki' : '👧 Perempuan'}
            </p>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center">
            <a class="btn btn-outline btn-sm" href="#/recap/student">← Pilih Siswa Lain</a>
            <a class="btn btn-outline btn-sm" href="#/recap">📊 Rekap Bulanan</a>
          </div>
        </div>

        <!-- Filter Bulan/Tahun -->
        <div class="card" style="padding:1rem 1.5rem">
          <div class="student-recap-filters">
            <div class="form-group">
              <label class="form-label" for="filter-month">Bulan</label>
              <select class="form-select" id="filter-month" style="min-width:140px">
                ${months.map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${getMonthName(m)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="filter-year">Tahun</label>
              <input class="form-input" type="number" id="filter-year" value="${year}" min="2000" max="2099" style="width:100px" />
            </div>
            <div class="form-group" style="justify-content:flex-end">
              <label class="form-label">&nbsp;</label>
              <button class="btn btn-primary btn-sm" id="btn-filter-recap">🔍 Tampilkan</button>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="student-recap-stats" id="recap-stats-section">
          ${renderStatsCards(stats, hadirRate)}
        </div>

        <!-- History Table -->
        <div id="recap-history-section">
          ${renderHistoryTable(attendanceHistory, month, year)}
        </div>

      </div>
    `;

    // Event listener filter
    document.getElementById('btn-filter-recap').addEventListener('click', async () => {
      const newMonth = parseInt(document.getElementById('filter-month').value);
      const newYear = parseInt(document.getElementById('filter-year').value);

      const statsSection = document.getElementById('recap-stats-section');
      const historySection = document.getElementById('recap-history-section');

      statsSection.innerHTML = '<div class="loading-spinner" style="margin:1rem auto"></div>';
      historySection.innerHTML = '';

      try {
        const newData = await getStudentRecap(studentId, newMonth, newYear);
        const newTotal = newData.stats.total_days;
        const newHadirRate = newTotal > 0
          ? ((newData.stats.total_hadir / newTotal) * 100).toFixed(1)
          : '0';

        statsSection.innerHTML = renderStatsCards(newData.stats, newHadirRate);
        historySection.innerHTML = renderHistoryTable(newData.history, newMonth, newYear);

        // Update URL tanpa reload
        const newHash = `/recap/student/${studentId}?month=${newMonth}&year=${newYear}`;
        window.history.replaceState(null, '', '#' + newHash);
      } catch (err) {
        console.error(err);
        showToast('Gagal memuat rekap: ' + err.message, 'error');
        statsSection.innerHTML = renderStatsCards({ total_hadir: 0, total_izin: 0, total_sakit: 0, total_alpha: 0, total_days: 0 }, '0');
        historySection.innerHTML = renderHistoryTable([], month, year);
      }
    });

  } catch (err) {
    console.error(err);
    content.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Gagal Memuat Data</div>
          <div class="empty-state-text">${err.message}</div>
          <a class="btn btn-primary btn-sm" href="#/recap/student" style="margin-top:1rem">← Kembali</a>
        </div>
      </div>
    `;
  }
}

/**
 * Render stats cards HTML
 */
function renderStatsCards(stats, hadirRate) {
  return `
    <div class="card stat-card" style="text-align:center">
      <div class="stat-card-icon" style="color:var(--color-hadir)">✅</div>
      <div class="stat-card-value" style="color:var(--color-hadir)">${stats.total_hadir}</div>
      <div class="stat-card-label">Hadir</div>
    </div>
    <div class="card stat-card" style="text-align:center">
      <div class="stat-card-icon" style="color:var(--color-izin)">📋</div>
      <div class="stat-card-value" style="color:var(--color-izin)">${stats.total_izin}</div>
      <div class="stat-card-label">Izin</div>
    </div>
    <div class="card stat-card" style="text-align:center">
      <div class="stat-card-icon" style="color:var(--color-sakit)">🤒</div>
      <div class="stat-card-value" style="color:var(--color-sakit)">${stats.total_sakit}</div>
      <div class="stat-card-label">Sakit</div>
    </div>
    <div class="card stat-card" style="text-align:center">
      <div class="stat-card-icon" style="color:var(--color-alpha)">❌</div>
      <div class="stat-card-value" style="color:var(--color-alpha)">${stats.total_alpha}</div>
      <div class="stat-card-label">Alpha</div>
    </div>
    <div class="card stat-card" style="text-align:center">
      <div class="stat-card-icon">📅</div>
      <div class="stat-card-value">${stats.total_days}</div>
      <div class="stat-card-label">Total Hari</div>
    </div>
    <div class="card stat-card" style="text-align:center">
      <div class="stat-card-icon" style="color:var(--color-primary)">📈</div>
      <div class="stat-card-value" style="color:var(--color-primary)">${hadirRate}%</div>
      <div class="stat-card-label">% Kehadiran</div>
    </div>
  `;
}

/**
 * Render tabel history absensi
 */
function renderHistoryTable(history, month, year) {
  if (!history || history.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">Tidak Ada Data</div>
        <div class="empty-state-text">Belum ada data absensi untuk ${getMonthName(month)} ${year}.</div>
      </div>
    `;
  }

  const rows = history
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(item => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td style="text-align:center">${renderStatusBadge(item.status)}</td>
        <td style="color:var(--text-secondary);font-size:0.875rem">${item.note || '<span style="opacity:0.4">—</span>'}</td>
      </tr>
    `).join('');

  return `
    <div class="student-recap-table-wrapper">
      <table class="recap-table" style="width:100%">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th style="text-align:center;width:120px">Status</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}
