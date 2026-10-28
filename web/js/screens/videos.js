// Yerel video tarayıcısı: config.json → mediaDirs içindeki klasörler (Mac: ~/Movies, Pi: /media/... USB, NAS bağlama noktası).
import { el, esc } from '../dom.js';
import { icons } from '../icons.js';
import * as nav from '../nav.js';

const fmtSize = b => b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`;

export default function videos(ctx, { path = '' } = {}) {
  const root = el(`
    <section>
      <header class="screen-head">
        <div class="screen-kicker">Videolar</div>
        <h1 class="screen-title">Yükleniyor…</h1>
      </header>
      <div class="grid-wrap" data-scroll-y><div class="grid" data-nav-group="grid"></div></div>
    </section>`);
  const grid = root.querySelector('.grid');
  const title = root.querySelector('.screen-title');
  let items = [];

  async function load() {
    const res = await fetch(`/api/media?path=${encodeURIComponent(path)}`).then(r => r.json()).catch(() => ({ error: 'Sunucuya ulaşılamadı' }));
    if (res.error) {
      title.textContent = 'Hata';
      grid.innerHTML = `<p class="empty">${esc(res.error)}</p>`;
      return;
    }
    title.textContent = res.title;
    items = res.items;
    if (!items.length) {
      grid.innerHTML = `<p class="empty">Bu klasörde oynatılabilir video yok.<br><small>Desteklenen: mp4, m4v, webm, mov, mkv (H.264/VP9/AV1)</small></p>`;
      return;
    }
    grid.innerHTML = items.map((it, i) => `
      <button class="poster ${it.type}${it.missing ? ' missing' : ''}" data-nav data-i="${i}" style="--h:${(i * 47) % 360}">
        <span class="poster-art">${it.type === 'dir' ? (path ? icons.folder : icons.usb) : icons.play}</span>
        <span class="poster-text">
          <b>${esc(it.name)}</b>
          <small>${it.type === 'dir' ? (it.missing ? 'Bağlı değil' : 'Klasör') : `${esc(it.file.split('.').pop().toUpperCase())} · ${fmtSize(it.size)}${it.subtitles?.length ? ' · Altyazı' : ''}`}</small>
        </span>
      </button>`).join('');
    nav.focusFirst(root);
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const it = items[+b.dataset.i];
    if (it.missing) return ctx.toast('Bu konum şu an bağlı değil');
    if (it.type === 'dir') ctx.push('videos', { path: it.path });
    else ctx.push('player', { item: it });
  });

  load();
  return { el: root };
}
