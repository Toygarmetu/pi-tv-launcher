// Uygulama çekirdeği: ekran yığını (stack), global tuş yönetimi, telefon olayları.
import * as nav from './nav.js';
import { actionFor } from './keys.js';
import { hasExtension, extRequest } from './ext.js';
import { initWeather } from './weather.js';
import { initScreensaver } from './screensaver.js';
import home from './screens/home.js';
import videos from './screens/videos.js';
import player from './screens/player.js';
import browser from './screens/browser.js';
import youtube from './screens/youtube.js';
import weather from './screens/weather.js';
import clock from './screens/clock.js';

const SCREENS = { home, videos, player, browser, youtube, weather, clock };
const root = document.getElementById('screens');
const stack = [];
const top = () => stack[stack.length - 1];
let saver = null;

export const ctx = {
  config: {}, info: {},
  push, pop, goHome, toast, openUrl, launchYouTube, setAccent,
};

// ---------------------------------------------------------------- ekran yığını

function push(name, params = {}) {
  const prev = top();
  if (prev) { prev.lastFocus = nav.current(); prev.el.hidden = true; prev.onHide?.(); }
  const s = SCREENS[name](ctx, params);
  s.name = name;
  s.el.classList.add('screen', `screen-${name}`);
  stack.push(s);
  root.append(s.el);
  nav.setScope(s.el);
  s.onShow?.();
  if (!nav.current()) nav.focusFirst(s.el);
}

function pop() {
  if (stack.length <= 1) return false;
  const s = stack.pop();
  s.destroy?.();
  s.el.remove();
  const t = top();
  t.el.hidden = false;
  nav.setScope(t.el);
  t.onShow?.();
  if (t.lastFocus && t.el.contains(t.lastFocus)) nav.focus(t.lastFocus, { scroll: false });
  else nav.focusFirst(t.el);
  return true;
}

function goHome() { while (stack.length > 1) pop(); }

// ---------------------------------------------------------------- tuşlar

function dispatch(action) {
  const s = top();
  if (s?.onAction?.(action)) return;
  switch (action) {
    case 'up': case 'down': case 'left': case 'right': nav.move(action); break;
    case 'ok': nav.current()?.click(); break;
    case 'back': pop(); break;
    case 'home': goHome(); break;
  }
}

addEventListener('keydown', e => {
  if (saver?.activity()) { e.preventDefault(); return; } // ekran koruyucuyu yalnızca kapat
  const action = actionFor(e);
  if (!action) return;
  e.preventDefault();
  dispatch(action);
});

// Fare ile gezinen (Mac'te test) için: üzerine gelinen öğe odak alsın.
addEventListener('mousemove', e => {
  saver?.activity();
  const el = e.target.closest?.('[data-nav]');
  if (el && el !== document.activeElement && top()?.el.contains(el)) nav.focus(el, { scroll: false });
}, { passive: true });

// ---------------------------------------------------------------- yardımcılar

let toastTimer;
function toast(text, ms = 3500) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

function setAccent(color) {
  document.getElementById('bg').style.setProperty('--accent', color);
}

const YT_ID = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

// Harici bir adresi aç. YouTube video linkleri gömülü oynatıcıda; diğerleri tam sayfa.
// Not: Çoğu site iframe içine gömülmeyi yasaklar (X-Frame-Options / CSP), bu yüzden
// sayfanın kendisine gidilir; geri dönüş eklentideki Geri/Home tuşuyla olur.
function openUrl(url, { youtubeId } = {}) {
  const id = youtubeId || url.match(YT_ID)?.[1];
  if (id) return push('youtube', { id });
  saveSession();
  location.href = url;
}

async function launchYouTube() {
  const mode = ctx.config.youtube?.mode || 'auto';
  const status = await extRequest('status');
  const useTv = mode === 'tv' || (mode === 'auto' && hasExtension() && !status?.ytFallback);
  saveSession();
  location.href = useTv ? 'https://www.youtube.com/tv' : 'https://www.youtube.com/';
}

function saveSession() {
  try { sessionStorage.setItem('tvl.focus', document.activeElement?.dataset.id || ''); } catch {}
}

// ---------------------------------------------------------------- telefon olayları

function listenRemote() {
  const es = new EventSource('/api/events');
  es.onmessage = e => {
    const ev = JSON.parse(e.data);
    if (saver?.activity() && ev.type === 'key') return; // telefondan gelen tuş da önce uyandırır
    if (ev.type === 'open') {
      toast(`Telefondan: ${ev.url}`);
      openUrl(ev.url, { youtubeId: ev.youtubeId });
    } else if (ev.type === 'key') {
      dispatch(ev.key);
    }
  };
}

// ---------------------------------------------------------------- açılış

async function start() {
  const [config, info] = await Promise.all([
    fetch('/api/config').then(r => r.json()),
    fetch('/api/info').then(r => r.json()).catch(() => ({})),
  ]);
  Object.assign(ctx.config, config);
  Object.assign(ctx.info, info);
  document.documentElement.classList.toggle('has-ext', hasExtension());
  initWeather(config.weather);
  push('home');
  listenRemote();

  // Ekran koruyucu: config.screensaver.idleMinutes (0 = kapalı). Test için: ?idle=10 (saniye)
  const idleSec = +new URLSearchParams(location.search).get('idle') || (config.screensaver?.idleMinutes ?? 5) * 60;
  if (idleSec > 0) saver = initScreensaver({ idleMs: idleSec * 1000, isBusy: () => !!top()?.isPlaying?.() });

  // Eklenti, başka bir sayfadayken telefondan gelen YouTube linkini #yt=ID ile buraya yollar.
  const yt = location.hash.match(/^#yt=([A-Za-z0-9_-]{11})/);
  if (yt) { history.replaceState(null, '', location.pathname); push('youtube', { id: yt[1] }); }
}

start();
