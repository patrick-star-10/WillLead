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
