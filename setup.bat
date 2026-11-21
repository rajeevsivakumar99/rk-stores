@echo off
setlocal EnableExtensions EnableDelayedExpansion
title RK Stores - Setup
cd /d "%~dp0"

rem ---------- logging: logs\setup.log (folder is created automatically) ----------
if not exist "%~dp0logs" mkdir "%~dp0logs"
set "RK_LOGFILE=%~dp0logs\setup.log"
>>"%RK_LOGFILE%" echo.
call :say "===== setup.bat started ====="

echo.
echo  ==========================================
echo    RK Stores - one-time setup
echo  ==========================================
echo.

rem ---------- 1. Node.js ----------
call :say "[1/5] Checking Node.js..."
where node >nul 2>nul
if errorlevel 1 goto :nonode
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>18||(a===18&&b>=17)?0:1)"
if errorlevel 1 goto :oldnode
for /f "delims=" %%v in ('node -v') do call :say "Node.js %%v found."
goto :env

:nonode
call :say "ERROR: Node.js is not installed."
echo.
echo  [X] Node.js is not installed.
echo      Install the LTS version from https://nodejs.org , close this window,
echo      open it again and run setup.bat once more.
start "" "https://nodejs.org/en/download"
pause
exit /b 1

:oldnode
call :say "ERROR: Node.js is older than 18.17."
echo.
echo  [X] Your Node.js is too old. Version 18.17 or newer is needed.
echo      Install the LTS version from https://nodejs.org and run setup.bat again.
start "" "https://nodejs.org/en/download"
pause
exit /b 1

rem ---------- 2. .env.local ----------
:env
echo.
call :say "[2/5] Checking the .env.local settings file..."
if exist ".env.local" goto :envok
copy ".env.example" ".env.local" >nul
call :say "Created .env.local from .env.example."
:envok

rem ---------- 3. Packages ----------
echo.
call :say "[3/5] Installing packages (npm install) - this can take a few minutes..."
set "RK_EXE=npm"
set "RK_ARGS=install --no-audit --no-fund"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-logged.ps1"
if errorlevel 1 goto :npmfail
call :say "Packages installed."

rem ---------- 4. Generate secrets ----------
echo.
call :say "[4/5] Filling in the values that can be generated automatically..."
set "RK_EXE=powershell"
set "RK_ARGS=-NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-env.ps1""
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-logged.ps1"
set ENVSTATUS=%errorlevel%
call :say "Environment check finished (code %ENVSTATUS%; 2 means Supabase keys are still missing)."

rem ---------- 5. Python virtual environment (venv) ----------
echo.
call :say "[5/5] Creating the Python virtual environment (.venv) and installing its requirements..."
echo       (Used for the automated device tests. The website itself runs on Node.js.)
set PYCMD=
py -3 --version >nul 2>nul
if not errorlevel 1 set PYCMD=py -3
if not "!PYCMD!"=="" goto :havepy
python --version >nul 2>nul
if not errorlevel 1 set PYCMD=python
if "!PYCMD!"=="" goto :nopy

:havepy
if not exist ".venv\Scripts\python.exe" call !PYCMD! -m venv .venv >>"%RK_LOGFILE%" 2>&1
if not exist ".venv\Scripts\python.exe" goto :pyfail
set "RK_EXE=%~dp0.venv\Scripts\python.exe"
set "RK_ARGS=-m pip install --upgrade pip"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-logged.ps1"
set "RK_ARGS=-m pip install -r tests\requirements.txt"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-logged.ps1"
if errorlevel 1 goto :pyfail
call :say "Downloading the test browser (Chromium) - about 150 MB, one time..."
set "RK_ARGS=-m playwright install chromium"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-logged.ps1"
call :say "Python venv ready in .venv"
goto :summary

:nopy
call :say "Python was not found, so the venv was skipped. The website still works without it."
echo       To get it later: install Python from https://python.org and tick Add python.exe to PATH, then run setup.bat again.
goto :summary

:pyfail
call :say "WARNING: the Python venv could not be completed. The website still works without it."
echo       Run setup.bat again later to retry.
goto :summary

:npmfail
call :say "ERROR: npm install failed."
echo.
echo  [X] npm install failed. Check your internet connection and try again.
echo      Details are in the log file: %RK_LOGFILE%
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
echo       then run supabase\migrations\003_daily_sales_feedback.sql   (daily sales + feedback)
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
echo  Log files are in the "logs" folder: setup.log, start.log, server.log, scheduler.log, app.log
echo.
if "%ENVSTATUS%"=="2" goto :needkeys
call :say "===== setup.bat finished OK ====="
echo  Everything is ready. Double-click start.bat to run the site.
echo.
pause
exit /b 0

:needkeys
call :say "===== setup.bat finished - Supabase keys still missing in .env.local ====="
echo  IMPORTANT: .env.local still needs your Supabase keys. Notepad will open now.
echo  Paste the three Supabase values, save the file, then double-click start.bat.
echo.
start "" notepad ".env.local"
pause
exit /b 2

rem ---------- helper: print a message and add it (with date and time) to the log ----------
:say
set "MSG=%~1"
echo !MSG!
>>"%RK_LOGFILE%" echo [%date% %time%] !MSG!
exit /b 0
