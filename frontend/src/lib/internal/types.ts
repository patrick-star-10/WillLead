import type { Address } from 'viem'
import type { ExecutionEnvironment, ListenerSubscriptionStatus } from '../../types/willlead'

export type WalletSnapshot = {
  wallet: import('../../types/willlead').WalletState
  intent: import('../../types/willlead').IntentState
  automation: import('../../types/willlead').AutomationCreditState
  executionProofs: import('../../types/willlead').ExecutionProof[]
  historyWarning: string | null
  historyDiagnostics: string | null
}

export type WalletBindingContext = {
  walletAddress: Address | null
  listenerAddress: Address | null
  signalEmitterAddress: Address | null
  sourceChainId: string | null
  destinationChainId: string | null
  strategySignalTopic0: string | null
  source: 'factory' | 'legacy' | 'none'
}

export type BoundWalletBindingContext = Omit<WalletBindingContext, 'walletAddress'> & {
  walletAddress: Address
}

export type WalletRuntimeBinding = {
  listener: Address
  signalEmitter: Address
  sourceChainId: string
  destinationChainId: string
  strategySignalTopic0: string
}

export type RuntimeRouteInput = {
  listener: Address
  signalEmitter: Address
  sourceChainId: bigint
  destinationChainId: bigint
  strategySignalTopic0: bigint
}

export type OperatorRuntime = {
  serviceStatus: import('../../types/willlead').OperatorServiceStatus
  lastHeartbeat: string
  listenerBalance: string
  listenerDebt: string
  lastFundingResult: string
  mirroredIntentActive: boolean | null
  apiUrl: string | null
  walletAddress: Address | null
}

export type ListenerRuntime = {
  listenerPaused: boolean | null
  callbackGasLimit: string
  signalEmitter: Address
  ownerAddress: Address
  originChainId: string
  destinationChainId: string
  strategySignalTopic0: string
  subscriptionStatus: ListenerSubscriptionStatus
  canManageListener: (ownerAddress: string | null) => boolean
}

export type AutomationReadinessParams = {
  runtimeStatus: import('../../types/willlead').WalletState['runtimeStatus']
  listenerPaused: boolean | null
  subscriptionStatus: ListenerSubscriptionStatus
}

export type SingleSignatureReadinessParams = {
  operatorRelayAvailable: boolean
  automationReadiness: import('../../types/willlead').AutomationReadiness
}

export type HistoryItem = import('../../types/willlead').ExecutionProof & {
  observedAt: bigint
  blockNumber: bigint
  logIndex: number
}

export type ReadWalletStateParams = {
  ownerAddress: string | null
  connectionSource: import('../../types/willlead').WalletConnectionSource
  detailLevel: 'core' | 'full'
  executionEnvironment: ExecutionEnvironment
}
