#!/bin/bash
# KCET Exam Platform - Local Development Startup Script

# 🎨 Define colors for our prefixes
BACKEND_PREFIX=$'\033[34m[BACKEND]\033[0m'   # Blue
FRONTEND_PREFIX=$'\033[32m[FRONTEND]\033[0m' # Green

echo "🚀 Starting KCET Exam Platform..."

# 🛑 Trap CTRL+C to cleanly kill all background processes in this script's group
trap 'echo -e "\n🛑 Shutting down all servers..."; kill 0; exit' INT

# 1. Start the FastAPI Backend
echo "Starting Backend Server..."
cd Backend || exit
source .venv/bin/activate
# Run server, grab all output, and inject the blue [BACKEND] tag instantly (-u for unbuffered)
uvicorn app.main:app --reload 2>&1 | sed -u "s/^/$BACKEND_PREFIX /" &
cd ..

# 2. Start the React/Vite Frontend
echo "Starting Frontend Server..."
cd "Figma Frontend" || exit
# Run frontend, grab all output, and inject the green [FRONTEND] tag instantly
pnpm run dev 2>&1 | sed -u "s/^/$FRONTEND_PREFIX /" &
cd ..

echo "✅ Both servers are running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press [CTRL+C] to stop both servers."

# Wait indefinitely until the user presses CTRL+C
wait