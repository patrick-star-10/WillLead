export const willLeadWalletAbi = [
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
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'executedCount', type: 'uint256' },
      { name: 'automationBalanceFloor', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'configureIntent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'automationBalanceFloor', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'configureRuntimeRoute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'runtimeListener', type: 'address' },
      { name: 'runtimeSignalEmitter', type: 'address' },
      { name: 'runtimeSourceChainId', type: 'uint256' },
      { name: 'runtimeDestinationChainId', type: 'uint256' },
      { name: 'runtimeStrategySignalTopic0', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'getRuntimeBinding',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'runtimeListener', type: 'address' },
      { name: 'runtimeSignalEmitter', type: 'address' },
      { name: 'runtimeSourceChainId', type: 'uint256' },
      { name: 'runtimeDestinationChainId', type: 'uint256' },
      { name: 'runtimeStrategySignalTopic0', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'getSwapIntentSummary',
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
    name: 'configureSwapIntent',
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
    name: 'configureSwapRuntimeRoute',
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
    name: 'getSwapRuntimeBinding',
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
  },
  {
    type: 'function',
    name: 'pauseSwapIntent',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'resumeSwapIntent',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'lastExecutionNonce',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
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
    name: 'lastSignalHash',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'lastSwapExecutedAt',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'lastSwapOriginTxHash',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    anonymous: false,
    type: 'event',
    name: 'IntentExecuted',
    inputs: [
      { indexed: true, name: 'wallet', type: 'address' },
      { indexed: true, name: 'token', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'executionNonce', type: 'uint256' },
      { indexed: false, name: 'signalHash', type: 'bytes32' },
      { indexed: false, name: 'originTxHash', type: 'uint256' }
    ]
  },
  {
    anonymous: false,
    type: 'event',
    name: 'FaucetRequestExecuted',
    inputs: [
      { indexed: true, name: 'wallet', type: 'address' },
      { indexed: true, name: 'poolId', type: 'bytes32' },
      { indexed: true, name: 'swapSender', type: 'address' },
      { indexed: false, name: 'faucet', type: 'address' },
      { indexed: false, name: 'lreactRecipient', type: 'address' },
      { indexed: false, name: 'requestValue', type: 'uint256' },
      { indexed: false, name: 'executionCount', type: 'uint256' },
      { indexed: false, name: 'originTxHash', type: 'uint256' }
    ]
  }
] as const
