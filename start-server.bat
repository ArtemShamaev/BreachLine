@echo off
chcp 65001 >nul
rem Starts your own Breachline server: asks for a port and a name, keeps data in .\data.
rem Needs Node.js 18+ (https://nodejs.org). npm is not needed.
cd /d "%~dp0"
where node >nul 2>nul || (echo Нужен Node.js 18 или новее: https://nodejs.org & pause & exit /b 1)
set PORT=
set /p PORT=Порт [8088]: 
if "%PORT%"=="" set PORT=8088
set NAME=
set /p NAME=Название сервера [Мой сервер]: 
if "%NAME%"=="" set NAME=Мой сервер
echo.
echo Пробросьте порт %PORT% (роутер, Openport, playit и т. п.) и дайте друзьям адрес.
echo Для игры с сайта по https нужен https-адрес туннеля; иначе друзья открывают игру прямо по адресу сервера.
echo.
set BREACHLINE_NAME=%NAME%
node server.js %PORT%
pause
