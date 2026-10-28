// Launcher sayfasında çalışır: sayfaya eklentinin varlığını bildirir ve
// sayfa <-> arka plan (background.js) mesajlarını taşır.
document.documentElement.dataset.tvExt = '1';

addEventListener('message', async e => {
  if (e.source !== window || e.data?.source !== 'tvl-page') return;
  const { id, source, ...msg } = e.data;
  let result = null;
  try { result = await chrome.runtime.sendMessage(msg); } catch {}
  postMessage({ source: 'tvl-ext', id, result }, location.origin);
});
