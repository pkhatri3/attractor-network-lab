#!/bin/bash

# Neural Network Attractor Platform - Startup Script
# This script starts both the backend and frontend servers

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Neural Network Attractor Platform${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists python3; then
    echo -e "${RED}Error: python3 is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites found${NC}"
echo ""

# Backend setup
echo -e "${YELLOW}Setting up backend...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    echo -e "${RED}Error: Could not find virtual environment activation script${NC}"
    exit 1
fi

# Install/upgrade dependencies if needed
if [ ! -f "venv/.deps_installed" ] || [ "requirements.txt" -nt "venv/.deps_installed" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    pip install -q -r requirements.txt
    touch venv/.deps_installed
fi

# Kill any existing backend processes
echo -e "${YELLOW}Checking for existing backend processes...${NC}"
pkill -f "uvicorn api:app" 2>/dev/null || true

# Start backend in background
echo -e "${GREEN}Starting backend server...${NC}"
uvicorn api:app --reload --host 0.0.0.0 --port 8001 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${BLUE}  Backend API: http://localhost:8001${NC}"
echo -e "${BLUE}  API Docs: http://localhost:8001/docs${NC}"
echo ""

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Error: Backend failed to start. Check backend.log for details.${NC}"
    exit 1
fi

# Frontend setup
echo -e "${YELLOW}Setting up frontend...${NC}"
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Check for .env.local file
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    echo "VITE_API_URL=http://localhost:8001" > .env.local
    echo -e "${GREEN}✓ Created .env.local${NC}"
fi

# Start frontend
echo -e "${GREEN}Starting frontend server...${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Application is starting!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}Backend API: http://localhost:8001${NC}"
echo -e "${GREEN}API Docs: http://localhost:8001/docs${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    pkill -f "uvicorn api:app" 2>/dev/null || true
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Start frontend (this will block)
npm run dev

