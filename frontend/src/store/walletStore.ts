import { create } from 'zustand'

import {
  addWatchedToken,
  configureIntent,
  connectOwnerWallet,
  createOwnerWebWallet,
  disconnectOwnerWallet,
  ensureReactiveListenerArmed,
  emitSignal,
  fundAutonomousWallet,
  initializeAutonomousWallet,
  importOwnerWebWallet,
  pauseIntent,
  pauseReactiveListener,
  readControllerAssetViewNetwork,
  readWalletState,
  restoreOwnerWallet,
  resumeIntent,
  resumeReactiveListener,
  topUpAutomationCredit,
  writeControllerAssetViewNetwork
} from '../lib/willlead'
import { txExplorerLink } from '../lib/explorers'
import { getMessages, useLanguageStore } from '../lib/i18n'
import type {
  ActionResult,
  AutomationCreditState,
  AutomationFundingValues,
  ControllerAssetViewNetwork,
  ExecutionProof,
  IntentFormValues,
  IntentState,
  WalletFundingValues,
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
  createAutonomousWallet: () => Promise<void>
  refreshChainState: () => Promise<void>
  backgroundRefreshChainState: () => Promise<void>
  submitIntent: (values: IntentFormValues) => Promise<void>
  fundAutomation: (values: AutomationFundingValues) => Promise<void>
  fundWallet: (values: WalletFundingValues) => Promise<void>
  pauseWalletIntent: () => Promise<void>
  resumeWalletIntent: () => Promise<void>
  pauseListener: () => Promise<void>
  resumeListener: () => Promise<void>
  triggerSignal: () => Promise<void>
  watchAssetToken: (tokenAddress: string) => Promise<void>
  setControllerAssetViewNetwork: (viewNetwork: ControllerAssetViewNetwork) => Promise<void>
  syncIdleCopy: () => void
}

const initialWalletState: WalletState = {
  contractAddress: 'Unavailable',
  ownerAddress: null,
  connectionSource: 'disconnected',
  connectionLabel: 'Not connected',
  controllerAssetViewNetwork: readControllerAssetViewNetwork(),
  controllerAssetViewLabel: 'Execution Chain View',
  balanceContextLabel: 'Controller wallet balance',
  balanceLabel: 'Unavailable',
  assetBalances: [],
  connectedBalanceLabel: 'Unavailable',
  connectedAssetBalances: [],
  walletAccessState: 'needs_connection',
  runtimeStatus: 'inactive',
  isConnected: false,
  lastSyncedAt: 'Unavailable',
  lastExecutionNonce: 0,
  lastExecutedAt: 'Never',
  lastSignalHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  destinationBalanceDelta: '0 ETH',
  runtimeRoute: {
    listenerAddress: 'Unavailable',
    signalEmitterAddress: 'Unavailable',
    sourceChainId: 'Unavailable',
    destinationChainId: 'Unavailable',
    signalTopic0: 'Unavailable',
    listenerPaused: null,
    callbackGasLimit: 'Unavailable',
    subscriptionStatus: 'unavailable',
    canManageListener: false
  },
  operatorServiceStatus: 'unknown',
  operatorLastHeartbeat: 'Never',
  operatorListenerBalance: 'Unavailable',
  operatorListenerDebt: 'Unavailable',
  operatorLastFundingResult: 'Unknown',
  automationReadiness: 'unavailable',
  singleSignatureReadiness: 'unavailable'
}

const initialIntentState: IntentState = {
  token: 'native',
  recipient: 'Not configured',
  amountPerExecution: '0',
  maxExecutions: 0,
  executedCount: 0,
  minAutomationBalance: '0',
  enabled: false
}

const initialAutomationState: AutomationCreditState = {
  creditLabel: 'Unavailable',
  availableBalance: 'Unavailable',
  minRequiredBalance: 'Unavailable'
}

const initialProofs: ExecutionProof[] = []
const signalOutcomePollIntervalMs = 3000
const signalOutcomeMaxAttempts = 20
let detailedSnapshotInFlightKey: string | null = null

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function hasDestinationOutcome(proofs: ExecutionProof[], expectedNonce: number) {
  return proofs.some((proof) => {
    if (!proof.nonceLabel || Number(proof.nonceLabel) !== expectedNonce) return false
    return proof.label === 'Destination Execution' || proof.label === 'Destination Skipped'
  })
}

function statusMessageForSnapshot(snapshot: {
  wallet: WalletState
}, connectedMessage: string) {
  if (snapshot.wallet.walletAccessState === 'mismatch') {
    return copy().connectedWalletMismatch
  }

  if (snapshot.wallet.walletAccessState === 'needs_wallet') {
    return copy().initializeWalletToContinue
  }

  if (snapshot.wallet.walletAccessState === 'unavailable') {
    return copy().walletAccessUnavailable
  }

  return connectedMessage
}

function mergeCoreSnapshotIntoState(
  state: WillLeadStore,
  snapshot: {
    wallet: WalletState
    intent: IntentState
    automation: AutomationCreditState
    executionProofs: ExecutionProof[]
  }
) {
  return {
    ...snapshot,
    wallet: {
      ...snapshot.wallet,
      runtimeRoute: {
        ...snapshot.wallet.runtimeRoute,
        signalEmitterAddress:
          snapshot.wallet.runtimeRoute.signalEmitterAddress ===
          '0x0000000000000000000000000000000000000000'
            ? state.wallet.runtimeRoute.signalEmitterAddress
            : snapshot.wallet.runtimeRoute.signalEmitterAddress,
        canManageListener:
          snapshot.wallet.runtimeRoute.canManageListener || state.wallet.runtimeRoute.canManageListener,
        listenerPaused:
          snapshot.wallet.runtimeRoute.listenerPaused === null
            ? state.wallet.runtimeRoute.listenerPaused
            : snapshot.wallet.runtimeRoute.listenerPaused,
        callbackGasLimit:
          snapshot.wallet.runtimeRoute.callbackGasLimit === 'Unavailable'
            ? state.wallet.runtimeRoute.callbackGasLimit
            : snapshot.wallet.runtimeRoute.callbackGasLimit,
        subscriptionStatus:
          snapshot.wallet.runtimeRoute.subscriptionStatus === 'unavailable'
            ? state.wallet.runtimeRoute.subscriptionStatus
            : snapshot.wallet.runtimeRoute.subscriptionStatus,
        sourceChainId:
          snapshot.wallet.runtimeRoute.sourceChainId === 'Unavailable'
            ? state.wallet.runtimeRoute.sourceChainId
            : snapshot.wallet.runtimeRoute.sourceChainId,
        destinationChainId:
          snapshot.wallet.runtimeRoute.destinationChainId === 'Unavailable'
            ? state.wallet.runtimeRoute.destinationChainId
            : snapshot.wallet.runtimeRoute.destinationChainId,
        signalTopic0:
          snapshot.wallet.runtimeRoute.signalTopic0 === 'Unavailable'
            ? state.wallet.runtimeRoute.signalTopic0
            : snapshot.wallet.runtimeRoute.signalTopic0
      },
      operatorServiceStatus:
        snapshot.wallet.operatorServiceStatus === 'unknown'
          ? state.wallet.operatorServiceStatus
          : snapshot.wallet.operatorServiceStatus,
      operatorLastHeartbeat:
        snapshot.wallet.operatorLastHeartbeat === 'Never'
          ? state.wallet.operatorLastHeartbeat
          : snapshot.wallet.operatorLastHeartbeat,
      operatorListenerBalance:
        snapshot.wallet.operatorListenerBalance === 'Unavailable'
          ? state.wallet.operatorListenerBalance
          : snapshot.wallet.operatorListenerBalance,
      operatorListenerDebt:
        snapshot.wallet.operatorListenerDebt === 'Unavailable'
          ? state.wallet.operatorListenerDebt
          : snapshot.wallet.operatorListenerDebt,
      operatorLastFundingResult:
        snapshot.wallet.operatorLastFundingResult === 'Unknown'
          ? state.wallet.operatorLastFundingResult
          : snapshot.wallet.operatorLastFundingResult,
      automationReadiness:
        snapshot.wallet.automationReadiness === 'unavailable'
          ? state.wallet.automationReadiness
          : snapshot.wallet.automationReadiness,
      singleSignatureReadiness:
        snapshot.wallet.singleSignatureReadiness === 'unavailable'
          ? state.wallet.singleSignatureReadiness
          : snapshot.wallet.singleSignatureReadiness
    },
    automation:
      snapshot.automation.creditLabel === 'Unknown' ? state.automation : snapshot.automation,
    executionProofs:
      snapshot.executionProofs.length > 0 ? snapshot.executionProofs : state.executionProofs
  }
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
      const controllerAssetViewNetwork = readControllerAssetViewNetwork()
      const snapshot = await readWalletState(
        restored?.address ?? null,
        restored?.source ?? 'disconnected',
        restored ? 'core' : 'full',
        controllerAssetViewNetwork
      )

      set({
        ...snapshot,
        isPending: false,
        statusMessage: restored
          ? statusMessageForSnapshot(snapshot, `${copy().restoredWebWallet} ${restored.address}`)
          : copy().readyToConnectWallet,
        errorMessage: null
      })

      if (restored?.address) {
        void hydrateDetailedSnapshot(set, restored.address, restored.source, controllerAssetViewNetwork)
      }
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
      const controllerAssetViewNetwork = readControllerAssetViewNetwork()
      const snapshot = await readWalletState(result.address, result.source, 'core', controllerAssetViewNetwork)

      set({
        ...snapshot,
        wallet: {
          ...snapshot.wallet,
          connectionLabel: result.providerLabel ?? snapshot.wallet.connectionLabel
        },
        isPending: false,
        statusMessage: statusMessageForSnapshot(
          snapshot,
          `${copy().connectedWalletPrefix} ${result.providerLabel ?? copy().browserWalletLower} ${result.address}`
        ),
        errorMessage: null
      })

      void hydrateDetailedSnapshot(set, result.address, result.source, controllerAssetViewNetwork)
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
      const controllerAssetViewNetwork = readControllerAssetViewNetwork()
      const snapshot = await readWalletState(result.address, result.source, 'core', controllerAssetViewNetwork)

      set({
        ...snapshot,
        isPending: false,
        statusMessage: statusMessageForSnapshot(snapshot, `${copy().createdWebWallet} ${result.address}`),
        errorMessage: null
      })

      void hydrateDetailedSnapshot(set, result.address, result.source, controllerAssetViewNetwork)

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
      const controllerAssetViewNetwork = readControllerAssetViewNetwork()
      const snapshot = await readWalletState(result.address, result.source, 'core', controllerAssetViewNetwork)

      set({
        ...snapshot,
        isPending: false,
        statusMessage: statusMessageForSnapshot(snapshot, `${copy().importedWebWallet} ${result.address}`),
        errorMessage: null
      })

      void hydrateDetailedSnapshot(set, result.address, result.source, controllerAssetViewNetwork)
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
  createAutonomousWallet: async () => {
    set({
      isPending: true,
      errorMessage: null,
      statusMessage: copy().initializingAutonomousWallet
    })

    try {
      const action = await initializeAutonomousWallet()
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().walletNotInitialized,
        statusMessage: copy().initializeAutonomousWallet
      })
    }
  },
  refreshChainState: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().refreshingWalletState })

    try {
      const ownerAddress = get().wallet.ownerAddress
      const connectionSource = get().wallet.connectionSource
      const snapshot = await readWalletState(
        ownerAddress,
        connectionSource,
        'core',
        get().wallet.controllerAssetViewNetwork
      )
      set({
        ...snapshot,
        isPending: false,
        statusMessage: copy().walletStateRefreshed,
        errorMessage: null
      })

      if (ownerAddress) {
        void hydrateDetailedSnapshot(set, ownerAddress, connectionSource, get().wallet.controllerAssetViewNetwork)
      }
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedRefreshChainState,
        statusMessage: copy().refreshFailed
      })
    }
  },
  backgroundRefreshChainState: async () => {
    const initialState = get()
    if (initialState.isPending || !initialState.wallet.ownerAddress) return

    try {
      const snapshot = await readWalletState(
        initialState.wallet.ownerAddress,
        initialState.wallet.connectionSource,
        'core',
        initialState.wallet.controllerAssetViewNetwork
      )

      set((state) => {
        if (state.isPending || state.wallet.ownerAddress !== initialState.wallet.ownerAddress) {
          return {}
        }

        const settled =
          snapshot.wallet.lastExecutionNonce > state.wallet.lastExecutionNonce ||
          snapshot.intent.executedCount > state.intent.executedCount ||
          snapshot.wallet.balanceLabel !== state.wallet.balanceLabel

        return {
          ...mergeCoreSnapshotIntoState(state, snapshot),
          isPending: false,
          errorMessage: null,
          statusMessage: settled ? copy().automationResultDetected : state.statusMessage
        }
      })

      void hydrateDetailedSnapshot(
        set,
        initialState.wallet.ownerAddress,
        initialState.wallet.connectionSource,
        initialState.wallet.controllerAssetViewNetwork
      )
    } catch {}
  },
  submitIntent: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().submittingIntentTransaction })

    try {
      const action = await configureIntent(values)
      await applyPostAction(set, get, action)
      if (get().wallet.operatorServiceStatus !== 'online') {
        try {
          const listenerAction = await ensureReactiveListenerArmed()
          if (listenerAction) {
            await applyPostAction(set, get, listenerAction)
          }
        } catch {}
      }
      void pollForListenerActivation(set, get)
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
  fundWallet: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().fundingAutonomousWallet })

    try {
      const action = await fundAutonomousWallet(values)
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage:
          error instanceof Error ? error.message : copy().failedFundAutonomousWallet,
        statusMessage: copy().autonomousWalletFundingFailed
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
      const expectedNonce = state.wallet.lastExecutionNonce + 1
      const action = await emitSignal({
        token: state.intent.token,
        recipient: state.intent.recipient,
        amountPerExecution: state.intent.amountPerExecution,
        nextNonce: expectedNonce
      })
      await applyPostAction(set, get, action)
      set({ statusMessage: copy().awaitingAutomationResult })
      void pollForSignalOutcome(set, get, expectedNonce)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedEmitSourceSignal,
        statusMessage: copy().signalEmissionFailed
      })
    }
  },
  watchAssetToken: async (tokenAddress) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().addingWatchedToken })

    try {
      const action = addWatchedToken(tokenAddress, get().wallet.controllerAssetViewNetwork)
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedAddWatchedToken,
        statusMessage: copy().addWatchedTokenFailed
      })
    }
  },
  setControllerAssetViewNetwork: async (viewNetwork) => {
    writeControllerAssetViewNetwork(viewNetwork)
    set({ isPending: true, errorMessage: null, statusMessage: copy().switchingAssetView })

    try {
      const ownerAddress = get().wallet.ownerAddress
      const connectionSource = get().wallet.connectionSource
      const snapshot = await readWalletState(ownerAddress, connectionSource, 'core', viewNetwork)
      set({
        ...snapshot,
        isPending: false,
        statusMessage: copy().assetViewSwitched,
        errorMessage: null
      })

      if (ownerAddress) {
        void hydrateDetailedSnapshot(set, ownerAddress, connectionSource, viewNetwork)
      }
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().assetViewSwitchFailed,
        statusMessage: copy().assetViewSwitchFailed
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
  const ownerAddress = get().wallet.ownerAddress
  const connectionSource = get().wallet.connectionSource
  const controllerAssetViewNetwork = get().wallet.controllerAssetViewNetwork
  const snapshot = await readWalletState(
    ownerAddress,
    connectionSource,
    'core',
    controllerAssetViewNetwork
  )

  set((state) => ({
    ...mergeCoreSnapshotIntoState(state, snapshot),
    isPending: false,
    statusMessage: `${action.label}: ${action.hash}`,
    errorMessage: null,
    executionProofs: [
      {
        id: action.hash,
        label: action.label,
        description: action.description,
        status: inferProofStatus(action.label),
        reference: action.hash,
        chain: inferProofChain(action.label),
        timestampLabel: new Intl.DateTimeFormat('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }).format(new Date()),
        nonceLabel: null,
        detailLabel: null,
        href: txExplorerLink(inferProofChain(action.label), action.hash)
      },
      ...state.executionProofs.filter((proof) => proof.reference !== action.hash)
    ]
  }))

  if (ownerAddress) {
    void hydrateDetailedSnapshot(set, ownerAddress, connectionSource, controllerAssetViewNetwork)
  }
}

async function hydrateDetailedSnapshot(
  set: (partial:
    | Partial<WillLeadStore>
    | ((state: WillLeadStore) => Partial<WillLeadStore>)
  ) => void,
  ownerAddress: string,
  connectionSource: WalletState['connectionSource'],
  controllerAssetViewNetwork: WalletState['controllerAssetViewNetwork']
) {
  const requestKey = `${ownerAddress}:${connectionSource}:${controllerAssetViewNetwork}`
  if (detailedSnapshotInFlightKey === requestKey) {
    return
  }

  detailedSnapshotInFlightKey = requestKey

  try {
    const snapshot = await readWalletState(
      ownerAddress,
      connectionSource,
      'full',
      controllerAssetViewNetwork
    )

    set((state) => {
      if (
        state.isPending ||
        state.wallet.ownerAddress !== ownerAddress ||
        state.wallet.connectionSource !== connectionSource ||
        state.wallet.controllerAssetViewNetwork !== controllerAssetViewNetwork
      ) {
        return {}
      }

      return {
        ...snapshot,
        isPending: false,
        errorMessage: null,
        statusMessage: state.statusMessage
      }
    })
  } catch {}
  finally {
    if (detailedSnapshotInFlightKey === requestKey) {
      detailedSnapshotInFlightKey = null
    }
  }
}

async function pollForSignalOutcome(
  set: (partial:
    | Partial<WillLeadStore>
    | ((state: WillLeadStore) => Partial<WillLeadStore>)
  ) => void,
  get: () => WillLeadStore,
  expectedNonce: number
) {
  const initialOwnerAddress = get().wallet.ownerAddress
  const initialConnectionSource = get().wallet.connectionSource
  const initialControllerAssetViewNetwork = get().wallet.controllerAssetViewNetwork

  if (!initialOwnerAddress) return

  for (let attempt = 0; attempt < signalOutcomeMaxAttempts; attempt += 1) {
    if (attempt > 0) {
      await sleep(signalOutcomePollIntervalMs)
    }

    const state = get()
    if (
      state.wallet.ownerAddress !== initialOwnerAddress ||
      state.wallet.connectionSource !== initialConnectionSource ||
      state.wallet.controllerAssetViewNetwork !== initialControllerAssetViewNetwork ||
      state.isPending
    ) {
      return
    }

    try {
      const snapshot = await readWalletState(
        initialOwnerAddress,
        initialConnectionSource,
        'full',
        initialControllerAssetViewNetwork
      )
      const settled =
        snapshot.wallet.lastExecutionNonce >= expectedNonce ||
        hasDestinationOutcome(snapshot.executionProofs, expectedNonce)

      set({
        ...snapshot,
        isPending: false,
        statusMessage: settled ? copy().automationResultDetected : copy().awaitingAutomationResult,
        errorMessage: null
      })

      if (settled) {
        return
      }
    } catch {}
  }

  set({
    isPending: false,
    statusMessage: copy().automationStillPending
  })
}

async function pollForListenerActivation(
  set: (partial:
    | Partial<WillLeadStore>
    | ((state: WillLeadStore) => Partial<WillLeadStore>)
  ) => void,
  get: () => WillLeadStore
) {
  const initialOwnerAddress = get().wallet.ownerAddress
  const initialConnectionSource = get().wallet.connectionSource
  const initialControllerAssetViewNetwork = get().wallet.controllerAssetViewNetwork

  if (!initialOwnerAddress) return

  set({
    statusMessage: copy().awaitingListenerArming,
    errorMessage: null
  })

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (attempt > 0) {
      await sleep(signalOutcomePollIntervalMs)
    }

    const state = get()
    if (
      state.wallet.ownerAddress !== initialOwnerAddress ||
      state.wallet.connectionSource !== initialConnectionSource ||
      state.wallet.controllerAssetViewNetwork !== initialControllerAssetViewNetwork ||
      state.isPending
    ) {
      return
    }

    try {
      const snapshot = await readWalletState(
        initialOwnerAddress,
        initialConnectionSource,
        'full',
        initialControllerAssetViewNetwork
      )
      const listenerArmed =
        snapshot.wallet.runtimeStatus === 'active' &&
        snapshot.wallet.runtimeRoute.listenerPaused === false &&
        snapshot.wallet.runtimeRoute.subscriptionStatus === 'armed'

      set({
        ...snapshot,
        isPending: false,
        statusMessage: listenerArmed ? copy().listenerArmedForIntent : copy().awaitingListenerArming,
        errorMessage: null
      })

      if (listenerArmed) {
        return
      }
    } catch {}
  }
}

function inferProofChain(label: string): 'origin' | 'destination' | 'reactive' {
  if (label.includes('Signal')) return 'origin'
  if (label.includes('Listener')) return 'reactive'
  return 'destination'
}

function inferProofStatus(label: string): 'observed' | 'success' | 'skipped' {
  if (label.includes('Signal') || label.includes('Listener')) return 'observed'
  if (label.includes('Skipped')) return 'skipped'
  return 'success'
}
