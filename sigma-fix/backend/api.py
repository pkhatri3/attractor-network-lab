from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
from attractor import attractorNet
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

@app.post("/learn")
def learn(payload: LearnPayload):
    global AN
    try:
        print(payload)
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

        AN = attractorNet(N, C, scale)
        if payload.learning_rate is not None:
            AN.mu = payload.learning_rate

        W_hist = AN.learn(memories, N, M, payload.rule)

        network_id = str(uuid4())
        network_cache[network_id] = W_hist[-1]  # only final weights

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
    A: List[int]
    max_iters: int = 200
    network_id: str

@app.post("/simulate_stream")
async def simulate_stream(payload: SimPayload):
    W = network_cache[payload.network_id]
    A = np.array(payload.A, dtype=int)
    AN = attractorNet(len(A), np.ones((len(A), len(A))), 0)
    AN.W = W

    async def event_gen():
        try:
            for state in AN.simulate_iter(A, payload.max_iters):
                yield f"data: {json.dumps(state)}\n\n"
                await asyncio.sleep(0.05)  # give frontend time to render
            yield "data: {\"done\": true}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")

class MemoryCapacityPayload(BaseModel):
    memories: List[List[int]]
    C_b64: str = None
    N: int = None
    learning_rate: Optional[float] = None
    scale: float = 1.0
    rule: str = "standard"
    noise_level: float = 0.1
    max_iters: int = 50

@app.post("/memory_capacity_test")
async def memory_capacity_test(payload: MemoryCapacityPayload):
    async def event_gen():
        try:
            if not payload.memories or not payload.memories[0]:
                yield f"data: {json.dumps({'error': 'memories must be a non-empty 2D list'})}\n\n"
                return
            
            memories_arr = np.array(payload.memories, dtype=int).T
            N, M = memories_arr.shape
            C = decode_C(payload)
            
            for num_patterns in range(1, M + 1):
                AN = attractorNet(N, C, payload.scale)
                if payload.learning_rate is not None:
                    AN.mu = payload.learning_rate
                
                data_subset = memories_arr[:, :num_patterns]
                AN.learn(data_subset, N, num_patterns, payload.rule)
                recalls = []
                success_count = 0
                for p_idx in range(num_patterns):
                    original_pattern = memories_arr[:, p_idx].copy()
                    
                    noisy_pattern = original_pattern.copy()
                    num_flips = max(1, int(N * payload.noise_level))
                    flip_indices = np.random.choice(N, size=num_flips, replace=False)
                    noisy_pattern[flip_indices] *= -1
                    
                    AN.A = noisy_pattern.copy()
                    for _ in range(payload.max_iters):
                        Aold = AN.A.copy()
                        AN.update()
                        if np.all(AN.A == Aold):
                            break
                    
                    recalled_pattern = AN.A.copy()
                    matches = np.sum(recalled_pattern == original_pattern)
                    accuracy = matches / N
                    is_success = (matches == N)
                    if is_success:
                        success_count += 1
                    
                    recalls.append({
                        "pattern_idx": int(p_idx),
                        "accuracy": float(accuracy),
                        "converged": bool(np.all(recalled_pattern == original_pattern)),
                        "success": bool(is_success)
                    })
                
                result = {
                    "num_patterns": int(num_patterns),
                    "success_count": int(success_count),
                    "recalls": recalls
                }
                
                yield f"data: {json.dumps(result)}\n\n"
                await asyncio.sleep(0.1)
            
            yield "data: {\"done\": true}\n\n"
            
        except Exception as e:
            print("Error in /memory_capacity_test:", e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
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
