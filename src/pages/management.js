/**
 * Management Page — Kelola kelas dan siswa (SMK TKJ)
 * Route: #/management
 */
import { supabase } from '../supabase.js';
import { getSchool } from '../auth.js';
import { renderAppShell } from '../main.js';
import { showToast } from '../components/toast.js';
import { addClass, addStudent, deactivateStudent, updateClass, updateStudent, deleteClass, deleteStudent } from '../utils/api.js';
import { isDemoMode, demoQueryClasses, demoQueryStudents, demoGetAllStudentsByClass } from '../demo.js';

// Tingkat SMK TKJ
const GRADE_OPTIONS = [
  { value: '10', label: 'Kelas X TKJ' },
  { value: '11', label: 'Kelas XI TKJ' },
  { value: '12', label: 'Kelas XII TKJ' },
];

function gradeLabel(grade) {
  const opt = GRADE_OPTIONS.find(o => String(o.value) === String(grade));
  return opt ? opt.label : `Kelas ${grade}`;
}

// ---- Validation ----

export function validateClassForm(data, existingClasses, excludeId = null) {
  const errors = {};
  if (!data.name?.trim()) {
    errors.name = 'Nama kelas wajib diisi';
  } else if (existingClasses.some(c => c.id !== excludeId && c.name.toLowerCase() === data.name.trim().toLowerCase())) {
    errors.name = 'Nama kelas sudah ada';
  }
  if (!data.grade_level) errors.grade_level = 'Tingkat kelas wajib dipilih';
  return errors;
}

export function validateStudentForm(data, existingStudents, excludeId = null) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Nama wajib diisi';
  if (!data.nis?.trim()) {
    errors.nis = 'NIS wajib diisi';
  } else if (existingStudents.some(s => s.id !== excludeId && s.nis === data.nis.trim())) {
    errors.nis = 'NIS sudah digunakan';
  }
  if (!data.gender) errors.gender = 'Jenis kelamin wajib dipilih';
  return errors;
}

// ---- Helpers ----

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('form-input-error');
  const existing = field.parentElement.querySelector('.form-error');
  if (existing) existing.remove();
  const err = document.createElement('div');
  err.className = 'form-error';
  err.textContent = message;
  field.parentElement.appendChild(err);
}

function clearFieldErrors(formEl) {
  formEl.querySelectorAll('.form-error').forEach(e => e.remove());
  formEl.querySelectorAll('.form-input-error').forEach(e => e.classList.remove('form-input-error'));
}

function gradeSelectOptions(selected = '') {
  return GRADE_OPTIONS.map(o =>
    `<option value="${o.value}" ${String(selected) === String(o.value) ? 'selected' : ''}>${o.label}</option>`
  ).join('');
}

// ---- Main Page ----

export async function renderManagementPage() {
  const app = document.getElementById('app');
  await renderAppShell(app, 'Manajemen');
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="management-page animate-fade-in-up">
      <div style="margin-bottom:1.5rem">
        <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.25rem">⚙️ Manajemen</h2>
        <p style="color:var(--text-secondary);font-size:0.875rem">Kelola data kelas dan siswa SMK TKJ</p>
      </div>
      <div class="management-tabs" id="management-tabs">
        <button class="management-tab active" data-tab="classes">📚 Kelas</button>
        <button class="management-tab" data-tab="students">👥 Siswa</button>
      </div>
      <div id="tab-content"></div>
    </div>
  `;

  let activeTab = 'classes';
  const tabContent = document.getElementById('tab-content');

  async function renderTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.management-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'classes') await renderClassesTab(tabContent);
    else await renderStudentsTab(tabContent);
  }

  document.getElementById('management-tabs').addEventListener('click', async (e) => {
    const btn = e.target.closest('.management-tab');
    if (btn && btn.dataset.tab !== activeTab) await renderTab(btn.dataset.tab);
  });

  await renderTab('classes');
}

// ---- Tab Kelas ----

async function renderClassesTab(container) {
  container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Memuat kelas...</div></div>`;

  const { data: classes } = isDemoMode()
    ? demoQueryClasses()
    : await supabase.from('classes').select('id, name, grade_level').order('name');

  const studentCountMap = {};
  if (classes && classes.length > 0) {
    if (isDemoMode()) {
      classes.forEach(c => { studentCountMap[c.id] = demoQueryStudents(c.id).data.length; });
    } else {
      const { data: sts } = await supabase.from('students').select('class_id').eq('status', 'aktif').in('class_id', classes.map(c => c.id));
      (sts || []).forEach(s => { studentCountMap[s.class_id] = (studentCountMap[s.class_id] || 0) + 1; });
    }
  }

  container.innerHTML = `
    <div class="management-section" style="margin-top:1.5rem">
      <div class="management-section-header">
        <h3 class="management-section-title">Daftar Kelas</h3>
        <button class="btn btn-primary btn-sm" id="btn-show-add-class">+ Tambah Kelas</button>
      </div>
      <div id="add-class-form-wrapper" style="display:none">
        <div class="card" style="padding:1.25rem;margin-bottom:1rem">
          <h4 style="font-weight:700;margin-bottom:1rem">Tambah Kelas Baru</h4>
          <form id="add-class-form" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end">
            <div class="form-group" style="flex:1;min-width:160px">
              <label class="form-label" for="class-name">Nama Kelas</label>
              <input class="form-input" type="text" id="class-name" placeholder="Contoh: X TKJ 1" maxlength="20" />
            </div>
            <div class="form-group" style="min-width:160px">
              <label class="form-label" for="class-grade">Tingkat</label>
              <select class="form-select" id="class-grade">
                <option value="">Pilih...</option>
                ${gradeSelectOptions()}
              </select>
            </div>
            <div style="display:flex;gap:0.5rem">
              <button type="submit" class="btn btn-primary btn-sm">Simpan</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-add-class">Batal</button>
            </div>
          </form>
        </div>
      </div>
      <div id="classes-list">
        ${!classes || classes.length === 0
          ? `<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">Belum ada kelas</div></div>`
          : `<div class="card" style="padding:0;overflow:hidden">
              <table class="recap-table" style="width:100%">
                <thead><tr><th>Nama Kelas</th><th>Tingkat</th><th style="text-align:center">Siswa Aktif</th><th style="text-align:right">Aksi</th></tr></thead>
                <tbody>
                  ${classes.map(c => `
                    <tr>
                      <td style="font-weight:600">${c.name}</td>
                      <td style="color:var(--text-secondary)">${gradeLabel(c.grade_level)}</td>
                      <td style="text-align:center"><span class="badge badge-guru">${studentCountMap[c.id] || 0} siswa</span></td>
                      <td style="text-align:right">
                        <div style="display:flex;gap:0.375rem;justify-content:flex-end">
                          <button class="btn btn-secondary btn-sm btn-edit-class" data-id="${c.id}" data-name="${c.name}" data-grade="${c.grade_level}">✏️ Edit</button>
                          <a href="#/attendance/${c.id}" class="btn btn-ghost btn-sm">📋 Absen</a>
                          <button class="btn btn-danger btn-sm btn-delete-class" data-id="${c.id}" data-name="${c.name}" data-count="${studentCountMap[c.id] || 0}">🗑️ Hapus</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`
        }
      </div>
    </div>
  `;

  document.getElementById('btn-show-add-class').addEventListener('click', () => {
    document.getElementById('add-class-form-wrapper').style.display = 'block';
    document.getElementById('btn-show-add-class').style.display = 'none';
    document.getElementById('class-name').focus();
  });
  document.getElementById('btn-cancel-add-class').addEventListener('click', () => {
    document.getElementById('add-class-form-wrapper').style.display = 'none';
    document.getElementById('btn-show-add-class').style.display = '';
    document.getElementById('add-class-form').reset();
  });

  document.getElementById('add-class-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    clearFieldErrors(form);
    const data = { name: document.getElementById('class-name').value, grade_level: document.getElementById('class-grade').value };
    const currentClasses = isDemoMode() ? demoQueryClasses().data : (await supabase.from('classes').select('id, name')).data || [];
    const errors = validateClassForm(data, currentClasses);
    if (Object.keys(errors).length > 0) {
      if (errors.name) showFieldError('class-name', errors.name);
      if (errors.grade_level) showFieldError('class-grade', errors.grade_level);
      return;
    }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    try {
      const school = isDemoMode() ? { id: null } : await getSchool();
      await addClass({ ...data, school_id: school?.id });
      showToast(`Kelas ${data.name} berhasil ditambahkan`, 'success');
      await renderClassesTab(container);
    } catch (err) {
      showToast('Gagal menambah kelas: ' + err.message, 'error');
      btn.disabled = false; btn.innerHTML = 'Simpan';
    }
  });

  container.querySelectorAll('.btn-edit-class').forEach(btn => {
    btn.addEventListener('click', () => showEditClassModal(btn.dataset.id, btn.dataset.name, btn.dataset.grade, container));
  });

  container.querySelectorAll('.btn-delete-class').forEach(btn => {
    btn.addEventListener('click', async () => {
      const count = parseInt(btn.dataset.count);
      const msg = count > 0
        ? `Hapus kelas "${btn.dataset.name}"? Kelas ini memiliki ${count} siswa aktif. Semua data absensi terkait juga akan terhapus. Tindakan ini tidak bisa dibatalkan.`
        : `Hapus kelas "${btn.dataset.name}"? Tindakan ini tidak bisa dibatalkan.`;
      if (!confirm(msg)) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        await deleteClass(btn.dataset.id);
        showToast(`Kelas ${btn.dataset.name} berhasil dihapus`, 'success');
        await renderClassesTab(container);
      } catch (err) {
        showToast('Gagal menghapus kelas: ' + err.message, 'error');
        btn.disabled = false; btn.textContent = '🗑️ Hapus';
      }
    });
  });
}

// ---- Tab Siswa ----

async function renderStudentsTab(container) {
  const { data: classes } = isDemoMode()
    ? demoQueryClasses()
    : await supabase.from('classes').select('id, name, grade_level').order('name');

  container.innerHTML = `
    <div class="management-section" style="margin-top:1.5rem">
      <div class="management-section-header">
        <h3 class="management-section-title">Daftar Siswa</h3>
      </div>
      <div class="form-group" style="max-width:240px;margin-bottom:1rem">
        <label class="form-label" for="student-class-select">Pilih Kelas</label>
        <select class="form-select" id="student-class-select">
          <option value="">Pilih kelas...</option>
          ${(classes || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div id="students-content">
        <div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Pilih kelas untuk melihat siswa</div></div>
      </div>
    </div>
  `;

  document.getElementById('student-class-select').addEventListener('change', async (e) => {
    const classId = e.target.value;
    if (!classId) return;
    const className = e.target.options[e.target.selectedIndex].text;
    await renderStudentsList(document.getElementById('students-content'), classId, className);
  });
}

async function renderStudentsList(container, classId, className) {
  container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Memuat siswa...</div></div>`;

  let students;
  if (isDemoMode()) {
    students = demoQueryStudents(classId).data;
  } else {
    const { data } = await supabase.from('students').select('id, name, nis, gender, status').eq('class_id', classId).eq('status', 'aktif').order('name');
    students = data || [];
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem">
      <span style="font-size:0.875rem;color:var(--text-secondary)">${students.length} siswa aktif di ${className}</span>
      <button class="btn btn-primary btn-sm" id="btn-show-add-student">+ Tambah Siswa</button>
    </div>
    <div id="add-student-form-wrapper" style="display:none;margin-bottom:1rem">
      <div class="card" style="padding:1.25rem">
        <h4 style="font-weight:700;margin-bottom:1rem">Tambah Siswa ke ${className}</h4>
        <form id="add-student-form" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end">
          <div class="form-group" style="flex:2;min-width:180px">
            <label class="form-label" for="student-name">Nama Lengkap</label>
            <input class="form-input" type="text" id="student-name" placeholder="Nama siswa" maxlength="100" />
          </div>
          <div class="form-group" style="flex:1;min-width:120px">
            <label class="form-label" for="student-nis">NIS</label>
            <input class="form-input" type="text" id="student-nis" placeholder="NIS unik" maxlength="20" />
          </div>
          <div class="form-group" style="min-width:140px">
            <label class="form-label" for="student-gender">Jenis Kelamin</label>
            <select class="form-select" id="student-gender">
              <option value="">Pilih...</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button type="submit" class="btn btn-primary btn-sm">Simpan</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-add-student">Batal</button>
          </div>
        </form>
      </div>
    </div>
    <div id="students-table-wrapper">
      ${students.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Belum ada siswa aktif</div></div>`
        : `<div class="card" style="padding:0;overflow:hidden">
            <table class="recap-table" style="width:100%">
              <thead><tr><th>#</th><th>Nama</th><th>NIS</th><th>Jenis Kelamin</th><th style="text-align:right">Aksi</th></tr></thead>
              <tbody>
                ${students.map((s, i) => `
                  <tr>
                    <td style="color:var(--text-tertiary)">${i + 1}</td>
                    <td style="font-weight:600">${s.name}</td>
                    <td style="color:var(--text-secondary)">${s.nis}</td>
                    <td>${s.gender === 'L' ? '👦 Laki-laki' : '👧 Perempuan'}</td>
                    <td style="text-align:right">
                      <div style="display:flex;gap:0.375rem;justify-content:flex-end">
                        <button class="btn btn-secondary btn-sm btn-edit-student" data-id="${s.id}" data-name="${s.name}" data-nis="${s.nis}" data-gender="${s.gender}">✏️ Edit</button>
                        <button class="btn btn-ghost btn-sm btn-deactivate" data-id="${s.id}" data-name="${s.name}">🚫 Nonaktifkan</button>
                        <button class="btn btn-danger btn-sm btn-delete-student" data-id="${s.id}" data-name="${s.name}">🗑️ Hapus</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>
  `;

  document.getElementById('btn-show-add-student').addEventListener('click', () => {
    document.getElementById('add-student-form-wrapper').style.display = 'block';
    document.getElementById('btn-show-add-student').style.display = 'none';
    document.getElementById('student-name').focus();
  });
  document.getElementById('btn-cancel-add-student').addEventListener('click', () => {
    document.getElementById('add-student-form-wrapper').style.display = 'none';
    document.getElementById('btn-show-add-student').style.display = '';
    document.getElementById('add-student-form').reset();
  });

  document.getElementById('add-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    clearFieldErrors(form);
    const data = {
      name: document.getElementById('student-name').value,
      nis: document.getElementById('student-nis').value,
      gender: document.getElementById('student-gender').value,
      class_id: classId,
    };
    const allStudents = isDemoMode()
      ? (demoGetAllStudentsByClass ? demoGetAllStudentsByClass(classId) : [])
      : (await supabase.from('students').select('id, nis').eq('class_id', classId)).data || [];
    const errors = validateStudentForm(data, allStudents);
    if (Object.keys(errors).length > 0) {
      if (errors.name) showFieldError('student-name', errors.name);
      if (errors.nis) showFieldError('student-nis', errors.nis);
      if (errors.gender) showFieldError('student-gender', errors.gender);
      return;
    }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    try {
      await addStudent(data);
      showToast(`Siswa ${data.name} berhasil ditambahkan`, 'success');
      await renderStudentsList(container, classId, className);
    } catch (err) {
      showToast('Gagal menambah siswa: ' + err.message, 'error');
      btn.disabled = false; btn.innerHTML = 'Simpan';
    }
  });

  container.querySelectorAll('.btn-edit-student').forEach(btn => {
    btn.addEventListener('click', () => showEditStudentModal(btn.dataset.id, btn.dataset.name, btn.dataset.nis, btn.dataset.gender, students, container, classId, className));
  });

  container.querySelectorAll('.btn-deactivate').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Nonaktifkan "${btn.dataset.name}"? Siswa tidak akan muncul di absensi berikutnya.`)) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        await deactivateStudent(btn.dataset.id);
        showToast(`${btn.dataset.name} berhasil dinonaktifkan`, 'success');
        await renderStudentsList(container, classId, className);
      } catch (err) {
        showToast('Gagal: ' + err.message, 'error');
        btn.disabled = false; btn.textContent = '🚫 Nonaktifkan';
      }
    });
  });

  container.querySelectorAll('.btn-delete-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Hapus siswa "${btn.dataset.name}" secara permanen? Semua data absensinya juga akan terhapus. Tindakan ini tidak bisa dibatalkan.`)) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        await deleteStudent(btn.dataset.id);
        showToast(`${btn.dataset.name} berhasil dihapus`, 'success');
        await renderStudentsList(container, classId, className);
      } catch (err) {
        showToast('Gagal menghapus: ' + err.message, 'error');
        btn.disabled = false; btn.textContent = '🗑️ Hapus';
      }
    });
  });
}

// ---- Modal Edit Kelas ----

function showEditClassModal(classId, currentName, currentGrade, container) {
  const existing = document.getElementById('edit-class-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'edit-class-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content animate-scale-in">
      <div class="modal-header">
        <h3>✏️ Edit Kelas</h3>
        <button class="btn btn-ghost btn-icon" id="edit-class-close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="edit-class-form" style="display:flex;flex-direction:column;gap:1rem">
          <div class="form-group">
            <label class="form-label" for="edit-class-name">Nama Kelas</label>
            <input class="form-input" type="text" id="edit-class-name" value="${currentName}" maxlength="20" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-class-grade">Tingkat</label>
            <select class="form-select" id="edit-class-grade">
              ${gradeSelectOptions(currentGrade)}
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="edit-class-cancel">Batal</button>
        <button class="btn btn-primary" id="edit-class-save">💾 Simpan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  document.getElementById('edit-class-close').addEventListener('click', close);
  document.getElementById('edit-class-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('edit-class-save').addEventListener('click', async () => {
    const form = document.getElementById('edit-class-form');
    clearFieldErrors(form);
    const newName = document.getElementById('edit-class-name').value;
    const newGrade = document.getElementById('edit-class-grade').value;
    if (!newName.trim()) { showFieldError('edit-class-name', 'Nama kelas wajib diisi'); return; }
    const allClasses = isDemoMode() ? demoQueryClasses().data : (await supabase.from('classes').select('id, name')).data || [];
    const errors = validateClassForm({ name: newName, grade_level: newGrade }, allClasses, classId);
    if (errors.name) { showFieldError('edit-class-name', errors.name); return; }
    const saveBtn = document.getElementById('edit-class-save');
    saveBtn.disabled = true; saveBtn.innerHTML = '<div class="spinner"></div>';
    try {
      await updateClass(classId, { name: newName, grade_level: newGrade });
      showToast('Kelas berhasil diperbarui', 'success');
      close();
      await renderClassesTab(container);
    } catch (err) {
      showToast('Gagal: ' + err.message, 'error');
      saveBtn.disabled = false; saveBtn.innerHTML = '💾 Simpan';
    }
  });
}

// ---- Modal Edit Siswa ----

function showEditStudentModal(studentId, currentName, currentNis, currentGender, allStudents, container, classId, className) {
  const existing = document.getElementById('edit-student-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'edit-student-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content animate-scale-in">
      <div class="modal-header">
        <h3>✏️ Edit Siswa</h3>
        <button class="btn btn-ghost btn-icon" id="edit-student-close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="edit-student-form" style="display:flex;flex-direction:column;gap:1rem">
          <div class="form-group">
            <label class="form-label" for="edit-student-name">Nama Lengkap</label>
            <input class="form-input" type="text" id="edit-student-name" value="${currentName}" maxlength="100" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-student-nis">NIS</label>
            <input class="form-input" type="text" id="edit-student-nis" value="${currentNis}" maxlength="20" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-student-gender">Jenis Kelamin</label>
            <select class="form-select" id="edit-student-gender">
              <option value="L" ${currentGender === 'L' ? 'selected' : ''}>Laki-laki</option>
              <option value="P" ${currentGender === 'P' ? 'selected' : ''}>Perempuan</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="edit-student-cancel">Batal</button>
        <button class="btn btn-primary" id="edit-student-save">💾 Simpan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  document.getElementById('edit-student-close').addEventListener('click', close);
  document.getElementById('edit-student-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('edit-student-save').addEventListener('click', async () => {
    const form = document.getElementById('edit-student-form');
    clearFieldErrors(form);
    const newName = document.getElementById('edit-student-name').value;
    const newNis = document.getElementById('edit-student-nis').value;
    const newGender = document.getElementById('edit-student-gender').value;
    const errors = validateStudentForm({ name: newName, nis: newNis, gender: newGender }, allStudents, studentId);
    if (errors.name) { showFieldError('edit-student-name', errors.name); return; }
    if (errors.nis) { showFieldError('edit-student-nis', errors.nis); return; }
    if (errors.gender) { showFieldError('edit-student-gender', errors.gender); return; }
    const saveBtn = document.getElementById('edit-student-save');
    saveBtn.disabled = true; saveBtn.innerHTML = '<div class="spinner"></div>';
    try {
      await updateStudent(studentId, { name: newName, nis: newNis, gender: newGender });
      showToast('Data siswa berhasil diperbarui', 'success');
      close();
      await renderStudentsList(container, classId, className);
    } catch (err) {
      showToast('Gagal: ' + err.message, 'error');
      saveBtn.disabled = false; saveBtn.innerHTML = '💾 Simpan';
    }
  });
}
