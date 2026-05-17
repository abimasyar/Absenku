/**
 * Login Page — dengan tab Login & Daftar Akun
 */
import { signIn, signUp } from '../auth.js';
import { router } from '../router.js';
import { showToast } from '../components/toast.js';
import { enableDemo } from '../demo.js';

export async function renderLoginPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page">
      <div class="login-bg"></div>
      <div class="login-card" style="max-width:460px">
        <div class="login-logo">📋 AbsenKu</div>
        <p class="login-subtitle">Sistem Absensi Digital untuk Guru</p>

        <!-- Tab switcher -->
        <div style="display:flex;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.25rem;margin-bottom:1.5rem">
          <button class="login-tab active" id="tab-login" type="button"
            style="flex:1;padding:0.5rem;border-radius:var(--radius-sm);font-size:0.875rem;font-weight:600;transition:all var(--transition-fast);border:none;cursor:pointer;background:var(--color-primary);color:#fff">
            Masuk
          </button>
          <button class="login-tab" id="tab-register" type="button"
            style="flex:1;padding:0.5rem;border-radius:var(--radius-sm);font-size:0.875rem;font-weight:600;transition:all var(--transition-fast);border:none;cursor:pointer;background:transparent;color:var(--text-secondary)">
            Buat Akun
          </button>
        </div>

        <!-- Form Login -->
        <form class="login-form" id="login-form">
          <div class="form-group">
            <label class="form-label" for="login-email">Email</label>
            <input class="form-input" type="email" id="login-email" placeholder="guru@sekolah.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input class="form-input" type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <div id="login-error" class="form-error" style="display:none"></div>
          <button type="submit" class="btn btn-primary btn-lg w-full" id="login-submit">
            Masuk
          </button>
        </form>

        <!-- Form Daftar -->
        <form class="login-form" id="register-form" style="display:none">
          <div class="form-group">
            <label class="form-label" for="reg-name">Nama Lengkap</label>
            <input class="form-input" type="text" id="reg-name" placeholder="Nama lengkap Anda" required maxlength="100" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <input class="form-input" type="email" id="reg-email" placeholder="guru@sekolah.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">Password</label>
            <input class="form-input" type="password" id="reg-password" placeholder="Min. 6 karakter" required autocomplete="new-password" minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password-confirm">Konfirmasi Password</label>
            <input class="form-input" type="password" id="reg-password-confirm" placeholder="Ulangi password" required autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-nip">NIP <span style="color:var(--text-tertiary);font-weight:400">(opsional)</span></label>
            <input class="form-input" type="text" id="reg-nip" placeholder="Nomor Induk Pegawai" maxlength="30" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-school">Nama Sekolah</label>
            <input class="form-input" type="text" id="reg-school" placeholder="Contoh: SMK TKJ Maju Bersama" required maxlength="100" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-address">Alamat Sekolah <span style="color:var(--text-tertiary);font-weight:400">(opsional)</span></label>
            <input class="form-input" type="text" id="reg-address" placeholder="Alamat lengkap sekolah" maxlength="300" />
          </div>
          <div id="register-error" class="form-error" style="display:none"></div>
          <button type="submit" class="btn btn-primary btn-lg w-full" id="register-submit">
            Buat Akun
          </button>
        </form>

        <div style="position:relative;margin:1.5rem 0;text-align:center">
          <hr style="border:none;border-top:1px solid var(--border-color)" />
          <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:hsla(225,20%,13%,0.65);padding:0 0.75rem;font-size:0.75rem;color:var(--text-tertiary)">ATAU COBA DEMO</span>
        </div>

        <button class="btn btn-secondary w-full" id="demo-guru" type="button">
          👨‍🏫 Demo Guru
        </button>

        <p style="text-align:center;margin-top:1.5rem;font-size:0.8125rem;color:var(--text-tertiary)">
          © 2026 AbsenKu — Attendance Made Simple
        </p>
      </div>
    </div>
  `;

  // ---- Tab switching ----
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  function switchTab(tab) {
    if (tab === 'login') {
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      tabLogin.style.background = 'var(--color-primary)';
      tabLogin.style.color = '#fff';
      tabRegister.style.background = 'transparent';
      tabRegister.style.color = 'var(--text-secondary)';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
      tabRegister.style.background = 'var(--color-primary)';
      tabRegister.style.color = '#fff';
      tabLogin.style.background = 'transparent';
      tabLogin.style.color = 'var(--text-secondary)';
    }
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  // ---- Login ----
  const loginErrorEl = document.getElementById('login-error');
  const loginSubmitBtn = document.getElementById('login-submit');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      loginErrorEl.textContent = 'Email dan password harus diisi';
      loginErrorEl.style.display = 'block';
      return;
    }

    loginSubmitBtn.disabled = true;
    loginSubmitBtn.innerHTML = '<div class="spinner"></div> Memproses...';
    loginErrorEl.style.display = 'none';

    try {
      await signIn(email, password);
      showToast('Login berhasil!', 'success');
      router.navigate('/dashboard');
    } catch (err) {
      loginErrorEl.textContent = err.message === 'Invalid login credentials'
        ? 'Email atau password salah'
        : err.message || 'Gagal login';
      loginErrorEl.style.display = 'block';
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.innerHTML = 'Masuk';
    }
  });

  // ---- Register ----
  const registerErrorEl = document.getElementById('register-error');
  const registerSubmitBtn = document.getElementById('register-submit');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerErrorEl.style.display = 'none';

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;
    const nip = document.getElementById('reg-nip').value.trim();
    const schoolName = document.getElementById('reg-school').value.trim();
    const schoolAddress = document.getElementById('reg-address').value.trim();

    // Validasi
    if (!name) { showRegisterError('Nama lengkap wajib diisi'); return; }
    if (!email) { showRegisterError('Email wajib diisi'); return; }
    if (password.length < 6) { showRegisterError('Password minimal 6 karakter'); return; }
    if (password !== passwordConfirm) { showRegisterError('Konfirmasi password tidak cocok'); return; }
    if (!schoolName) { showRegisterError('Nama sekolah wajib diisi'); return; }

    registerSubmitBtn.disabled = true;
    registerSubmitBtn.innerHTML = '<div class="spinner"></div> Membuat akun...';

    try {
      await signUp({ name, email, password, nip, schoolName, schoolAddress });
      showToast('Akun berhasil dibuat! Silakan masuk.', 'success');
      // Switch ke tab login dan isi email
      switchTab('login');
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').focus();
    } catch (err) {
      const msg = err.message?.includes('already registered')
        ? 'Email sudah terdaftar, silakan masuk'
        : err.message || 'Gagal membuat akun';
      showRegisterError(msg);
    } finally {
      registerSubmitBtn.disabled = false;
      registerSubmitBtn.innerHTML = 'Buat Akun';
    }
  });

  function showRegisterError(msg) {
    registerErrorEl.textContent = msg;
    registerErrorEl.style.display = 'block';
  }

  // ---- Demo ----
  document.getElementById('demo-guru').addEventListener('click', () => {
    enableDemo('guru');
    showToast('Mode demo aktif! 👨‍🏫', 'success');
    router.navigate('/dashboard');
  });
}
