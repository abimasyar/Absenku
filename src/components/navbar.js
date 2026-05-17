/**
 * Top navbar component
 */
import { getProfile } from '../auth.js';

export async function renderNavbar(title = '') {
  const profile = await getProfile();
  const initials = profile ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const roleBadge = profile?.role === 'admin'
    ? '<span class="badge badge-admin">Admin</span>'
    : '<span class="badge badge-guru">Guru</span>';

  return `
    <header class="navbar" id="navbar">
      <div class="navbar-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
        <span class="navbar-title">${title}</span>
      </div>
      <div class="navbar-right">
        ${roleBadge}
        <a href="#/profile" class="navbar-user">
          <div class="avatar">${initials}</div>
          <span class="navbar-user-name">${profile?.name || 'User'}</span>
        </a>
      </div>
    </header>
  `;
}
