# Fills in the values of .env.local that can be generated automatically (CRON_SECRET and the web-push keys)
# and reports which values you still have to paste in by hand. Called by setup.bat.
$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) { Write-Host '  .env.local not found.'; exit 1 }

$script:lines = @(Get-Content $envFile)

function Get-Env([string]$name) {
  foreach ($l in $script:lines) {
    if ($l -match "^$name=(.*)$") { return (($Matches[1] -replace '\s+#.*$', '')).Trim() }
  }
  return ''
}
function Set-Env([string]$name, [string]$value) {
  $found = $false
  for ($i = 0; $i -lt $script:lines.Count; $i++) {
    if ($script:lines[$i] -match "^$name=") { $script:lines[$i] = "$name=$value"; $found = $true }
  }
  if (-not $found) { $script:lines += "$name=$value" }
}

# 1. Random cron secret
$cron = Get-Env 'CRON_SECRET'
if ($cron -eq '' -or $cron -eq 'change-me-to-a-long-random-string') {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Set-Env 'CRON_SECRET' (([BitConverter]::ToString($bytes) -replace '-', '').ToLower())
  Write-Host '  [ok] CRON_SECRET generated'
}

# 2. Web-push (VAPID) keys
if ((Get-Env 'NEXT_PUBLIC_VAPID_PUBLIC_KEY') -eq '' -or (Get-Env 'VAPID_PRIVATE_KEY') -eq '') {
  try {
    Push-Location $root
    $json = & node (Join-Path $PSScriptRoot 'gen-vapid.js')
    Pop-Location
    $keys = $json | ConvertFrom-Json
    Set-Env 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' $keys.publicKey
    Set-Env 'VAPID_PRIVATE_KEY' $keys.privateKey
    Write-Host '  [ok] web-push keys generated'
  } catch {
    Pop-Location -ErrorAction SilentlyContinue
    Write-Host '  [!] Could not generate web-push keys (push notifications will be off). You can ignore this.'
  }
}

# Write back as UTF-8 WITHOUT a BOM (a BOM would break the first variable name).
[System.IO.File]::WriteAllLines($envFile, $script:lines, (New-Object System.Text.UTF8Encoding($false)))

# 3. What is still missing?
$missing = @()
$url = Get-Env 'NEXT_PUBLIC_SUPABASE_URL'
if ($url -eq '' -or $url -like '*YOUR-PROJECT*')                       { $missing += 'NEXT_PUBLIC_SUPABASE_URL' }
$anon = Get-Env 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
if ($anon -eq '' -or $anon -eq 'your-anon-key')                        { $missing += 'NEXT_PUBLIC_SUPABASE_ANON_KEY' }
$svc = Get-Env 'SUPABASE_SERVICE_ROLE_KEY'
if ($svc -eq '' -or $svc -eq 'your-service-role-key')                  { $missing += 'SUPABASE_SERVICE_ROLE_KEY' }

if ($missing.Count -gt 0) {
  Write-Host ''
  Write-Host '  Still to fill in .env.local (Supabase -> Project Settings -> API):'
  $missing | ForEach-Object { Write-Host "    - $_" }
  exit 2
}
Write-Host '  [ok] Supabase keys are filled in'
exit 0
