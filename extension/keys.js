// Launcher dışındaki her sayfada çalışır: kumandanın Geri / Home tuşlarını yakalar.
//   Home (Home, BrowserHome, F10)      -> ana ekran
//   Geri (Escape, BrowserBack, ⌫)      -> önceki sayfa (YouTube TV'de YouTube'un kendi Geri'si)
//   Geri'ye ~1 sn basılı tutmak        -> her yerde ana ekran
(() => {
  const LAUNCHER = 'http://localhost:8080/';
  const LONG_PRESS_MS = 800;
  const KEYCODES = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, MediaPlayPause: 179 };

  const isYouTubeTv = () => location.hostname === 'www.youtube.com' && location.pathname.startsWith('/tv');
  const editable = el => !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'submit'].includes(el.type)));
  const goHome = () => { location.href = LAUNCHER; };
  const stop = e => { e.preventDefault(); e.stopImmediatePropagation(); };

  let backDownAt = 0;

  addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'Home' || k === 'BrowserHome' || k === 'F10') { stop(e); goHome(); return; }

    const isBack = k === 'Escape' || k === 'BrowserBack' || (k === 'Backspace' && !editable(e.target));
    if (!isBack) return;

    if (!e.repeat) backDownAt = Date.now();
    else if (Date.now() - backDownAt > LONG_PRESS_MS) { stop(e); goHome(); return; }

    if (isYouTubeTv()) return;                                  // YouTube TV kendi menüsünde geri gider
    if (e.repeat) { stop(e); return; }
    if (k === 'Escape' && editable(e.target)) { e.target.blur(); stop(e); return; }
    if (k === 'Escape' && document.fullscreenElement) return;   // önce tam ekran videodan çık
    stop(e);
    if (history.length > 1) history.back(); else goHome();
  }, true);

  // Telefon kumandasından gelen yön tuşları (arka plan iletir).
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type !== 'key') return;
    const key = msg.key;
    const target = document.activeElement || document.body;
    for (const type of ['keydown', 'keyup']) {
      target.dispatchEvent(new KeyboardEvent(type, { key, code: key, keyCode: KEYCODES[key] || 0, which: KEYCODES[key] || 0, bubbles: true, cancelable: true }));
    }
  });
})();
