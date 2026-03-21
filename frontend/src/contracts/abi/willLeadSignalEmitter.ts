export const willLeadSignalEmitterAbi = [
  {
    type: 'function',
    name: 'emitSignal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'executionNonce', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'syncIntent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'active', type: 'bool' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'poke',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'executionNonce', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'mirroredIntentOf',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' }
    ]
  }
] as const
