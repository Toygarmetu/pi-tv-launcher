// Hava durumu: şu an + önümüzdeki saatler + 7 gün.
import { el, esc } from '../dom.js';
import { icons } from '../icons.js';
import { onWeather, describe } from '../weather.js';

export default function weather(ctx) {
  const root = el(`
    <section class="weather">
      <header class="screen-head">
        <div class="screen-kicker">Hava Durumu</div>
        <h1 class="screen-title">${esc(ctx.config.weather?.name || '')}</h1>
      </header>
      <div class="wx-body"><p class="empty">Yükleniyor…</p></div>
    </section>`);
  const body = root.querySelector('.wx-body');

  const stop = onWeather(w => {
    const c = w.current, now = describe(c.weather_code, c.is_day);
    const nowIdx = Math.max(0, w.hourly.time.findIndex(t => t >= c.time.slice(0, 13)));
    const hours = w.hourly.time.slice(nowIdx, nowIdx + 12).map((t, i) => {
      const j = nowIdx + i, d = describe(w.hourly.weather_code[j], w.hourly.is_day[j]);
      return `<div class="wx-hour"><span>${i === 0 ? 'Şimdi' : t.slice(11, 16)}</span><i>${icons[d.icon]}</i><b>${Math.round(w.hourly.temperature_2m[j])}°</b></div>`;
    }).join('');
    const days = w.daily.time.map((t, i) => {
      const d = describe(w.daily.weather_code[i]);
      const name = i === 0 ? 'Bugün' : new Date(t + 'T12:00').toLocaleDateString('tr-TR', { weekday: 'long' });
      return `<div class="wx-day"><span class="wx-dname">${name}</span><i>${icons[d.icon]}</i>
        <span class="wx-rain">${w.daily.precipitation_probability_max[i] ?? 0}%</span>
        <span class="wx-range"><small>${Math.round(w.daily.temperature_2m_min[i])}°</small> <b>${Math.round(w.daily.temperature_2m_max[i])}°</b></span></div>`;
    }).join('');
    body.innerHTML = `
      <div class="wx-now">
        <i class="wx-now-icon wx-anim">${icons[now.icon]}</i>
        <div>
          <div class="wx-now-temp">${Math.round(c.temperature_2m)}°</div>
          <div class="wx-now-text">${esc(now.text)}</div>
          <div class="wx-now-meta">Hissedilen ${Math.round(c.apparent_temperature)}° · Nem %${c.relative_humidity_2m} · Rüzgâr ${Math.round(c.wind_speed_10m)} km/s</div>
        </div>
      </div>
      <div class="wx-hours">${hours}</div>
      <div class="wx-days">${days}</div>`;
  });

  return { el: root, destroy: stop };
}
