@echo off
REM Neural Network Attractor Platform - Windows Stop Script

echo Stopping Neural Network Attractor Platform servers...

REM Kill backend processes
taskkill /F /IM python.exe /FI "WINDOWTITLE eq uvicorn*" >nul 2>&1
if errorlevel 1 (
    echo No backend processes found
) else (
    echo Backend stopped
)

REM Kill frontend processes (Vite)
taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1
if errorlevel 1 (
    echo No frontend processes found
) else (
    echo Frontend stopped
)

echo All servers stopped
pause

