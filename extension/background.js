// Kiosk yardımcısı — arka plan.
//  * Telefondan gelen adres/tuşları, launcher dışındaki bir sayfadayken de uygular.
//  * youtube.com/tv açılamayıp normal YouTube'a yönlendirilirse bunu fark eder ve
//    bir hafta boyunca launcher'ın doğrudan web sürümünü açmasını sağlar.
const LAUNCHER = 'http://localhost:8080/';
const WEEK = 7 * 24 * 3600 * 1000;
const KEY_NAMES = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', ok: 'Enter', playpause: 'MediaPlayPause' };

// ---------------------------------------------------------------- telefon olayları

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Telefon kumandasından gelen komutlar için yerel sunucuya EventSource bağlantısı',
  }).catch(() => {});
}
chrome.runtime.onStartup.addListener(ensureOffscreen);
chrome.runtime.onInstalled.addListener(ensureOffscreen);
ensureOffscreen();

async function handleRemote(ev) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || tab.url?.startsWith(LAUNCHER)) return; // launcher bu olayları kendisi işler
  if (ev.type === 'open') {
    chrome.tabs.update(tab.id, { url: ev.youtubeId ? `${LAUNCHER}#yt=${ev.youtubeId}` : ev.url });
  } else if (ev.type === 'key') {
    if (ev.key === 'home') chrome.tabs.update(tab.id, { url: LAUNCHER });
    else if (ev.key === 'back') chrome.tabs.goBack(tab.id).catch(() => chrome.tabs.update(tab.id, { url: LAUNCHER }));
    else if (KEY_NAMES[ev.key]) chrome.tabs.sendMessage(tab.id, { type: 'key', key: KEY_NAMES[ev.key] }).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'remote-event') { handleRemote(msg.event); return; }
  if (msg.type === 'status') {
    chrome.storage.local.get('ytFallbackAt').then(({ ytFallbackAt }) =>
      reply({ ytFallback: !!ytFallbackAt && Date.now() - ytFallbackAt < WEEK }));
    return true;
  }
  if (msg.type === 'reset-youtube') { chrome.storage.local.remove('ytFallbackAt').then(() => reply(true)); return true; }
});

// ---------------------------------------------------------------- YouTube TV yedek planı

const tvStartedAt = new Map();

chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (d.frameId === 0 && d.url.startsWith('https://www.youtube.com/tv')) tvStartedAt.set(d.tabId, Date.now());
});

chrome.webNavigation.onCommitted.addListener(d => {
  if (d.frameId !== 0 || !tvStartedAt.has(d.tabId)) return;
  const u = new URL(d.url);
  const onTv = u.hostname === 'www.youtube.com' && u.pathname.startsWith('/tv');
  if (onTv) return;
  const redirected = u.hostname.endsWith('youtube.com') && Date.now() - tvStartedAt.get(d.tabId) < 20000;
  tvStartedAt.delete(d.tabId);
  if (redirected) {
    // TV arayüzü cihazı kabul etmedi: kullanıcı zaten normal youtube.com'da; bir dahakine doğrudan oraya git.
    chrome.storage.local.set({ ytFallbackAt: Date.now() });
  }
});
