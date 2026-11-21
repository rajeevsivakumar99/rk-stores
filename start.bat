@echo off
setlocal EnableExtensions EnableDelayedExpansion
title RK Stores - Launcher
cd /d "%~dp0"

rem ---------- logging: logs\start.log (folder is created automatically) ----------
if not exist "%~dp0logs" mkdir "%~dp0logs"
set "RK_LOGFILE=%~dp0logs\start.log"
>>"%RK_LOGFILE%" echo.
call :say "===== start.bat launched ====="

rem Run setup first if this is the first time.
if not exist "node_modules" goto :needsetup
if not exist ".env.local" goto :needsetup
goto :check

:needsetup
call :say "First run detected - running setup.bat first..."
echo.
call "%~dp0setup.bat"
rem setup.bat returns 2 when .env.local still needs the Supabase keys.
if errorlevel 2 goto :nokeys
if not exist "node_modules" goto :setupfail
if not exist ".env.local" goto :setupfail

:check
rem Make sure the Supabase keys are filled in (also fills any generated secrets that are still empty).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-env.ps1" >nul
if errorlevel 2 goto :nokeys
call :say "Settings check OK."
goto :run

:setupfail
call :say "ERROR: setup did not finish, so the site was not started."
pause
exit /b 1

:nokeys
call :say "STOPPED: .env.local still needs the Supabase keys."
echo.
echo  .env.local still needs your Supabase keys (Supabase - Project Settings - API).
echo  Notepad will open. Paste the three values, save, then run start.bat again.
start "" notepad ".env.local"
pause
exit /b 2

:run
echo.
call :say "Starting RK Stores..."
echo  The website server opens in its own window. Close that window to stop the site.
echo  A "Reminder scheduler" window also opens: it triggers the sales and closing reminders. Keep it open.
echo  If setup created the Python venv, one more window opens with it already activated.
echo  Logs are written to the "logs" folder.
echo.

rem Terminal 1 (the only one required): the Next.js server - website, admin panel and API in one.
rem Its console output is also saved to logs\server.log; the app's own events go to logs\app.log.
set "RK_EXE=npm"
set "RK_ARGS=run dev"
set "RK_LOGFILE=%~dp0logs\server.log"
start "RK Stores - Server (close to stop)" /d "%~dp0" cmd /k "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-logged.ps1"
set "RK_LOGFILE=%~dp0logs\start.log"
call :say "Server window opened (output in logs\server.log)."

rem Terminal 2 (optional helper): a command window with the Python venv already activated, for running the tests.
if not exist ".venv\Scripts\activate.bat" goto :wait
start "RK Stores - Python venv (tests)" /d "%~dp0" cmd /k ".venv\Scripts\activate.bat"
call :say "Python venv window opened."

:wait
call :say "Waiting for the site to be ready..."
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=0; while($t -lt 90){ try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 2 | Out-Null; exit 0 } catch { if ($_.Exception.Response) { exit 0 }; Start-Sleep -Seconds 1; $t++ } }; exit 1"
if errorlevel 1 goto :slow
call :say "Site is up at http://localhost:3000"
goto :open

:slow
call :say "WARNING: the site did not answer within 90 seconds. Check logs\server.log for errors."

:open
rem Terminal 3: the reminder scheduler. It calls the cron endpoint every minute so the customer closing reminder and the
rem admin "enter today's sales" reminders (2 h / 1 h / 30 min before the day ends) actually fire. Output goes to logs\scheduler.log.
set "RK_EXE=powershell"
set "RK_ARGS=-NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\scheduler.ps1""
set "RK_LOGFILE=%~dp0logs\scheduler.log"
start "RK Stores - Reminder scheduler" /d "%~dp0" cmd /k "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-logged.ps1"
set "RK_LOGFILE=%~dp0logs\start.log"
call :say "Reminder scheduler window opened (output in logs\scheduler.log)."

start "" "http://localhost:3000"
call :say "Browser opened."
echo.
echo  Site:   http://localhost:3000
echo  Log in with your admin account on the normal login page - the admin panel appears automatically.
echo.
timeout /t 5 >nul
exit /b 0

rem ---------- helper: print a message and add it (with date and time) to the log ----------
:say
set "MSG=%~1"
echo !MSG!
>>"%RK_LOGFILE%" echo [%date% %time%] !MSG!
exit /b 0
