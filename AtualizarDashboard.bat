@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0AtualizarDashboard.ps1" %*
exit /b %ERRORLEVEL%
