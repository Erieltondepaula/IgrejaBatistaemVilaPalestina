$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = $env:TARGET_ROOT
if (-not $targetRoot) {
    $targetRoot = Join-Path $env:USERPROFILE 'DashboardMembros'
}

function Test-Command($Name) {
    return $null -ne (Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

function Invoke-ExternalCommand {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$Step
    )

    Write-Host "[STEP] $Step" -ForegroundColor Yellow
    $result = & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Comando falhou em '$Step'."
    }
    return $result
}

function Initialize-Directory($Path) {
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Preparando máquina Windows para o Dashboard  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if (-not (Test-Command node)) {
    Write-Host "[FALTA] Node.js não encontrado. Instalando via winget..." -ForegroundColor Yellow
    if (Test-Command winget) {
        winget install -e --id OpenJS.NodeJS.LTS --source winget --accept-source-agreements --accept-package-agreements
    } else {
        throw 'winget não foi encontrado. Instale Node.js manualmente em https://nodejs.org/'
    }
}

if (-not (Test-Command npm)) {
    throw 'npm não foi encontrado após a instalação do Node.js.'
}

if (-not (Test-Command git)) {
    Write-Host "[WARN] Git não encontrado. Pode ser necessário para manter atualizações futuras." -ForegroundColor Yellow
}

$postgresInstalled = $false
if (Test-Command winget) {
    $wingetResult = winget list --id PostgreSQL.PostgreSQL --exact --source winget 2>$null
    if ($wingetResult -match 'PostgreSQL') {
        $postgresInstalled = $true
    }
}

if (-not $postgresInstalled) {
    $postgresService = Get-Service -Name postgres* -ErrorAction SilentlyContinue
    if ($postgresService) {
        $postgresInstalled = $true
    }
}

if (-not $postgresInstalled) {
    Write-Host "[FALTA] PostgreSQL não encontrado. Instalando via winget..." -ForegroundColor Yellow
    if (Test-Command winget) {
        winget install -e --id PostgreSQL.PostgreSQL --source winget --accept-source-agreements --accept-package-agreements
    } else {
        throw 'Não foi possível instalar PostgreSQL automaticamente. Instale manualmente em https://www.postgresql.org/download/windows/'
    }
}

$service = Get-Service -Name postgres* -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $service) {
    throw 'O serviço do PostgreSQL não foi encontrado após a instalação.'
}

if ($service.Status -ne 'Running') {
    Write-Host "[STEP] Iniciando serviço do PostgreSQL..." -ForegroundColor Yellow
    Start-Service -Name $service.Name
}

$pgBin = $null
$possibleBins = @(
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe',
    'C:\Program Files\PostgreSQL\15\bin\psql.exe',
    'C:\Program Files\PostgreSQL\14\bin\psql.exe',
    'C:\Program Files\PostgreSQL\13\bin\psql.exe'
)
foreach ($candidate in $possibleBins) {
    if (Test-Path $candidate) {
        $pgBin = $candidate
        break
    }
}

if (-not $pgBin) {
    Write-Host "[WARN] psql.exe não foi encontrado no caminho padrão. O banco pode precisar de configuração manual." -ForegroundColor Yellow
} else {
    $dbName = 'dashboard_membros'
    $dbUser = 'dashboard_app'
    $passwordBytes = New-Object byte[] 32
    $passwordGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $passwordGenerator.GetBytes($passwordBytes)
    }
    finally {
        $passwordGenerator.Dispose()
    }
    $dbPassword = [BitConverter]::ToString($passwordBytes).Replace('-', '').ToLowerInvariant()

    $postgresCredential = Get-Credential -UserName 'postgres' -Message 'Informe a senha do administrador PostgreSQL'
    $env:PGPASSWORD = $postgresCredential.GetNetworkCredential().Password
    $dbExists = & $pgBin -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName';"
    if (-not ($dbExists -match '1')) {
        Write-Host "[STEP] Criando banco de dados $dbName..." -ForegroundColor Yellow
        & $pgBin -h localhost -U postgres -d postgres -c "CREATE DATABASE `"$dbName`";"
    }

    $userExists = & $pgBin -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$dbUser';"
    if (-not ($userExists -match '1')) {
        Write-Host "[STEP] Criando usuário $dbUser..." -ForegroundColor Yellow
        & $pgBin -h localhost -U postgres -d postgres -c "CREATE USER `"$dbUser`" WITH PASSWORD '$dbPassword';"
    } else {
        Write-Host "[STEP] Ajustando senha do usuário $dbUser..." -ForegroundColor Yellow
        & $pgBin -h localhost -U postgres -d postgres -c "ALTER USER `"$dbUser`" WITH PASSWORD '$dbPassword';"
    }

    & $pgBin -h localhost -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE `"$dbName`" TO `"$dbUser`";"

    $env:PGPASSWORD = $null
}

$installDir = $targetRoot
Initialize-Directory $installDir
Write-Host "[STEP] Copiando projeto para $installDir..." -ForegroundColor Yellow
if (Test-Path (Join-Path $repoRoot 'dist')) {
    Copy-Item (Join-Path $repoRoot '*') $installDir -Recurse -Force
} else {
    Copy-Item $repoRoot $installDir -Recurse -Force
}

$dotEnvPath = Join-Path (Join-Path $installDir 'backend') '.env'
if (-not (Test-Path $dotEnvPath)) {
    @"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dashboard_membros
DB_USER=dashboard_app
DB_PASSWORD=$dbPassword
PORT=5001
NODE_ENV=development
"@ | Set-Content -Path $dotEnvPath -Encoding UTF8
}

$backendPath = Join-Path $installDir 'backend'
if (Test-Path $backendPath) {
    Write-Host "[STEP] Instalando dependências do backend..." -ForegroundColor Yellow
    Push-Location $backendPath
    npm install --silent
    Pop-Location
}

if (Test-Path (Join-Path $installDir 'package.json')) {
    Write-Host "[STEP] Instalando dependências do frontend..." -ForegroundColor Yellow
    Push-Location $installDir
    npm install --silent
    Pop-Location
}

Write-Host "" 
Write-Host "[OK] Máquina pronta para operar o Dashboard de Membros." -ForegroundColor Green
Write-Host "Local de instalação: $installDir" -ForegroundColor Cyan
Write-Host "Banco configurado: dashboard_membros / dashboard_app" -ForegroundColor Cyan
Write-Host "Próximo passo: iniciar backend e frontend com o script IniciarTudo.bat ou usando npm run dev." -ForegroundColor Yellow
