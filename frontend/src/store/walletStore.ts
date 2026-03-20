import { create } from 'zustand'

import {
  configureIntent,
  connectOwnerWallet,
  createOwnerWebWallet,
  disconnectOwnerWallet,
  emitSignal,
  importOwnerWebWallet,
  pauseIntent,
  pauseReactiveListener,
  readWalletState,
  restoreOwnerWallet,
  resumeIntent,
  resumeReactiveListener,
  topUpAutomationCredit
} from '../lib/willlead'
import { txExplorerLink } from '../lib/explorers'
import { getMessages, useLanguageStore } from '../lib/i18n'
import type {
  ActionResult,
  AutomationFundingValues,
  AutomationCreditState,
  ExecutionProof,
  IntentFormValues,
  IntentState,
  WalletState
} from '../types/willlead'

type WillLeadStore = {
  wallet: WalletState
  intent: IntentState
  automation: AutomationCreditState
  executionProofs: ExecutionProof[]
  isPending: boolean
  statusMessage: string
  errorMessage: string | null
  initializeWallet: () => Promise<void>
  connectBrowserWallet: (providerId: string) => Promise<void>
  createWebWallet: () => Promise<string>
  importWebWallet: (mnemonic: string) => Promise<void>
  disconnectWallet: () => Promise<void>
  refreshChainState: () => Promise<void>
  submitIntent: (values: IntentFormValues) => Promise<void>
  fundAutomation: (values: AutomationFundingValues) => Promise<void>
  pauseWalletIntent: () => Promise<void>
  resumeWalletIntent: () => Promise<void>
  pauseListener: () => Promise<void>
  resumeListener: () => Promise<void>
  triggerSignal: () => Promise<void>
  syncIdleCopy: () => void
}

const initialWalletState: WalletState = {
  contractAddress: '0xA11CE0000000000000000000000000000000BEEF',
  listenerAddress: '0xBEEF00000000000000000000000000000000A11C',
  signalEmitterAddress: '0xF00D00000000000000000000000000000000CAFE',
  ownerAddress: null,
  connectionSource: 'disconnected',
  connectionLabel: 'Not connected',
  balanceContextLabel: 'Controller wallet balance',
  balanceLabel: 'Unavailable',
  assetBalances: [],
  connectedBalanceLabel: 'Unavailable',
  connectedAssetBalances: [],
  runtimeStatus: 'active',
  isConnected: false,
  lastSyncedAt: '2026-03-18 06:10 PST',
  lastExecutionNonce: 3,
  lastExecutedAt: '2026-03-18 05:58 PST',
  lastSignalHash: '0x4d6f636b5369676e616c48617368000000000000000000000000000000000000',
  destinationBalanceDelta: '-0.01 ETH',
  listenerPaused: null,
  callbackGasLimit: '1000000',
  subscriptionStatus: 'unavailable',
  subscriptionOriginChainId: '11155111',
  subscriptionDestinationChainId: '11155111',
  subscriptionTopic0: '0xe45289780e7528d2841b99cd319e5c8b096bbcabe47294706cae408a97267f92'
}

const initialIntentState: IntentState = {
  token: 'native',
  recipient: '0xF00D00000000000000000000000000000000CAFE',
  amountPerExecution: '0.01',
  maxExecutions: 5,
  executedCount: 3,
  minAutomationBalance: '0.005',
  enabled: true
}

const initialAutomationState: AutomationCreditState = {
  creditLabel: 'Unavailable',
  availableBalance: 'Unavailable',
  minRequiredBalance: 'Unavailable'
}

const initialProofs: ExecutionProof[] = [
  {
    id: 'origin-log',
    label: 'Origin Signal',
    description: 'StrategySignal emitted on Base Sepolia.',
    reference: '0xorigin...1234',
    chain: 'origin',
    href: null
  },
  {
    id: 'reactive-callback',
    label: 'Reactive Callback',
    description: 'Reactive listener requested a destination callback.',
    reference: '0xreactive...4567',
    chain: 'reactive',
    href: null
  },
  {
    id: 'destination-exec',
    label: 'Destination Execution',
    description: 'WillLeadWallet executed the fixed transfer intent.',
    reference: '0xdestination...89ab',
    chain: 'destination',
    href: null
  }
]

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export const useWalletStore = create<WillLeadStore>((set, get) => ({
  wallet: initialWalletState,
  intent: initialIntentState,
  automation: initialAutomationState,
  executionProofs: initialProofs,
  isPending: false,
  statusMessage: copy().readyBindWallet,
  errorMessage: null,
  initializeWallet: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().preparingWalletSession })

    try {
      const restored = await restoreOwnerWallet()
      const snapshot = await readWalletState(
        restored?.address ?? null,
        restored?.source ?? 'disconnected'
      )

      set({
        ...snapshot,
        isPending: false,
        statusMessage: restored
          ? `${copy().restoredWebWallet} ${restored.address}`
          : copy().readyToConnectWallet,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedInitializeWallet,
        statusMessage: copy().initializeWalletFailed
      })
    }
  },
  connectBrowserWallet: async (providerId) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().connectingBrowserWallet })

    try {
      const result = await connectOwnerWallet(providerId)
      const snapshot = await readWalletState(result.address, result.source)

      set({
        ...snapshot,
        wallet: {
          ...snapshot.wallet,
          connectionLabel: result.providerLabel ?? snapshot.wallet.connectionLabel
        },
        isPending: false,
        statusMessage: `${copy().connectedWalletPrefix} ${result.providerLabel ?? copy().browserWalletLower} ${result.address}`,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedConnectBrowserWallet,
        statusMessage: copy().browserWalletConnectionFailed
      })
      throw error
    }
  },
  createWebWallet: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().creatingWebWallet })

    try {
      const result = await createOwnerWebWallet()
      const snapshot = await readWalletState(result.address, result.source)

      set({
        ...snapshot,
        isPending: false,
        statusMessage: `${copy().createdWebWallet} ${result.address}`,
        errorMessage: null
      })

      return result.mnemonic ?? ''
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedCreateWebWallet,
        statusMessage: copy().webWalletCreationFailed
      })
      throw error
    }
  },
  importWebWallet: async (mnemonic) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().importingWebWalletStatus })

    try {
      const result = await importOwnerWebWallet(mnemonic)
      const snapshot = await readWalletState(result.address, result.source)

      set({
        ...snapshot,
        isPending: false,
        statusMessage: `${copy().importedWebWallet} ${result.address}`,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedImportWebWallet,
        statusMessage: copy().webWalletImportFailed
      })
      throw error
    }
  },
  disconnectWallet: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().disconnectingWalletSession })

    try {
      await disconnectOwnerWallet()
      const snapshot = await readWalletState(null, 'disconnected')

      set({
        ...snapshot,
        isPending: false,
        statusMessage: copy().walletDisconnected,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedDisconnectWallet,
        statusMessage: copy().walletDisconnectFailed
      })
      throw error
    }
  },
  refreshChainState: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().refreshingWalletState })

    try {
      const snapshot = await readWalletState(
        get().wallet.ownerAddress,
        get().wallet.connectionSource
      )
      set({
        ...snapshot,
        isPending: false,
        statusMessage: copy().walletStateRefreshed,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedRefreshChainState,
        statusMessage: copy().refreshFailed
      })
    }
  },
  submitIntent: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().submittingIntentTransaction })

    try {
      const action = await configureIntent(values)
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedConfigureIntent,
        statusMessage: copy().intentConfigurationFailed
      })
    }
  },
  fundAutomation: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().fundingAutomationCredit })

    try {
      const action = await topUpAutomationCredit(values)
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedFundAutomation,
        statusMessage: copy().automationFundingFailed
      })
    }
  },
  pauseWalletIntent: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().pausingIntent })

    try {
      const action = await pauseIntent()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedPauseIntent,
        statusMessage: copy().pauseFailed
      })
    }
  },
  resumeWalletIntent: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().resumingIntent })

    try {
      const action = await resumeIntent()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedResumeIntent,
        statusMessage: copy().resumeFailed
      })
    }
  },
  pauseListener: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().pausingReactiveListener })

    try {
      const action = await pauseReactiveListener()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedPauseReactiveListener,
        statusMessage: copy().reactiveListenerPauseFailed
      })
    }
  },
  resumeListener: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().resumingReactiveListener })

    try {
      const action = await resumeReactiveListener()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage:
          error instanceof Error ? error.message : copy().failedResumeReactiveListener,
        statusMessage: copy().reactiveListenerResumeFailed
      })
    }
  },
  triggerSignal: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().emittingSourceSignal })

    try {
      const state = get()
      const action = await emitSignal({
        token: state.intent.token,
        recipient: state.intent.recipient,
        amountPerExecution: state.intent.amountPerExecution,
        nextNonce: state.wallet.lastExecutionNonce + 1
      })
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedEmitSourceSignal,
        statusMessage: copy().signalEmissionFailed
      })
    }
  },
  syncIdleCopy: () => {
    set((state) => {
      if (state.isPending) return {}
      if (state.errorMessage) return {}

      const nextStatus = state.wallet.isConnected
        ? state.statusMessage
        : copy().readyToConnectWallet

      if (nextStatus === state.statusMessage) return {}

      return {
        statusMessage: nextStatus
      }
    })
  }
}))

async function applyPostAction(
  set: (partial:
    | Partial<WillLeadStore>
    | ((state: WillLeadStore) => Partial<WillLeadStore>)
  ) => void,
  get: () => WillLeadStore,
  action: ActionResult
) {
  const snapshot = await readWalletState(get().wallet.ownerAddress, get().wallet.connectionSource)

  set((state) => ({
    ...snapshot,
    isPending: false,
    statusMessage: `${action.label}: ${action.hash}`,
    errorMessage: null,
    executionProofs: [
      {
        id: action.hash,
        label: action.label,
        description: action.description,
        reference: action.hash,
        chain: inferProofChain(action.label),
        href: txExplorerLink(inferProofChain(action.label), action.hash)
      },
      ...state.executionProofs.filter((proof) => proof.reference !== action.hash)
    ]
  }))
}

function inferProofChain(label: string): 'origin' | 'destination' | 'reactive' {
  if (label.includes('Signal')) return 'origin'
  if (label.includes('Listener')) return 'reactive'
  return 'destination'
}
