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
  }
] as const

