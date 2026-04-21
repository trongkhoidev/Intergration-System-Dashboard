#!/bin/bash

# Port definitions
BACKEND_PORT=5001
FRONTEND_PORT=3000

echo "🚀 Stopping existing processes on ports $BACKEND_PORT and $FRONTEND_PORT..."

# Kill processes on backend port
PID_BACKEND=$(lsof -t -i:$BACKEND_PORT)
if [ ! -z "$PID_BACKEND" ]; then
    echo "Stopping backend (PID: $PID_BACKEND)..."
    kill -9 $PID_BACKEND
fi

# Kill processes on frontend port
PID_FRONTEND=$(lsof -t -i:$FRONTEND_PORT)
if [ ! -z "$PID_FRONTEND" ]; then
    echo "Stopping frontend (PID: $PID_FRONTEND)..."
    kill -9 $PID_FRONTEND
fi

# Give it a second to release the ports
sleep 1

echo "📦 Starting Backend Server (Flask)..."
# Start backend in background
./.venv/bin/python app.py &
BACKEND_PID=$!

echo "⚛️ Starting Frontend Server (React)..."
# Start frontend in background
cd frontend && npm start &
FRONTEND_PID=$!

echo "✅ Servers are starting up..."
echo "🔗 Backend: http://localhost:$BACKEND_PORT"
echo "🔗 Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl+C to stop both (not really, they are in background, use 'kill' or stop manually if needed)"

# Wait for background processes (this keeps the script running and shows logs)
wait $BACKEND_PID $FRONTEND_PID
