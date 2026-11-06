$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $repoRoot 'dist'
$releaseRoot = Join-Path $PSScriptRoot 'releases'
$manifestPath = Join-Path $releaseRoot 'latest.json'
$nodeCommand = Get-Command node.exe -ErrorAction Stop
$nodePath = $nodeCommand.Source
$logRoot = Join-Path $env:LOCALAPPDATA 'DashboardMembros\logs'
$serverOutLog = Join-Path $logRoot 'update-server.out.log'
$serverErrorLog = Join-Path $logRoot 'update-server.err.log'
$backendOutLog = Join-Path $logRoot 'backend.out.log'
$backendErrorLog = Join-Path $logRoot 'backend.err.log'

if (-not (Test-Path (Join-Path $appRoot 'index.html'))) {
    throw "Build do painel não encontrada em $appRoot. Gere a build antes de iniciar os serviços."
}

if (-not (Test-Path $manifestPath)) {
    throw "Manifesto de atualizações não encontrado em $manifestPath. Reinstale a versão publicada."
}

try {
    & (Join-Path $PSScriptRoot 'archive-build-backup.ps1') `
        -BuildDirectory $appRoot `
        -BackupDirectory (Join-Path $repoRoot 'backend\database\Build-Backup')
}
catch {
    Write-Warning "Could not archive the new build; startup will continue: $($_.Exception.Message)"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.version -or -not $manifest.files -or $manifest.files.Count -eq 0) {
    throw "Manifesto de atualizações inválido em $manifestPath."
}

New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

$listeners = @(Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)
foreach ($listenerGroup in ($listeners | Group-Object OwningProcess)) {
    $processId = [int]$listenerGroup.Name
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
    if (-not $process) {
        continue
    }

    if ($process.Name -match '^node(\.exe)?$' -and $process.CommandLine -match '(?i)(http-server|local-update-server\.js)') {
        Write-Host "Encerrando servidor antigo na porta 8081 (PID $processId)..."
        Stop-Process -Id $processId -Force
        continue
    }

    throw "A porta 8081 já está sendo usada por $($process.Name) (PID $processId). Feche esse serviço antes de iniciar o Dashboard."
}

$waitForPortDeadline = (Get-Date).AddSeconds(10)
do {
    Start-Sleep -Milliseconds 250
    $remainingListeners = @(Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)
} while ($remainingListeners.Count -gt 0 -and (Get-Date) -lt $waitForPortDeadline)

if ($remainingListeners.Count -gt 0) {
    throw 'A porta 8081 não foi liberada pelo servidor antigo.'
}

$backendListeners = @(Get-NetTCPConnection -LocalPort 5001 -State Listen -ErrorAction SilentlyContinue)
$backendReady = $false
if ($backendListeners.Count -gt 0) {
    try {
        $backendResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5001/api/system/updates/ready' -TimeoutSec 2
        $backendReady = ($backendResponse.StatusCode -eq 200) -and (($backendResponse.Content | ConvertFrom-Json).ready -eq $true)
    }
    catch {
        $backendReady = $false
    }

    if (-not $backendReady) {
        foreach ($listenerGroup in ($backendListeners | Group-Object OwningProcess)) {
            $processId = [int]$listenerGroup.Name
            $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
            if (-not $process -or $process.Name -notmatch '^node(\.exe)?$' -or $process.CommandLine -notmatch '(?i)server\.js') {
                throw "A porta 5001 está ocupada por um serviço desconhecido (PID $processId). Ele não foi encerrado; libere a porta antes de iniciar a API do Dashboard."
            }

            Write-Host "Reiniciando a API antiga do Dashboard na porta 5001 (PID $processId)..."
            Stop-Process -Id $processId -Force
        }

        $backendListeners = @(Get-NetTCPConnection -LocalPort 5001 -State Listen -ErrorAction SilentlyContinue)
        if ($backendListeners.Count -gt 0) {
            throw 'A API antiga do Dashboard não liberou a porta 5001.'
        }
    }
}

if (-not $backendReady) {
    Write-Host 'Iniciando API do Dashboard na porta 5001...'
    $backendScript = Join-Path $repoRoot 'backend\server.js'
    Start-Process -FilePath $nodePath `
        -ArgumentList ('"' + $backendScript + '"') `
        -WorkingDirectory (Join-Path $repoRoot 'backend') `
        -WindowStyle Hidden `
        -RedirectStandardOutput $backendOutLog `
        -RedirectStandardError $backendErrorLog | Out-Null
}

$backendDeadline = (Get-Date).AddSeconds(120)
do {
    Start-Sleep -Milliseconds 500
    try {
        $backendResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5001/api/system/updates/ready' -TimeoutSec 2
        $backendReady = ($backendResponse.StatusCode -eq 200) -and (($backendResponse.Content | ConvertFrom-Json).ready -eq $true)
    }
    catch {
        $backendReady = $false
    }
} while (-not $backendReady -and (Get-Date) -lt $backendDeadline)

if (-not $backendReady) {
    $backendErrors = if (Test-Path $backendErrorLog) { Get-Content -LiteralPath $backendErrorLog -Raw } else { '' }
    throw "A API do Dashboard não respondeu na porta 5001. Verifique as dependências do backend e o arquivo backend\.env. Consulte $backendErrorLog. $backendErrors"
}

Write-Host "Iniciando servidor unificado com manifesto $($manifest.version) na porta 8081..."
$serverArguments = 'installer/local-update-server.js --port 8081 --app-root "' + $appRoot + '" --root "' + $releaseRoot + '"'
Start-Process -FilePath $nodePath `
    -ArgumentList $serverArguments `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $serverOutLog `
    -RedirectStandardError $serverErrorLog | Out-Null

$serverReady = $false
$startupDeadline = (Get-Date).AddSeconds(20)
do {
    Start-Sleep -Milliseconds 500
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8081/latest.json' -TimeoutSec 2
        $servedManifest = $response.Content | ConvertFrom-Json
        if ($response.StatusCode -eq 200 -and $servedManifest.version -and $servedManifest.files.Count -gt 0) {
            $serverReady = $true
        }
    } catch {
        $serverReady = $false
    }
} while (-not $serverReady -and (Get-Date) -lt $startupDeadline)

if (-not $serverReady) {
    $serverErrors = if (Test-Path $serverErrorLog) { Get-Content -LiteralPath $serverErrorLog -Raw } else { '' }
    throw "O servidor não respondeu com um manifesto válido na porta 8081. Consulte $serverErrorLog. $serverErrors"
}

Write-Host "Servidor online: http://localhost:8081/latest.json (versão $($servedManifest.version))."
