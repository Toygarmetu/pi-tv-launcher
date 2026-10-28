// HTML5 video oynatıcı. Kumanda: OK = oynat/duraklat, ◀ ▶ = 10 sn sar, ▲ = bilgi, ▼ = altyazı aç/kapa, Geri = çık.
import { el, esc, fmtDuration } from '../dom.js';
import { icons } from '../icons.js';

const POS_KEY = p => `tvl.pos:${p}`;

export default function player(ctx, { item }) {
  const src = `/media/stream?path=${encodeURIComponent(item.path)}`;
  const root = el(`
    <section class="player">
      <video preload="auto" autoplay playsinline src="${src}">
        ${(item.subtitles || []).map((s, i) => `<track kind="subtitles" srclang="tr" label="Altyazı ${i + 1}" src="/media/subtitle?path=${encodeURIComponent(s)}"${i === 0 ? ' default' : ''}>`).join('')}
      </video>
      <div class="osd">
        <div class="osd-title">${esc(item.name)}</div>
        <div class="osd-bar"><div class="osd-buffer"></div><div class="osd-progress"></div></div>
        <div class="osd-row">
          <span class="osd-state"></span>
          <span class="osd-time">0:00 / --:--</span>
          <span class="osd-hint">OK oynat/duraklat · ◀ ▶ 10 sn · ▼ altyazı · Geri çık</span>
        </div>
      </div>
      <div class="player-msg" hidden></div>
    </section>`);
  const video = root.querySelector('video');
  const osd = root.querySelector('.osd');
  const $ = s => root.querySelector(s);
  let hideTimer;

  // Bilgi bandı açıkken altyazıyı onun üstüne kaldır.
  function setOsd(visible) {
    osd.classList.toggle('visible', visible);
    for (const t of video.textTracks) for (const c of t.cues || []) c.line = visible ? -8 : 'auto';
  }

  function showOsd(ms = 3500) {
    setOsd(true);
    clearTimeout(hideTimer);
    if (!video.paused) hideTimer = setTimeout(() => setOsd(false), ms);
  }

  function render() {
    const d = video.duration, t = video.currentTime;
    $('.osd-progress').style.width = d ? `${(t / d) * 100}%` : '0';
    if (video.buffered.length && d) $('.osd-buffer').style.width = `${(video.buffered.end(video.buffered.length - 1) / d) * 100}%`;
    $('.osd-time').textContent = `${fmtDuration(t)} / ${fmtDuration(d)}`;
    $('.osd-state').innerHTML = video.paused ? icons.pause : icons.play;
  }

  function savePos() {
    try {
      const d = video.duration, t = video.currentTime;
      if (d && t > 30 && t < d - 30) localStorage.setItem(POS_KEY(item.path), String(Math.floor(t)));
      else localStorage.removeItem(POS_KEY(item.path));
    } catch {}
  }

  video.addEventListener('loadedmetadata', () => {
    let saved = 0;
    try { saved = +localStorage.getItem(POS_KEY(item.path)) || 0; } catch {}
    if (saved) { video.currentTime = saved; ctx.toast(`Kaldığın yerden devam: ${fmtDuration(saved)}`); }
    render();
  });
  root.querySelectorAll('track').forEach(tr =>
    tr.addEventListener('load', () => setOsd(osd.classList.contains('visible'))));
  video.addEventListener('timeupdate', render);
  video.addEventListener('progress', render);
  video.addEventListener('play', () => { render(); showOsd(); });
  video.addEventListener('pause', () => { render(); showOsd(); savePos(); });
  video.addEventListener('ended', () => { savePos(); ctx.pop(); });
  video.addEventListener('error', () => {
    const m = $('.player-msg');
    m.hidden = false;
    m.innerHTML = `<b>Bu video oynatılamıyor</b><br>Tarayıcı bu kodeği desteklemiyor olabilir (ör. HEVC/H.265, AC3/DTS ses).<br><small>${esc(item.file)}</small>`;
  });
  const saveTimer = setInterval(savePos, 10000);

  function seek(delta) {
    if (!isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration - 1);
    render();
    showOsd();
  }

  function toggleSubs() {
    const tracks = [...video.textTracks];
    if (!tracks.length) return ctx.toast('Altyazı yok');
    const on = tracks.some(t => t.mode === 'showing');
    tracks.forEach((t, i) => { t.mode = !on && i === 0 ? 'showing' : 'hidden'; });
    ctx.toast(on ? 'Altyazı kapalı' : 'Altyazı açık', 1500);
  }

  return {
    el: root,
    onShow() { showOsd(); },
    isPlaying: () => !video.paused,
    onAction(a) {
      switch (a) {
        case 'ok': case 'playpause': video.paused ? video.play() : video.pause(); return true;
        case 'left': case 'rewind': seek(-10); return true;
        case 'right': case 'forward': seek(+10); return true;
        case 'up': showOsd(6000); return true;
        case 'down': toggleSubs(); return true;
      }
      return false; // back/home → varsayılan (ekranı kapat)
    },
    destroy() { savePos(); clearInterval(saveTimer); clearTimeout(hideTimer); video.pause(); video.removeAttribute('src'); video.load(); },
  };
}
