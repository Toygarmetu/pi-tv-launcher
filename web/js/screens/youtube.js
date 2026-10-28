// Tek bir YouTube videosunu gömülü (iframe) oynatıcıda açar.
// Telefondan gönderilen ya da adres çubuğuna yazılan YouTube linkleri buraya gelir.
// Kumanda tuşları iframe'e değil bu sayfaya gelir; oynatıcı IFrame API ile yönetilir.
import { el, fmtDuration } from '../dom.js';
import { icons } from '../icons.js';

let apiReady;
function loadApi() {
  apiReady ??= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiReady = null; reject(new Error('YouTube API yüklenemedi')); };
    document.head.append(s);
  });
  return apiReady;
}

const ERRORS = {
  2: 'Geçersiz video adresi', 5: 'Video oynatılamadı', 100: 'Video bulunamadı ya da gizli',
  101: 'Sahibi bu videonun başka sitelerde oynatılmasına izin vermiyor', 150: 'Sahibi bu videonun başka sitelerde oynatılmasına izin vermiyor',
};

export default function youtube(ctx, { id }) {
  const root = el(`
    <section class="player">
      <div class="yt-frame"><div></div></div>
      <div class="osd visible">
        <div class="osd-title">YouTube</div>
        <div class="osd-bar"><div class="osd-progress"></div></div>
        <div class="osd-row">
          <span class="osd-state"></span>
          <span class="osd-time">--:-- / --:--</span>
          <span class="osd-hint">OK oynat/duraklat · ◀ ▶ 10 sn · Geri çık</span>
        </div>
      </div>
      <div class="player-msg" hidden></div>
    </section>`);
  const $ = s => root.querySelector(s);
  const osd = $('.osd');
  let player, tick, hideTimer, destroyed = false;

  function showOsd(ms = 3500) {
    osd.classList.add('visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (player?.getPlayerState?.() === 1) osd.classList.remove('visible'); }, ms);
  }

  function render() {
    if (!player?.getDuration) return;
    const d = player.getDuration(), t = player.getCurrentTime();
    $('.osd-progress').style.width = d ? `${(t / d) * 100}%` : '0';
    $('.osd-time').textContent = `${fmtDuration(t)} / ${fmtDuration(d)}`;
    $('.osd-state').innerHTML = player.getPlayerState() === 1 ? icons.play : icons.pause;
  }

  function fail(text) {
    const m = $('.player-msg');
    m.hidden = false;
    m.innerHTML = `<b>${text}</b><br><small>Geri tuşuyla dönebilirsin.</small>`;
  }

  loadApi().then(YT => {
    if (destroyed) return;
    player = new YT.Player(root.querySelector('.yt-frame > div'), {
      videoId: id, width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3, hl: 'tr' },
      events: {
        onReady: e => {
          $('.osd-title').textContent = e.target.getVideoData?.().title || 'YouTube';
          e.target.playVideo();
          showOsd();
        },
        onStateChange: e => {
          if (e.data === YT.PlayerState.ENDED) ctx.pop();
          render();
          showOsd();
        },
        onError: e => fail(ERRORS[e.data] || `Oynatma hatası (${e.data})`),
      },
    });
    tick = setInterval(render, 500);
  }).catch(err => fail(err.message));

  function seek(delta) {
    if (!player?.seekTo) return;
    player.seekTo(Math.max(0, player.getCurrentTime() + delta), true);
    showOsd();
  }

  return {
    el: root,
    isPlaying: () => player?.getPlayerState?.() === 1,
    onAction(a) {
      switch (a) {
        case 'ok': case 'playpause':
          if (!player?.getPlayerState) return true;
          player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();
          return true;
        case 'left': case 'rewind': seek(-10); return true;
        case 'right': case 'forward': seek(+10); return true;
        case 'up': case 'down': showOsd(6000); return true;
      }
      return false;
    },
    destroy() { destroyed = true; clearInterval(tick); clearTimeout(hideTimer); player?.destroy?.(); },
  };
}
