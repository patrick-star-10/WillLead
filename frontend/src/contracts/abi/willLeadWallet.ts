export const willLeadWalletAbi = [
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
  }
] as const
