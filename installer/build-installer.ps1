$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$issPath = Join-Path $PSScriptRoot 'DashboardMembros.iss'

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Preparando pacote de instalação Windows " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "[OK] Gerando a versão mais recente da aplicação..." -ForegroundColor Green
Push-Location $repoRoot
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao gerar a versão mais recente da aplicação.'
    }
}
finally {
    Pop-Location
}

$manifestPath = Join-Path $PSScriptRoot 'manifest.js'
if (Test-Path $manifestPath) {
    $appVersionLine = Select-String -Path $issPath -Pattern '^AppVersion\s*=\s*(.+)$' | Select-Object -First 1
    if (-not $appVersionLine) {
        throw 'Não foi possível determinar a versão do instalador em DashboardMembros.iss.'
    }
    $appVersion = $appVersionLine.Matches[0].Groups[1].Value.Trim()

    Write-Host "[OK] Gerando manifesto do projeto..." -ForegroundColor Green
    & node (Join-Path $PSScriptRoot 'manifest.js') --root $repoRoot --version $appVersion --write
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao gerar o manifesto do projeto.'
    }

    Write-Host "[OK] Publicando pacote de atualização para inclusão no instalador..." -ForegroundColor Green
    & node (Join-Path $PSScriptRoot 'release-publisher.js') --root $repoRoot --output (Join-Path $PSScriptRoot 'releases') --version $appVersion
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao publicar o pacote de atualização.'
    }
}

$isccPath = $null
$possiblePaths = @(
    'C:\InnoSetup\ISCC.exe',
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 5\ISCC.exe",
    'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
    'C:\Program Files\Inno Setup 6\ISCC.exe',
    'C:\Program Files (x86)\Inno Setup 5\ISCC.exe',
    'C:\Program Files\Inno Setup 5\ISCC.exe'
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $isccPath = $path
        break
    }
}

if (-not $isccPath) {
    Write-Host "[FALTA] Inno Setup não foi encontrado. Instale o Inno Setup e execute novamente." -ForegroundColor Red
    Write-Host "Site oficial: https://jrsoftware.org/isinfo.php" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Inno Setup encontrado em: $isccPath" -ForegroundColor Green
Write-Host "[OK] Compilando instalador a partir de $issPath" -ForegroundColor Green

& $isccPath $issPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha na compilação do instalador." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "" 
Write-Host "Instalador gerado com sucesso. Verifique a pasta do projeto e o arquivo .exe gerado pelo Inno Setup." -ForegroundColor Green
