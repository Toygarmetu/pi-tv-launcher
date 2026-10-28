// Tam ekran saat (ekran koruyucu gibi de kullanılabilir).
import { el, fmtTime, fmtDate, everyMinute } from '../dom.js';

export default function clock() {
  const root = el(`
    <section class="clock">
      <div class="clock-time"></div>
      <div class="clock-date"></div>
    </section>`);
  const stop = everyMinute(() => {
    root.querySelector('.clock-time').textContent = fmtTime();
    root.querySelector('.clock-date').textContent = fmtDate(new Date()) + ' ' + new Date().getFullYear();
  });
  return { el: root, destroy: stop };
}
