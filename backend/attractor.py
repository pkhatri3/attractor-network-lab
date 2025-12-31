from numpy import *
from copy import deepcopy
import numpy as np
import math

# This code was written by Arya Teymourlouei and Dr. James Reggia

# Hamming dist between vectors a, b
# (used to quantify the distance between the starting state of the
# attractor network and the final state after T timesteps)
def hamdist(a,b): return sum(a != b)  # Hamming dist vectors a, b

# Sign function (Activation Function)
def sgn(x,oldval):         # compute a = sgn(input)
    if x > 0: return 1
    elif x < 0: return -1
    else: return oldval

# Attractor Neural Network Class Definition
class attractorNet(object):

    def __init__ (self, N, C, scale,allow_diag: bool = False, update_gain=1.8,):  # create N-node Hopfield Net 
        self.N = N
        self.A = zeros(N)             # A = activity/activations state
        self.W = zeros((N,N))         # W = N x N weight matrix
        self.E = 0                    # E = current network energy
        self.C = C                    # C = Connections matrix (N x N)
        self.mu = 1.0 / N             # learning rate (see learning_example())
        self.scale = scale            # decay rate (You can ignore this)
        self.allow_diag = allow_diag  # whether to allow self-connections (diagonal of W)
        self.update_gain = update_gain
        if self.allow_diag:
            np.fill_diagonal(self.C, 1)

    def learn(self, data,N,M,learn_type, return_history=True):
        if learn_type == 'standard':
            return self.learn_standard(data,N,M, return_history)
        elif learn_type == 'decay':
            return self.learn_decay(data,N,M,self.scale, return_history)
        elif learn_type == 'iterative':
            return self.iterative_hebb(data,N,M)
        elif learn_type == 'store_erase_decay':
            return self.learn_store_erase_decay(data,N,M,self.scale, return_history)
        elif learn_type == 'store_erase':
            return self.learn_store_erase(data,N,M, return_history)
        else:
            print("invalid learn type")
            raise SystemExit(1)
    
    # Iterative Hebbian learning (You can ignore this for now)
    def iterative_hebb(self, data, N, M):
        flag = 0 # stopping condition
        step = 0
        max_steps = 100
        delta = 1   
        W_hist = []    
        
        while flag == 0 and step < max_steps:
            flag = 1
            for p in range(M):
                for i in range(N):
                    # the "incoming field" 
                    field = dot(ones((N,)), self.C[i]*self.W[i]*data[:,p])
                    
                    if field*data[i,p] < delta:
                        self.W[i] += (self.C[i]*data[:,p]*data[i,p])/N
                        flag = 0
            
            step += 1

            if not self.allow_diag:
                fill_diagonal(self.W, 0)
            

            # Only append if different from last
            if len(W_hist) == 0 or not np.array_equal(self.W, W_hist[-1]):
                W_hist.append(self.W.copy())

        return W_hist
                    
    # Standard one-shot Hebbian learning (this is what I explained in the notes
    # and you can see an example of this in learning_examples() below).
    def learn_standard(self, data, N, M, return_history=True):
        W_hist = []

        for i in range(M):                # for each input pattern i
            self.W = self.W + self.mu*self.C*outer(data[:,i],data[:,i])
            #fill_diagonal(self.W, 0)                # zero out main diagonal
            if not self.allow_diag:
                fill_diagonal(self.W, 0)

            if return_history:
                W_hist.append(self.W.copy())
        
        if not return_history:
            W_hist.append(self.W.copy())
        
        return W_hist
        
    # One-shot Hebbian learning with weight decay (ignore this for now)
    def learn_decay(self, data, N, M, scale, return_history=True):
        W_hist = []

        for i in range(M):                # for each input pattern i
            self.W = scale*self.W + self.mu*self.C*outer(data[:,i],data[:,i])
            if not self.allow_diag:
                fill_diagonal(self.W, 0)           # zero out main diagonal
            if return_history:
                W_hist.append(self.W.copy())
        
        if not return_history:
            W_hist.append(self.W.copy())
        
        return W_hist

    # Store-Erase Hebbian Learning with Decay
    def learn_store_erase_decay(self, data, N, M, scale, return_history=True):
        W_hist = []
        Wold = deepcopy(self.W)
        for i in range(M):
            outerprod = outer(data[:,i],data[:,i])
            V = Wold @ outerprod
            deltaW = self.mu*(outerprod - (V + V.T))
            self.W = scale*self.W + self.C*deltaW
            Wold = deepcopy(self.W)
            if not self.allow_diag:
                fill_diagonal(self.W, 0)
            if return_history:
                W_hist.append(self.W.copy())
        
        if not return_history:
            W_hist.append(self.W.copy())
        return W_hist

    # Store-Erase Hebbian Learning (NO DECAY)
    def learn_store_erase(self, data, N, M, return_history=True):
        W_hist = []
        Wold = deepcopy(self.W)
        for i in range(M):
            outerprod = outer(data[:,i],data[:,i])
            V = Wold @ outerprod
            deltaW = self.mu*(outerprod - (V + V.T))
            self.W = self.W + self.C*deltaW
            Wold = deepcopy(self.W)
            if not self.allow_diag:
                fill_diagonal(self.W, 0)
            if return_history:
                W_hist.append(self.W.copy())
        
        if not return_history:
            W_hist.append(self.W.copy())
        return W_hist
    
    # Method to update the activations vector (or matrix) A at each timestep
    def update_standard(self):                           # asynchronously update A
        indices = random.permutation(self.N)    # determine order node updates
        for i in indices:                       # for each node i
            scalprod = dot(self.W[i,:],self.A)  # compute i's input
            self.A[i] = sgn(scalprod,self.A[i]) # assign i's act. value

    def update_continuous(self, update_gain=None):
        gain = self.update_gain if update_gain is None else update_gain
        indices = random.permutation(self.N)
        for i in indices:
            s = dot(self.W[i,:], self.A)
            self.A[i] = math.tanh(gain * s)

    def update(self, update_type='standard', update_gain=None):
        if update_type == 'standard':
            self.update_standard()
        elif update_type == 'continuous':
            self.update_continuous(update_gain=update_gain)
        else:
            print('invalid update method')
            raise SystemExit(1)

    def simulate(self,Ainit):
        # Simulate attractor net starting in state Ainit.
        # Returns iteration number tlast and Hamming distance dist
        # of A from stored pattern Ainit when final state reached.
        t = 0                        # initialize time step t
        self.A = deepcopy(Ainit)     # assign initial state A
        self.E = self.energy()       # compute energy E
        Aold = deepcopy(Ainit)       # A at previous t
        moretodo = True              # not known to be at equilibrium yet
        t_MAX = 20                   # maximum time the simulation will run
        print("Timestep:", t, "Energy:", self.E, "Activations:", self.A)
        
        while moretodo and t<t_MAX:    # while fixed point not reached
            t += 1                     #   increment iteration counter
            self.update()              #   update all A values once per t
            self.E = self.energy()     #   compute energy E of state A
            print("Timestep:", t, "Energy:", self.E, "Activations:", self.A)
            
            Aold_binary = np.sign(Aold) + (np.array(Aold) == 0)
            A_binary = np.sign(self.A) + (self.A == 0)
            if all(A_binary == Aold_binary):           # if at fixed point
                tlast = t                     # record ending iteration
                dist = hamdist(Ainit,A_binary)  # distance from Ainit
                moretodo = False              # and quit

            Aold = deepcopy(self.A) # update Aold

        # fixed point not reached but simulation ended (This will NEVER
        # happen in a Hopfield network - that is guaranteed.)
        if moretodo: 
            tlast = t
            A_binary = np.sign(self.A) + (self.A == 0)
            dist = hamdist(Ainit,A_binary)
        
        return tlast,dist

    def energy(self):  # Returns network's energy E
        return -0.5 * dot(self.A,dot(self.W,self.A))

    def simulate_iter(self, Ainit, max_iters=101, update_type='standard', granular=False, update_gain=None):
        t = 0
        self.A = deepcopy(Ainit)
        self.A = np.array(self.A, dtype=np.float64)
        self.E = self.energy()
        Aold = deepcopy(Ainit)
        moretodo = True

        if 'continuous' in update_type:
            yield {"t": t, "E": float(self.E), "A": self.A.tolist()}
        else:
            A_binary = np.sign(self.A) + (self.A == 0)
            yield {"t": t, "E": float(self.E), "A": A_binary.tolist()}  # Start state

        while moretodo and t < max_iters:
            t += 1
            
            if granular:
                indices = random.permutation(self.N)
                changed_any = False
                
                for i in indices:
                    old_val = self.A[i]

                    gain = self.update_gain if update_gain is None else update_gain
                    
                    if update_type == 'standard':
                        scalprod = dot(self.W[i,:],self.A)
                        self.A[i] = sgn(scalprod,self.A[i])
                    elif update_type == 'continuous':
                        s = dot(self.W[i,:], self.A)
                        self.A[i] = math.tanh(gain * s)
                    
                    # check if changed
                    if 'continuous' in update_type:
                        # Check if sign changed (binary state stability)
                        old_bin = 1 if old_val >= 0 else -1
                        new_bin = 1 if self.A[i] >= 0 else -1
                        is_diff = old_bin != new_bin
                    else:
                        is_diff = self.A[i] != old_val

                    if is_diff:
                        changed_any = True
                        
                        self.E = self.energy()
                        if 'continuous' in update_type:
                            yield {"t": t, "E": float(self.E), "A": self.A.tolist()}
                        else:
                            A_binary = np.sign(self.A) + (self.A == 0)
                            yield {"t": t, "E": float(self.E), "A": A_binary.tolist()}
                
                if not changed_any:
                    moretodo = False
                    
            else:
                self.update(update_type, update_gain=update_gain)
                self.E = self.energy()

                if 'continuous' in update_type:
                    yield {"t": t, "E": float(self.E), "A": self.A.tolist()}
                else:
                    A_binary = np.sign(self.A) + (self.A == 0)
                    yield {"t": t, "E": float(self.E), "A": A_binary.tolist()}

                A_binary = np.sign(self.A) + (self.A == 0)
                if all(A_binary == Aold):
                    moretodo = False
                Aold = deepcopy(A_binary)
    
if __name__ == '__main__':
    learning_example()
    simulation_examples()
