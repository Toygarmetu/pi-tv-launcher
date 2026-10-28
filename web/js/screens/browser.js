// İnternet ekranı: adres çubuğu + kumandayla kullanılabilen ekran klavyesi + yer imleri
// + telefondan adres gönderme bilgisi. "Git" denince sayfa tam ekran açılır.
import { el, esc } from '../dom.js';
import { icons } from '../icons.js';

const ROWS = [
  '1234567890'.split(''),
  'qwertyuıopğü'.split(''),
  'asdfghjklşi'.split(''),
  'zxcvbnmöç.-'.split(''),
];
const SPECIAL = [
  { cmd: 'shift', label: '⇧' }, { key: '/' }, { key: ':' }, { key: '@' }, { key: '_' },
  { key: '.com' }, { key: '.com.tr' }, { cmd: 'space', label: 'Boşluk', wide: 2 },
  { cmd: 'del', label: '⌫' }, { cmd: 'clear', label: 'Temizle' }, { cmd: 'go', label: 'Git', wide: 2, cls: 'go' },
];

export function toUrl(text, searchBase) {
  const t = text.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^localhost(:\d+)?(\/|$)/i.test(t) || /^[^\s]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(t) || /^\d+\.\d+\.\d+\.\d+/.test(t)) return `https://${t}`;
  return searchBase + encodeURIComponent(t);
}

export default function browser(ctx) {
  const bookmarks = ctx.config.bookmarks || [];
  const remoteUrl = ctx.info.remoteUrl;
  const root = el(`
    <section class="browser">
      <header class="screen-head">
        <div class="screen-kicker">İnternet</div>
        <h1 class="screen-title">Nereye gidelim?</h1>
      </header>
      <div class="browser-body">
        <div class="browser-main">
          <div class="addr">
            <span class="addr-icon">${icons.globe}</span>
            <input class="addr-input" data-nav data-nav-default type="text" inputmode="url" autocomplete="off"
                   spellcheck="false" placeholder="Adres ya da arama">
          </div>
          <div class="osk" data-nav-group="osk">
            ${ROWS.map(r => `<div class="osk-row">${r.map(k => `<button class="key" data-nav data-key="${k}">${k}</button>`).join('')}</div>`).join('')}
            <div class="osk-row">
              ${SPECIAL.map(s => `<button class="key ${s.cls || ''}" data-nav ${s.cmd ? `data-cmd="${s.cmd}"` : `data-key="${esc(s.key)}"`} style="flex:${s.wide || 1}">${esc(s.label || s.key)}</button>`).join('')}
            </div>
          </div>
        </div>
        <aside class="browser-side">
          <div class="side-label">Yer imleri</div>
          <div class="bm-list" data-nav-group="bm" data-scroll-y>
            ${bookmarks.map(b => `<button class="bm" data-nav data-url="${esc(b.url)}"><b>${esc(b.title)}</b><small>${esc(b.url.replace(/^https?:\/\/(www\.)?/, ''))}</small></button>`).join('')}
          </div>
          ${remoteUrl ? `
          <div class="phone-box">
            <span class="phone-icon">${icons.phone}</span>
            <div><b>Telefondan gönder</b><small>Aynı Wi-Fi’deki telefonda aç:</small><code>${esc(remoteUrl)}</code></div>
          </div>` : ''}
          <p class="browser-note">Sayfadayken <b>Geri</b> önceki sayfa, <b>Geri’ye basılı tut</b> ya da <b>Home</b> ana ekran.</p>
        </aside>
      </div>
    </section>`);

  const input = root.querySelector('.addr-input');
  let shift = false;

  function setShift(on) {
    shift = on;
    root.querySelector('[data-cmd="shift"]').classList.toggle('on', on);
    root.querySelectorAll('.osk-row .key[data-key]').forEach(k => {
      const v = k.dataset.key;
      k.textContent = on && v.length === 1 ? v.toLocaleUpperCase('tr') : v;
    });
  }

  function go() {
    const url = toUrl(input.value, ctx.config.search || 'https://www.google.com/search?q=');
    if (!url) return ctx.toast('Önce bir adres yaz');
    ctx.openUrl(url);
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.url) return ctx.openUrl(b.dataset.url);
    if (b.dataset.key) {
      const k = b.dataset.key;
      input.value += shift && k.length === 1 ? k.toLocaleUpperCase('tr') : k;
      if (shift) setShift(false);
      return;
    }
    switch (b.dataset.cmd) {
      case 'shift': setShift(!shift); break;
      case 'space': input.value += ' '; break;
      case 'del': input.value = input.value.slice(0, -1); break;
      case 'clear': input.value = ''; break;
      case 'go': go(); break;
    }
  });

  return {
    el: root,
    onAction(a) {
      if (a === 'ok' && document.activeElement === input) { go(); return true; }
      return false;
    },
  };
}
