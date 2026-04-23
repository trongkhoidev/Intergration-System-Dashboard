@echo off
echo.
echo ===================================================
echo   Integration System Dashboard Startup
echo ===================================================
echo.

echo [1/3] Stopping existing processes on ports 5001 and 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5001" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [2/3] Starting Backend Server (Flask)...
start "Backend (Flask)" cmd /k "python app.py"

echo [3/3] Starting Frontend Server (React)...
start "Frontend (React)" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Successfully opened 2 new terminal windows for Backend and Frontend.
echo 🔗 Backend: http://localhost:5001
echo 🔗 Frontend: http://localhost:3000
echo.
