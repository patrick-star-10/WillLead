export const willLeadWalletFactoryAbi = [
  {
    type: 'function',
    name: 'callbackProxy',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'authorizedRvmId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'reactiveListener',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
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
    name: 'walletOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'listenerOf',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'createWallet',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'wallet', type: 'address' }]
  },
  {
    type: 'function',
    name: 'getWalletContext',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'wallet', type: 'address' },
      { name: 'listener', type: 'address' },
      { name: 'emitter', type: 'address' },
      { name: 'sourceChain', type: 'uint256' },
      { name: 'targetChain', type: 'uint256' },
      { name: 'signalTopic0', type: 'uint256' }
    ]
  },
  {
    anonymous: false,
    type: 'event',
    name: 'WalletCreated',
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'wallet', type: 'address' },
      { indexed: true, name: 'reactiveListener', type: 'address' }
    ]
  }
] as const
