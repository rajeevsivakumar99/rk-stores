# Local reminder scheduler (opened by start.bat). Every minute it calls the app's /api/cron/closing endpoint, which runs:
#   - the customer "shop closes soon" reminder, and
#   - the admin "enter today's GPay + Cash sales" reminders (2 hours, 1 hour and 30 minutes before the day ends).
# Each reminder is sent only once per day, so calling it often is safe. On a real server use an online scheduler instead (see README).
$ErrorActionPreference = 'Continue'
$root    = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env.local'
$base    = 'http://localhost:3000'
$every   = 60

$secret = ''
if (Test-Path $envFile) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^CRON_SECRET=' } | Select-Object -First 1
  if ($line) { $secret = (($line -replace '^CRON_SECRET=', '') -replace '\s+#.*$', '').Trim() }
}
if (-not $secret) { Write-Host 'CRON_SECRET is missing in .env.local. Run setup.bat first.'; exit 1 }

Write-Host "Reminder scheduler started. Calling $base/api/cron/closing every $every seconds."
Write-Host 'Leave this window open while you work. Close it to stop the reminders.'
while ($true) {
  $t = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  try {
    $r = Invoke-RestMethod -Uri "$base/api/cron/closing" -Headers @{ Authorization = "Bearer $secret" } -TimeoutSec 60
    $closing = ($r.closing | ConvertTo-Json -Compress -Depth 4)
    $sales   = ($r.sales   | ConvertTo-Json -Compress -Depth 4)
    Write-Host "[$t] closing: $closing | sales: $sales"
  } catch {
    Write-Host "[$t] call failed (is the site running?): $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $every
}
