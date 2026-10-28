// youtube.com/tv sayfasının kendi JS'i de tarayıcıyı TV sansın (sunucu tarafı için rules/youtube-tv.json).
// Bu dosya sayfanın "MAIN world"ünde, sayfa kodundan önce çalışır.
(() => {
  const UA = 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.0 TV Safari/537.36';
  const define = (name, get) => {
    try { Object.defineProperty(Navigator.prototype, name, { get, configurable: true }); } catch {}
  };
  define('userAgent', () => UA);
  define('appVersion', () => UA.slice(8));
  define('platform', () => 'Linux armv7l');
  define('userAgentData', () => undefined); // Client Hints masaüstü Chrome olduğunu ele verir
})();
