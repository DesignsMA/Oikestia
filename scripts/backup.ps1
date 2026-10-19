# Copia de seguridad de MongoDB (archive comprimido) en ./backups/.
# Uso:    .\scripts\backup.ps1            (requiere el stack en marcha)
# Restaurar: .\scripts\restore.ps1 backups\oikestia-20261018-1200.archive.gz
#
# El dump se genera dentro del contenedor y se copia con `docker compose cp`:
# tubear el binario por la consola de PowerShell 5.1 lo corrompería.

param(
    [string]$Nombre = "oikestia"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$destino = Join-Path (Get-Location) "backups"
if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

$marca = Get-Date -Format "yyyyMMdd-HHmmss"
$local = Join-Path $destino "$Nombre-$marca.archive.gz"
$enContenedor = "/tmp/backup.archive.gz"

docker compose exec -T mongo sh -c "mongodump --archive=$enContenedor --gzip --db $Nombre"
if ($LASTEXITCODE -ne 0) { throw "mongodump falló (código $LASTEXITCODE)." }

docker compose cp "mongo:$enContenedor" $local
if ($LASTEXITCODE -ne 0) { throw "docker compose cp falló (código $LASTEXITCODE)." }
docker compose exec -T mongo rm -f $enContenedor | Out-Null

$peso = [math]::Round((Get-Item $local).Length / 1MB, 2)
"Backup creado: $local ($peso MB)"
