export const willLeadPoolSwapListenerAbi = [
  {
    type: 'function',
    name: 'isPaused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'resume',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'repairSubscriptions',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'ownerAddress',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'originChainId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'watchedPool',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'swapTopic0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const
