export type WalletConnectionSource = 'browser' | 'web' | 'disconnected'
export type ListenerSubscriptionStatus = 'armed' | 'missing' | 'unavailable'
export type WalletAccessState = 'needs_connection' | 'bound' | 'mismatch' | 'unavailable'

export type WalletState = {
  contractAddress: string
  listenerAddress: string
  signalEmitterAddress: string
  ownerAddress: string | null
  connectionSource: WalletConnectionSource
  connectionLabel: string
  balanceContextLabel: string
  balanceLabel: string
  assetBalances: AssetBalance[]
  connectedBalanceLabel: string
  connectedAssetBalances: AssetBalance[]
  walletAccessState: WalletAccessState
  runtimeStatus: string
  isConnected: boolean
  lastSyncedAt: string
  lastExecutionNonce: number
  lastExecutedAt: string
  lastSignalHash: string
  destinationBalanceDelta: string
  listenerPaused: boolean | null
  callbackGasLimit: string
  subscriptionStatus: ListenerSubscriptionStatus
  subscriptionOriginChainId: string
  subscriptionDestinationChainId: string
  subscriptionTopic0: string
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
  status: 'observed' | 'success' | 'skipped'
  reference: string
  chain: 'origin' | 'destination' | 'reactive'
  timestampLabel: string
  nonceLabel?: string | null
  detailLabel?: string | null
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

export type AssetBalance = {
  symbol: string
  balanceLabel: string
  kind: 'native' | 'erc20'
}
