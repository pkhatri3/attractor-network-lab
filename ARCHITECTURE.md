# System Architecture & API Documentation

This document provides detailed information about the system architecture, API endpoints, data formats, and implementation details of the Neural Network Attractor Simulation Platform.

## Table of Contents

- [System Architecture](#system-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [API Documentation](#api-documentation)
- [Data Formats](#data-formats)
- [Learning Algorithms](#learning-algorithms)
- [Activation Rules](#activation-rules)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)

## System Architecture

### Overview

The application follows a client-server architecture with a React frontend and FastAPI backend:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Construction │→ │   Learning   │→ │  Simulation  │   │
│  │    Phase     │  │    Phase     │  │    Phase     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                  │                  │           │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
│                    GraphContext /                         │
│                 LearningContext /                         │
│                SimulationContext                          │
└────────────────────────────┼──────────────────────────────┘
                             │
                    HTTP/REST API
                             │
┌────────────────────────────┼──────────────────────────────┐
│                    Backend (FastAPI)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │              API Endpoints (/learn,                 │  │
│  │         /simulate_stream, /memory_capacity_test)   │  │
│  └────────────────────────────────────────────────────┘  │
│                            │                              │
│  ┌────────────────────────┼──────────────────────────┐  │
│  │   AttractorNet (NumPy)  │  JaxAttractorNet (JAX)   │  │
│  │   - Learning Rules      │  - GPU Acceleration      │  │
│  │   - Update Rules        │  - Same Interface        │  │
│  └─────────────────────────┴──────────────────────────┘  │
│                            │                              │
│                    Network Cache                          │
│              (Stores weight matrices)                     │
└───────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Frontend handles UI/UX, backend handles computation
2. **Stateless Backend**: Network state cached in memory with UUID identifiers
3. **Streaming Responses**: Large computations use Server-Sent Events (SSE) for real-time updates
4. **Dual Backend Support**: Both NumPy (CPU) and JAX (GPU) implementations available
5. **Context-Based State Management**: React Context API for phase-specific state

## Component Architecture

### Frontend Components

#### Context Providers

**GraphContext** (`src/GraphContext.jsx`)
- Manages network structure and graph state
- Stores connectivity matrix (C) and node positions (layout)
- Tracks graph version for change detection
- Provides network serialization utilities

**LearningContext** (`src/LearningContext.jsx`)
- Manages learning phase state
- Stores weight matrix history (WHist)
- Tracks memories, learning rules, and parameters
- Manages learning completion status

**SimulationContext** (`src/SimulationContext.jsx`)
- Manages simulation phase state
- Stores activation history (AHist) and energy history
- Tracks capacity test results
- Manages simulation mode (activation vs. capacity)

#### Phase Components

**Construction.jsx** (`src/pages/Construction.jsx`)
- Network building interface
- Template placement and customization
- Graph editing tools (add, drag, delete)
- Network export functionality

**LearningPhase.jsx** (`src/pages/LearningPhase.jsx`)
- Memory import and management
- Learning rule configuration
- Weight matrix visualization
- Learning progress tracking

**SimulationPhase.jsx** (`src/components/SimulationPhase.jsx`)
- Activation simulation interface
- Memory capacity testing
- Energy and state visualization
- PDF report generation

#### Core Components

**GraphCanvas.jsx** (`src/components/GraphCanvas.jsx`)
- Sigma.js-based graph visualization
- Handles node/edge interactions
- Grid snapping and layout management
- Template placement logic

**ToolsMenu.jsx** (`src/components/ToolsMenu.jsx`)
- Construction phase tool palette
- Template selection and configuration
- Network import/export controls

**StatePicker.jsx** (`src/components/StatePicker.jsx`)
- Activation state input/visualization
- Matrix and text input modes
- State editing interface

**reportGenerator.js** (`src/components/reportGenerator.js`)
- PDF generation for capacity and recall tests
- Chart and matrix visualization in PDF
- Report formatting and layout

### Backend Architecture

#### Core Modules

**api.py** (`backend/api.py`)
- FastAPI application setup
- REST endpoint definitions
- Request/response models (Pydantic)
- Network cache management
- SSE streaming implementation

**attractor.py** (`backend/attractor.py`)
- NumPy-based attractor network implementation
- Learning rule implementations
- Activation update rules
- Energy computation
- Simulation iteration logic

**jax_attractor.py** (`backend/jax_attractor.py`)
- JAX-based GPU-accelerated implementation
- Same interface as NumPy version
- JIT-compiled operations
- GPU memory management

#### Network Cache

Networks are cached in memory after learning:
```python
network_cache = {
    "network_id": {
        "W": weight_matrix,      # Final weight matrix
        "backend": "numpy"        # Backend used
    }
}
```

Cache persists for the lifetime of the backend process. UUIDs are used to reference cached networks in subsequent API calls.

## Data Flow

### Learning Flow

1. **Frontend** → User configures network and memories
2. **Frontend** → Sends `/learn` request with:
   - Connectivity matrix (base64 encoded)
   - Memory patterns
   - Learning parameters
3. **Backend** → Creates AttractorNet instance
4. **Backend** → Applies learning rule
5. **Backend** → Caches weight matrix with UUID
6. **Backend** → Returns network_id and weight history
7. **Frontend** → Stores network_id for simulation phase

### Simulation Flow

1. **Frontend** → User configures initial state and activation rule
2. **Frontend** → Sends `/simulate_stream` request with:
   - network_id (from learning phase)
   - Initial activation state
   - Update type and parameters
3. **Backend** → Retrieves weight matrix from cache
4. **Backend** → Creates AttractorNet with cached weights
5. **Backend** → Streams simulation results via SSE:
   - Each iteration: timestep, energy, activations
   - Final message: `{"done": true}`
6. **Frontend** → Updates UI in real-time as data streams

### Capacity Test Flow

1. **Frontend** → User configures test parameters
2. **Frontend** → Sends `/memory_capacity_test` request
3. **Backend** → For each pattern count (1 to M):
   - Creates new network
   - Learns first N patterns
   - Tests recall with noise
   - Computes success rate
4. **Backend** → Streams results via SSE:
   - Each pattern count: `{"num_patterns": N, "success_count": X}`
   - Final message: `{"done": true}`
5. **Frontend** → Updates capacity plot in real-time

## API Documentation

### Base URL

```
http://localhost:8001
```

### Authentication

Currently no authentication is required. All endpoints are publicly accessible.

### Endpoints

#### `POST /learn`

Train a network on memory patterns using Hebbian learning.

**Request Body**:
```json
{
  "memories": [[1, -1, 1], [-1, 1, -1]],
  "N": 3,
  "C_b64": "base64_encoded_connectivity_matrix",
  "learning_rate": 0.25,
  "scale": 1.0,
  "rule": "standard",
  "allow_diag": false,
  "backend": "numpy"
}
```

**Parameters:**
- `memories` (required, `List[List[int]]`): 2D array of memory patterns. Each pattern is an array of ±1 values. Shape: M patterns × N neurons.
- `N` (required, `int`): Number of neurons in the network.
- `C_b64` (required, `str`): Base64-encoded connectivity matrix. See [Data Formats](#connectivity-matrix-encoding) for encoding details.
- `learning_rate` (optional, `float`): Learning rate (μ). Default: 0.25. Typically set to 1/N.
- `scale` (optional, `float`): Decay scale for decay-based learning rules. Default: 1.0. Values < 1.0 cause weight decay.
- `rule` (optional, `str`): Learning rule. Options:
  - `"standard"`: Standard Hebbian (default)
  - `"decay"`: Hebbian with weight decay
  - `"iterative"`: Iterative Hebbian
  - `"store_erase"`: Store-Erase Hebbian
  - `"store_erase_decay"`: Store-Erase with decay
- `allow_diag` (optional, `bool`): Allow self-connections (diagonal weights). Default: `false`.
- `backend` (optional, `str`): Computational backend. Options: `"numpy"` (default) or `"jax"` (GPU-accelerated).

**Response**:
```json
{
  "ok": true,
  "network_id": "550e8400-e29b-41d4-a716-446655440000",
  "N": 3,
  "M": 2,
  "rule": "standard",
  "W_hist": [
    [[0.0, 0.083, 0.083], [0.083, 0.0, 0.083], [0.083, 0.083, 0.0]],
    [[0.0, 0.167, 0.0], [0.167, 0.0, 0.167], [0.0, 0.167, 0.0]]
  ]
}
```

**Response Fields:**
- `ok` (`bool`): Success indicator
- `network_id` (`str`): UUID for referencing this network in subsequent calls
- `N` (`int`): Number of neurons
- `M` (`int`): Number of memories learned
- `rule` (`str`): Learning rule used
- `W_hist` (`List[List[List[float]]]`): Weight matrix history. Each element is an N×N weight matrix after learning each memory.

**Error Response**:
```json
{
  "ok": false,
  "error": "Error message describing what went wrong"
}
```

**Status Codes:**
- `200 OK`: Successful learning
- `400 Bad Request`: Invalid input parameters
- `500 Internal Server Error`: Server-side error

#### `POST /simulate_stream`

Stream simulation results using Server-Sent Events (SSE). This endpoint streams simulation state at each iteration.

**Request Body**:
```json
{
  "A": [1, -1, 1],
  "network_id": "550e8400-e29b-41d4-a716-446655440000",
  "max_iters": 200,
  "update_type": "standard",
  "update_gain": 1.8,
  "granular": false,
  "positions": null
}
```

**Parameters:**
- `A` (required, `List[int]`): Initial activation state. Array of ±1 values, length must match network size.
- `network_id` (required, `str`): UUID from `/learn` endpoint.
- `max_iters` (optional, `int`): Maximum iterations before stopping. Default: 200.
- `update_type` (optional, `str`): Activation rule. Options:
  - `"standard"`: Discrete sign function (default)
  - `"continuous"`: Continuous hyperbolic tangent
  - `"ef"`: Discrete with electric field
  - `"continuous_ef"`: Continuous with electric field
- `update_gain` (optional, `float`): Gain parameter for continuous updates. Default: 1.8.
- `granular` (optional, `bool`): For standard rule, emit updates after each node change. Default: `false`.
- `positions` (optional, `List[List[float]]`): 2D positions for electric field rules. Format: `[[x1,y1], [x2,y2], ...]`. Default: `null`.

**Response** (SSE stream):
```
data: {"t": 0, "E": -1.5, "A": [1, -1, 1]}

data: {"t": 1, "E": -2.0, "A": [1, -1, 1]}

data: {"t": 2, "E": -2.0, "A": [1, -1, 1]}

data: {"done": true}
```

**Response Fields** (per message):
- `t` (`int`): Timestep/iteration number
- `E` (`float`): Network energy at this timestep
- `A` (`List[int]`): Activation state (binary ±1)
- `done` (`bool`): Present only in final message

**Error Response** (SSE):
```
data: {"error": "Error message"}
```

**Status Codes:**
- `200 OK`: Stream started successfully
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Network ID not found in cache
- `500 Internal Server Error`: Server-side error

#### `POST /memory_capacity_test`

Run memory capacity test. Tests how many patterns can be successfully recalled as more patterns are learned. Results streamed via SSE.

**Request Body**:
```json
{
  "memories": [[1, -1, 1], [-1, 1, -1], [1, 1, -1]],
  "N": 3,
  "C_b64": "base64_encoded_matrix",
  "learning_rate": 0.25,
  "scale": 1.0,
  "rule": "standard",
  "noise_level": 0.1,
  "error_tolerance": 0.0,
  "max_iters": 50,
  "iterations": 5,
  "backend": "numpy",
  "update_type": "standard",
  "positions": null
}
```

**Parameters:**
- `memories` (required, `List[List[int]]`): All memory patterns to test. Test will evaluate capacity from 1 pattern up to all patterns.
- `N` (required, `int`): Number of neurons.
- `C_b64` (required, `str`): Base64-encoded connectivity matrix.
- `learning_rate` (optional, `float`): Learning rate. Default: 0.25.
- `scale` (optional, `float`): Decay scale. Default: 1.0.
- `rule` (optional, `str`): Learning rule. Default: `"standard"`.
- `noise_level` (optional, `float`): Noise percentage (0.0 to 0.5). Percentage of bits to flip in test patterns. Default: 0.1 (10%).
- `error_tolerance` (optional, `float`): Error tolerance (0.0 to 0.5). Percentage of mismatched bits allowed for success. Default: 0.0 (requires 100% match).
- `max_iters` (optional, `int`): Maximum iterations per recall test. Default: 50.
- `iterations` (optional, `int`): Number of runs per pattern count for averaging. Default: 1.
- `backend` (optional, `str`): Computational backend. Default: `"numpy"`.
- `update_type` (optional, `str`): Activation rule for testing. Default: `"standard"`.
- `positions` (optional, `List[List[float]]`): Positions for electric field rules. Default: `null`.

**Response** (SSE stream):
```
data: {"num_patterns": 1, "success_count": 1.0}

data: {"num_patterns": 2, "success_count": 2.0}

data: {"num_patterns": 3, "success_count": 1.5}

data: {"done": true}
```

**Response Fields** (per message):
- `num_patterns` (`int`): Number of patterns learned
- `success_count` (`float`): Average number of successful recalls (0 to num_patterns)
- `done` (`bool`): Present only in final message

**Status Codes:**
- `200 OK`: Test started successfully
- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Server-side error

## Data Formats

### Connectivity Matrix Encoding

The connectivity matrix `C` (N×N binary matrix) is encoded as base64 for efficient transmission:

1. **Bit Packing**: Convert N×N binary matrix to bit array
   - Each cell (i,j) becomes one bit: 1 if connected, 0 if not
   - Bits packed into bytes (8 bits per byte, row-major order)

2. **Base64 Encoding**: Encode packed bytes as base64 string

**Example** (3×3 matrix):
```
C = [[0,1,1],
     [1,0,1],
     [1,1,0]]

Bit array: [0,1,1, 1,0,1, 1,1,0]
Packed: [0b01110110, 0b00000000] = [118, 0] (padded to byte boundary)
Base64: "dgA="
```

**Decoding** (Python):
```python
import base64
import numpy as np

data = base64.b64decode(C_b64)
bits = np.frombuffer(data, dtype=np.uint8)
C = np.zeros((N, N), dtype=np.int8)
k = 0
for i in range(N):
    for j in range(N):
        C[i, j] = (bits[k >> 3] >> (k & 7)) & 1
        k += 1
```

### Network Cache Structure

After learning, networks are cached with the following structure:

```python
network_cache = {
    "network_id": {
        "W": np.array,      # Final weight matrix (N×N)
        "backend": str      # "numpy" or "jax"
    }
}
```

Cache is in-memory only and persists for the lifetime of the backend process.

### Memory Format

Memories are represented as arrays of ±1 values:

```python
memories = [
    [1, -1, 1, -1],    # Memory 1
    [-1, 1, -1, 1],    # Memory 2
    [1, 1, -1, -1]     # Memory 3
]
```

Each memory must have length N (number of neurons).

### Activation State Format

Activation states are arrays of ±1 (for discrete) or continuous values in [-1, 1] (for continuous):

```python
# Discrete
A = [1, -1, 1, -1]

# Continuous (after tanh)
A = [0.9, -0.8, 0.7, -0.6]
```

## Learning Algorithms

### Standard Hebbian Learning

One-shot learning rule:

```
W = W + μ · C · (pattern ⊗ pattern)
```

Where:
- `μ` = learning rate (typically 1/N)
- `C` = connectivity matrix
- `⊗` = outer product

**Implementation**: `attractorNet.learn_standard()`

### Decay Hebbian Learning

Includes weight decay:

```
W = scale · W + μ · C · (pattern ⊗ pattern)
```

Where `scale < 1.0` causes older memories to fade.

**Implementation**: `attractorNet.learn_decay()`

### Iterative Hebbian Learning

Iteratively strengthens weak memories until all patterns are stable:

```
For each pattern p:
    For each neuron i:
        field = Σ C[i,j] · W[i,j] · pattern[j]
        If field · pattern[i] < threshold:
            W[i] += (C[i] · pattern · pattern[i]) / N
```

Continues until convergence or max iterations.

**Implementation**: `attractorNet.iterative_hebb()`

### Store-Erase Hebbian Learning

Reduces interference between memories using anti-Hebbian term:

```
V = W_old @ (pattern ⊗ pattern)
ΔW = μ · ((pattern ⊗ pattern) - (V + Vᵀ))
W = W + C · ΔW
```

**Implementation**: `attractorNet.learn_store_erase()`

### Store-Erase with Decay

Combines store-erase with weight decay:

```
W = scale · W + C · ΔW
```

**Implementation**: `attractorNet.learn_store_erase_decay()`

## Activation Rules

### Discrete (Standard)

Sign function activation:

```
A[i] = sgn(Σ W[i,j] · A[j])
```

Where `sgn(x)` returns:
- `+1` if x > 0
- `-1` if x < 0
- Previous value if x = 0

**Implementation**: `attractorNet.update_standard()`

### Continuous

Hyperbolic tangent activation:

```
A[i] = tanh(gain · Σ W[i,j] · A[j])
```

Outputs continuous values in [-1, 1]. `gain` parameter controls steepness.

**Implementation**: `attractorNet.update_continuous()`

### Discrete with Electric Field

Discrete activation with electric field coupling:

```
synaptic_current = Σ W[i,j] · A[j]
electric_field_current = Σ S[i,j] · A[j]
A[i] = sgn(synaptic_current + ε · electric_field_current)
```

Where:
- `S` = synaptic kernel matrix (distance-based coupling)
- `ε` = coupling strength parameter

**Implementation**: `attractorNet.update_ef()`

### Continuous with Electric Field

Continuous activation with electric field:

```
A[i] = tanh(gain · (synaptic_current + ε · electric_field_current))
```

**Implementation**: `attractorNet.update_continuous_ef()`

### Synaptic Kernel

For electric field rules, the synaptic kernel `S` is computed from node positions:

```
S[i,j] = exp(-coupling_gain · distance(i,j)²)
```

Where `distance(i,j)` is Euclidean distance between node positions.

## Error Handling

### Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "ok": false,
  "error": "Descriptive error message"
}
```

### Common Error Scenarios

**Invalid Network ID**:
- **Endpoint**: `/simulate_stream`
- **Error**: `"Network ID not found in cache"`
- **Solution**: Ensure learning phase completed and network_id is valid

**Dimension Mismatch**:
- **Endpoint**: `/learn`
- **Error**: `"memories row X has Y columns; expected Z"`
- **Solution**: Ensure all memories have same length as network size

**Missing Parameters**:
- **Endpoint**: Any
- **Error**: `"Missing required field: X"`
- **Solution**: Include all required parameters in request

**Memory Capacity Test Errors**:
- **Error**: `"Need at least 2 memories to test capacity"`
- **Solution**: Provide at least 2 memory patterns

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Resource not found (e.g., network_id)
- `500 Internal Server Error`: Server-side error (check backend logs)

## Performance Considerations

### Backend Selection

**NumPy Backend** (`"numpy"`):
- CPU-based computation
- Good for small to medium networks (N < 500)
- No GPU required
- Lower memory overhead

**JAX Backend** (`"jax"`):
- GPU-accelerated computation
- Recommended for large networks (N > 500)
- Requires CUDA-capable GPU
- JIT compilation for performance
- Higher memory usage

### Memory Management

- **Weight History**: For large networks (N > 500), full weight history is disabled to prevent OOM
- **Network Cache**: Cached networks persist in memory. Restart backend to clear cache
- **Streaming**: Large results streamed via SSE to avoid memory issues

### Optimization Tips

1. **Use JAX for Large Networks**: Switch to JAX backend for N > 500
2. **Disable Weight History**: For very large networks, history tracking is automatically disabled
3. **Batch Operations**: Capacity tests can be slow; use appropriate iteration counts
4. **GPU Memory**: JAX backend requires sufficient GPU memory for large weight matrices

### Scalability

- **Network Size**: Tested up to N = 1000 neurons
- **Memory Count**: No hard limit, but performance degrades with many memories
- **Concurrent Requests**: Backend handles multiple requests, but network cache is shared

## Security Considerations

### Current Implementation

- **No Authentication**: All endpoints are publicly accessible
- **CORS**: Configured to allow all origins (`allow_origins=["*"]`)
- **Input Validation**: Pydantic models validate all inputs
- **No Rate Limiting**: Currently no rate limiting implemented

### Production Recommendations

1. **Add Authentication**: Implement API key or OAuth2 authentication
2. **Restrict CORS**: Set specific allowed origins instead of `*`
3. **Rate Limiting**: Add rate limiting middleware (e.g., slowapi)
4. **Input Sanitization**: Additional validation for file uploads
5. **HTTPS**: Use HTTPS in production
6. **Network Cache Limits**: Implement cache size limits and eviction policies

## Future Enhancements

Potential improvements for future versions:

1. **Persistent Storage**: Database for network and experiment storage
2. **User Accounts**: Multi-user support with experiment sharing
3. **Batch Processing**: Queue system for long-running capacity tests
4. **Advanced Visualizations**: 3D network visualization, energy landscapes
5. **Export Formats**: Additional export formats (HDF5, MATLAB, etc.)
6. **Real-time Collaboration**: WebSocket support for collaborative editing
7. **Plugin System**: Extensible architecture for custom learning rules

