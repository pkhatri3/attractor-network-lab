@echo off
REM Neural Network Attractor Platform - Windows Startup Script

echo ========================================
echo Neural Network Attractor Platform
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Checking prerequisites...
echo.

REM Backend setup
echo Setting up backend...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies if needed
if not exist "venv\.deps_installed" (
    echo Installing backend dependencies...
    pip install -q -r requirements.txt
    type nul > venv\.deps_installed
)

REM Kill any existing backend processes
echo Checking for existing backend processes...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq uvicorn*" >nul 2>&1

REM Start backend in background
echo Starting backend server...
start "Neural Backend" /MIN cmd /c "uvicorn api:app --reload --host 0.0.0.0 --port 8001"
timeout /t 2 /nobreak >nul

echo Backend started at http://localhost:8001
echo API Docs: http://localhost:8001/docs
echo.

REM Frontend setup
echo Setting up frontend...
cd ..\frontend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

REM Check for .env.local file
if not exist ".env.local" (
    echo Creating .env.local file...
    echo VITE_API_URL=http://localhost:8001 > .env.local
)

REM Start frontend
echo.
echo ========================================
echo Application is starting!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8001
echo API Docs: http://localhost:8001/docs
echo.
echo Press Ctrl+C to stop both servers
echo.

call npm run dev

REM Cleanup on exit
taskkill /F /IM python.exe /FI "WINDOWTITLE eq uvicorn*" >nul 2>&1
echo.
echo Servers stopped

