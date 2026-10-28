// Arka plan service worker'ı 30 sn boşta kalınca kapanır; bu görünmez belge ise açık kalır
// ve yerel sunucunun olay akışını (telefondan gelen adres/tuşlar) sürekli dinler.
const es = new EventSource('http://localhost:8080/api/events');
es.onmessage = e => {
  chrome.runtime.sendMessage({ type: 'remote-event', event: JSON.parse(e.data) }).catch(() => {});
};
