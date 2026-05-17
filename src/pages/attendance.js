/**
 * Attendance Page — Mark student attendance
 */
import { supabase } from '../supabase.js';
import { renderAppShell } from '../main.js';
import { showToast } from '../components/toast.js';
import { submitAttendance, getStudentsByClass } from '../utils/api.js';
import { getToday, formatDateFull } from '../utils/date.js';
import { isDemoMode, demoQueryClasses, demoQueryAttendance } from '../demo.js';
import { filterStudents } from '../utils/filter.js';
import { renderQuickStats } from '../components/progress-bar.js';
import { showConfirmModal } from '../components/confirm-modal.js';

// Re-export untuk backward compatibility dan kemudahan import dari luar
export { filterStudents };

let attendanceState = {};
let searchQuery = '';

export async function renderAttendancePage(params = {}) {
  const app = document.getElementById('app');
  await renderAppShell(app, 'Absensi');
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="animate-fade-in-up">
      <div class="attendance-header">
        <div class="attendance-filters">
          <div class="form-group">
            <label class="form-label" for="att-class">Kelas</label>
            <select class="form-select" id="att-class" style="min-width:160px"></select>
          </div>
          <div class="form-group">
            <label class="form-label" for="att-date">Tanggal</label>
            <input class="form-input" type="date" id="att-date" value="${getToday()}" />
          </div>
        </div>
        <div class="attendance-actions">
          <button class="btn btn-secondary btn-sm" id="btn-all-hadir">✅ Semua Hadir</button>
        </div>
      </div>
      <div id="student-list-container">
        <div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Memuat data...</div></div>
      </div>
    </div>
  `;

  // Load classes
  const { data: classes } = isDemoMode()
    ? demoQueryClasses()
    : await supabase.from('classes').select('id, name, grade_level').order('name');

  const classSelect = document.getElementById('att-class');
  if (!classes || classes.length === 0) {
    classSelect.innerHTML = '<option value="">Tidak ada kelas</option>';
    document.getElementById('student-list-container').innerHTML = `
      <div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">Belum ada kelas</div></div>
    `;
    return;
  }

  classSelect.innerHTML = classes.map(c =>
    `<option value="${c.id}" ${c.id === params.classId ? 'selected' : ''}>Kelas ${c.name}</option>`
  ).join('');

  if (params.classId) classSelect.value = params.classId;

  async function loadStudents() {
    const classId = classSelect.value;
    const date = document.getElementById('att-date').value;
    if (!classId) return;

    // Reset search query saat load ulang
    searchQuery = '';

    const container = document.getElementById('student-list-container');
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Memuat siswa...</div></div>`;

    try {
      const students = await getStudentsByClass(classId);
      const activeStudents = students.filter(s => s.status === 'aktif');

      if (activeStudents.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Tidak ada siswa aktif</div></div>`;
        return;
      }

      // Check existing attendance
      let existing = [];
      if (isDemoMode()) {
        const r = demoQueryAttendance({ class_id: classId, date });
        existing = r.data || [];
      } else {
        const { data } = await supabase
          .from('attendance')
          .select('student_id, status, note')
          .eq('class_id', classId)
          .eq('date', date);
        existing = data || [];
      }

      const existingMap = {};
      existing.forEach(a => { existingMap[a.student_id] = a; });

      attendanceState = {};
      activeStudents.forEach(s => {
        const ex = existingMap[s.id];
        attendanceState[s.id] = { status: ex?.status || null, note: ex?.note || '' };
      });

      renderStudentList(activeStudents, date, classId);
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Gagal memuat</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  }

  // Simpan referensi ke semua siswa aktif agar filter tidak kehilangan data
  let allActiveStudents = [];

  function renderStudentList(students, date, classId) {
    // Simpan daftar lengkap siswa aktif untuk keperluan filter
    allActiveStudents = students;
    const container = document.getElementById('student-list-container');
    const statuses = ['hadir', 'izin', 'sakit', 'alpha'];
    const statusLabels = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpha: 'Alpha' };

    container.innerHTML = `
      <div style="margin-bottom:0.75rem;font-size:0.875rem;color:var(--text-secondary)">
        ${formatDateFull(date)}
      </div>
      <div class="search-bar-wrapper" style="margin-bottom:0.75rem;">
        <input
          class="form-input"
          type="text"
          id="student-search"
          placeholder="Cari nama atau NIS..."
          value="${searchQuery}"
          style="width:100%;"
        />
        <div id="search-counter" style="margin-top:0.4rem;font-size:0.8rem;color:var(--text-secondary);display:none;"></div>
      </div>
      <div id="quick-stats-container" style="margin-bottom:1rem;">
        ${renderQuickStats(attendanceState, students.length)}
      </div>
      <div class="student-list" id="student-list">
      </div>
      <div class="attendance-summary">
        <div class="attendance-summary-stats">
          <div class="attendance-summary-stat"><span style="color:var(--color-hadir)">✅</span> <span id="sum-hadir">0</span></div>
          <div class="attendance-summary-stat"><span style="color:var(--color-izin)">📝</span> <span id="sum-izin">0</span></div>
          <div class="attendance-summary-stat"><span style="color:var(--color-sakit)">🏥</span> <span id="sum-sakit">0</span></div>
          <div class="attendance-summary-stat"><span style="color:var(--color-alpha)">❌</span> <span id="sum-alpha">0</span></div>
        </div>
        <button class="btn btn-primary" id="btn-submit-attendance">
          💾 Simpan Absensi
        </button>
      </div>
    `;

    // Render baris siswa sesuai filter saat ini
    renderFilteredRows(statuses, statusLabels);
    updateSummary();

    // Event listener search bar — real-time filtering
    document.getElementById('student-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderFilteredRows(statuses, statusLabels);
      updateSearchCounter();
    });

    document.getElementById('btn-submit-attendance')?.addEventListener('click', async () => {
      // Hitung summary dari attendanceState
      const stateValues = Object.values(attendanceState);
      const hadir = stateValues.filter(v => v.status === 'hadir').length;
      const izin = stateValues.filter(v => v.status === 'izin').length;
      const sakit = stateValues.filter(v => v.status === 'sakit').length;
      const alpha = stateValues.filter(v => v.status === 'alpha').length;
      const total = allActiveStudents.length;
      const unfilledCount = stateValues.filter(v => !v.status).length;

      const summary = { hadir, izin, sakit, alpha, total, unfilledCount };

      // Tampilkan modal konfirmasi sebelum submit
      showConfirmModal(
        summary,
        // onConfirm — lakukan submit
        async () => {
          const btn = document.getElementById('btn-submit-attendance');
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner"></div> Menyimpan...';
          }

          const records = Object.entries(attendanceState)
            .filter(([_, v]) => v.status)
            .map(([studentId, v]) => ({ student_id: studentId, status: v.status, note: v.note || null }));

          try {
            const result = await submitAttendance(classId, date, records);
            showToast(`Absensi berhasil disimpan! (${result.inserted || 0} baru, ${result.updated || 0} diperbarui)`, 'success');
            if (btn) {
              btn.innerHTML = '✅ Tersimpan!';
              setTimeout(() => { btn.innerHTML = '💾 Simpan Absensi'; btn.disabled = false; }, 2000);
            }
          } catch (err) {
            showToast('Gagal menyimpan: ' + err.message, 'error');
            if (btn) {
              btn.innerHTML = '💾 Simpan Absensi';
              btn.disabled = false;
            }
          }
        },
        // onCancel — tutup modal tanpa submit
        null
      );
    });
  }

  /**
   * Render ulang baris siswa berdasarkan searchQuery saat ini.
   * attendanceState tidak diubah — hanya tampilan yang difilter.
   */
  function renderFilteredRows(statuses, statusLabels) {
    const listEl = document.getElementById('student-list');
    if (!listEl) return;

    const filtered = filterStudents(allActiveStudents, searchQuery);

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:2rem 0;">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Tidak ada siswa yang cocok</div>
          <div class="empty-state-text">Coba kata kunci lain</div>
        </div>
      `;
    } else {
      listEl.innerHTML = filtered.map((s, i) => {
        const st = attendanceState[s.id];
        return `
          <div class="student-row animate-fade-in-up delay-${Math.min(i + 1, 8)}" data-student-id="${s.id}">
            <div class="student-number">${i + 1}</div>
            <div class="student-info">
              <div class="student-name">${s.name}</div>
              <div class="student-nis">NIS: ${s.nis} · ${s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
            </div>
            <div class="student-statuses">
              ${statuses.map(status => `
                <button class="status-pill ${st?.status === status ? 'active' : ''}"
                  data-status="${status}" data-student="${s.id}">
                  ${statusLabels[status]}
                </button>
              `).join('')}
            </div>
            <div class="student-note">
              <input
                class="note-input"
                type="text"
                placeholder="Catatan (opsional)"
                maxlength="500"
                value="${(st?.note || '').replace(/"/g, '&quot;')}"
                data-student="${s.id}"
              />
            </div>
          </div>
        `;
      }).join('');
    }

    // Pasang event listener status pill
    listEl.querySelectorAll('.status-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const studentId = pill.dataset.student;
        const status = pill.dataset.status;
        attendanceState[studentId].status = status;
        const row = pill.closest('.student-row');
        row.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        updateSummary();
      });
    });

    // Pasang event listener note input — update state saat user mengetik
    listEl.querySelectorAll('.note-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const studentId = e.target.dataset.student;
        if (attendanceState[studentId]) {
          attendanceState[studentId].note = e.target.value;
        }
      });
    });

    updateSearchCounter();
  }

  /**
   * Tampilkan counter hasil pencarian saat query aktif.
   * Contoh: "Menampilkan 5 dari 30 siswa"
   */
  function updateSearchCounter() {
    const counterEl = document.getElementById('search-counter');
    if (!counterEl) return;
    if (!searchQuery || !searchQuery.trim()) {
      counterEl.style.display = 'none';
      counterEl.textContent = '';
    } else {
      const filtered = filterStudents(allActiveStudents, searchQuery);
      counterEl.style.display = 'block';
      counterEl.textContent = `Menampilkan ${filtered.length} dari ${allActiveStudents.length} siswa`;
    }
  }

  function updateSummary() {
    let h = 0, i = 0, s = 0, a = 0;
    Object.values(attendanceState).forEach(v => {
      if (v.status === 'hadir') h++; else if (v.status === 'izin') i++;
      else if (v.status === 'sakit') s++; else if (v.status === 'alpha') a++;
    });
    const el = (id) => document.getElementById(id);
    if (el('sum-hadir')) el('sum-hadir').textContent = h;
    if (el('sum-izin')) el('sum-izin').textContent = i;
    if (el('sum-sakit')) el('sum-sakit').textContent = s;
    if (el('sum-alpha')) el('sum-alpha').textContent = a;

    // Update quick stats secara real-time
    const quickStatsContainer = document.getElementById('quick-stats-container');
    if (quickStatsContainer) {
      quickStatsContainer.innerHTML = renderQuickStats(attendanceState, allActiveStudents.length);
    }
  }

  function checkSubmitReady(total) {
    const filled = Object.values(attendanceState).filter(s => s.status).length;
    const btn = document.getElementById('btn-submit-attendance');
    if (btn) btn.disabled = filled === 0;
  }

  document.getElementById('btn-all-hadir')?.addEventListener('click', () => {
    Object.keys(attendanceState).forEach(id => { attendanceState[id].status = 'hadir'; });
    // Re-render baris yang tampil agar status pill ter-update
    const statuses = ['hadir', 'izin', 'sakit', 'alpha'];
    const statusLabels = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpha: 'Alpha' };
    renderFilteredRows(statuses, statusLabels);
    updateSummary();
  });

  classSelect.addEventListener('change', loadStudents);
  document.getElementById('att-date')?.addEventListener('change', loadStudents);
  await loadStudents();
}
