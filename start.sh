#!/bin/bash

echo "========================================================"
echo "🚀 INITIALIZING SYSTEM DASHBOARD PROJECT..."
echo "========================================================"

# 1. Setup Python Virtual Environment
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment (.venv)..."
    python -m venv .venv
fi

echo "🔄 Activating virtual environment..."
if [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OSTYPE" == "win32"* ]]; then
    source .venv/Scripts/activate
else
    source .venv/bin/activate
fi

# 2. Install Backend Dependencies
echo "📦 Installing Backend Dependencies..."
pip install -r requirements.txt

# 3. Initialize Databases
echo "🗄️ Setting up Databases (SQL Server & MySQL)..."
python init_db.py
echo "🔏 Setting up Auth & Syncing Users..."
python setup_auth.py

# 4. Install Frontend Dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing Frontend Dependencies (npm install)..."
    cd frontend && npm install && cd ..
fi

# 5. Stop existing processes
BACKEND_PORT=5001
FRONTEND_PORT=3000

echo "🚀 Stopping existing processes on ports $BACKEND_PORT and $FRONTEND_PORT..."

if command -v lsof > /dev/null; then
    PID_BACKEND=$(lsof -t -i:$BACKEND_PORT)
    if [ ! -z "$PID_BACKEND" ]; then
        kill -9 $PID_BACKEND 2>/dev/null
    fi
    PID_FRONTEND=$(lsof -t -i:$FRONTEND_PORT)
    if [ ! -z "$PID_FRONTEND" ]; then
        kill -9 $PID_FRONTEND 2>/dev/null
    fi
else
    # Windows fallback if running in Git Bash
    netstat -ano | grep ":$BACKEND_PORT " | awk '{print $5}' | xargs -I {} taskkill //PID {} //F 2>/dev/null || true
    netstat -ano | grep ":$FRONTEND_PORT " | awk '{print $5}' | xargs -I {} taskkill //PID {} //F 2>/dev/null || true
fi

sleep 1

# 6. Start Servers
echo "📦 Starting Backend Server (Flask)..."
python app.py &
BACKEND_PID=$!

echo "⚛️ Starting Frontend Server (React)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "========================================================"
echo "✅ ALL SYSTEMS GO!"
echo "🔗 Backend: http://localhost:$BACKEND_PORT"
echo "🔗 Frontend: http://localhost:$FRONTEND_PORT"
echo "⚠️  Press Ctrl+C to stop both servers."
echo "========================================================"

wait $BACKEND_PID $FRONTEND_PID
