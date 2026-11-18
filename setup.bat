@echo off
setlocal EnableExtensions EnableDelayedExpansion
title RK Stores - Setup
cd /d "%~dp0"

echo.
echo  ==========================================
echo    RK Stores - one-time setup
echo  ==========================================
echo.

rem ---------- 1. Node.js ----------
echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 goto :nonode
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>18||(a===18&&b>=17)?0:1)"
if errorlevel 1 goto :oldnode
for /f "delims=" %%v in ('node -v') do echo       Node.js %%v found.
goto :env

:nonode
echo.
echo  [X] Node.js is not installed.
echo      Install the LTS version from https://nodejs.org , close this window,
echo      open it again and run setup.bat once more.
start "" "https://nodejs.org/en/download"
pause
exit /b 1

:oldnode
echo.
echo  [X] Your Node.js is too old. Version 18.17 or newer is needed.
echo      Install the LTS version from https://nodejs.org and run setup.bat again.
start "" "https://nodejs.org/en/download"
pause
exit /b 1

rem ---------- 2. .env.local ----------
:env
echo.
echo [2/5] Checking the .env.local settings file...
if exist ".env.local" goto :envok
copy ".env.example" ".env.local" >nul
echo       Created .env.local from .env.example.
:envok

rem ---------- 3. Packages ----------
echo.
echo [3/5] Installing packages (npm install) - this can take a few minutes...
call npm install --no-audit --no-fund
if errorlevel 1 goto :npmfail
echo       Packages installed.

rem ---------- 4. Generate secrets ----------
echo.
echo [4/5] Filling in the values that can be generated automatically...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-env.ps1"
set ENVSTATUS=%errorlevel%

rem ---------- 5. Python virtual environment (venv) ----------
echo.
echo [5/5] Creating the Python virtual environment (.venv) and installing its requirements...
echo       (Used for the automated device tests. The website itself runs on Node.js.)
set PYCMD=
py -3 --version >nul 2>nul
if not errorlevel 1 set PYCMD=py -3
if not "!PYCMD!"=="" goto :havepy
python --version >nul 2>nul
if not errorlevel 1 set PYCMD=python
if "!PYCMD!"=="" goto :nopy

:havepy
if not exist ".venv\Scripts\python.exe" call !PYCMD! -m venv .venv
if not exist ".venv\Scripts\python.exe" goto :pyfail
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r tests\requirements.txt
if errorlevel 1 goto :pyfail
echo       Downloading the test browser (Chromium) - about 150 MB, one time...
".venv\Scripts\python.exe" -m playwright install chromium
echo       Python venv ready in .venv
goto :summary

:nopy
echo       Python was not found, so the venv was skipped. The website still works without it.
echo       To get it later: install Python from https://python.org and tick Add python.exe to PATH, then run setup.bat again.
goto :summary

:pyfail
echo       The Python venv could not be completed. The website still works without it. Run setup.bat again later.
goto :summary

:npmfail
echo.
echo  [X] npm install failed. Check your internet connection and try again.
pause
exit /b 1

:summary
echo.
echo  ==========================================
echo    Setup finished
echo  ==========================================
echo.
echo  Do these ONE-TIME steps in your Supabase dashboard (supabase.com):
echo.
echo    1. SQL Editor - run supabase\schema.sql        (only if you have never run it)
echo    2. SQL Editor - run supabase\migrations\002_cart_order_coupon_banner_activity.sql
echo    3. Authentication - Email Templates - "Confirm signup":
echo       add the line   Your verification code is: {{ .Token }}
echo       (customers who register with an email type this code to verify)
echo    4. Authentication - URL Configuration:
echo       Site URL = http://localhost:3000
echo       Redirect URL = http://localhost:3000/auth/callback
echo    5. Make yourself admin (after you register on the site):
echo       update profiles set role = 'super_admin' where email = 'you@example.com';
echo       (phone account: where phone = '919876543210')
echo.
if "%ENVSTATUS%"=="2" goto :needkeys
echo  Everything is ready. Double-click start.bat to run the site.
echo.
pause
exit /b 0

:needkeys
echo  IMPORTANT: .env.local still needs your Supabase keys. Notepad will open now.
echo  Paste the three Supabase values, save the file, then double-click start.bat.
echo.
start "" notepad ".env.local"
pause
exit /b 2
