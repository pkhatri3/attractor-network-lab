# New Demo
- Rewritten using Sigma.js + Graphololgy instead of React Flow

# Running Locally (Development)

This explains how to run the frontend and backend locally on the VM for development.

## Backend (FastAPI + Python)

- cd backend
- svn update
- python3 -m venv venv          # only first time
- source venv/bin/activate      # activate venv (on Windows: venv\Scripts\activate)
- pip install -r requirements.txt   # only first time
- pkill -f "uvicorn api:app" ; uvicorn api:app --reload --host 0.0.0.0 --port 8001

The backend will now be running at http://vodaphone.cs.umd.edu:8001 and you can test endpoints at http://vodaphone.cs.umd.edu:8001/docs

Also, to deactivate/exit a venv, just run "deactivate"

## Frontend (React + Vite)

- cd frontend
- svn update
- npm install       # only first time
- npm run dev

The frontend will now be running at http://localhost:5173

## Summary

- (In venv) Start backend: pkill -f "uvicorn api:app" ; uvicorn api:app --reload --host 0.0.0.0 --port 8001
- Start frontend: npm run dev  
- Open browser: http://localhost:5173

# Deployment

Right now, the production web app is running from my (Ryan’s) directory (`/home/rdecamp/neural/sigma-prototype`).  
Because of the way the VM permissions are set up, each of us only has write access within our own home directory (I believe).  
This means I am currently the only one who can directly deploy changes to the live site.  

To update the deployed version, should commit your changes to SVN.  
I will then pull into my directory and redeploy.

## Frontend Deployment

1. Navigate to the frontend project:
   cd ~/neural/sigma-prototype/frontend

2. Update to the latest SVN changes:
   svn update

3. Build the React app:
   npm run build

4. Copy the build output to Nginx’s serving directory:
   sudo cp -r dist/* /var/www/frontend/

## Backend Deployment

1. Navigate to the backend project:
   cd ~/neural/sigma-prototype/backend

2. Update to the latest SVN changes:
   svn update

3. Restart the FastAPI backend service so changes take effect:
   sudo systemctl restart neural-backend

## Quick Deploy (Frontend and Backend)

For a full deployment after pulling SVN changes:

# Frontend
- cd ~/neural/sigma-prototype/frontend
- svn update
- npm run build
- sudo cp -r dist/* /var/www/frontend/

# Backend
- cd ~/neural/sigma-prototype/backend
- svn update
- sudo systemctl restart neural-backend