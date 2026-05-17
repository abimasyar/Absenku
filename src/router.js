/**
 * Simple hash-based SPA Router
 */
export class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.beforeEach = null;
    window.addEventListener('hashchange', () => this.resolve());
  }

  add(pattern, handler) {
    // Convert :param to named capture groups, match end of string (ignore query string)
    const regexStr = '^' + pattern.replace(/:([a-zA-Z]+)/g, '(?<$1>[^/?]+)') + '(?:\\?.*)?$';
    const regex = new RegExp(regexStr);
    this.routes.push({ pattern, regex, handler });
    return this;
  }

  guard(fn) {
    this.beforeEach = fn;
    return this;
  }

  navigate(path) {
    window.location.hash = path;
  }

  async resolve() {
    // Strip query string from hash before matching
    const rawHash = window.location.hash.slice(1) || '/login';
    const hash = rawHash.split('?')[0] || '/login';

    for (const route of this.routes) {
      const match = hash.match(route.regex);
      if (match) {
        if (this.beforeEach) {
          const allowed = await this.beforeEach(hash, route);
          if (!allowed) return;
        }
        this.currentRoute = { ...route, params: match.groups || {} };
        await route.handler(match.groups || {});
        return;
      }
    }

    // 404 fallback
    this.navigate('/login');
  }

  start() {
    this.resolve();
  }
}

export const router = new Router();
