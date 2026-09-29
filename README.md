# Attractor Network Lab

Attractor Network Lab is an interactive web application for designing, training, and analyzing Hopfield-style attractor neural networks.

The application guides an experiment through three stages:

1. **Construction** — create or import a network topology.
2. **Learning** — store memories using configurable Hebbian learning rules.
3. **Simulation** — test recall, inspect energy and activation dynamics, and measure memory capacity.

## Features

- Build networks with Hopfield, rectangular-grid, and triangular-grid templates.
- Edit graphs interactively by adding, removing, and repositioning nodes and edges.
- Import and export network topologies as JSON or CSV.
- Create random memories or import bipolar memories from CSV.
- Compare standard Hebbian, decay, iterative, and store-erase learning rules.
- Visualize weight matrices with multiple color schemes and learning-history views.
- Run discrete or continuous activation simulations.
- Add noise to initial states and observe recall behavior step by step.
- Run memory-capacity experiments with configurable noise, tolerance, and trial counts.
- Generate PDF reports containing experiment parameters, plots, and weight visualizations.

## Technology

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, Sigma.js, Graphology, Recharts, jsPDF, React Router |
| Backend | Python, FastAPI, Uvicorn, NumPy, JAX |
| Deployment | Vercel for the frontend, Render for the backend |

## Requirements

- Node.js 18 or newer
- npm
- Python 3.12 or newer
- `pip`

## Run locally

From the repository root, the startup scripts install missing dependencies and run both services.

### macOS and Linux

```bash
./start.sh
```

### Windows

```bat
start.bat
```

The application will be available at:

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:8001>
- Interactive API docs: <http://localhost:8001/docs>

Stop the services with `./stop.sh`, `stop.bat`, or `make stop`.

## Install and run manually

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8001
```

On Windows, activate the environment with:

```bat
venv\Scripts\activate
```

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the backend URL from `VITE_API_URL`. For local development, the included configuration uses:

```env
VITE_API_URL=http://localhost:8001
```

To create a local environment file manually:

```bash
cp frontend/.env.example frontend/.env.local
```

`.env.local` is ignored by Git and should not contain credentials that need to be shared.

## Common commands

The Makefile provides shortcuts for macOS and Linux:

```bash
make install          # Install backend and frontend dependencies
make start            # Start both services
make start-backend   # Start only the API
make start-frontend  # Start only the Vite app
make stop             # Stop both services
make clean            # Remove local logs and Python cache files
make logs             # Follow backend logs
```

## Using the application

### 1. Construct a network

Choose a built-in topology or create a custom graph. Network templates support configurable dimensions, connection probability, and triangular-grid radius. Networks can also be imported from JSON or CSV.

### 2. Learn memories

Create random memories or import bipolar patterns containing only `-1` and `1`. The number of values in each memory must match the number of neurons in the network.

Select a learning rule, learning rate, decay scale, backend, and whether diagonal self-connections are allowed. The resulting weight matrix and learning history are displayed in the interface.

### 3. Simulate and evaluate

Run a recall simulation from a selected or noisy initial state. The simulation displays activation states, energy, convergence, and iteration history. The capacity test evaluates recall across increasing numbers of stored patterns.

## Import formats

### Network JSON

```json
{
  "N": 4,
  "C": [
    [0, 1, 1, 0],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [0, 1, 1, 0]
  ],
  "layout": [
    {"x": 0, "y": 0},
    {"x": 100, "y": 0},
    {"x": 0, "y": 100},
    {"x": 100, "y": 100}
  ]
}
```

### Network CSV

The first line is the number of neurons, followed by the adjacency matrix:

```csv
4
0,1,1,0
1,0,1,1
1,1,0,1
0,1,1,0
```

### Memory CSV

Each row is one bipolar memory. Values must be `-1` or `1`:

```csv
1,-1,1,-1
-1,1,-1,1
1,1,-1,-1
```

## Backend API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `POST` | `/learn` | Train a network and return learned weights |
| `POST` | `/simulate_stream` | Stream simulation states using server-sent events |
| `POST` | `/memory_capacity_test` | Stream capacity-test results using server-sent events |

Interactive Swagger documentation is available at `/docs` when the backend is running.

## Deployment

The repository includes deployment configuration for the planned split deployment:

- `render.yaml` configures the FastAPI service on Render.
- `frontend/vercel.json` provides the client-side routing fallback required by the React app.

### Render

Create a Render Web Service using the repository and the included `render.yaml`, or configure these values manually:

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: uvicorn api:app --host 0.0.0.0 --port $PORT
Health check path: /health
```

### Vercel

Create a Vercel project with `frontend` as its root directory. Set the production environment variable to the public Render URL:

```text
VITE_API_URL=https://your-render-service.onrender.com
```

Use `npm run build` as the build command and `dist` as the output directory.

Do not commit deployment credentials or environment-specific service URLs that should remain private.

## Project structure

```text
.
├── backend/
│   ├── api.py                 # FastAPI endpoints and streaming responses
│   ├── attractor.py           # NumPy attractor-network implementation
│   ├── jax_attractor.py       # JAX attractor-network implementation
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable interface and visualization components
│   │   ├── pages/             # Construction and learning views
│   │   ├── styles/            # Application styles
│   │   └── utils/              # Import, export, and graph utilities
│   ├── public/                # Static assets
│   ├── .env.example           # Frontend environment template
│   ├── eslint.config.js       # ESLint configuration
│   ├── package.json           # Frontend dependencies and scripts
│   └── vercel.json            # Vercel SPA routing configuration
├── render.yaml                # Render backend configuration
├── Makefile                   # Common local development commands
├── start.sh / start.bat       # Cross-platform startup scripts
├── stop.sh / stop.bat         # Cross-platform shutdown scripts
├── LICENSE
└── README.md
```

## Design notes

- The frontend keeps the current graph, memories, weights, and experiment state in React context providers.
- The backend performs learning and simulation work so larger matrix operations do not block the browser.
- Streaming endpoints send progress and simulation states as server-sent events.
- Learned weight matrices are currently held in the backend process memory. A backend restart clears them, and a multi-instance deployment would require persistent storage or session affinity.
- The JAX implementation is configured for CPU execution in `backend/jax_attractor.py`.

## References

- Hopfield, J. J. (1982). *Neural networks and physical systems with emergent collective computational abilities*. Proceedings of the National Academy of Sciences, 79(8), 2554–2558.
- Reggia, J. A., Sylvester, J., Weems, S. A., & Bunting, M. F. (2009). *A Simple Oscillatory Short-Term Memory*. AAAI Fall Symposium.
- Rodgers, N., Tiňo, P., & Johnson, S. (2022). *Network hierarchy and pattern recovery in directed sparse Hopfield networks*. Physical Review E, 105(6), 064304.
- Katz, G. E., Davis, G. P., Gentili, R. J., & Reggia, J. A. (2019). *A programmable neural virtual machine based on a fast store-erase learning rule*. Neural Networks, 119, 10–30.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
