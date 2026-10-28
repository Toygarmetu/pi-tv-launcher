// Ana ekran: üstte "top shelf" (odaklı kartın büyük başlığı), altta yatay kart satırları.
import { el, esc, fmtTime, fmtDate, everyMinute } from '../dom.js';
import { icons } from '../icons.js';
import { onWeather, describe } from '../weather.js';
import * as nav from '../nav.js';

const APPS = [
  { id: 'youtube', title: 'YouTube', accent: '#c4122f', c1: '#ff2d4f', c2: '#a3001b', icon: icons.youtube,
    kicker: 'Video', sub: 'Kumandayla kullanılabilen TV arayüzü' },
  { id: 'videos', title: 'Videolar', accent: '#1e6fd9', c1: '#3c8dff', c2: '#1747a6', icon: icons.film,
    kicker: 'Yerel medya', sub: 'Bilgisayardaki, ağdaki ve USB’deki videolar' },
  { id: 'browser', title: 'İnternet', accent: '#0f8a7a', c1: '#22c1a8', c2: '#0b6b8f', icon: icons.globe,
    kicker: 'Web', sub: 'Adres yaz, yer imi seç ya da telefondan gönder' },
  { id: 'weather', title: 'Hava Durumu', accent: '#3a64c8', c1: '#5aa0ff', c2: '#2b4fae', icon: icons.partly,
    kicker: 'Hava', sub: '' },
  { id: 'clock', title: 'Saat', accent: '#5b3cc4', c1: '#7f62ff', c2: '#3a2a8f', icon: icons.clock,
    kicker: 'Saat ve tarih', sub: '' },
];

function hue(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function home(ctx) {
  const bookmarks = ctx.config.bookmarks || [];
  const root = el(`
    <section>
      <header class="topbar">
        <div class="topbar-weather"></div>
        <div class="topbar-clock"></div>
      </header>
      <div class="hero">
        <div class="hero-kicker"></div>
        <h1 class="hero-title"></h1>
        <p class="hero-sub"></p>
      </div>
      <div class="rows">
        <div class="row apps" data-scroll-x data-nav-group="apps">
          ${APPS.map(a => `
            <button class="card" data-nav data-id="${a.id}" style="--c1:${a.c1};--c2:${a.c2}">
              <span class="card-art">
                <span class="card-icon">${a.icon}</span>
                <span class="card-live"></span>
              </span>
              <span class="card-label">${a.title}</span>
            </button>`).join('')}
        </div>
        ${bookmarks.length ? `
        <div class="row-label">Yer imleri</div>
        <div class="row bookmarks" data-scroll-x data-nav-group="bm">
          ${bookmarks.map((b, i) => `
            <button class="tile" data-nav data-id="bm-${i}" data-url="${esc(b.url)}" style="--h:${hue(b.url)}">
              <span class="tile-letter">${esc(b.title[0] || '?')}</span>
              <span class="tile-text"><b>${esc(b.title)}</b><small>${esc(new URL(b.url).hostname.replace(/^www\./, ''))}</small></span>
            </button>`).join('')}
        </div>` : ''}
      </div>
    </section>`);

  const $ = s => root.querySelector(s);
  const card = id => root.querySelector(`.card[data-id="${id}"]`);
  const live = id => card(id).querySelector('.card-live');
  const hero = { kicker: $('.hero-kicker'), title: $('.hero-title'), sub: $('.hero-sub') };
  let heroFor = null;

  // --- canlı kartlar: saat & hava
  const stopClock = everyMinute(() => {
    $('.topbar-clock').textContent = fmtTime();
    live('clock').innerHTML = `<span class="live-big">${fmtTime()}</span><span class="live-small">${esc(fmtDate())}</span>`;
    card('clock').classList.add('has-live');
    APPS.find(a => a.id === 'clock').sub = fmtDate();
    if (heroFor === 'clock') updateHero('clock');
  });

  const stopWeather = onWeather(w => {
    const c = w.current, d = describe(c.weather_code, c.is_day);
    const t = Math.round(c.temperature_2m);
    $('.topbar-weather').innerHTML = `<span class="mini-icon wx-anim">${icons[d.icon]}</span>
      <span class="mini-text"><b>${t}°</b><small>${esc(d.text)}</small></span>`;
    live('weather').innerHTML = `<span class="live-icon wx-anim">${icons[d.icon]}</span><span class="live-big">${t}°</span><span class="live-small">${esc(d.text)}</span>`;
    card('weather').classList.add('has-live');
    APPS.find(a => a.id === 'weather').sub = `${w.place}: ${d.text}, ${t}° · En yüksek ${Math.round(w.daily.temperature_2m_max[0])}°`;
    if (heroFor === 'weather') updateHero('weather');
  });

  if (!ctx.config.youtube || ctx.config.youtube.mode !== 'tv') {
    const yt = APPS[0];
    yt.sub = document.documentElement.classList.contains('has-ext')
      ? 'TV arayüzü (youtube.com/tv) — Geri tuşuna basılı tut: ana ekran'
      : 'Eklenti yok: normal youtube.com açılır (geri dönmek için ⌘[)';
  }

  function updateHero(id) {
    heroFor = id;
    const a = APPS.find(x => x.id === id);
    if (a) {
      hero.kicker.textContent = a.kicker;
      hero.title.textContent = a.title;
      hero.sub.textContent = a.sub;
      ctx.setAccent(a.accent);
      return;
    }
    const b = bookmarks[+id.slice(3)];
    if (b) {
      hero.kicker.textContent = 'Yer imi';
      hero.title.textContent = b.title;
      hero.sub.textContent = b.url;
      ctx.setAccent(`hsl(${hue(b.url)} 45% 30%)`);
    }
  }

  root.addEventListener('focusin', e => {
    const id = e.target.dataset?.id;
    if (id) updateHero(id);
  });

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.url) return ctx.openUrl(b.dataset.url);
    if (id === 'youtube') return ctx.launchYouTube();
    ctx.push(id);
  });

  return {
    el: root,
    onShow() {
      // Sayfaya geri dönüldüğünde (ör. YouTube'dan) son odaklanan kartı geri getir.
      let id = '';
      try { id = sessionStorage.getItem('tvl.focus') || ''; sessionStorage.removeItem('tvl.focus'); } catch {}
      const target = id && root.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (target) nav.focus(target);
      if (!heroFor) updateHero(nav.current()?.dataset.id || 'youtube');
    },
    destroy() { stopClock(); stopWeather(); },
  };
}
