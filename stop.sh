#!/bin/bash

# Attractor Network Lab - Stop Script
# This script stops all running backend and frontend servers

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Attractor Network Lab servers...${NC}"

# Kill backend processes
BACKEND_PIDS=$(pgrep -f "uvicorn api:app" || true)
if [ -n "$BACKEND_PIDS" ]; then
    echo -e "${YELLOW}Stopping backend servers...${NC}"
    pkill -f "uvicorn api:app"
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${BLUE}No backend processes found${NC}"
fi

# Kill frontend processes (Vite dev server)
FRONTEND_PIDS=$(pgrep -f "vite" || true)
if [ -n "$FRONTEND_PIDS" ]; then
    echo -e "${YELLOW}Stopping frontend servers...${NC}"
    pkill -f "vite"
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo -e "${BLUE}No frontend processes found${NC}"
fi

echo -e "${GREEN}All servers stopped${NC}"
