export type WalletConnectionSource = 'browser' | 'web' | 'disconnected'

export type WalletState = {
  contractAddress: string
  ownerAddress: string | null
  connectionSource: WalletConnectionSource
  connectionLabel: string
  balanceLabel: string
  runtimeStatus: string
  isConnected: boolean
  lastSyncedAt: string
  lastExecutionNonce: number
  lastExecutedAt: string
  lastSignalHash: string
  destinationBalanceDelta: string
  listenerPaused: boolean
  callbackGasLimit: string
}

export type IntentState = {
  token: string
  recipient: string
  amountPerExecution: string
  maxExecutions: number
  executedCount: number
  minAutomationBalance: string
  enabled: boolean
}

export type AutomationCreditState = {
  creditLabel: string
  availableBalance: string
  minRequiredBalance: string
}

export type ExecutionProof = {
  id: string
  label: string
  description: string
  reference: string
  chain: 'origin' | 'destination' | 'reactive'
  href: string | null
}

export type IntentFormValues = {
  token: string
  recipient: string
  amountPerExecution: string
  maxExecutions: number
  minAutomationBalance: string
}

export type ActionResult = {
  hash: string
  label: string
  description: string
}

export type AutomationFundingValues = {
  amount: string
}

export type WalletConnectResult = {
  address: string
  source: Exclude<WalletConnectionSource, 'disconnected'>
  mnemonic?: string
  providerId?: string
  providerLabel?: string
}

export type InjectedWalletOption = {
  id: string
  label: string
}
