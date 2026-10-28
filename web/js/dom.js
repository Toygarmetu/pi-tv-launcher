// Minik DOM yardımcıları (framework yerine).

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const fmtTime = (d = new Date()) =>
  d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export const fmtDate = (d = new Date()) =>
  d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

export function fmtDuration(sec) {
  if (!isFinite(sec)) return '--:--';
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Dakika başında tetiklenen saat; tüm saat göstergeleri bunu kullanır.
export function everyMinute(fn) {
  fn();
  let interval;
  const timeout = setTimeout(() => { fn(); interval = setInterval(fn, 60000); }, 60000 - Date.now() % 60000 + 50);
  return () => { clearTimeout(timeout); clearInterval(interval); };
}
