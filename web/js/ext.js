// Kiosk yardımcı eklentisiyle (extension/) konuşma köprüsü.
// Eklenti yüklüyse <html data-tv-ext="1"> olur; yoksa arayüz düz tarayıcı modunda çalışır.

export const hasExtension = () => document.documentElement.dataset.tvExt === '1';

let seq = 0;
export function extRequest(type, payload = {}) {
  if (!hasExtension()) return Promise.resolve(null);
  const id = ++seq;
  return new Promise(resolve => {
    const timer = setTimeout(() => { removeEventListener('message', onMsg); resolve(null); }, 1500);
    function onMsg(e) {
      if (e.source !== window || e.data?.source !== 'tvl-ext' || e.data.id !== id) return;
      clearTimeout(timer);
      removeEventListener('message', onMsg);
      resolve(e.data.result);
    }
    addEventListener('message', onMsg);
    postMessage({ source: 'tvl-page', id, type, ...payload }, location.origin);
  });
}
