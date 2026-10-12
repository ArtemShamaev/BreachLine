#!/bin/sh
# Starts your own Breachline server: asks for a port and a name, keeps data in ./data.
# Needs Node.js 18+ (https://nodejs.org). npm is not needed.
# With cloudflared installed it can also give the server a public https address, which players can
# add from the game's website (an https page may only connect to https servers).
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js 18 или новее: https://nodejs.org"; exit 1
fi
printf "Порт [8088]: "; read PORT; PORT=${PORT:-8088}
printf "Название сервера [Мой сервер]: "; read NAME; NAME=${NAME:-Мой сервер}

TUNNEL_PID=
if command -v cloudflared >/dev/null 2>&1; then
  printf "Дать серверу https-адрес в интернете через Cloudflare (нужно для игры с сайта)? [Y/n]: "; read TUNNEL
  case "$TUNNEL" in [nNнН]*) ;; *)
    LOG="${TMPDIR:-/tmp}/breachline-tunnel-$$.log"
    cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" >"$LOG" 2>&1 &
    TUNNEL_PID=$!
    trap 'kill $TUNNEL_PID 2>/dev/null; rm -f "$LOG"' EXIT INT TERM
    # print the address as soon as Cloudflare hands it out (takes a few seconds)
    ( for i in $(seq 1 60); do
        URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1)
        if [ -n "$URL" ]; then
          echo; echo "  Адрес в интернете: $URL"
          echo "  Друзья: Мультиплеер → Добавить сервер → этот адрес → Подключиться."; echo
          exit 0
        fi
        sleep 1
      done; echo "  Cloudflare не выдал адрес — см. $LOG" ) &
  ;; esac
fi

echo
if [ -z "$TUNNEL_PID" ]; then
  echo "Для игры через интернет пробросьте порт $PORT (роутер, Openport, playit и т. п.)."
  echo "Адрес вида IP:порт друзья открывают прямо в браузере (http://IP:$PORT/): сайт по https к нему не подключится."
  command -v cloudflared >/dev/null 2>&1 || echo "Чтобы играть с сайта, установите cloudflared — скрипт сам выдаст https-адрес."
fi
echo "В этом окне: op ВашНик — назначить администратора (только он начинает матчи); help — все команды."
echo
BREACHLINE_NAME="$NAME" node server.js "$PORT"
