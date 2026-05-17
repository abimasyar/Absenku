/**
 * Dashboard Page
 */
import { supabase } from '../supabase.js';
import { getProfile, getSchool } from '../auth.js';
import { renderAppShell } from '../main.js';
import { renderStatsCard, animateCounters } from '../components/stats-card.js';
import { getToday, formatDateFull, getGreeting } from '../utils/date.js';
import { showToast } from '../components/toast.js';
import { isDemoMode, demoQueryClasses, demoQueryStudents, demoQueryAttendance } from '../demo.js';

/**
 * Render mini progress bar HTML for class cards
 * @param {number} filled - number of filled attendance records
 * @param {number} total - total students
 * @param {boolean} isDone - whether attendance is complete
 */
function renderMiniProgressBar(filled, total, isDone) {
  const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
  const colorClass = isDone ? 'progress-fill-done' : pct > 0 ? 'progress-fill-partial' : 'progress-fill-empty';
  return `
    <div class="class-card-progress">
      <div class="class-progress-bar">
        <div class="class-progress-fill ${colorClass}" style="width:${pct}%"></div>
      </div>
      <span class="class-progress-label">${pct}%</span>
    </div>
  `;
}

/**
 * Render attendance rate card (5th stats card)
 * @param {number} hadir - total hadir today
 * @param {number} total - total attendance records today
 * @param {number} delay - stagger delay index
 */
function renderAttendanceRateCard(hadir, total, delay) {
  const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
  const rateStr = `${rate}%`;
  const subtitle = total > 0 ? `${hadir} dari ${total} siswa hadir` : 'Belum ada data hari ini';
  return `
    <div class="stats-card stats-card-rate animate-fade-in-up delay-${delay}">
      <div class="stats-icon">📊</div>
      <div class="stats-value">${rateStr}</div>
      <div class="stats-label">Tingkat Kehadiran</div>
      <div class="stats-subtitle">${subtitle}</div>
    </div>
  `;
}

/**
 * Render a single class card with enhanced visuals
 */
function renderClassCard(c, total, filled, attendanceRate, index) {
  const isDone = total > 0 && filled >= total;
  const delayClass = `delay-${Math.min(index + 1, 6)}`;

  // Status badge
  let statusBadge;
  if (isDone) {
    statusBadge = `<span class="class-status-badge class-status-done">✅ Selesai</span>`;
  } else if (filled > 0) {
    statusBadge = `<span class="class-status-badge class-status-partial">⏳ Sebagian</span>`;
  } else {
    statusBadge = `<span class="class-status-badge class-status-empty">📋 Belum diisi</span>`;
  }

  // Attendance rate display (only if data available)
  const rateHtml = attendanceRate !== null
    ? `<span class="class-attendance-rate">${attendanceRate}% hadir</span>`
    : '';

  // Action button
  const actionBtn = isDone
    ? `<a href="#/attendance/${c.id}" class="btn btn-outline btn-sm">✏️ Edit</a>`
    : `<a href="#/attendance/${c.id}" class="btn btn-primary btn-sm">📋 Absen Sekarang</a>`;

  return `
    <div class="card card-hover class-card animate-fade-in-up ${delayClass}">
      <div class="class-card-header">
        <div>
          <div class="class-card-name">Kelas ${c.name}</div>
          <div class="class-card-grade">Tingkat ${c.grade_level}</div>
        </div>
        <span class="badge badge-guru">${total} siswa</span>
      </div>
      ${renderMiniProgressBar(filled, total, isDone)}
      <div class="class-card-footer">
        <div class="class-card-status-group">
          ${statusBadge}
          ${rateHtml}
        </div>
        ${actionBtn}
      </div>
    </div>
  `;
}

/**
 * Render quick action section for classes that haven't been filled
 */
function renderQuickActions(pendingClasses) {
  if (pendingClasses.length === 0) return '';

  const items = pendingClasses.slice(0, 3).map(c => `
    <a href="#/attendance/${c.id}" class="quick-action-item">
      <span class="quick-action-icon">📋</span>
      <span class="quick-action-label">Kelas ${c.name}</span>
      <span class="quick-action-arrow">→</span>
    </a>
  `).join('');

  const moreText = pendingClasses.length > 3
    ? `<div class="quick-action-more">+${pendingClasses.length - 3} kelas lainnya belum diisi</div>`
    : '';

  return `
    <div class="quick-actions-section animate-fade-in-up">
      <div class="quick-actions-header">
        <span class="quick-actions-icon">⚡</span>
        <h3 class="quick-actions-title">Perlu Diisi Hari Ini</h3>
        <span class="quick-actions-count">${pendingClasses.length} kelas</span>
      </div>
      <div class="quick-actions-list">
        ${items}
      </div>
      ${moreText}
    </div>
  `;
}

export async function renderDashboardPage() {
  const app = document.getElementById('app');
  await renderAppShell(app, 'Dashboard');

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="dashboard-header animate-fade-in-up">
      <h1 id="dashboard-greeting">Memuat...</h1>
      <p id="dashboard-date"></p>
    </div>
    <div class="stats-grid" id="stats-grid">
      ${renderStatsCard('hadir', 0, 'Hadir Hari Ini', 1)}
      ${renderStatsCard('izin', 0, 'Izin Hari Ini', 2)}
      ${renderStatsCard('sakit', 0, 'Sakit Hari Ini', 3)}
      ${renderStatsCard('alpha', 0, 'Alpha Hari Ini', 4)}
    </div>
    <div id="attendance-rate-container"></div>
    <div id="quick-actions-container"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
      <h2 style="font-size:1.25rem;font-weight:700">Kelas Saya</h2>
    </div>
    <div class="class-grid" id="class-grid">
      <div class="card" style="opacity:0.5"><div class="skeleton" style="height:20px;width:60%;margin-bottom:0.75rem"></div><div class="skeleton" style="height:14px;width:40%"></div></div>
      <div class="card" style="opacity:0.5"><div class="skeleton" style="height:20px;width:60%;margin-bottom:0.75rem"></div><div class="skeleton" style="height:14px;width:40%"></div></div>
    </div>
  `;

  try {
    const profile = await getProfile();
    const school = await getSchool();

    document.getElementById('dashboard-greeting').textContent =
      `${getGreeting()}, ${profile?.name || 'User'} 👋`;
    document.getElementById('dashboard-date').textContent =
      `${school?.name || 'Sekolah'} — ${formatDateFull(getToday())}`;

    // Load classes
    const { data: classes, error: classErr } = isDemoMode()
      ? demoQueryClasses()
      : await supabase.from('classes').select('id, name, grade_level, homeroom_teacher_id').order('name');
    if (classErr) throw classErr;

    // Load today's attendance
    const today = getToday();
    const { data: todayAtt, error: attErr } = isDemoMode()
      ? demoQueryAttendance({ date: today })
      : await supabase.from('attendance').select('status').eq('date', today);

    let hadir = 0, izin = 0, sakit = 0, alpha = 0;
    if (!attErr && todayAtt) {
      todayAtt.forEach(a => {
        if (a.status === 'hadir') hadir++;
        else if (a.status === 'izin') izin++;
        else if (a.status === 'sakit') sakit++;
        else if (a.status === 'alpha') alpha++;
      });
    }

    const totalToday = hadir + izin + sakit + alpha;

    // Update stats grid with staggered animation delays
    document.getElementById('stats-grid').innerHTML = `
      ${renderStatsCard('hadir', hadir, 'Hadir Hari Ini', 1)}
      ${renderStatsCard('izin', izin, 'Izin Hari Ini', 2)}
      ${renderStatsCard('sakit', sakit, 'Sakit Hari Ini', 3)}
      ${renderStatsCard('alpha', alpha, 'Alpha Hari Ini', 4)}
    `;
    animateCounters(document.getElementById('stats-grid'));

    // Render attendance rate card
    document.getElementById('attendance-rate-container').innerHTML =
      renderAttendanceRateCard(hadir, totalToday, 5);

    const classGrid = document.getElementById('class-grid');
    if (!classes || classes.length === 0) {
      classGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <div class="empty-state-title">Belum Ada Kelas</div>
          <div class="empty-state-text">Anda belum memiliki kelas yang diampu.</div>
        </div>
      `;
      return;
    }

    // Count students per class
    const classIds = classes.map(c => c.id);
    let allStudents = [];
    if (isDemoMode()) {
      classIds.forEach(cid => {
        const { data } = demoQueryStudents(cid);
        allStudents = allStudents.concat(data);
      });
    } else {
      const { data } = await supabase.from('students').select('id, class_id, status').in('class_id', classIds);
      allStudents = data || [];
    }

    const studentCountMap = {};
    allStudents.forEach(s => {
      if (s.status === 'aktif') studentCountMap[s.class_id] = (studentCountMap[s.class_id] || 0) + 1;
    });

    // Check attendance filled today (with status breakdown per class)
    const { data: todayAttByClass } = isDemoMode()
      ? demoQueryAttendance({ date: today })
      : await supabase.from('attendance').select('class_id, student_id, status').eq('date', today).in('class_id', classIds);

    const filledMap = {};
    const hadirPerClassMap = {};
    (todayAttByClass || []).forEach(a => {
      filledMap[a.class_id] = (filledMap[a.class_id] || 0) + 1;
      if (a.status === 'hadir') {
        hadirPerClassMap[a.class_id] = (hadirPerClassMap[a.class_id] || 0) + 1;
      }
    });

    // Build pending classes list (not yet filled)
    const pendingClasses = classes.filter(c => {
      const total = studentCountMap[c.id] || 0;
      const filled = filledMap[c.id] || 0;
      return total > 0 && filled < total;
    });

    // Render quick actions for pending classes
    document.getElementById('quick-actions-container').innerHTML =
      renderQuickActions(pendingClasses);

    // Render class cards with enhanced visuals
    classGrid.innerHTML = classes.map((c, i) => {
      const total = studentCountMap[c.id] || 0;
      const filled = filledMap[c.id] || 0;
      const hadirCount = hadirPerClassMap[c.id] || 0;
      // Only show attendance rate if attendance has been filled
      const attendanceRate = filled > 0 ? Math.round((hadirCount / filled) * 100) : null;
      return renderClassCard(c, total, filled, attendanceRate, i);
    }).join('');

  } catch (err) {
    console.error('Dashboard error:', err);
    showToast('Gagal memuat dashboard: ' + (err.message || ''), 'error');
  }
}
