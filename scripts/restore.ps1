# Restaura un archive creado con backup.ps1.
# Uso:  .\scripts\restore.ps1 backups\oikestia-20261018-1200.archive.gz
#       .\scripts\restore.ps1 backups\....archive.gz -Drop   (borra antes las colecciones existentes)
#
# El archivo se copia al contenedor con `docker compose cp` por el mismo motivo
# que en backup.ps1 (PowerShell 5.1 corrompe binarios en la tubería de consola).

param(
    [Parameter(Mandatory = $true)]
    [string]$Archivo,
    [string]$Nombre = "oikestia",
    [switch]$Drop
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$ruta = (Resolve-Path -LiteralPath $Archivo).Path
$enContenedor = "/tmp/restore.archive.gz"

docker compose cp "$ruta" "mongo:$enContenedor"
if ($LASTEXITCODE -ne 0) { throw "docker compose cp falló (código $LASTEXITCODE)." }

$flags = "--archive --gzip --nsInclude=$Nombre.*"
if ($Drop) { $flags += " --drop" }

docker compose exec -T mongo sh -c "mongorestore $flags $enContenedor && rm -f $enContenedor"
if ($LASTEXITCODE -ne 0) { throw "mongorestore falló (código $LASTEXITCODE)." }

"Restauración completada desde: $ruta"
