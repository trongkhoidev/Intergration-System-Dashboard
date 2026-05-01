@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   INITIALIZING SYSTEM DASHBOARD PROJECT
echo ========================================================

echo [1/5] Setting up Python Virtual Environment...
if not exist ".venv\" (
    echo Creating .venv...
    python -m venv .venv
)

echo Activating .venv...
call .venv\Scripts\activate.bat

echo [2/5] Installing Backend Dependencies...
pip install -r requirements.txt

echo [3/5] Setting up Databases (SQL Server ^& MySQL)...
python init_db.py
echo Setting up Auth and Syncing Users...
python setup_auth.py

echo [4/5] Installing Frontend Dependencies...
if not exist "frontend\node_modules\" (
    echo Running npm install...
    cd frontend
    call npm install
    cd ..
)

echo [5/5] Stopping existing processes on ports 5001 and 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5001" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Starting Backend Server (Flask)...
start /b "Backend (Flask)" cmd /c "call .venv\Scripts\activate.bat && python app.py"

echo Starting Frontend Server (React)...
start /b "Frontend (React)" cmd /c "cd frontend && npm run dev"

echo.
echo ========================================================
echo [OK] Successfully opened 2 new terminal windows.
echo - Backend: http://localhost:5001
echo - Frontend: http://localhost:3000
echo ========================================================
echo.
pause
