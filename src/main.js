/**
 * AbsenKu — Main Entry Point
 */
import './styles/index.css';
import './styles/components.css';
import './styles/pages.css';

import { router } from './router.js';
import { isAuthenticated, onAuthChange, getProfile } from './auth.js';
import { renderLoginPage } from './pages/login.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderAttendancePage } from './pages/attendance.js';
import { renderRecapPage } from './pages/recap.js';
import { renderProfilePage } from './pages/profile.js';
import { renderStudentRecapPage } from './pages/student-recap.js';
import { renderManagementPage } from './pages/management.js';
import { renderSidebar, initSidebar } from './components/sidebar.js';
import { renderNavbar } from './components/navbar.js';

/**
 * Render the app shell (sidebar + navbar + content area)
 */
export async function renderAppShell(container, pageTitle = '') {
  const [navbar, profile] = await Promise.all([
    renderNavbar(pageTitle),
    getProfile(),
  ]);
  const sidebar = await renderSidebar(profile);

  container.innerHTML = `
    <div class="app-shell">
      ${sidebar}
      <div class="app-main">
        ${navbar}
        <div class="app-content" id="page-content"></div>
      </div>
    </div>
  `;

  initSidebar();
}

// Auth-protected routes
const protectedRoutes = ['/dashboard', '/attendance', '/recap', '/profile', '/management'];

// Setup router
router
  .add('/login', async () => {
    const authed = await isAuthenticated();
    if (authed) {
      router.navigate('/dashboard');
      return;
    }
    await renderLoginPage();
  })
  .add('/dashboard', async () => {
    await renderDashboardPage();
  })
  .add('/attendance/:classId', async (params) => {
    await renderAttendancePage(params);
  })
  .add('/attendance', async () => {
    await renderAttendancePage({});
  })
  .add('/recap', async () => {
    await renderRecapPage();
  })
  .add('/recap/student/:studentId', async (params) => {
    await renderStudentRecapPage(params);
  })
  .add('/recap/student', async () => {
    await renderStudentRecapPage({});
  })
  .add('/profile', async () => {
    await renderProfilePage();
  })
  .add('/management', async () => {
    await renderManagementPage();
  })
  .guard(async (hash) => {
    const isProtected = protectedRoutes.some(r => hash.startsWith(r));
    if (isProtected) {
      const authed = await isAuthenticated();
      if (!authed) {
        router.navigate('/login');
        return false;
      }
    }
    return true;
  });

// Listen for auth changes
onAuthChange((event) => {
  if (event === 'SIGNED_OUT') {
    router.navigate('/login');
  }
});

// Start
router.start();
