// Küçük uzamsal (spatial) gezinme yöneticisi.
// Fikir Norigin Spatial Navigation / js-spatial-navigation'dan: odaklanabilir öğeler
// ekrandaki konumlarına göre seçilir; "grup"lar (data-nav-group) son odaklanan
// öğeyi hatırlar — Apple TV'de satırlar arasında gezerken olduğu gibi.
//
// Odaklanabilir öğe: [data-nav] özniteliği olan herhangi bir eleman.
// Gerçek DOM odağı (focus()) kullanılır; böylece <input> klavyeyle doğal çalışır.

let scope = document.body;
const groupMemory = new WeakMap();

export function setScope(el) { scope = el; }

function visible(el) {
  if (el.disabled || el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

export function focusables(root = scope) {
  return [...root.querySelectorAll('[data-nav]')].filter(visible);
}

export function current() {
  const a = document.activeElement;
  return a && a !== document.body && scope.contains(a) && a.matches('[data-nav]') ? a : null;
}

export function focus(el, { scroll = true } = {}) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const group = el.closest('[data-nav-group]');
  if (group) groupMemory.set(group, el);
  if (scroll) scrollIntoView(el);
}

export function focusFirst(root = scope) {
  const pref = root.querySelector('[data-nav-default]');
  focus(pref && visible(pref) ? pref : focusables(root)[0]);
}

function scrollIntoView(el) {
  // Yatay satırlar kartı ortalar; dikey liste en yakın kenara kaydırır.
  const row = el.closest('[data-scroll-x]');
  if (row) {
    const target = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }
  const col = el.closest('[data-scroll-y]');
  if (col) {
    const r = el.getBoundingClientRect(), c = col.getBoundingClientRect();
    const pad = c.height * 0.12;
    if (r.top < c.top + pad) col.scrollBy({ top: r.top - c.top - pad, behavior: 'smooth' });
    else if (r.bottom > c.bottom - pad) col.scrollBy({ top: r.bottom - c.bottom + pad, behavior: 'smooth' });
  }
}

// Verilen yönde en uygun aday: ana eksendeki mesafe + dik eksendeki kaymanın 2 katı.
function best(from, dir, candidates) {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let winner = null, score = Infinity;
  for (const el of candidates) {
    if (el === from) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    let main, cross;
    switch (dir) {
      case 'right': if (bx <= ax + 1) continue; main = b.left - a.right; cross = overlapGap(a.top, a.bottom, b.top, b.bottom, ay, by); break;
      case 'left': if (bx >= ax - 1) continue; main = a.left - b.right; cross = overlapGap(a.top, a.bottom, b.top, b.bottom, ay, by); break;
      case 'down': if (by <= ay + 1) continue; main = b.top - a.bottom; cross = overlapGap(a.left, a.right, b.left, b.right, ax, bx); break;
      case 'up': if (by >= ay - 1) continue; main = a.top - b.bottom; cross = overlapGap(a.left, a.right, b.left, b.right, ax, bx); break;
    }
    const s = Math.max(0, main) + cross * 2;
    if (s < score) { score = s; winner = el; }
  }
  return winner;
}

// Dik eksende örtüşen öğeler 0 cezası alır (aynı satır/sütun), örtüşmeyenler merkez farkı kadar.
function overlapGap(a1, a2, b1, b2, ac, bc) {
  return (b1 < a2 && b2 > a1) ? Math.abs(ac - bc) * 0.1 : Math.abs(ac - bc);
}

export function move(dir) {
  const items = focusables();
  const cur = current();
  if (!cur) { focusFirst(); return true; }
  let next = best(cur, dir, items);
  if (!next) return false;
  // Başka bir gruba geçiliyorsa o grubun hatırlanan öğesine dön.
  const g1 = cur.closest('[data-nav-group]'), g2 = next.closest('[data-nav-group]');
  if (g2 && g2 !== g1) {
    const remembered = groupMemory.get(g2);
    if (remembered && g2.contains(remembered) && visible(remembered)) next = remembered;
  }
  focus(next);
  return true;
}
