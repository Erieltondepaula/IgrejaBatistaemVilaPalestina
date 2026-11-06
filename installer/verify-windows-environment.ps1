$ErrorActionPreference = 'Stop'

function Test-Command($Name) {
    return $null -ne (Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

function Test-Port($ComputerName, $Port) {
    try {
        $tcp = [System.Net.Sockets.TcpClient]::new()
        $connect = $tcp.BeginConnect($ComputerName, $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if (-not $wait) {
            $tcp.Close()
            return $false
        }

        try {
            $tcp.EndConnect($connect)
            return $true
        }
        catch {
            return $false
        }
        finally {
            $tcp.Close()
        }
    }
    catch {
        return $false
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Verificação do ambiente Windows        " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$checks = @()

if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js instalado: $nodeVersion" -ForegroundColor Green
    $checks += 'node'
} else {
    Write-Host "[FALTA] Node.js não encontrado. Instale em https://nodejs.org/" -ForegroundColor Red
}

if (Test-Command npm) {
    $npmVersion = npm --version
    Write-Host "[OK] npm instalado: $npmVersion" -ForegroundColor Green
    $checks += 'npm'
} else {
    Write-Host "[FALTA] npm não encontrado." -ForegroundColor Red
}

if (Test-Command git) {
    $gitVersion = git --version
    Write-Host "[OK] Git instalado: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "[WARN] Git não encontrado, mas não é obrigatório para execução local." -ForegroundColor Yellow
}

if (Get-Service -Name postgres* -ErrorAction SilentlyContinue) {
    $postgresServices = Get-Service -Name postgres* -ErrorAction SilentlyContinue
    foreach ($svc in $postgresServices) {
        Write-Host "[OK] Serviço PostgreSQL encontrado: $($svc.Name) ($($svc.Status))" -ForegroundColor Green
    }
    $checks += 'postgres-service'
} else {
    Write-Host "[WARN] Serviço PostgreSQL não foi localizado automaticamente. Verifique a instalação local." -ForegroundColor Yellow
}

if (Test-Command pg_isready) {
    & pg_isready -h localhost -p 5432
    $checks += 'pg_isready'
} elseif (Test-Port -TargetHost 'localhost' -Port 5432) {
    Write-Host "[OK] Porta 5432 respondendo em localhost." -ForegroundColor Green
    $checks += 'port-5432'
} else {
    Write-Host "[WARN] PostgreSQL ainda não responde na porta 5432." -ForegroundColor Yellow
}

if (Test-Port 'localhost' 5001) {
    Write-Host "[OK] Porta 5001 do backend está ativa." -ForegroundColor Green
} else {
    Write-Host "[WARN] Backend ainda não está em execução na porta 5001." -ForegroundColor Yellow
}

if (Test-Port 'localhost' 8081) {
    Write-Host "[OK] Porta 8081 do frontend está ativa." -ForegroundColor Green
} else {
    Write-Host "[WARN] Frontend ainda não está em execução na porta 8081." -ForegroundColor Yellow
}

if ($checks.Count -gt 0) {
    Write-Host "" 
    Write-Host "Checklist mínimo detectado: $($checks -join ', ')" -ForegroundColor Cyan
} else {
    Write-Host "" 
    Write-Host "Nenhum requisito mínimo foi validado. Ajuste a instalação do sistema antes de continuar." -ForegroundColor Red
}

Write-Host "" 
Write-Host "Recomendação: execute 'node installer/installer.js --dry-run --target ""C:\\DashboardMembros\\Instalacao""' para validar a cópia do projeto e o manifesto." -ForegroundColor Yellow
