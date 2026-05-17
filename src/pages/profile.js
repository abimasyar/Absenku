/**
 * Profile Page — dengan fitur edit profil
 */
import { getProfile, getSchool, signOut, clearProfileCache } from '../auth.js';
import { renderAppShell } from '../main.js';
import { showToast } from '../components/toast.js';
import { supabase } from '../supabase.js';
import { router } from '../router.js';
import { isDemoMode, demoUpdateProfile } from '../demo.js';

export async function renderProfilePage() {
  const app = document.getElementById('app');
  await renderAppShell(app, 'Profil');
  const content = document.getElementById('page-content');

  const profile = await getProfile();
  const school = await getSchool();

  if (!profile) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Profil tidak ditemukan</div></div>`;
    return;
  }

  renderProfileView(content, profile, school);
}

function renderProfileView(content, profile, school) {
  const initials = profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleName = profile.role === 'admin' ? 'Administrator' : 'Guru';
  const roleBadge = profile.role === 'admin'
    ? '<span class="badge badge-admin">Admin</span>'
    : '<span class="badge badge-guru">Guru</span>';

  const demoNotice = isDemoMode()
    ? `<div style="background:var(--color-primary-subtle);border:1px solid hsla(215,100%,58%,0.3);border-radius:var(--radius-md);padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.875rem;display:flex;align-items:center;gap:0.5rem">
        <span>🎮</span> <span>Mode Demo — Data ini hanya simulasi</span>
      </div>`
    : '';

  content.innerHTML = `
    <div class="profile-card card animate-fade-in-up">
      ${demoNotice}
      <div class="profile-header">
        <div class="avatar avatar-lg" id="profile-avatar">${initials}</div>
        <div>
          <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem" id="profile-name-display">${profile.name}</h2>
          <div style="display:flex;align-items:center;gap:0.5rem">
            ${roleBadge}
            <span style="color:var(--text-secondary);font-size:0.875rem">${school?.name || ''}</span>
          </div>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="profile-info-grid" id="profile-info-view">
        <div class="profile-info-item"><label>Email</label><p>${profile.email}</p></div>
        <div class="profile-info-item"><label>NIP</label><p id="profile-nip-display">${profile.nip || '-'}</p></div>
        <div class="profile-info-item"><label>Jabatan</label><p>${roleName}</p></div>
        <div class="profile-info-item"><label>Sekolah</label><p>${school?.name || '-'}</p></div>
        <div class="profile-info-item" style="grid-column:1/-1"><label>Alamat Sekolah</label><p>${school?.address || '-'}</p></div>
      </div>

      <!-- Edit Form (hidden by default) -->
      <div id="profile-edit-form" style="display:none;margin-top:1.5rem">
        <div style="border-top:1px solid var(--border-color);padding-top:1.5rem">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:1.25rem">✏️ Edit Profil</h3>
          <div style="display:flex;flex-direction:column;gap:1rem;max-width:480px">

            <p style="font-size:0.8125rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:-0.25rem">Data Pribadi</p>

            <div class="form-group">
              <label class="form-label" for="edit-name">Nama Lengkap</label>
              <input class="form-input" type="text" id="edit-name" value="${profile.name}" maxlength="100" />
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-nip">NIP</label>
              <input class="form-input" type="text" id="edit-nip" value="${profile.nip || ''}" maxlength="30" placeholder="Nomor Induk Pegawai" />
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-role">Jabatan</label>
              <select class="form-select" id="edit-role">
                <option value="guru" ${profile.role === 'guru' ? 'selected' : ''}>Guru</option>
                <option value="admin" ${profile.role === 'admin' ? 'selected' : ''}>Administrator</option>
              </select>
            </div>

            <p style="font-size:0.8125rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-top:0.5rem;margin-bottom:-0.25rem">Data Sekolah</p>

            <div class="form-group">
              <label class="form-label" for="edit-school-name">Nama Sekolah</label>
              <input class="form-input" type="text" id="edit-school-name" value="${school?.name || ''}" maxlength="100" placeholder="Nama sekolah" />
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-school-address">Alamat Sekolah</label>
              <textarea class="form-input" id="edit-school-address" maxlength="300" placeholder="Alamat lengkap sekolah" rows="2" style="resize:vertical">${school?.address || ''}</textarea>
            </div>

            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:0.5rem">
              <button class="btn btn-primary" id="btn-save-profile">💾 Simpan Perubahan</button>
              <button class="btn btn-secondary" id="btn-cancel-edit">Batal</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div id="profile-actions" style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border-color);display:flex;gap:0.75rem;flex-wrap:wrap">
        <button class="btn btn-secondary" id="btn-edit-profile">✏️ Edit Profil</button>
        <button class="btn btn-danger" id="btn-logout-profile">🚪 Keluar</button>
      </div>
    </div>
  `;

  // Toggle edit form
  document.getElementById('btn-edit-profile').addEventListener('click', () => {
    document.getElementById('profile-edit-form').style.display = 'block';
    document.getElementById('profile-actions').style.display = 'none';
    document.getElementById('edit-name').focus();
  });

  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    document.getElementById('profile-edit-form').style.display = 'none';
    document.getElementById('profile-actions').style.display = 'flex';
    // Reset ke nilai asal
    document.getElementById('edit-name').value = profile.name;
    document.getElementById('edit-nip').value = profile.nip || '';
    document.getElementById('edit-role').value = profile.role || 'guru';
    document.getElementById('edit-school-name').value = school?.name || '';
    document.getElementById('edit-school-address').value = school?.address || '';
  });

  // Simpan perubahan
  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const newName = document.getElementById('edit-name').value.trim();
    const newNip = document.getElementById('edit-nip').value.trim();
    const newRole = document.getElementById('edit-role').value;
    const newSchoolName = document.getElementById('edit-school-name').value.trim();
    const newSchoolAddress = document.getElementById('edit-school-address').value.trim();

    if (!newName) {
      showToast('Nama tidak boleh kosong', 'error');
      document.getElementById('edit-name').focus();
      return;
    }

    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Menyimpan...';

    try {
      if (isDemoMode()) {
        demoUpdateProfile({ name: newName, nip: newNip, role: newRole, schoolName: newSchoolName, schoolAddress: newSchoolAddress });
      } else {
        // Update profil user
        const { error: profileErr } = await supabase
          .from('users')
          .update({ name: newName, nip: newNip || null, role: newRole })
          .eq('id', profile.id);
        if (profileErr) throw new Error(profileErr.message);

        // Update data sekolah jika ada school_id
        if (profile.school_id) {
          const { error: schoolErr } = await supabase
            .from('schools')
            .update({ name: newSchoolName || school?.name, address: newSchoolAddress || school?.address })
            .eq('id', profile.school_id);
          if (schoolErr) throw new Error(schoolErr.message);
        }
      }

      clearProfileCache();
      showToast('Profil berhasil diperbarui', 'success');

      // Reload halaman profil dengan data terbaru
      const { getProfile: gp, getSchool: gs } = await import('../auth.js');
      const updatedProfile = await gp();
      const updatedSchool = await gs();
      renderProfileView(content, updatedProfile, updatedSchool);

    } catch (err) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '💾 Simpan Perubahan';
    }
  });

  document.getElementById('btn-logout-profile').addEventListener('click', async () => {
    await signOut();
    router.navigate('/login');
  });
}
