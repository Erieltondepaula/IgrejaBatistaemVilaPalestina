@echo off
setlocal
cd /d "%~dp0"
title Inicializador do Sistema IBVP
color 0B
cls
echo ==========================================
echo    INICIALIZANDO OS SERVICOS DO SISTEMA
echo ==========================================
echo.

echo [1/3] Garantindo que o Banco PostgreSQL esteja rodando...
net start postgresql-x64-17 >nul 2>&1

echo [2/3] Iniciando e validando os servicos do Dashboard...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\start-dashboard-services.ps1"
if errorlevel 1 (
    echo.
    echo ERRO: Nao foi possivel iniciar os servicos. Verifique a mensagem acima.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    [3/3] SERVIDOR ONLINE! ABRINDO O PAINEL...
echo ==========================================
start "" "%~dp0interface.hta"
exit /b 0