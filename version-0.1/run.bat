@echo off
setlocal
set "ROOT=%~dp0"

:menu
echo ==============================
echo   JW Scrapping - Menu
 echo ==============================
echo.
echo [1] Iniciar servidor HTTP (puerto 8000)
echo [2] Ejecutar scraper.py
echo [3] Ejecutar scraper.py y luego servidor
echo [4] Abrir app (Neutralino)
echo [5] Salir
echo.
set /p choice=Selecciona una opcion: 

echo.
if "%choice%"=="1" (
  cd /d "%ROOT%"
  start "" cmd /c "timeout /t 1 >nul & start \"\" http://localhost:8000/programa-completo-nuevo.html"
  python -m http.server 8000
  goto :eof
)
if "%choice%"=="2" (
  cd /d "%ROOT%"
  python scraper.py
  goto :eof
)
if "%choice%"=="3" (
  cd /d "%ROOT%"
  python scraper.py
  start "" cmd /c "timeout /t 1 >nul & start \"\" http://localhost:8000/programa-completo-nuevo.html"
  python -m http.server 8000
  goto :eof
)
if "%choice%"=="4" (
  cd /d "%ROOT%neutralino-app"
  npx @neutralinojs/neu run
  goto :eof
)
if "%choice%"=="5" (
  exit /b 0
)

echo Opcion invalida.
pause
endlocal
