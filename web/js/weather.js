// Open-Meteo: API anahtarı gerektirmeyen ücretsiz hava durumu servisi.
// 15 dakikada bir yenilenir; ana ekran kartı ve hava durumu ekranı aynı veriyi paylaşır.

const CODES = {
  0: ['Açık', 'sun'], 1: ['Az bulutlu', 'partly'], 2: ['Parçalı bulutlu', 'partly'], 3: ['Kapalı', 'cloud'],
  45: ['Sisli', 'fog'], 48: ['Kırağılı sis', 'fog'],
  51: ['Hafif çisenti', 'rain'], 53: ['Çisenti', 'rain'], 55: ['Yoğun çisenti', 'rain'],
  56: ['Donan çisenti', 'rain'], 57: ['Donan çisenti', 'rain'],
  61: ['Hafif yağmur', 'rain'], 63: ['Yağmur', 'rain'], 65: ['Kuvvetli yağmur', 'rain'],
  66: ['Donan yağmur', 'rain'], 67: ['Donan yağmur', 'rain'],
  71: ['Hafif kar', 'snow'], 73: ['Kar', 'snow'], 75: ['Yoğun kar', 'snow'], 77: ['Kar taneleri', 'snow'],
  80: ['Sağanak', 'rain'], 81: ['Sağanak', 'rain'], 82: ['Şiddetli sağanak', 'rain'],
  85: ['Kar sağanağı', 'snow'], 86: ['Kar sağanağı', 'snow'],
  95: ['Gök gürültülü', 'storm'], 96: ['Dolu ile fırtına', 'storm'], 99: ['Dolu ile fırtına', 'storm'],
};

export function describe(code, isDay = 1) {
  const [text, icon] = CODES[code] || ['—', 'cloud'];
  return { text, icon: icon === 'sun' && !isDay ? 'moon' : icon };
}

let data = null, loading = null, cfg = null;
const listeners = new Set();

export function initWeather(config) {
  cfg = config;
  refresh();
  setInterval(refresh, 15 * 60 * 1000);
}

export function onWeather(fn) {
  listeners.add(fn);
  if (data) fn(data);
  return () => listeners.delete(fn);
}

async function refresh() {
  if (!cfg || loading) return loading;
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: cfg.latitude, longitude: cfg.longitude, timezone: 'auto', forecast_days: 7,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  });
  loading = fetch(u).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(json => {
    data = { ...json, place: cfg.name };
    listeners.forEach(fn => fn(data));
  }).catch(err => console.warn('hava durumu alınamadı', err)).finally(() => { loading = null; });
  return loading;
}
