from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
from attractor import attractorNet
from jax_attractor import JaxAttractorNet
from fastapi.responses import StreamingResponse
import asyncio
import json
import base64
from uuid import uuid4

app = FastAPI()
network_cache = {} 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

AN = None  

class LearnPayload(BaseModel):
    memories: List[List[int]]
    C_b64: str = None
    N: int = None
    learning_rate: Optional[float] = None
    scale: float = 1.0
    rule: str = "standard"
    allow_diag: bool = False
    backend: str = "numpy"  # "numpy" or "jax"

@app.post("/learn")
def learn(payload: LearnPayload):
    global AN
    try:
        print(f"Received learn request. Backend: {payload.backend}, N: {payload.N}")
        #print(payload)
        if not payload.memories or not payload.memories[0]:
            return {"ok": False, "error": "memories must be a non-empty 2D list"}
        expected_n = len(payload.memories[0])
        for idx, row in enumerate(payload.memories, start=1):
            if len(row) != expected_n:
                return {
                    "ok": False,
                    "error": f"memories row {idx} has {len(row)} columns; expected {expected_n}"
                }
        memories = np.array(payload.memories, dtype=int).T  # shape: (N, M)
        N, M = memories.shape

        C = decode_C(payload)
        scale = payload.scale

        if payload.backend == "jax":
            AN = JaxAttractorNet(N, C, scale, allow_diag=payload.allow_diag)
        else:
            AN = attractorNet(N, C, scale, allow_diag=payload.allow_diag)
            
        if payload.learning_rate is not None:
            AN.mu = payload.learning_rate

        # Disable history for large N to prevent OOM
        return_history = True
        if N > 500:
            print(f"N={N} > 500, disabling full history tracking.")
            return_history = False

        import time
        t0 = time.perf_counter()
        W_hist = AN.learn(memories, N, M, payload.rule, return_history=return_history)
        t1 = time.perf_counter()
        print(f"Learning took {t1-t0:.4f}s using {payload.backend}")

        #print("allow_diag:", payload.allow_diag)
        #print("diag sample:", np.diag(W_hist[-1])[:10])

        final_W = W_hist[-1]
        network_id = str(uuid4())
        # store W and backend info
        network_cache[network_id] = {
            "W": W_hist[-1],
            "backend": payload.backend
        }

        return {
            "ok": True,
            "network_id": network_id,
            "N": N,
            "M": M,
            "rule": payload.rule,
            "W_hist": [W.tolist() for W in W_hist]
        }
    except Exception as e:
        print("Error in /learn:", e)
        return {"ok": False, "error": str(e)}

class SimPayload(BaseModel):
    A: List[float]
    max_iters: int = 200
    network_id: str
    update_type: str = "standard"
    update_gain: Optional[float] = None
    granular: bool = False
    positions: Optional[List[List[float]]] = None  # Optional 2D positions for electric field

@app.post("/simulate_stream")
async def simulate_stream(payload: SimPayload):
    # Retrieve weights and backend info
    cache_data = network_cache[payload.network_id]
    
    # Handle legacy cache (just W) or new cache (dict)
    if isinstance(cache_data, dict) and "W" in cache_data:
        W = cache_data["W"]
        backend = cache_data.get("backend", "numpy")
    else:
        W = cache_data
        backend = "numpy"

    # A from list to numpy array
    A = np.array(payload.A, dtype=float)

    # Create a new attractor network instance using cached weights
    positions = None
    if payload.positions:
        positions = np.array(payload.positions)
    
    if backend == "jax":
        AN = JaxAttractorNet(len(A), np.ones((len(A), len(A))), 0)
    else:
        AN = attractorNet(len(A), np.ones((len(A), len(A))), 0, positions=positions)
        
    AN.W = W
    if payload.update_gain is not None:
        AN.update_gain = payload.update_gain

    # Each iteration, yields one message
    async def event_gen():
        try:
            # Pass granular flag to both backends
            kwargs = {}
            kwargs['granular'] = payload.granular
            if payload.update_gain is not None:
                kwargs['update_gain'] = payload.update_gain

            for state in AN.simulate_iter(A, payload.max_iters, update_type=payload.update_type, **kwargs):
                # Stream timestep, energy, and activations to the frontend
                yield f"data: {json.dumps(state)}\n\n"

                if payload.granular:
                    # Faster updates for granular to keep animation smooth but visible
                    await asyncio.sleep(0.02)
                else:
                    await asyncio.sleep(0.05)

            
            yield "data: {\"done\": true}\n\n"

        except Exception as e:
            # Stream any backend errors as SSE (server-sent events) messages
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    # Return SSE stream
    return StreamingResponse(event_gen(), media_type="text/event-stream")


class MemoryCapacityPayload(BaseModel):
    memories: List[List[int]]
    C_b64: str = None
    N: int = None
    learning_rate: Optional[float] = None
    scale: float = 1.0
    rule: str = "standard"
    noise_level: float = 0.1
    error_tolerance: float = 0.0
    max_iters: int = 50
    iterations: int = 1
    backend: str = "numpy"
    update_type: str = "standard"
    positions: Optional[List[List[float]]] = None

@app.post("/memory_capacity_test")
async def memory_capacity_test(payload: MemoryCapacityPayload):

    async def event_gen():
        try:
            # Convert full memory list -> matrix (N * M)
            memories_arr = np.array(payload.memories, dtype=int).T
            N, M = memories_arr.shape

            # Decode connectivity matrix
            C = decode_C(payload)

            # Test capacity from 1 pattern up to M patterns
            print(f"Starting capacity test. Total patterns: {M}, Iterations per point: {payload.iterations}")
            for num_patterns in range(1, M + 1):

                # Create a new attractor network and apply learning rule
                positions = None
                if payload.positions:
                    positions = np.array(payload.positions)
                
                if payload.backend == "jax":
                    AN = JaxAttractorNet(N, C, payload.scale)
                else:
                    AN = attractorNet(N, C, payload.scale, positions=positions)
                    
                if payload.learning_rate is not None:
                    AN.mu = payload.learning_rate

                # Learn only the first num_patterns memories
                data_subset = memories_arr[:, :num_patterns]
                AN.learn(data_subset, N, num_patterns, payload.rule)

                total_success_count = 0
                
                # Run the test 'iterations' times to get an average
                for iter_idx in range(payload.iterations):
                    current_run_success_count = 0
                    
                    # Test recall for each stored memory
                    for p_idx in range(num_patterns):
                        original = memories_arr[:, p_idx].copy()

                        # Add noise by flipping a % of bits
                        noisy = original.copy()
                        num_flips = max(1, int(N * payload.noise_level))
                        flip_idxs = np.random.choice(N, size=num_flips, replace=False)
                        noisy[flip_idxs] *= -1

                        # Run updates until convergence
                        if "continuous" in payload.update_type:
                            AN.A = noisy.copy().astype(float)
                        else:
                            AN.A = noisy.copy()
                        
                        for _ in range(payload.max_iters):
                            # Capture state before update
                            if "continuous" in payload.update_type:
                                # For continuous, we track the binary state for convergence
                                raw_old = AN.A if payload.backend == "numpy" else np.array(AN.A)
                                Aold = np.sign(raw_old) + (raw_old == 0)
                            else:
                                Aold = AN.A.copy() if payload.backend == "numpy" else np.array(AN.A)

                            AN.update(payload.update_type)
                            
                            # Capture state after update
                            if "continuous" in payload.update_type:
                                raw_curr = AN.A if payload.backend == "numpy" else np.array(AN.A)
                                curr_A = np.sign(raw_curr) + (raw_curr == 0)
                            else:
                                curr_A = AN.A if payload.backend == "numpy" else np.array(AN.A)

                            if np.all(curr_A == Aold):
                                break

                        # Compute accuracy + success with error tolerance
                        raw_recalled = AN.A if payload.backend == "numpy" else np.array(AN.A)
                        
                        if "continuous" in payload.update_type:
                            recalled = np.sign(raw_recalled) + (raw_recalled == 0)
                        else:
                            recalled = raw_recalled

                        matches = np.sum(recalled == original)
                        accuracy = matches / N if N > 0 else 0
                        # Success if accuracy is at least (1 - error_tolerance)
                        success = (accuracy >= (1.0 - payload.error_tolerance))
                        if success:
                            current_run_success_count += 1
                    
                    print(f"Patterns: {num_patterns}, Iteration: {iter_idx+1}/{payload.iterations}, Successes: {current_run_success_count}")
                    total_success_count += current_run_success_count

                avg_success_count = total_success_count / payload.iterations
                print(f"Patterns: {num_patterns}, Average Success: {avg_success_count}")
                
                msg = {
                    "num_patterns": int(num_patterns),
                    "success_count": float(avg_success_count),
                    "recalls": [], # Recalls detail omitted for averaged runs
                }

                
                yield f"data: {json.dumps(msg)}\n\n"

                await asyncio.sleep(0.1)

            # Done with all capacity levels
            yield "data: {\"done\": true}\n\n"

        except Exception as e:
            # Stream error message if anything fails
            err_msg = {"error": str(e)}
            yield f"data: {json.dumps(err_msg)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


def decode_C(payload):
    if getattr(payload, "C_b64", None) is not None:
        N = getattr(payload, "N", None)
        if N is None:
            raise ValueError("Missing N for base64-decoded matrix")
        data = base64.b64decode(payload.C_b64)
        bits = np.frombuffer(data, dtype=np.uint8)
        C = np.zeros((N, N), dtype=np.int8)
        k = 0
        for i in range(N):
            for j in range(N):
                C[i, j] = (bits[k >> 3] >> (k & 7)) & 1
                k += 1
        return C
    elif getattr(payload, "C", None) is not None:
        return np.array(payload.C, dtype=int)
    else:
        raise ValueError("Missing C or C_b64 field")