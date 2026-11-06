@echo off
REM Inicia o PostgreSQL (ajuste o caminho se necessário)
REM call "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\15\data"

REM Inicia o backend (ajuste o caminho e comando se usar pkg ou node)
cd /d "%~dp0..\backend"
start "Backend" cmd /k "node server.js"

REM Aguarda o backend subir (ajuste o tempo se necessário)
timeout /t 5 > nul

REM Abre o frontend no navegador padrão
start http://localhost:8081

REM Mensagem final
@echo Sistema iniciado. Feche esta janela para encerrar.
