# Backup of the dh database with mongodump (policy: docs/COMO-FUNCIONA.md, section 20).
#
#   npm run backup
#
# Copies the database in MONGODB_URI (local or Atlas, same steps for both).
# If MONGODB_URI is not set, it copies the local database.
# Needs the MongoDB Database Tools (mongodump), installed apart from the server.

param(
  [string]$Destino = "C:\respaldos\dh"
)

# 1. Which database to copy. The Atlas URI has the password, so it comes from an
#    environment variable and is never written in this file.
$uri = $env:MONGODB_URI
if (-not $uri) {
  $uri = "mongodb://127.0.0.1:27017/dh"
}

if (-not (Get-Command mongodump -ErrorAction SilentlyContinue)) {
  Write-Error "mongodump not found. Install the MongoDB Database Tools and add them to PATH."
  exit 1
}

# 2. One compressed file per day, outside the repo: dh-2026-10-26.gz
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$fecha   = Get-Date -Format "yyyy-MM-dd"
$archivo = Join-Path $Destino "dh-$fecha.gz"
$log     = Join-Path $Destino "backup.log"

# 3. The copy itself: all 4 collections with their indexes and validators.
mongodump --uri="$uri" --gzip --archive="$archivo"

# 4. Check it worked: exit code 0 and a non-empty file. If not, stop here and
#    keep the old copies (a failed run must never delete the good ones).
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $archivo) -or (Get-Item $archivo).Length -eq 0) {
  Add-Content $log "$(Get-Date -Format s)  ERROR"
  Write-Error "Backup failed: $archivo"
  exit 1
}

$kb = [math]::Round((Get-Item $archivo).Length / 1KB)
Add-Content $log "$(Get-Date -Format s)  OK  $archivo  $kb KB"

# 5. Retention (section 20.4): daily copies for 7 days, Sunday copies (the
#    weekly ones) for 4 weeks. Everything older is deleted.
$hoy = (Get-Date).Date
Get-ChildItem $Destino -Filter "dh-*.gz" | ForEach-Object {
  $dias = ($hoy - $_.LastWriteTime.Date).Days
  $esDomingo = $_.LastWriteTime.DayOfWeek -eq "Sunday"
  $guardar = ($dias -le 7) -or ($esDomingo -and $dias -le 28)

  if (-not $guardar) {
    Remove-Item $_.FullName
    Add-Content $log "$(Get-Date -Format s)  DELETED  $($_.Name)"
  }
}

Write-Output "Backup OK: $archivo ($kb KB)"
