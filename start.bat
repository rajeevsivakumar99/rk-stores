@echo off
setlocal EnableExtensions
title RK Stores - Launcher
cd /d "%~dp0"

rem Run setup first if this is the first time.
if not exist "node_modules" goto :needsetup
if not exist ".env.local" goto :needsetup
goto :check

:needsetup
echo First run detected - running setup.bat first...
echo.
call "%~dp0setup.bat"
rem setup.bat returns 2 when .env.local still needs the Supabase keys.
if errorlevel 2 exit /b 2
if not exist "node_modules" exit /b 1
if not exist ".env.local" exit /b 1

:check
rem Make sure the Supabase keys are filled in (also fills any generated secrets that are still empty).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-env.ps1" >nul
if errorlevel 2 goto :nokeys
goto :run

:nokeys
echo.
echo  .env.local still needs your Supabase keys (Supabase - Project Settings - API).
echo  Notepad will open. Paste the three values, save, then run start.bat again.
start "" notepad ".env.local"
pause
exit /b 2

:run
echo.
echo  Starting RK Stores...
echo  The website server opens in its own window. Close that window to stop the site.
echo  If setup created the Python venv, a second window opens with it already activated.
echo.

rem Terminal 1 (the only one required): the Next.js server - website, admin panel and API in one.
start "RK Stores - Server (close to stop)" /d "%~dp0" cmd /k "npm run dev"

rem Terminal 2 (optional helper): a command window with the Python venv already activated, for running the tests.
if exist ".venv\Scripts\activate.bat" start "RK Stores - Python venv (tests)" /d "%~dp0" cmd /k ".venv\Scripts\activate.bat"

echo  Waiting for the site to be ready...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=0; while($t -lt 90){ try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 2 | Out-Null; break } catch { if ($_.Exception.Response) { break }; Start-Sleep -Seconds 1; $t++ } }"

start "" "http://localhost:3000"
echo.
echo  Site:   http://localhost:3000
echo  Log in with your admin account on the normal login page - the admin panel appears automatically.
echo.
timeout /t 5 >nul
exit /b 0
