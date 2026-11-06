$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$defaultUrl = 'http://localhost:8081/latest.json'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host '[FALTA] Node.js nao foi encontrado no sistema.' -ForegroundColor Red
    Write-Host 'Instale o Node.js em: https://nodejs.org/' -ForegroundColor Yellow
    Write-Host 'Depois execute este atalho novamente.' -ForegroundColor Yellow
    Read-Host 'Pressione ENTER para sair'
    exit 1
}

Write-Host '[INFO] Atualizador do Dashboard de Membros' -ForegroundColor Cyan
Write-Host "[INFO] Pasta de instalacao: $root" -ForegroundColor Cyan
Write-Host "[INFO] URL padrao de atualizacao: $defaultUrl" -ForegroundColor Cyan

if ($args.Count -gt 0) {
    & node (Join-Path $root 'installer\updater.js') --target $root @args
} else {
    & node (Join-Path $root 'installer\updater.js') --target $root --source-url $defaultUrl
}

$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Write-Host ''
    Write-Host '[WARN] Nao foi possivel atualizar automaticamente.' -ForegroundColor Yellow
    Write-Host 'Use manualmente:' -ForegroundColor Yellow
    Write-Host "  node `"$root\installer\updater.js`" --target `"$root`" --source-url `"http://IP_DA_MAQUINA:8081/latest.json`"" -ForegroundColor Yellow
    Write-Host "  ou" -ForegroundColor Yellow
    Write-Host "  node `"$root\installer\updater.js`" --source `"C:\Caminho\Para\Projeto`" --target `"$root`"" -ForegroundColor Yellow
    Read-Host 'Pressione ENTER para sair'
}

exit $exitCode
