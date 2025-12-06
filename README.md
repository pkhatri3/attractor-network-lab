# Neural Network Attractor Simulation Platform

A comprehensive web-based platform for constructing, training, and simulating Hopfield-style attractor neural networks. This application provides an interactive interface for building custom network topologies, learning memory patterns, and testing network capacity and recall performance.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

This platform enables researchers and students to:

- **Construct** custom neural network topologies with various connectivity patterns
- **Train** networks using multiple Hebbian learning rules
- **Simulate** network dynamics with different activation rules
- **Test** memory capacity and recall performance
- **Visualize** network weights, activations, and energy landscapes
- **Generate** comprehensive PDF reports of experiments

The application follows a three-phase workflow: Construction → Learning → Simulation, allowing users to build complete experiments from network design to performance analysis.

## Features

### Construction Phase
- **Multiple Network Templates**:
  - Hopfield Connectivity (fully connected)
  - Rectangular Grid (2D lattice)
  - Hexagonal Grid (honeycomb lattice with configurable radius)
- **Custom Network Import**: Import networks from JSON or CSV files
- **Interactive Graph Editor**: 
  - Add/delete nodes and edges
  - Drag nodes to reposition
  - Grid and freeform layout modes
- **Connection Probability**: Control edge creation probability for templates
- **Network Export**: Save networks for later use

### Learning Phase
- **Multiple Learning Rules**:
  - Standard Hebbian
  - Decay Hebbian
  - Iterative Hebbian
  - Store-Erase (with and without decay)
- **Memory Management**:
  - Import memories from CSV/JSON
  - Generate random memories
  - Visual memory editor
- **Weight Matrix Visualization**:
  - Real-time weight updates
  - Multiple color schemes
  - Step-by-step learning history
- **Backend Options**: Choose between NumPy (CPU) or JAX (GPU-accelerated) backends
- **Learning Parameters**: Adjustable learning rate, decay scale, and diagonal connections

### Simulation Phase
- **Activation Rules**:
  - **Discrete**: Binary sign function activation
  - **Continuous**: Hyperbolic tangent activation
  - **Discrete-EF**: Discrete with electric field coupling
  - **Continuous-EF**: Continuous with electric field coupling
- **Activation Simulation**:
  - Text or matrix input modes
  - Real-time energy evolution
  - Iteration-by-iteration state browsing
  - Granular update mode for step-by-step visualization
  - Noise injection for testing robustness
- **Memory Capacity Testing**:
  - Automated capacity analysis
  - Configurable noise levels
  - Error tolerance parameter
  - Multiple iterations per data point
  - Capacity vs. pattern count visualization
- **PDF Report Generation**:
  - Memory Capacity Test Reports
  - Memory Recall Test Reports
  - Includes experiment metadata, plots, and weight matrices

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Sigma.js** - Graph visualization library
- **Graphology** - Graph data structure
- **Recharts** - Chart visualization
- **jsPDF** - PDF generation
- **React Router** - Client-side routing

### Backend
- **Python 3.12+** - Backend runtime
- **FastAPI** - REST API framework
- **NumPy** - Numerical computations
- **JAX** - GPU-accelerated computations (optional)
- **SciPy** - Scientific computing utilities
- **Uvicorn** - ASGI server

## Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.12+
- **pip** (Python package manager)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   # On macOS/Linux:
   source venv/bin/activate
   
   # On Windows:
   venv\Scripts\activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

Create a `.env.local` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8001
```

For production, set this to your backend server URL.

## Quick Start

### Using Startup Scripts (Recommended)

The easiest way to start the application is using the provided startup scripts:

**On macOS/Linux:**
```bash
./start.sh
```

**On Windows:**
```cmd
start.bat
```

The startup script will:
- Check prerequisites
- Set up virtual environment if needed
- Install dependencies if missing
- Start both backend and frontend servers
- Display URLs for accessing the application

To stop the servers:
- **macOS/Linux**: Press `Ctrl+C` in the terminal, or run `./stop.sh`
- **Windows**: Press `Ctrl+C` in the terminal, or run `stop.bat`

### Using Makefile

Alternatively, you can use the Makefile:

```bash
# Install all dependencies
make install

# Start both servers
make start

# Or start individually
make start-backend   # Backend only
make start-frontend  # Frontend only

# Stop all servers
make stop

# View backend logs
make logs

# Clean up temporary files
make clean
```

### Manual Start

If you prefer to start servers manually:

1. **Start the Backend** (in the `backend` directory):
   ```bash
   # Activate virtual environment first
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   
   # Start the server
   uvicorn api:app --reload --host 0.0.0.0 --port 8001
   ```
   
   The backend API will be available at `http://localhost:8001`
   API documentation (Swagger UI) at `http://localhost:8001/docs`

2. **Start the Frontend** (in the `frontend` directory):
   ```bash
   npm run dev
   ```
   
   The frontend will be available at `http://localhost:5173`

3. **Open in Browser**:
   Navigate to `http://localhost:5173`

## Usage Guide

### Phase 1: Construction

1. **Select Template or Create Custom Network**:
   - Choose from built-in templates (Hopfield, Rectangular, Hexagonal)
   - Or import a custom network from JSON/CSV
   - For Hexagonal grids, adjust the radius parameter (1 = immediate neighbors, 2 = two edges away, etc.)

2. **Configure Template Parameters**:
   - **Rows/Columns**: Grid dimensions
   - **Connection Probability**: Percentage chance of edge creation
   - **Radius** (Hexagonal only): Connectivity radius
   - **Force Connectedness**: Ensures all nodes are reachable

3. **Place Networks**:
   - Click on the canvas to place template instances
   - Use "Add" mode to place, "Drag" mode to reposition, "Delete" mode to remove

4. **Export Network** (optional):
   - Use "Export Template" to save your network for later use

5. **Proceed to Learning**:
   - Click "Go to Learning" to advance to the next phase

### Phase 2: Learning

1. **Import or Create Memories**:
   - Use "Import Memories" to load from CSV/JSON
   - Or use the random memory generator
   - Memories must match the network's neuron count

2. **Configure Learning Parameters**:
   - **Learning Rule**: Choose from available Hebbian variants
   - **Learning Rate**: Controls weight update magnitude
   - **Decay Scale**: For decay-based rules
   - **Backend**: NumPy (CPU) or JAX (GPU)
   - **Allow Diagonal**: Enable self-connections

3. **Start Learning**:
   - Click "Begin Learning"
   - Watch the weight matrix update in real-time
   - Use the step slider to review learning history

4. **Visualize Weights**:
   - Select different color schemes
   - Toggle between coarse and detailed views
   - View weight statistics

5. **Proceed to Simulation**:
   - Click "Go to Simulation" when learning is complete

### Phase 3: Simulation

#### Activation Simulation

1. **Set Experiment Details**:
   - Enter an experiment name
   - Select activation rule (Discrete, Continuous, Discrete-EF, Continuous-EF)

2. **Configure Initial State**:
   - Enter activations as text (JSON array) or use matrix view
   - Use "Generate Noisy Input" to create corrupted versions of memories
   - Adjust noise level slider

3. **Run Simulation**:
   - Click "Start" to begin
   - Watch energy evolution in real-time
   - Use iteration slider to browse through states after completion
   - Enable "Granular Updates" for step-by-step visualization

4. **Analyze Results**:
   - View energy plot
   - Browse activation states iteration by iteration
   - Check convergence information

#### Memory Capacity Test

1. **Configure Test Parameters**:
   - **Noise Level**: Percentage of bits to flip in test patterns
   - **Error Tolerance**: Percentage of mismatched bits allowed for success
   - **Iterations per Point**: Number of runs to average

2. **Run Capacity Test**:
   - Click "Run Capacity Test"
   - Watch the capacity plot update in real-time
   - Test shows how many patterns can be successfully recalled

3. **View Results**:
   - Capacity plot shows successful recalls vs. number of patterns
   - Results indicate network memory capacity

#### Generate Reports

1. **Click "Generate Report PDF"**
2. **Enter Details**:
   - Experiment name (appears in PDF)
   - File name (for saving)
3. **Download PDF**:
   - Report includes all experiment parameters, plots, and visualizations
   - Available for both capacity tests and recall tests

## Configuration

### Network Import Formats

**JSON Format**:
```json
{
  "N": 4,
  "C": [[0,1,1,0], [1,0,1,1], [1,1,0,1], [0,1,1,0]],
  "layout": [
    {"x": 0, "y": 0},
    {"x": 100, "y": 0},
    {"x": 0, "y": 100},
    {"x": 100, "y": 100}
  ]
}
```

**CSV Format** (Adjacency Matrix):
```csv
,0,1,2,3
0,0,1,1,0
1,1,0,1,1
2,1,1,0,1
3,0,1,1,0
```

**Memory Format** (CSV):
```csv
1,-1,1,-1
-1,1,-1,1
1,1,-1,-1
```

### Learning Rules

- **Standard Hebbian**: Basic one-shot learning
- **Decay Hebbian**: Includes weight decay over time
- **Iterative Hebbian**: Iteratively strengthens weak memories
- **Store-Erase**: Reduces interference between memories
- **Store-Erase with Decay**: Combines store-erase with decay

### Activation Rules

- **Discrete**: Binary sign function (outputs ±1)
- **Continuous**: Hyperbolic tangent (outputs continuous values)
- **Discrete-EF**: Discrete with electric field coupling
- **Continuous-EF**: Continuous with electric field coupling

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (needs 3.12+)
- Verify virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

### Frontend won't connect to backend
- Verify `VITE_API_URL` in `.env.local` matches backend URL
- Check backend is running and accessible
- Check CORS settings if accessing from different origin

### Memory capacity test fails
- Ensure memories match network neuron count
- Check that learning phase completed successfully
- Verify network has sufficient connectivity

### PDF generation issues
- Ensure all required data is available (weights, results, etc.)
- Check browser console for errors
- Verify jsPDF library is loaded

### Network import fails
- Verify file format matches expected structure
- Check neuron count matches between network and memories
- Ensure connectivity matrix is symmetric for undirected graphs

## Project Structure

```
neural/
├── backend/
│   ├── api.py                 # FastAPI application and endpoints
│   ├── attractor.py           # NumPy-based attractor network
│   ├── jax_attractor.py       # JAX-based GPU-accelerated implementation
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Main page components
│   │   ├── utils/             # Utility functions
│   │   └── styles/            # CSS styles
│   └── package.json
│
├── start.sh                    # Startup script for macOS/Linux
├── start.bat                   # Startup script for Windows
├── stop.sh                     # Stop script for macOS/Linux
├── stop.bat                    # Stop script for Windows
├── Makefile                    # Makefile for common tasks
├── README.md                   # This file
└── ARCHITECTURE.md             # System architecture and API documentation
```

## Additional Resources

- **System Architecture & API Documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Interactive Docs**: Available at `http://localhost:8001/docs` when backend is running


## Contributors
Pranav Khatri
Ryan DeCamp
Vihaan Motwani
Abdullatif Elmuaqaat
Shaun Fernandes

## Acknowledgments

Built with Sigma.js, Graphology, FastAPI, and React.
