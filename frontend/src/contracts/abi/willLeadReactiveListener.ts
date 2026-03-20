export const willLeadReactiveListenerAbi = [
  {
    type: 'function',
    name: 'isPaused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'callbackGasLimit',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }]
  },
  {
    type: 'function',
    name: 'signalEmitter',
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
    name: 'destinationChainId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'strategySignalTopic0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'pause',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'resume',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    anonymous: false,
    type: 'event',
    name: 'Callback',
    inputs: [
      { indexed: true, name: 'chain_id', type: 'uint256' },
      { indexed: true, name: '_contract', type: 'address' },
      { indexed: true, name: 'gas_limit', type: 'uint64' },
      { indexed: false, name: 'payload', type: 'bytes' }
    ]
  }
] as const
