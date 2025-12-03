import jax.numpy as jnp
from jax import jit, lax, random
import jax
import numpy as np
from copy import deepcopy
import time

# force CPU usage
jax.config.update('jax_platform_name', 'cpu')

# JIT-compiled helper functions
@jit
def compute_energy(A, W):
    return -0.5 * jnp.dot(A, jnp.dot(W, A))

@jit
def update_step(A, W, rand_indices):
    def f(A_curr, i):
        in_i = jnp.dot(W[i, :], A_curr)
        s = jnp.sign(in_i)
        # tie-breaking: if s is 0, keep old value (A_curr[i])
        new_val = jnp.where(s == 0, A_curr[i], s)
        new_val = new_val.astype(A_curr.dtype)
        A_curr = A_curr.at[i].set(new_val)
        return A_curr, None

    A_new, _ = lax.scan(f, A, rand_indices)
    return A_new

@jit
def update_step_granular(A, W, rand_indices):
    def f(A_curr, i):
        in_i = jnp.dot(W[i, :], A_curr)
        s = jnp.sign(in_i)
        new_val = jnp.where(s == 0, A_curr[i], s)
        new_val = new_val.astype(A_curr.dtype)
        
        changed = new_val != A_curr[i]
        A_next = A_curr.at[i].set(new_val)
        
        return A_next, (A_next, changed)

    A_final, (A_stack, changed_stack) = lax.scan(f, A, rand_indices)
    return A_final, A_stack, changed_stack

@jit
def learn_standard_scan(W_init, C, data, mu, allow_diag):
    N = W_init.shape[0]
    M = data.shape[1]
    
    def scan_fn(W, i):
        delta = mu * C * jnp.outer(data[:, i], data[:, i])
        W_new = W + delta
        return W_new, W_new

    final_W, W_stack = lax.scan(scan_fn, W_init, jnp.arange(M))
    return final_W, W_stack

@jit
def learn_standard_loop(W_init, C, data, mu):
    M = data.shape[1]
    def body_fun(i, W):
        delta = mu * C * jnp.outer(data[:, i], data[:, i])
        return W + delta
    final_W = lax.fori_loop(0, M, body_fun, W_init)
    return final_W

@jit
def learn_decay_scan(W_init, C, data, mu, scale):
    M = data.shape[1]
    
    def scan_fn(W, i):
        delta = mu * C * jnp.outer(data[:, i], data[:, i])
        W_new = scale * W + delta
        return W_new, W_new

    final_W, W_stack = lax.scan(scan_fn, W_init, jnp.arange(M))
    return final_W, W_stack

@jit
def learn_decay_loop(W_init, C, data, mu, scale):
    M = data.shape[1]
    def body_fun(i, W):
        delta = mu * C * jnp.outer(data[:, i], data[:, i])
        return scale * W + delta
    final_W = lax.fori_loop(0, M, body_fun, W_init)
    return final_W

class JaxAttractorNet:
    def __init__(self, N, C, scale, allow_diag=False, update_gain=1.8):
        self.N = N
        self.C = jnp.array(C)
        self.scale = scale
        self.allow_diag = allow_diag
        self.update_gain = update_gain
        self.mu = 1.0 / N
        self.W = jnp.zeros((N, N))
        self.A = jnp.zeros(N)
        self.E = 0.0
        
        if self.allow_diag:
             self.C = self.C.at[jnp.diag_indices(self.N)].set(1)

    def learn(self, data, N, M, learn_type, return_history=True):
        data = jnp.array(data)
        self.W = jnp.zeros((N, N))
        
        W_stack = None
        
        if learn_type == 'standard':
            if return_history:
                final_W, W_stack = learn_standard_scan(self.W, self.C, data, self.mu, self.allow_diag)
            else:
                final_W = learn_standard_loop(self.W, self.C, data, self.mu)
        elif learn_type == 'decay':
            if return_history:
                final_W, W_stack = learn_decay_scan(self.W, self.C, data, self.mu, self.scale)
            else:
                final_W = learn_decay_loop(self.W, self.C, data, self.mu, self.scale)
        else:
            raise ValueError(f"Learn type {learn_type} not supported in JAX backend")

        self.W = final_W
        
        if not self.allow_diag:
            # Zero out diagonal
            mask = 1 - jnp.eye(N)
            self.W = self.W * mask
            if W_stack is not None:
                W_stack = W_stack * mask

        if return_history and W_stack is not None:
            # convert to numpy list of arrays
            W_hist = [np.array(w) for w in W_stack]
            return W_hist
        else:
            # Return list with just the final weight matrix
            return [np.array(self.W)]

    def simulate_iter(self, Ainit, max_iters=101, update_type='standard', granular=False):
        self.A = jnp.array(Ainit)
        t = 0
        self.E = compute_energy(self.A, self.W)
        
        # get the initial state
        yield {"t": t, "E": float(self.E), "A": np.array(self.A, dtype=int).tolist()}
        
        Aold = self.A
        moretodo = True
        
        # PRNG key
        key = random.PRNGKey(int(time.time() * 1000))
        
        while moretodo and t < max_iters:
            t += 1
            key, subkey = random.split(key)
            rand_indices = random.permutation(subkey, self.N)
            
            if granular and update_type == 'standard':
                self.A, A_stack, changed_stack = update_step_granular(self.A, self.W, rand_indices)
                
                # convert to numpy to iterate
                A_stack_np = np.array(A_stack)
                changed_stack_np = np.array(changed_stack)
                
                # get the intermediate states
                for i in range(self.N):
                    if changed_stack_np[i]:
                        curr_A = A_stack_np[i]
                        E_curr = compute_energy(jnp.array(curr_A), self.W)
                        yield {"t": t, "E": float(E_curr), "A": curr_A.astype(int).tolist()}
            else:
                self.A = update_step(self.A, self.W, rand_indices)
                self.E = compute_energy(self.A, self.W)
                
                # get the current state
                yield {"t": t, "E": float(self.E), "A": np.array(self.A, dtype=int).tolist()}
            
            if jnp.all(self.A == Aold):
                moretodo = False
            
            Aold = self.A
            
    def update(self, update_type='standard'):
        key = random.PRNGKey(int(time.time() * 1000))
        rand_indices = random.permutation(key, self.N)
        self.A = update_step(self.A, self.W, rand_indices)
