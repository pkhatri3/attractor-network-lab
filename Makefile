.PHONY: help install install-backend install-frontend start start-backend start-frontend stop clean logs

# Default target
help:
	@echo "Attractor Network Lab - Makefile"
	@echo ""
	@echo "Available commands:"
	@echo "  make install          - Install all dependencies (backend + frontend)"
	@echo "  make install-backend - Install backend dependencies only"
	@echo "  make install-frontend  Install frontend dependencies only"
	@echo "  make start            - Start both backend and frontend servers"
	@echo "  make start-backend    - Start backend server only"
	@echo "  make start-frontend  - Start frontend server only"
	@echo "  make stop             - Stop all servers"
	@echo "  make clean            - Clean up logs and temporary files"
	@echo "  make logs             - View backend logs"
	@echo ""

# Install all dependencies
install: install-backend install-frontend
	@echo "✓ All dependencies installed"

# Install backend dependencies
install-backend:
	@echo "Installing backend dependencies..."
	@cd backend && \
	if [ ! -d "venv" ]; then \
		python3 -m venv venv; \
	fi && \
	. venv/bin/activate 2>/dev/null || . venv/Scripts/activate && \
	pip install -q -r requirements.txt && \
	touch venv/.deps_installed
	@echo "✓ Backend dependencies installed"

# Install frontend dependencies
install-frontend:
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install
	@if [ ! -f frontend/.env.local ]; then \
		echo "VITE_API_URL=http://localhost:8001" > frontend/.env.local; \
	fi
	@echo "✓ Frontend dependencies installed"

# Start both servers
start:
	@./start.sh

# Start backend only
start-backend:
	@echo "Starting backend server..."
	@cd backend && \
	if [ ! -d "venv" ]; then \
		echo "Error: Virtual environment not found. Run 'make install-backend' first."; \
		exit 1; \
	fi && \
	. venv/bin/activate 2>/dev/null || . venv/Scripts/activate && \
	pkill -f "uvicorn api:app" 2>/dev/null || true && \
	uvicorn api:app --reload --host 0.0.0.0 --port 8001
	@echo "Backend started at http://localhost:8001"

# Start frontend only
start-frontend:
	@echo "Starting frontend server..."
	@cd frontend && npm run dev
	@echo "Frontend started at http://localhost:5173"

# Stop all servers
stop:
	@./stop.sh

# Clean up logs and temporary files
clean:
	@echo "Cleaning up..."
	@rm -f backend.log
	@rm -f frontend.log
	@find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Cleanup complete"

# View backend logs
logs:
	@if [ -f backend.log ]; then \
		tail -f backend.log; \
	else \
		echo "No backend.log file found. Backend may not be running."; \
	fi
