#!/usr/bin/env bash
# Mac'te geliştirme: sunucuyu başlatır, Chromium tabanlı bir tarayıcıyı ayrı bir profille açar.
#   ./scripts/run-mac.sh --setup  → Chrome for Testing'i proje içine (.browser/) indirir (bir kez)
#   ./scripts/run-mac.sh          → 1280×720 uygulama penceresi
#   KIOSK=1 ./scripts/run-mac.sh  → tam ekran kiosk (çıkış: ⌘Q)
#
# Neden Chrome for Testing? Normal Google Chrome 137'den beri --load-extension bayrağını
# yok sayıyor; kiosk eklentisi (Geri/Home tuşları, YouTube TV) yalnızca Chromium ve
# Chrome for Testing'de komut satırından yüklenebiliyor. Pi'deki Chromium'da sorun yok.
# Mac'e kalıcı bir şey kurulmaz: .browser/ ve .profile/ proje içinde, silinebilir.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
PORT="${TVL_PORT:-8080}"
URL="http://localhost:$PORT/"

if [[ "${1:-}" == "--setup" ]]; then
  npx -y @puppeteer/browsers install chrome@stable --path "$ROOT/.browser"
  exit 0
fi

find_browser() {
  [[ -n "${CHROME:-}" ]] && { echo "$CHROME"; return; }
  local cft
  cft="$(ls -d "$ROOT"/.browser/chrome/*/chrome-mac*/"Google Chrome for Testing.app" 2>/dev/null | tail -1 || true)"
  for app in \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "${cft:+$cft/Contents/MacOS/Google Chrome for Testing}" \
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    [[ -n "$app" && -x "$app" ]] && { echo "$app"; return; }
  done
}
BROWSER="$(find_browser)"
[[ -z "$BROWSER" ]] && { echo "Chrome/Chromium bulunamadı. ./scripts/run-mac.sh --setup çalıştırın ya da CHROME=/yol ile belirtin."; exit 1; }
if [[ "$BROWSER" == *"/Google Chrome.app/"* ]]; then
  echo "Uyarı: Normal Chrome eklentiyi yüklemez → YouTube TV ve sitelerde Geri/Home tuşu çalışmaz."
  echo "       Tam deneyim için bir kez: ./scripts/run-mac.sh --setup"
fi

if ! curl -s -o /dev/null "$URL"; then
  python3 server/server.py &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null' EXIT
  for _ in {1..30}; do curl -s -o /dev/null "$URL" && break; sleep 0.2; done
fi

MODE=(--app="$URL" --window-size=1280,720)
[[ "${KIOSK:-}" == 1 ]] && MODE=(--kiosk "$URL")

echo "Tarayıcı: $BROWSER"
"$BROWSER" \
  --user-data-dir="$ROOT/.profile" \
  --load-extension="$ROOT/extension" \
  --enable-spatial-navigation \
  --autoplay-policy=no-user-gesture-required \
  --lang=tr \
  --no-first-run --no-default-browser-check \
  "${MODE[@]}" >/dev/null 2>&1 &

echo "Launcher: $URL   — telefon: http://$(ipconfig getifaddr en0 2>/dev/null || echo localhost):$PORT/remote"
if [[ -n "${SERVER_PID:-}" ]]; then
  echo "Sunucuyu durdurmak için Ctrl+C"
  wait "$SERVER_PID"
fi
