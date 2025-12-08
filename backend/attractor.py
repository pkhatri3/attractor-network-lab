from numpy import *
from copy import deepcopy
import numpy as np
import math
from scipy.spatial.distance import cdist

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

    def __init__ (self, N, C, scale,allow_diag: bool = False, update_gain=1.8, positions=None, coupling_gain=0.1, coupling_str=1):  # create N-node Hopfield Net 
        self.N = N
        self.A = zeros(N)             # A = activity/activations state
        self.W = zeros((N,N))         # W = N x N weight matrix
        self.E = 0                    # E = current network energy
        self.C = C                    # C = Connections matrix (N x N)
        self.mu = 1.0 / N             # learning rate (see learning_example())
        self.scale = scale            # decay rate (You can ignore this)
        self.allow_diag = allow_diag  # whether to allow self-connections (diagonal of W)
        self.update_gain = update_gain
        self.coupling_gain = coupling_gain  # coupling strength for electric field
        self.coupling_str = coupling_str     # coupling strength parameter
        if self.allow_diag:
            np.fill_diagonal(self.C, 1)
        
        # Compute synaptic kernel for electric field if positions are provided
        self.S = None
        if positions is not None:
            self.S = self.get_synaptic_kernel(positions)
        elif N > 0:
            # Default: use connection matrix as distance proxy (1 for connected, large for not)
            # This is a fallback when positions aren't available
            self.S = np.ones((N, N)) * 0.1  # Small default coupling
    # There are different ways to learn, just worry about learn_standard() 
    # for right now.
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

    def update_continuous(self):
        indices = random.permutation(self.N)
        for i in indices:
            s = dot(self.W[i,:], self.A)
            self.A[i] = math.tanh(self.update_gain*s)

    def get_synaptic_kernel(self, positions):
        """Compute synaptic kernel matrix from positions"""
        positions = np.array(positions)
        if positions.ndim == 1:
            # If 1D, assume it's a flat list of coordinates, reshape to 2D
            if len(positions) == self.N * 2:
                positions = positions.reshape(self.N, 2)
            else:
                # Fallback: create dummy positions
                positions = np.random.rand(self.N, 2) * 100
        
        if positions.shape[0] != self.N:
            # Mismatch: use default
            return np.ones((self.N, self.N)) * 0.1
        
        S = cdist(positions, positions, 'euclidean')
        S = np.exp(-self.coupling_gain * (S**2))
        return S

    def update_ef(self):
        """Update with electric field (discrete)"""
        eps = self.coupling_str
        indices = random.permutation(self.N)
        for i in indices:
            ef_current = dot(self.S[i,:], self.A) if self.S is not None else 0
            syn_current = dot(self.W[i,:], self.A)
            scalprod = syn_current + eps * ef_current
            self.A[i] = sgn(scalprod, self.A[i])

    def update_continuous_ef(self):
        """Update with electric field (continuous)"""
        eps = self.coupling_str
        indices = random.permutation(self.N)
        for i in indices:
            ef_current = dot(self.S[i,:], self.A) if self.S is not None else 0
            syn_current = dot(self.W[i,:], self.A)
            s = syn_current + eps * ef_current
            self.A[i] = math.tanh(self.update_gain * s)

    def update(self, update_type='standard'):
        if update_type == 'standard':
            self.update_standard()
        elif update_type == 'continuous':
            self.update_continuous()
        elif update_type == 'ef':
            self.update_ef()
        elif update_type == 'continuous_ef':
            self.update_continuous_ef()
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

    def simulate_iter(self, Ainit, max_iters=101, update_type='standard', granular=False):
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
                    
                    if update_type == 'standard':
                        scalprod = dot(self.W[i,:],self.A)
                        self.A[i] = sgn(scalprod,self.A[i])
                    elif update_type == 'continuous':
                        s = dot(self.W[i,:], self.A)
                        self.A[i] = math.tanh(self.update_gain*s)
                    elif update_type == 'ef':
                        eps = self.coupling_str
                        ef_current = dot(self.S[i,:], self.A) if self.S is not None else 0
                        syn_current = dot(self.W[i,:], self.A)
                        scalprod = syn_current + eps * ef_current
                        self.A[i] = sgn(scalprod, self.A[i])
                    elif update_type == 'continuous_ef':
                        eps = self.coupling_str
                        ef_current = dot(self.S[i,:], self.A) if self.S is not None else 0
                        syn_current = dot(self.W[i,:], self.A)
                        s = syn_current + eps * ef_current
                        self.A[i] = math.tanh(self.update_gain * s)
                    
                    # check if changed
                    if self.A[i] != old_val:
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
                self.update(update_type)
                self.E = self.energy()

                if 'continuous' in update_type:
                    yield {"t": t, "E": float(self.E), "A": self.A.tolist()}
                else:
                    A_binary = np.sign(self.A) + (self.A == 0)
                    yield {"t": t, "E": float(self.E), "A": A_binary.tolist()}

                A_binary = np.sign(self.A) + (self.A == 0)
                if all(A_binary == Aold):
                    moretodo = False

                Aold = self.A.copy()


def learning_example():
    print("=================== learning example ========================")
    memory1 = [1, 1, 1, 1]
    memory2 = [1, 1, -1, 1]
    M = 2 # two memories to store
    N = 4 # four elements in each memory / four nodes in hopfield net
    data = np.array([memory1, memory2]).T
    print("Data:")
    print(data)
    
    # This is the same code as learn_standard() but I have moved it here
    # so I can add some print statements for you to see the output
    
    # The weights matrix starts as all zeros.
    W = zeros((N,N))
    print("Initial W:")
    print(W)
    
    # This is called the learning rate. It prevents the neural network
    # from having weights that are too large. We multiply mu to the 
    # outer product of each memory to decrease the "Effect" the memory
    # has on the weights matrix W
    mu = 1. / N
    
    # We are going to learn each of the M patterns:
    for i in range(M):  # for each input pattern i
        
        # An entry in the weights matrix W, W[i,j], signifies the strength of
        # the connection between neurons i and j. The matrix W is updated for
        # each pattern by adding the outer product of that pattern with itself
        # to W.
        outer_product = outer(data[:,i],data[:,i])
        print(f"Outer product of pattern #{i+1} with itself:")
        print(outer_product)
        
        # We first multiply outer product by mu (as explained above).
        outer_product_scaled = mu*outer_product
        print("Outer product after scaling:")
        print(outer_product_scaled)
        
        # We then do an element-wise product between the architecture matrix
        # (which specifies whether 2 neurons are connected in the structure
        #  or not) and the "information" matrix, outer_product_scaled
        # This is also called the Hadamard product:
        # https://en.wikipedia.org/wiki/Hadamard_product_(matrices)
        # In a hopfield network, the architecture is fully connected, so the 
        # matrix is all 1's. If you have a network where two neurons aren't
        # connected you would use 0 there instead of 1. 
        # This matrix is called "C" in the AttractorNet class.
        architecture = ones((N,N))
        W_new = architecture * outer_product_scaled
        
        # (Since this is a matrix of all 1's, it will be the same as 
        #  outer_product_scaled, so no need to print.)
        
        # This is added to W.
        W = W + W_new
        print(f"W matrix after updating with pattern #{i+1}:")
        print(W)

    fill_diagonal(W, 0)  # Hopfield nets don't allow self-connections.
    print("========== Final W matrix: =============")
    print(W)


# For all of these examples, as you study the output, you should notice the
# energy decreases at every single update of the timestep. That is guaranteed
# in a Hopfield network. We didn't formally define what energy is in our 
# first meeting, but it is generally how far the attractor is from 
# "equilibrium" - that is, how far it is from reaching a stable state (which,
# in our case, is a fixed point, which is a stored memory as long as the
# network is not over its memory capacity). So, what this means is that for 
# a Hopfield attractor, every time the network activations are updated, 
# we get closer to equilibrium.
def simulation_examples():
    print("=================== simulation examples ========================")
    # Example 1: One memory to store, four nodes in the network.
    print("============== Example 1 ================")
    memory1 = [1, 1, 1, 1]
    data = np.array([memory1]).T
    N = 4
    M = 1
    print(f"We have N={N} nodes in the network and M={M} patterns to learn.")
    C = ones((N, N)) # Hopfield: Fully connected
    an = attractorNet(N,C,0) # create the attractor
    an.learn(data,N,M,"standard") # learn the memory
    
    # To run the simulation you have to specify the initial state of the 
    # network activations, that is denoted as Ainit. Here, it is the same
    # as the memory itself so we expect the network to not do anything
    # (i.e., none of the activations will change to -1)
    Ainit = [1, 1, 1, 1] 
    print(f"Simulating the network with starting pattern = {Ainit}:")
    an.simulate(Ainit)
    
    # In this example, the last bit is -1. We expect that the network,
    # since it is an attractor, to go towards the fixed point which is
    # the stored memory. So, it should flip the -1 bit to 1.
    # Note that previous simulate() simulation has no bearing on this one
    print(" ")
    print("============== Example 1b ================")
    Ainit = [1, 1, 1, -1]
    print(f"Simulating the network with starting pattern = {Ainit}:")
    an.simulate(Ainit)
    
    # Example 2: Two memories to store, four nodes in the network.
    print(" ")
    print("============== Example 2 ================")
    memory1 = [1, 1, 1, 1]
    memory2 = [1, 1, -1, 1]
    M = 2
    N = 4 
    data = np.array([memory1, memory2]).T
    print(f"We have N={N} nodes in the network and M={M} patterns to learn.")
    C = ones((N, N))
    an = attractorNet(N,C,0)
    an.learn(data,N,M,"standard")
    
    # same idea as example 1, only the network has learned more.
    # we expect the network to converge to the FIRST memory, as that one 
    # is "closer" to Ainit (you only have to flip 1 bit, the first one,
    # to go from Ainit to memory1, whereas you have to flip 2 bits to 
    # get to memory2).
    Ainit = [-1, 1, 1, 1]
    print(f"Simulating the network with starting pattern = {Ainit}:")
    an.simulate(Ainit)    
    
    # In this example, memory2 is closer to Ainit (only required to flip
    # the last bit), so we expect the network to converge to memory2.
    # Again, previous simulation has no bearing on this one
    print(" ")
    print("============== Example 2b ================")
    Ainit = [1, 1, -1, -1]
    print(f"Simulating the network with starting pattern = {Ainit}:")
    an.simulate(Ainit)
    
    # Example 3: Four memories to store, four nodes in the network.
    print(" ")
    print("============== Example 3 ================")
    memory1 = [1, 1, 1, 1]
    memory2 = [-1, 1, 1, 1]
    memory3 = [1, -1, 1, 1]
    memory4 = [1, 1, -1, 1]
    M = 4
    N = 4 
    data = np.array([memory1, memory2, memory3, memory4]).T
    print(f"We have N={N} nodes in the network and M={M} patterns to learn.")
    C = ones((N, N))
    an = attractorNet(N,C,0)
    an.learn(data,N,M,"standard")
    
    # For this one, you would expect that the updating the attractor 
    # would cause the last bit to flip to 1 and then it would be at a
    # fixed point (the first memory). However, since we are trying to
    # store too many memories, you will see that the network takes longer
    # to achieve this than in example 1b. This is what we mean when we 
    # say "the network is reaching its capacity."
    Ainit = [1, 1, 1, -1]
    print(f"Simulating the network with starting pattern = {Ainit}:")
    an.simulate(Ainit) 
    
    
if __name__ == '__main__':
    learning_example()
    simulation_examples()
