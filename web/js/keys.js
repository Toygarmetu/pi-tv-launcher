// Ham klavye/kumanda tuşlarını soyut eylemlere çevirir.
// Mac'te: ok tuşları + Enter + Esc/Backspace. Pi'de HDMI-CEC kumandası aynı tuşlara
// eşlenir (bkz. pi/cec-keys), bu yüzden arayüz kodu iki ortamda da aynıdır.

const MAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'ok', NumpadEnter: 'ok', Select: 'ok',
  Escape: 'back', Backspace: 'back', BrowserBack: 'back', GoBack: 'back',
  Home: 'home', BrowserHome: 'home', F10: 'home',
  MediaPlayPause: 'playpause', MediaPlay: 'playpause', MediaPause: 'playpause',
  MediaStop: 'back',
  MediaFastForward: 'forward', MediaTrackNext: 'forward',
  MediaRewind: 'rewind', MediaTrackPrevious: 'rewind',
  ' ': 'playpause',
};

export function isEditable(el) {
  return !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && !['button', 'checkbox', 'radio'].includes(el.type)));
}

export function actionFor(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null; // Cmd+R vb. tarayıcıya kalsın
  const action = MAP[e.key];
  if (!action) return null;
  const t = e.target;
  if (isEditable(t)) {
    // Metin kutusunda Backspace/Boşluk yazı için; sol/sağ imleç sınırdayken gezinme
    if (e.key === 'Backspace' || e.key === ' ') return null;
    if (action === 'left' && (t.selectionStart > 0 || t.selectionEnd > 0)) return null;
    if (action === 'right' && t.selectionEnd < t.value.length) return null;
  }
  return action;
}
