// Ekran koruyucu: belli süre tuşa basılmazsa tam ekran saat + tarih + hava durumu.
// Video oynarken devreye girmez. Herhangi bir tuş yalnızca uyandırır (o tuş işlenmez).
// Ekran izi (burn-in) olmasın diye içerik her dakika yer değiştirir.
import { el, esc, fmtTime, fmtDate, everyMinute } from './dom.js';
import { icons } from './icons.js';
import { onWeather, describe } from './weather.js';

// Hava durumuna göre arka plan renkleri
const PALETTES = {
  sun: ['#f2994a', '#2d6cdf'], partly: ['#4f8fe8', '#c98a3d'], cloud: ['#4a5d7e', '#2a3550'],
  fog: ['#5c6878', '#2f3742'], rain: ['#2c5a8f', '#1d2b4a'], snow: ['#8fb3d9', '#3c5577'],
  storm: ['#3b3f6b', '#1b1d33'], moon: ['#3a2f7a', '#101a40'],
};

export function initScreensaver({ idleMs, isBusy }) {
  const root = el(`
    <div class="saver" hidden>
      <div class="saver-bg"><i></i><i></i><i></i></div>
      <div class="saver-box">
        <div class="saver-time"></div>
        <div class="saver-date"></div>
        <div class="saver-wx"></div>
      </div>
    </div>`);
  document.body.append(root);
  const box = root.querySelector('.saver-box');
  let timer, moveTimer, stopClock, stopWeather, active = false;

  function arm() {
    clearTimeout(timer);
    timer = setTimeout(() => (isBusy() ? arm() : show()), idleMs);
  }

  function move() {
    // Kenarlardan taşmadan, kalan boş alan içinde rastgele bir nokta
    const maxX = Math.max(0, (innerWidth - box.offsetWidth) / 2 - innerWidth * 0.04);
    const maxY = Math.max(0, (innerHeight - box.offsetHeight) / 2 - innerHeight * 0.05);
    const x = (Math.random() * 2 - 1) * maxX, y = (Math.random() * 2 - 1) * maxY;
    box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function show() {
    active = true;
    root.hidden = false;
    stopClock = everyMinute(() => {
      root.querySelector('.saver-time').textContent = fmtTime();
      root.querySelector('.saver-date').textContent = fmtDate();
    });
    stopWeather = onWeather(w => {
      const c = w.current, d = describe(c.weather_code, c.is_day);
      const [c1, c2] = PALETTES[d.icon] || PALETTES.cloud;
      root.style.setProperty('--s1', c1);
      root.style.setProperty('--s2', c2);
      root.querySelector('.saver-wx').innerHTML = `
        <span class="saver-wx-icon wx-anim">${icons[d.icon]}</span>
        <span><b>${Math.round(c.temperature_2m)}°</b> ${esc(d.text)}<small>${esc(w.place)}</small></span>`;
      move(); // içerik boyu değişti; taşmasın
    });
    move();
    moveTimer = setInterval(move, 60000);
    requestAnimationFrame(() => root.classList.add('on'));
  }

  function hide() {
    active = false;
    root.classList.remove('on');
    root.hidden = true;
    stopClock?.();
    stopWeather?.();
    clearInterval(moveTimer);
  }

  arm();
  return {
    // Her kullanıcı etkinliğinde çağrılır. Koruyucu açıksa kapatır ve true döner (tuş yutulur).
    activity() {
      const wasActive = active;
      if (active) hide();
      arm();
      return wasActive;
    },
    show,
  };
}
