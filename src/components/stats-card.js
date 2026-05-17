/**
 * Stats card component
 * @param {string} type - hadir | izin | sakit | alpha | rate
 * @param {number|string} value - numeric value or formatted string
 * @param {string} label - card label
 * @param {number} [delay] - stagger delay index (1-based), adds delay-N class
 * @param {string} [subtitle] - optional subtitle below value
 */
export function renderStatsCard(type, value, label, delay = 0, subtitle = '') {
  const icons = { hadir: '✅', izin: '📝', sakit: '🏥', alpha: '❌', rate: '📊' };
  const delayClass = delay > 0 ? ` delay-${delay}` : '';
  const subtitleHtml = subtitle ? `<div class="stats-subtitle">${subtitle}</div>` : '';
  return `
    <div class="stats-card stats-card-${type} animate-fade-in-up${delayClass}">
      <div class="stats-icon">${icons[type] || '📊'}</div>
      <div class="stats-value" data-count="${typeof value === 'number' ? value : ''}" data-display="${value}">${value}</div>
      <div class="stats-label">${label}</div>
      ${subtitleHtml}
    </div>
  `;
}

/**
 * Animate counting up for numeric values
 */
export function animateCounters(container) {
  const els = container.querySelectorAll('[data-count]');
  els.forEach(el => {
    const rawCount = el.dataset.count;
    // Skip non-numeric or empty data-count (e.g. percentage strings)
    if (!rawCount && rawCount !== '0') return;
    const target = parseInt(rawCount) || 0;
    if (target === 0) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = el.dataset.display
        ? el.dataset.display.replace(/\d+/, current)
        : current;
    }, 30);
  });
}
