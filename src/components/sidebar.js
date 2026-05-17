/**
 * Sidebar navigation component
 */
import { router } from '../router.js';
import { signOut } from '../auth.js';

export async function renderSidebar(profile) {
  const hash = window.location.hash.slice(1) || '/dashboard';

  const links = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/attendance', icon: '📋', label: 'Absensi' },
    { path: '/recap', icon: '📊', label: 'Rekap Bulanan' },
    { path: '/management', icon: '⚙️', label: 'Manajemen' },
    { path: '/profile', icon: '👤', label: 'Profil' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') return hash === '/dashboard';
    return hash.startsWith(path);
  };

  // Generate avatar initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Get role display name and badge class
  const getRoleInfo = (role) => {
    if (role === 'admin') return { name: 'Admin', badgeClass: 'badge-admin' };
    return { name: 'Guru', badgeClass: 'badge-guru' };
  };

  const initials = profile ? getInitials(profile.name) : '?';
  const roleInfo = profile ? getRoleInfo(profile.role) : { name: 'User', badgeClass: 'badge-guru' };

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-logo">📋 AbsenKu</span>
      </div>
      <div class="sidebar-user">
        <div class="avatar">${initials}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${profile?.name || 'User'}</div>
          <span class="badge ${roleInfo.badgeClass}">${roleInfo.name}</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${links.map(l => `
          <a href="#${l.path}" class="sidebar-link ${isActive(l.path) ? 'active' : ''}" id="nav-${l.path.slice(1)}">
            <span class="nav-icon">${l.icon}</span>
            <span>${l.label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <button class="btn btn-ghost w-full" id="btn-logout" style="justify-content:flex-start;gap:0.75rem;color:var(--color-alpha)">
          <span>🚪</span>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

export function initSidebar() {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut();
      router.navigate('/login');
    });
  }

  // Mobile sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('mobile-menu-btn');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('open');
    });
  }
}
