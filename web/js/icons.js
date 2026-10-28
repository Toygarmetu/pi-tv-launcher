// Satır içi SVG ikonlar — harici dosya/font gerekmez, Pi'de çevrimdışı çalışır.
const svg = (body, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  youtube: `<svg viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="5" fill="#fff"/><path d="M11 5.5v9l8-4.5z" fill="#ff0033"/></svg>`,
  film: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  play: svg('<path d="M7 5v14l12-7z" fill="currentColor"/>'),
  pause: svg('<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  phone: svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  usb: svg('<path d="M12 3v14M12 3l-2 3h4zM8 9v3l4 2M16 8v2l-4 2"/><circle cx="12" cy="19" r="2"/>'),

  // hava durumu — parçalar sınıflı; .wx-anim içindeyken CSS ile canlandırılır (app.css sonu)
  sun: svg('<g class="a-rays"><path stroke="#ffd34d" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g><circle class="a-glow" cx="12" cy="12" r="4.5" fill="#ffd34d" stroke="#ffd34d"/>'),
  moon: svg('<path class="a-glow" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="#cfd8ff" stroke="#cfd8ff"/>'),
  partly: svg('<circle class="a-glow" cx="8.5" cy="8.5" r="3.5" fill="#ffd34d" stroke="#ffd34d"/><path class="a-drift" d="M7 19h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 7 19z" fill="#e8edf5" stroke="#e8edf5"/>'),
  cloud: svg('<path class="a-drift" d="M6.5 19h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4 1.8A3.6 3.6 0 0 0 6.5 19z" fill="#d3dae6" stroke="#d3dae6"/>'),
  fog: svg('<path class="a-fog1" stroke="#d3dae6" d="M4 9h16M5 17h14"/><path class="a-fog2" stroke="#d3dae6" d="M3 13h18"/>'),
  rain: svg('<g class="a-fall"><path stroke="#6cb6ff" d="M8 17l-1 3"/><path stroke="#6cb6ff" d="M12 17l-1 3"/><path stroke="#6cb6ff" d="M16 17l-1 3"/></g><path class="a-drift" d="M6.5 15h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 6.5 15z" fill="#d3dae6" stroke="#d3dae6"/>'),
  snow: svg('<g class="a-snow"><path stroke="#fff" stroke-width="2.6" d="M8 18h.01"/><path stroke="#fff" stroke-width="2.6" d="M12 18h.01"/><path stroke="#fff" stroke-width="2.6" d="M16 18h.01"/></g><path class="a-drift" d="M6.5 14h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 6.5 14z" fill="#e8edf5" stroke="#e8edf5"/>'),
  storm: svg('<path class="a-bolt" d="M13 14l-3 4h4l-3 4" stroke="#ffd34d"/><path class="a-drift" d="M6.5 14h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 6.5 14z" fill="#aab4c4" stroke="#aab4c4"/>'),
};
