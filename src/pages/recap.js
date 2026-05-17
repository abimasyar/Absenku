/**
 * Recap Page — Monthly attendance summary with chart, export, and student recap link
 */
import { supabase } from '../supabase.js';
import { renderAppShell } from '../main.js';
import { showToast } from '../components/toast.js';
import { getMonthlyRecap } from '../utils/api.js';
import { exportToCSV, printRecap } from '../utils/export.js';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/date.js';
import { isDemoMode, demoQueryClasses } from '../demo.js';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);
let chartInstance = null;

// State rekap yang sudah dimuat
let currentRecapData = null;
let currentClassName = '';
let currentMonth = getCurrentMonth();
let currentYear = getCurrentYear();
let currentClassId = '';

export async function renderRecapPage() {
  const app = document.getElementById('app');
  await renderAppShell(app, 'Rekap Bulanan');
  const content = document.getElementById('page-content');
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  content.innerHTML = `
    <div class="animate-fade-in-up">
      <!-- Header Section -->
      <div class="recap-page-header">
        <div class="recap-page-title-group">
          <h2 class="recap-page-title">📊 Rekap Bulanan</h2>
          <p class="recap-page-subtitle">Ringkasan kehadiran siswa per kelas dalam satu bulan</p>
        </div>
        <div class="recap-export-actions" id="recap-export-actions" style="display:none">
          <a class="btn btn-outline btn-sm" id="btn-student-recap" href="#/recap/student">
            👤 Rekap per Siswa
          </a>
          <button class="btn btn-outline btn-sm" id="btn-print-recap">
            🖨️ Print
          </button>
          <button class="btn btn-primary btn-sm" id="btn-export-csv">
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="card recap-filters-card">
        <div class="recap-filters">
          <div class="form-group">
            <label class="form-label" for="recap-class">Kelas</label>
            <select class="form-select" id="recap-class" style="min-width:160px"></select>
          </div>
          <div class="form-group">
            <label class="form-label" for="recap-month">Bulan</label>
            <select class="form-select" id="recap-month" style="min-width:140px">
              ${months.map(m => `<option value="${m}" ${m === getCurrentMonth() ? 'selected' : ''}>${getMonthName(m)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="recap-year">Tahun</label>
            <input class="form-input" type="number" id="recap-year" value="${getCurrentYear()}" min="2000" max="2099" style="width:100px" />
          </div>
          <div class="form-group" style="justify-content:flex-end">
            <label class="form-label">&nbsp;</label>
            <button class="btn btn-primary btn-sm" id="btn-load-recap">📊 Tampilkan</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div id="recap-empty" class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">Belum Ada Data</div>
        <div class="empty-state-text">Pilih kelas, bulan, dan tahun lalu klik Tampilkan.</div>
      </div>

      <!-- Data Section (chart + table side by side) -->
      <div id="recap-data-section" style="display:none">
        <!-- Judul informatif -->
        <div class="recap-data-header">
          <h3 class="recap-data-title" id="recap-title"></h3>
          <div class="recap-data-meta" id="recap-data-meta"></div>
        </div>

        <!-- Chart + Table side by side -->
        <div class="recap-content-grid">
          <!-- Chart -->
          <div class="recap-chart-container">
            <div class="recap-chart-label">Distribusi Kehadiran</div>
            <div class="recap-chart-wrapper">
              <canvas id="recap-chart"></canvas>
            </div>
          </div>

          <!-- Table -->
          <div class="recap-table-container">
            <div class="recap-table-label">Detail Rekap</div>
            <div class="card" style="padding:0;overflow:hidden">
              <table class="recap-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th style="text-align:center">Jumlah</th>
                    <th style="text-align:center">Persentase</th>
                  </tr>
                </thead>
                <tbody id="recap-table-body"></tbody>
              </table>
            </div>

            <!-- Link ke rekap per siswa -->
            <div class="recap-student-link-section" id="recap-student-link-section">
              <div class="recap-student-link-info">
                <span class="recap-student-link-icon">👤</span>
                <div>
                  <div class="recap-student-link-title">Lihat Rekap per Siswa</div>
                  <div class="recap-student-link-desc">Tampilkan history kehadiran individual setiap siswa di kelas ini</div>
                </div>
              </div>
              <a class="btn btn-outline btn-sm" id="btn-student-recap-inline" href="#/recap/student">
                Lihat →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Muat daftar kelas
  const { data: classes } = isDemoMode()
    ? demoQueryClasses()
    : await supabase.from('classes').select('id, name, grade_level').order('name');

  const classSelect = document.getElementById('recap-class');
  if (!classes || classes.length === 0) {
    classSelect.innerHTML = '<option value="">Tidak ada kelas</option>';
    return;
  }
  classSelect.innerHTML = classes.map(c => `<option value="${c.id}">Kelas ${c.name}</option>`).join('');

  async function loadRecap() {
    currentClassId = classSelect.value;
    currentMonth = parseInt(document.getElementById('recap-month').value);
    currentYear = parseInt(document.getElementById('recap-year').value);
    if (!currentClassId) return;
    currentClassName = classSelect.options[classSelect.selectedIndex].text;

    try {
      const recap = await getMonthlyRecap(currentClassId, currentMonth, currentYear);
      const total = recap.total_hadir + recap.total_izin + recap.total_sakit + recap.total_alpha;

      if (total === 0) {
        document.getElementById('recap-data-section').style.display = 'none';
        document.getElementById('recap-export-actions').style.display = 'none';
        document.getElementById('recap-empty').style.display = 'block';
        document.getElementById('recap-empty').innerHTML = `
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">Tidak Ada Data Absensi</div>
          <div class="empty-state-text">Belum ada data absensi untuk ${currentClassName} pada ${getMonthName(currentMonth)} ${currentYear}.</div>
        `;
        currentRecapData = null;
        return;
      }

      // Simpan data rekap ke state
      currentRecapData = recap;

      // Tampilkan section data, sembunyikan empty state
      document.getElementById('recap-empty').style.display = 'none';
      document.getElementById('recap-data-section').style.display = 'block';
      document.getElementById('recap-export-actions').style.display = 'flex';

      // Set judul informatif
      const titleEl = document.getElementById('recap-title');
      titleEl.textContent = `${currentClassName} — ${getMonthName(currentMonth)} ${currentYear}`;

      // Set meta info
      const metaEl = document.getElementById('recap-data-meta');
      const hadirRate = total > 0 ? ((recap.total_hadir / total) * 100).toFixed(1) : '0';
      metaEl.innerHTML = `
        <span class="recap-meta-badge recap-meta-total">${total} total absensi</span>
        <span class="recap-meta-badge recap-meta-rate">✅ ${hadirRate}% kehadiran</span>
      `;

      // Update link rekap per siswa dengan classId
      const studentRecapUrl = `#/recap/student/${currentClassId}`;
      const btnStudentRecap = document.getElementById('btn-student-recap');
      const btnStudentRecapInline = document.getElementById('btn-student-recap-inline');
      if (btnStudentRecap) btnStudentRecap.href = studentRecapUrl;
      if (btnStudentRecapInline) btnStudentRecapInline.href = studentRecapUrl;

      // Render chart
      if (chartInstance) chartInstance.destroy();
      const ctx = document.getElementById('recap-chart').getContext('2d');
      chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Hadir', 'Izin', 'Sakit', 'Alpha'],
          datasets: [{
            data: [recap.total_hadir, recap.total_izin, recap.total_sakit, recap.total_alpha],
            backgroundColor: [
              getComputedStyle(document.documentElement).getPropertyValue('--color-hadir').trim(),
              getComputedStyle(document.documentElement).getPropertyValue('--color-izin').trim(),
              getComputedStyle(document.documentElement).getPropertyValue('--color-sakit').trim(),
              getComputedStyle(document.documentElement).getPropertyValue('--color-alpha').trim(),
            ],
            borderWidth: 0,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#aaa',
                padding: 16,
                font: { family: 'Inter', size: 13 },
              },
            },
            tooltip: {
              backgroundColor: 'hsl(225,20%,13%)',
              titleColor: '#fff',
              bodyColor: '#ccc',
              borderColor: 'hsl(225,15%,22%)',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 12,
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                  return ` ${ctx.label}: ${val} (${pct}%)`;
                },
              },
            },
          },
        },
      });

      // Render tabel
      const pct = (v) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';
      document.getElementById('recap-table-body').innerHTML = `
        <tr>
          <td><span class="badge badge-hadir">Hadir</span></td>
          <td style="text-align:center;font-weight:600">${recap.total_hadir}</td>
          <td style="text-align:center">${pct(recap.total_hadir)}</td>
        </tr>
        <tr>
          <td><span class="badge badge-izin">Izin</span></td>
          <td style="text-align:center;font-weight:600">${recap.total_izin}</td>
          <td style="text-align:center">${pct(recap.total_izin)}</td>
        </tr>
        <tr>
          <td><span class="badge badge-sakit">Sakit</span></td>
          <td style="text-align:center;font-weight:600">${recap.total_sakit}</td>
          <td style="text-align:center">${pct(recap.total_sakit)}</td>
        </tr>
        <tr>
          <td><span class="badge badge-alpha">Alpha</span></td>
          <td style="text-align:center;font-weight:600">${recap.total_alpha}</td>
          <td style="text-align:center">${pct(recap.total_alpha)}</td>
        </tr>
        <tr class="recap-table-total-row">
          <td style="font-weight:700">Total</td>
          <td style="text-align:center;font-weight:700">${total}</td>
          <td style="text-align:center;font-weight:700">100%</td>
        </tr>
      `;
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat rekap: ' + err.message, 'error');
    }
  }

  // Handler Export CSV
  function handleExportCSV() {
    if (!currentRecapData) {
      showToast('Muat data rekap terlebih dahulu', 'warning');
      return;
    }

    try {
      const total = currentRecapData.total_hadir + currentRecapData.total_izin +
        currentRecapData.total_sakit + currentRecapData.total_alpha;
      const hadirRate = total > 0
        ? ((currentRecapData.total_hadir / total) * 100).toFixed(1) + '%'
        : '0%';

      // Buat satu baris summary untuk kelas
      const rows = [{
        name: currentClassName,
        nis: '-',
        hadir: currentRecapData.total_hadir,
        izin: currentRecapData.total_izin,
        sakit: currentRecapData.total_sakit,
        alpha: currentRecapData.total_alpha,
        total,
        attendanceRate: hadirRate,
      }];

      // Format nama file: Rekap_Kelas-{nama}_Bulan-{bulan}_{tahun}.csv
      // Bersihkan nama kelas dari prefix "Kelas "
      const rawClassName = currentClassName.replace(/^Kelas\s+/i, '');
      const filename = `Rekap_Kelas-${rawClassName}_Bulan-${getMonthName(currentMonth)}-${currentYear}.csv`;

      exportToCSV(rows, filename);
      showToast('File CSV berhasil diunduh', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor CSV: ' + err.message, 'error');
    }
  }

  // Handler Print
  function handlePrint() {
    if (!currentRecapData) {
      showToast('Muat data rekap terlebih dahulu', 'warning');
      return;
    }

    try {
      const total = currentRecapData.total_hadir + currentRecapData.total_izin +
        currentRecapData.total_sakit + currentRecapData.total_alpha;
      const pct = (v) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';
      const hadirRate = pct(currentRecapData.total_hadir);

      const title = `${currentClassName} — ${getMonthName(currentMonth)} ${currentYear}`;

      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Jumlah</th>
              <th>Persentase</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Hadir</td><td>${currentRecapData.total_hadir}</td><td>${pct(currentRecapData.total_hadir)}</td></tr>
            <tr><td>Izin</td><td>${currentRecapData.total_izin}</td><td>${pct(currentRecapData.total_izin)}</td></tr>
            <tr><td>Sakit</td><td>${currentRecapData.total_sakit}</td><td>${pct(currentRecapData.total_sakit)}</td></tr>
            <tr><td>Alpha</td><td>${currentRecapData.total_alpha}</td><td>${pct(currentRecapData.total_alpha)}</td></tr>
            <tr style="font-weight:700;background:#f0f0f0"><td>Total</td><td>${total}</td><td>100%</td></tr>
          </tbody>
        </table>
        <p style="margin-top:16px;font-size:11px;color:#666">
          Tingkat kehadiran: <strong>${hadirRate}</strong> &nbsp;|&nbsp;
          Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      `;

      printRecap(title, tableHTML);
    } catch (err) {
      console.error(err);
      showToast('Gagal membuka dialog print: ' + err.message, 'error');
    }
  }

  // Pasang event listeners
  document.getElementById('btn-load-recap').addEventListener('click', loadRecap);
  document.getElementById('btn-export-csv').addEventListener('click', handleExportCSV);
  document.getElementById('btn-print-recap').addEventListener('click', handlePrint);

  // Muat rekap awal
  await loadRecap();
}
