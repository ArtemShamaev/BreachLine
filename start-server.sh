#!/bin/sh
# Starts your own Breachline server: asks for a port and a name, keeps data in ./data.
# Needs Node.js 18+ (https://nodejs.org). npm is not needed.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js 18 или новее: https://nodejs.org"; exit 1
fi
printf "Порт [8088]: "; read PORT; PORT=${PORT:-8088}
printf "Название сервера [Мой сервер]: "; read NAME; NAME=${NAME:-Мой сервер}
echo
echo "Пробросьте порт $PORT (роутер, Openport, playit и т. п.) и дайте друзьям адрес."
echo "Для игры с сайта по https нужен https-адрес туннеля; иначе друзья открывают игру прямо по адресу сервера."
echo "В этом окне: op ВашНик — назначить администратора (только он начинает матчи); help — все команды."
echo
BREACHLINE_NAME="$NAME" exec node server.js "$PORT"
