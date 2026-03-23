export const willLeadReactiveFaucetIntentAbi = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'getIntentSummary',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'status', type: 'uint8' },
      { name: 'faucet', type: 'address' },
      { name: 'lreactRecipient', type: 'address' },
      { name: 'requestValue', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'executedCount', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'getRuntimeBinding',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'runtimeListener', type: 'address' },
      { name: 'runtimePoolManager', type: 'address' },
      { name: 'runtimeWatchedPoolId', type: 'bytes32' },
      { name: 'runtimeSourceChainId', type: 'uint256' },
      { name: 'runtimeDestinationChainId', type: 'uint256' },
      { name: 'runtimeSwapTopic0', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'lastExecutedAt',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'lastOriginTxHash',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'configureIntent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'faucet', type: 'address' },
      { name: 'lreactRecipient', type: 'address' },
      { name: 'requestValue', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'configureRuntimeRoute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'runtimeListener', type: 'address' },
      { name: 'runtimePoolManager', type: 'address' },
      { name: 'runtimeWatchedPoolId', type: 'bytes32' },
      { name: 'runtimeSourceChainId', type: 'uint256' },
      { name: 'runtimeDestinationChainId', type: 'uint256' },
      { name: 'runtimeSwapTopic0', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'pauseIntent',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'resumeIntent',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  }
] as const
