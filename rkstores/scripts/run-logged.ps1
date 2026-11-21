# Runs one command, shows its output in the window AND appends every line to a log file.
# Used by setup.bat and start.bat. Settings are passed as environment variables to avoid quoting problems:
#   RK_EXE = program to run (npm, python.exe path ...)   RK_ARGS = its arguments   RK_LOGFILE = full path of the log file
$ErrorActionPreference = 'Continue'
$exe  = $env:RK_EXE
$argLine = $env:RK_ARGS
$log  = $env:RK_LOGFILE
if (-not $exe -or -not $log) { Write-Host 'run-logged.ps1: RK_EXE and RK_LOGFILE are required.'; exit 1 }

$dir = Split-Path -Parent $log
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

# UTF-8 without BOM, flushed on every line so the log is complete even if the window is closed.
$sw = New-Object System.IO.StreamWriter($log, $true, (New-Object System.Text.UTF8Encoding($false)))
$sw.AutoFlush = $true
$stamp = { Get-Date -Format 'yyyy-MM-dd HH:mm:ss' }
$sw.WriteLine("----- $(& $stamp)  $exe $argLine -----")
$code = 0
try {
  Invoke-Expression "& `"$exe`" $argLine 2>&1" | ForEach-Object {
    $line = $_.ToString()
    Write-Host $line
    $sw.WriteLine($line)
  }
  if ($null -ne $LASTEXITCODE) { $code = $LASTEXITCODE }
} catch {
  $sw.WriteLine("ERROR: $($_.Exception.Message)")
  Write-Host $_.Exception.Message
  $code = 1
} finally {
  $sw.WriteLine("----- finished $(& $stamp)  exit code $code -----")
  $sw.Close()
}
exit $code
