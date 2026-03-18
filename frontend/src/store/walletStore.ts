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
}

const initialWalletState: WalletState = {
  contractAddress: '0xA11CE0000000000000000000000000000000BEEF',
  ownerAddress: null,
  connectionSource: 'disconnected',
  connectionLabel: 'Not connected',
  balanceContextLabel: 'Connected Sepolia wallet balance',
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
  listenerPaused: false,
  callbackGasLimit: '1000000'
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

export const useWalletStore = create<WillLeadStore>((set, get) => ({
  wallet: initialWalletState,
  intent: initialIntentState,
  automation: initialAutomationState,
  executionProofs: initialProofs,
  isPending: false,
  statusMessage: 'Ready to bind a wallet and configure the first intent.',
  errorMessage: null,
  initializeWallet: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Preparing wallet session...' })

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
          ? `Restored web wallet ${restored.address}`
          : 'Ready to connect a browser wallet or create a web wallet.',
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to initialize wallet',
        statusMessage: 'Wallet session initialization failed.'
      })
    }
  },
  connectBrowserWallet: async (providerId) => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Connecting browser wallet...' })

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
        statusMessage: `Connected ${result.providerLabel ?? 'browser wallet'} ${result.address}`,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to connect browser wallet',
        statusMessage: 'Browser wallet connection failed.'
      })
      throw error
    }
  },
  createWebWallet: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Creating web wallet...' })

    try {
      const result = await createOwnerWebWallet()
      const snapshot = await readWalletState(result.address, result.source)

      set({
        ...snapshot,
        isPending: false,
        statusMessage: `Created web wallet ${result.address}`,
        errorMessage: null
      })

      return result.mnemonic ?? ''
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to create web wallet',
        statusMessage: 'Web wallet creation failed.'
      })
      throw error
    }
  },
  importWebWallet: async (mnemonic) => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Importing web wallet...' })

    try {
      const result = await importOwnerWebWallet(mnemonic)
      const snapshot = await readWalletState(result.address, result.source)

      set({
        ...snapshot,
        isPending: false,
        statusMessage: `Imported web wallet ${result.address}`,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to import web wallet',
        statusMessage: 'Web wallet import failed.'
      })
      throw error
    }
  },
  disconnectWallet: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Disconnecting wallet session...' })

    try {
      await disconnectOwnerWallet()
      const snapshot = await readWalletState(null, 'disconnected')

      set({
        ...snapshot,
        isPending: false,
        statusMessage: 'Wallet disconnected.',
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to disconnect wallet',
        statusMessage: 'Wallet disconnect failed.'
      })
      throw error
    }
  },
  refreshChainState: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Refreshing wallet state...' })

    try {
      const snapshot = await readWalletState(
        get().wallet.ownerAddress,
        get().wallet.connectionSource
      )
      set({
        ...snapshot,
        isPending: false,
        statusMessage: 'Wallet state refreshed.',
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to refresh chain state',
        statusMessage: 'Refresh failed.'
      })
    }
  },
  submitIntent: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Submitting intent transaction...' })

    try {
      const action = await configureIntent(values)
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to configure intent',
        statusMessage: 'Intent configuration failed.'
      })
    }
  },
  fundAutomation: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Funding automation credit...' })

    try {
      const action = await topUpAutomationCredit(values)
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to fund automation credit',
        statusMessage: 'Automation funding failed.'
      })
    }
  },
  pauseWalletIntent: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Pausing intent...' })

    try {
      const action = await pauseIntent()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to pause intent',
        statusMessage: 'Pause failed.'
      })
    }
  },
  resumeWalletIntent: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Resuming intent...' })

    try {
      const action = await resumeIntent()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to resume intent',
        statusMessage: 'Resume failed.'
      })
    }
  },
  pauseListener: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Pausing reactive listener...' })

    try {
      const action = await pauseReactiveListener()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to pause reactive listener',
        statusMessage: 'Reactive listener pause failed.'
      })
    }
  },
  resumeListener: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Resuming reactive listener...' })

    try {
      const action = await resumeReactiveListener()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage:
          error instanceof Error ? error.message : 'Failed to resume reactive listener',
        statusMessage: 'Reactive listener resume failed.'
      })
    }
  },
  triggerSignal: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: 'Emitting source signal...' })

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
        errorMessage: error instanceof Error ? error.message : 'Failed to emit source signal',
        statusMessage: 'Signal emission failed.'
      })
    }
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
