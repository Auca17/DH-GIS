# Backup of the dh database with mongodump (policy: docs/COMO-FUNCIONA.md, section 20).
#
#   Local:  powershell -ExecutionPolicy Bypass -File scripts/backup.ps1
#   Atlas:  $env:ATLAS_URI = "mongodb+srv://USER:PASSWORD@dh.35crots.mongodb.net/dh"
#           powershell -ExecutionPolicy Bypass -File scripts/backup.ps1 -Base atlas
#
# Needs the MongoDB Database Tools (mongodump), installed apart from the server.

param(
  [ValidateSet("local", "atlas")]
  [string]$Base = "local",
  [string]$Destino = "C:\respaldos\dh"
)

# 1. Which database to copy. The Atlas URI has the password, so it comes from an
#    environment variable and is never written in this file.
if ($Base -eq "local") {
  $uri = "mongodb://127.0.0.1:27017/dh"
} else {
  $uri = $env:ATLAS_URI
  if (-not $uri) {
    Write-Error "Set ATLAS_URI first (the Atlas connection string ending in /dh)."
    exit 1
  }
}

if (-not (Get-Command mongodump -ErrorAction SilentlyContinue)) {
  Write-Error "mongodump not found. Install the MongoDB Database Tools and add them to PATH."
  exit 1
}

# 2. One compressed file per base and day, outside the repo: local-2026-10-26.gz
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$fecha   = Get-Date -Format "yyyy-MM-dd"
$archivo = Join-Path $Destino "$Base-$fecha.gz"
$log     = Join-Path $Destino "backup.log"

# 3. The copy itself: all 6 collections with their indexes and validators.
mongodump --uri="$uri" --gzip --archive="$archivo"

# 4. Check it worked: exit code 0 and a non-empty file. If not, stop here and
#    keep the old copies (a failed run must never delete the good ones).
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $archivo) -or (Get-Item $archivo).Length -eq 0) {
  Add-Content $log "$(Get-Date -Format s)  $Base  ERROR"
  Write-Error "Backup failed: $archivo"
  exit 1
}

$kb = [math]::Round((Get-Item $archivo).Length / 1KB)
Add-Content $log "$(Get-Date -Format s)  $Base  OK  $archivo  $kb KB"

# 5. Retention (section 20.4):
#    - atlas: daily copies for 7 days; Sunday copies for 4 weeks (the weekly ones)
#    - local: weekly copies for 4 weeks
$hoy = (Get-Date).Date
Get-ChildItem $Destino -Filter "$Base-*.gz" | ForEach-Object {
  $dias = ($hoy - $_.LastWriteTime.Date).Days
  $esDomingo = $_.LastWriteTime.DayOfWeek -eq "Sunday"

  if ($Base -eq "atlas") {
    $guardar = ($dias -le 7) -or ($esDomingo -and $dias -le 28)
  } else {
    $guardar = $dias -le 28
  }

  if (-not $guardar) {
    Remove-Item $_.FullName
    Add-Content $log "$(Get-Date -Format s)  $Base  DELETED  $($_.Name)"
  }
}

Write-Output "Backup OK: $archivo ($kb KB)"
