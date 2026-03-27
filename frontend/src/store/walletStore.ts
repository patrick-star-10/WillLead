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
  readExecutionEnvironment,
  readWalletState,
  restoreOwnerWallet,
  resumeIntent,
  resumeReactiveListener,
  topUpAutomationCredit,
  writeExecutionEnvironment
} from '../lib/willlead'
import {
  configureSwapIntent,
  pauseSwapIntent as pauseSwapIntentTx,
  readSwapIntentState,
  resumeSwapIntent as resumeSwapIntentTx,
  topUpSwapIntentAutomationCredit
} from '../lib/swapIntent'
import { txExplorerLink } from '../lib/explorers'
import { getMessages, useLanguageStore } from '../lib/i18n'
import type {
  ActionResult,
  AutomationCreditState,
  AutomationFundingValues,
  ExecutionEnvironment,
  ExecutionProof,
  IntentFormValues,
  IntentState,
  SwapIntentFormValues,
  SwapIntentState,
  WalletFundingValues,
  WalletState
} from '../types/willlead'

type WillLeadStore = {
  wallet: WalletState
  intent: IntentState
  swapIntent: SwapIntentState
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
  refreshSwapIntentState: () => Promise<void>
  submitIntent: (values: IntentFormValues) => Promise<void>
  submitSwapIntent: (values: SwapIntentFormValues) => Promise<void>
  fundAutomation: (values: AutomationFundingValues) => Promise<void>
  fundSwapIntentAutomation: (amount: string) => Promise<void>
  fundWallet: (values: WalletFundingValues) => Promise<void>
  pauseWalletIntent: () => Promise<void>
  resumeWalletIntent: () => Promise<void>
  pauseSwapIntent: () => Promise<void>
  resumeSwapIntent: () => Promise<void>
  pauseListener: () => Promise<void>
  resumeListener: () => Promise<void>
  triggerSignal: () => Promise<void>
  watchAssetToken: (tokenAddress: string) => Promise<void>
  setExecutionEnvironment: (executionEnvironment: ExecutionEnvironment) => Promise<void>
  syncIdleCopy: () => void
}

const initialWalletState: WalletState = {
  contractAddress: 'Unavailable',
  ownerAddress: null,
  connectionSource: 'disconnected',
  connectionLabel: 'Not connected',
  executionEnvironment: readExecutionEnvironment(),
  executionEnvironmentLabel: 'Primary Execution',
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
  operatorRelayAvailable: false,
  operatorLastHeartbeat: 'Never',
  operatorListenerBalance: 'Unavailable',
  operatorListenerDebt: 'Unavailable',
  operatorLastFundingResult: 'Unknown',
  operatorMirroredIntentActive: null,
  automationReadiness: 'unavailable',
  singleSignatureReadiness: 'unavailable',
  historyStatus: 'idle',
  historyDiagnostics: null
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

const initialSwapIntentState: SwapIntentState = {
  supported: true,
  canManage: false,
  runtimeStatus: 'inactive',
  executionContractAddress: 'Unavailable',
  executionContractBalance: 'Unavailable',
  faucetAddress: 'Unavailable',
  recipient: 'Not configured',
  requestValue: '0',
  maxExecutions: 0,
  executedCount: 0,
  callbackReserve: 'Unavailable',
  callbackDebt: 'Unavailable',
  listenerAddress: 'Unavailable',
  poolManagerAddress: 'Unavailable',
  watchedPoolId: 'Unavailable',
  sourceChainId: 'Unavailable',
  destinationChainId: 'Unavailable',
  swapTopic0: 'Unavailable',
  lastExecutedAt: 'Never',
  lastOriginTxHash: 'Unavailable'
}

const initialProofs: ExecutionProof[] = []
const signalOutcomePollIntervalMs = 3000
const signalOutcomeMaxAttempts = 20
let detailedSnapshotInFlightKey: string | null = null
let activeSignalPollId = 0
let activeListenerPollId = 0

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function normalizeRuntimeRouteValue(value: string) {
  return value.trim().toLowerCase()
}

function runtimeRouteMatchesForm(
  walletRoute: WalletState['runtimeRoute'],
  values: IntentFormValues
) {
  return (
    normalizeRuntimeRouteValue(walletRoute.listenerAddress) ===
      normalizeRuntimeRouteValue(values.listenerAddress) &&
    normalizeRuntimeRouteValue(walletRoute.signalEmitterAddress) ===
      normalizeRuntimeRouteValue(values.signalEmitterAddress) &&
    walletRoute.sourceChainId.trim() === values.sourceChainId.trim() &&
    walletRoute.destinationChainId.trim() === values.destinationChainId.trim() &&
    normalizeRuntimeRouteValue(walletRoute.signalTopic0) ===
      normalizeRuntimeRouteValue(values.signalTopic0)
  )
}

function findDestinationOutcome(
  proofs: ExecutionProof[],
  expectedNonce: number,
  existingProofReferences: Set<string>
) {
  return (
    proofs.find((proof) => {
      if (!proof.nonceLabel || Number(proof.nonceLabel) !== expectedNonce) return false
      if (existingProofReferences.has(proof.reference)) return false
      return proof.label === 'Destination Execution' || proof.label === 'Destination Skipped'
    }) ?? null
  )
}

function statusMessageForDestinationOutcome(proof: ExecutionProof | null) {
  if (!proof) {
    return copy().automationResultDetected
  }

  if (proof.label === 'Destination Skipped') {
    return proof.detailLabel
      ? `${copy().destinationSkippedDetected} ${proof.detailLabel}`
      : copy().destinationSkippedDetected
  }

  return copy().destinationExecutionDetected
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
  snapshot: Awaited<ReturnType<typeof readWalletState>>
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
      operatorRelayAvailable:
        snapshot.wallet.operatorRelayAvailable || state.wallet.operatorRelayAvailable,
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
  swapIntent: initialSwapIntentState,
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
        restored?.source ?? 'disconnected',
        restored ? 'core' : 'full',
        readExecutionEnvironment()
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
        set((state) => ({
          wallet: {
            ...state.wallet,
            historyStatus: 'loading',
            historyDiagnostics: null
          }
        }))
        void hydrateDetailedSnapshot(
          set,
          restored.address,
          restored.source,
          readExecutionEnvironment()
        )
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
      const snapshot = await readWalletState(
        result.address,
        result.source,
        'core',
        readExecutionEnvironment()
      )

      set({
        ...snapshot,
        wallet: {
          ...snapshot.wallet,
          connectionLabel: result.providerLabel ?? snapshot.wallet.connectionLabel,
          historyStatus: 'loading',
          historyDiagnostics: null
        },
        isPending: false,
        statusMessage: statusMessageForSnapshot(
          snapshot,
          `${copy().connectedWalletPrefix} ${result.providerLabel ?? copy().browserWalletLower} ${result.address}`
        ),
        errorMessage: null
      })

      void hydrateDetailedSnapshot(
        set,
        result.address,
        result.source,
        readExecutionEnvironment()
      )
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
      const snapshot = await readWalletState(
        result.address,
        result.source,
        'core',
        readExecutionEnvironment()
      )

      set({
        ...snapshot,
        wallet: {
          ...snapshot.wallet,
          historyStatus: 'loading',
          historyDiagnostics: null
        },
        isPending: false,
        statusMessage: statusMessageForSnapshot(snapshot, `${copy().createdWebWallet} ${result.address}`),
        errorMessage: null
      })

      void hydrateDetailedSnapshot(
        set,
        result.address,
        result.source,
        readExecutionEnvironment()
      )

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
      const snapshot = await readWalletState(
        result.address,
        result.source,
        'core',
        readExecutionEnvironment()
      )

      set({
        ...snapshot,
        wallet: {
          ...snapshot.wallet,
          historyStatus: 'loading',
          historyDiagnostics: null
        },
        isPending: false,
        statusMessage: statusMessageForSnapshot(snapshot, `${copy().importedWebWallet} ${result.address}`),
        errorMessage: null
      })

      void hydrateDetailedSnapshot(
        set,
        result.address,
        result.source,
        readExecutionEnvironment()
      )
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
      const snapshot = await readWalletState(
        null,
        'disconnected',
        'full',
        readExecutionEnvironment()
      )

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
      const { snapshot, swapIntent } = await readCoreWalletAndSwapState(
        ownerAddress,
        connectionSource,
        get().wallet.executionEnvironment
      )
      set({
        ...snapshot,
        swapIntent: swapIntent ?? get().swapIntent,
        isPending: false,
        statusMessage: copy().walletStateRefreshed,
        errorMessage: null
      })

      if (ownerAddress) {
        set((state) => ({
          wallet: {
            ...state.wallet,
            historyStatus: 'loading',
            historyDiagnostics: state.wallet.historyDiagnostics
          }
        }))
        void hydrateDetailedSnapshot(
          set,
          ownerAddress,
          connectionSource,
          get().wallet.executionEnvironment
        )
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
      const { snapshot, swapIntent } = await readCoreWalletAndSwapState(
        initialState.wallet.ownerAddress,
        initialState.wallet.connectionSource,
        initialState.wallet.executionEnvironment
      )
      const settled =
        snapshot.wallet.lastExecutionNonce > initialState.wallet.lastExecutionNonce ||
        snapshot.intent.executedCount > initialState.intent.executedCount ||
        snapshot.wallet.balanceLabel !== initialState.wallet.balanceLabel ||
        (swapIntent?.lastOriginTxHash !== undefined &&
          swapIntent.lastOriginTxHash !== initialState.swapIntent.lastOriginTxHash)

      set((state) => {
        if (state.isPending || state.wallet.ownerAddress !== initialState.wallet.ownerAddress) {
          return {}
        }

        return {
          ...mergeCoreSnapshotIntoState(state, snapshot),
          swapIntent: swapIntent ?? state.swapIntent,
          isPending: false,
          errorMessage: null,
          statusMessage: settled ? copy().automationResultDetected : state.statusMessage
        }
      })

      const currentState = get()
      const shouldHydrateDetailedSnapshot =
        settled ||
        currentState.wallet.historyStatus === 'loading' ||
        currentState.wallet.historyStatus === 'idle' ||
        currentState.wallet.historyStatus === 'error'

      if (shouldHydrateDetailedSnapshot) {
        void hydrateDetailedSnapshot(
          set,
          initialState.wallet.ownerAddress,
          initialState.wallet.connectionSource,
          initialState.wallet.executionEnvironment
        )
      }
    } catch {}
  },
  refreshSwapIntentState: async () => {
    try {
      const ownerAddress = get().wallet.ownerAddress
      const initialState = get()
      const { snapshot, swapIntent } = await readCoreWalletAndSwapState(
        ownerAddress,
        initialState.wallet.connectionSource,
        initialState.wallet.executionEnvironment
      )

      if (!swapIntent) return

      set((state) => {
        const swapTriggered =
          swapIntent.lastOriginTxHash !== 'Unavailable' &&
          swapIntent.lastOriginTxHash !== state.swapIntent.lastOriginTxHash

        return {
          ...mergeCoreSnapshotIntoState(state, snapshot),
          swapIntent,
          statusMessage: swapTriggered
            ? `${copy().swapIntentTriggeredStatus} ${swapIntent.lastOriginTxHash}`
            : state.statusMessage
        }
      })
    } catch {}
  },
  submitIntent: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().submittingIntentTransaction })

    try {
      const action = await configureIntent(values, {
        skipRuntimeRouteSync: runtimeRouteMatchesForm(get().wallet.runtimeRoute, values)
      })
      await applyPostAction(set, get, action)
      if (get().wallet.operatorServiceStatus !== 'online') {
        try {
          const listenerAction = await ensureReactiveListenerArmed()
          if (listenerAction) {
            await applyPostAction(set, get, listenerAction)
          }
        } catch {}
      }
      const listenerPollId = ++activeListenerPollId
      void pollForListenerActivation(set, get, listenerPollId)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedConfigureIntent,
        statusMessage: copy().intentConfigurationFailed
      })
    }
  },
  submitSwapIntent: async (values) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().submittingSwapIntentTransaction })

    try {
      const action = await configureSwapIntent(values)
      const swapIntent = await readSwapIntentState(get().wallet.ownerAddress, 'primary')
      set({
        swapIntent,
        isPending: false,
        statusMessage: `${action.label}: ${action.hash}`,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedConfigureSwapIntent,
        statusMessage: copy().swapIntentConfigurationFailed
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
  fundSwapIntentAutomation: async (amount) => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().fundingAutomationCredit })

    try {
      const action = await topUpSwapIntentAutomationCredit(amount)
      const [swapIntent, snapshot] = await Promise.all([
        readSwapIntentState(get().wallet.ownerAddress, 'primary'),
        readWalletState(
          get().wallet.ownerAddress,
          get().wallet.connectionSource,
          'full',
          get().wallet.executionEnvironment
        )
      ])

      set({
        wallet: snapshot.wallet,
        intent: snapshot.intent,
        automation: snapshot.automation,
        executionProofs: snapshot.executionProofs,
        swapIntent,
        isPending: false,
        statusMessage: `${action.label}: ${action.hash}`,
        errorMessage: null
      })
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
  pauseSwapIntent: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().pausingSwapIntent })

    try {
      const action = await pauseSwapIntentTx()
      const swapIntent = await readSwapIntentState(get().wallet.ownerAddress, 'primary')
      set({
        swapIntent,
        isPending: false,
        statusMessage: `${action.label}: ${action.hash}`,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedPauseSwapIntent,
        statusMessage: copy().swapIntentPauseFailed
      })
    }
  },
  resumeSwapIntent: async () => {
    set({ isPending: true, errorMessage: null, statusMessage: copy().resumingSwapIntent })

    try {
      const action = await resumeSwapIntentTx()
      const swapIntent = await readSwapIntentState(get().wallet.ownerAddress, 'primary')
      set({
        swapIntent,
        isPending: false,
        statusMessage: `${action.label}: ${action.hash}`,
        errorMessage: null
      })
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedResumeSwapIntent,
        statusMessage: copy().swapIntentResumeFailed
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
    if (get().isPending) {
      return
    }

    activeListenerPollId += 1
    set({ isPending: true, errorMessage: null, statusMessage: copy().emittingSourceSignal })

    try {
      const state = get()
      const signalPollId = ++activeSignalPollId
      const expectedNonce = state.wallet.lastExecutionNonce + 1
      const initialLastExecutionNonce = state.wallet.lastExecutionNonce
      const initialExecutedCount = state.intent.executedCount
      const existingProofReferences = new Set(state.executionProofs.map((proof) => proof.reference))
      const action = await emitSignal({
        token: state.intent.token,
        recipient: state.intent.recipient,
        amountPerExecution: state.intent.amountPerExecution,
        nextNonce: expectedNonce
      })
      await applyPostAction(set, get, action)
      const latestState = get()
      const destinationAdvanced =
        latestState.wallet.lastExecutionNonce > initialLastExecutionNonce ||
        latestState.intent.executedCount > initialExecutedCount

      if (!destinationAdvanced) {
        set((currentState) => {
          if (signalPollId !== activeSignalPollId || currentState.isPending) {
            return {}
          }

          return { statusMessage: copy().awaitingAutomationResult }
        })
      }

      void pollForSignalOutcome(
        set,
        get,
        signalPollId,
        expectedNonce,
        initialLastExecutionNonce,
        initialExecutedCount,
        existingProofReferences
      )
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
      const action = addWatchedToken(
        tokenAddress,
        get().wallet.executionEnvironment
      )
      await applyPostAction(set, get, action)
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().failedAddWatchedToken,
        statusMessage: copy().addWatchedTokenFailed
      })
    }
  },
  setExecutionEnvironment: async (executionEnvironment) => {
    writeExecutionEnvironment(executionEnvironment)
    set({ isPending: true, errorMessage: null, statusMessage: copy().switchingExecutionEnvironment })

    try {
      const ownerAddress = get().wallet.ownerAddress
      const connectionSource = get().wallet.connectionSource
      const snapshot = await readWalletState(
        ownerAddress,
        connectionSource,
        'core',
        executionEnvironment
      )
      set({
        ...snapshot,
        isPending: false,
        statusMessage: copy().executionEnvironmentSwitched,
        errorMessage: null
      })

      if (ownerAddress) {
        void hydrateDetailedSnapshot(
          set,
          ownerAddress,
          connectionSource,
          executionEnvironment
        )
      }
    } catch (error) {
      set({
        isPending: false,
        errorMessage: error instanceof Error ? error.message : copy().executionEnvironmentSwitchFailed,
        statusMessage: copy().executionEnvironmentSwitchFailed
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
  const executionEnvironment = get().wallet.executionEnvironment
  const snapshot = await readWalletState(
    ownerAddress,
    connectionSource,
    'core',
    executionEnvironment
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
        href: txExplorerLink(inferProofChain(action.label), action.hash, executionEnvironment)
      },
      ...state.executionProofs.filter((proof) => proof.reference !== action.hash)
    ]
  }))

  if (ownerAddress) {
    void hydrateDetailedSnapshot(
      set,
      ownerAddress,
      connectionSource,
      executionEnvironment
    )
  }
}

async function readCoreWalletAndSwapState(
  ownerAddress: string | null,
  connectionSource: WalletState['connectionSource'],
  executionEnvironment: WalletState['executionEnvironment']
) {
  const snapshot = await readWalletState(
    ownerAddress,
    connectionSource,
    'core',
    executionEnvironment
  )

  const swapIntent =
    ownerAddress && executionEnvironment === 'primary'
      ? await readSwapIntentState(ownerAddress, executionEnvironment).catch(() => null)
      : null

  return { snapshot, swapIntent }
}

async function hydrateDetailedSnapshot(
  set: (partial:
    | Partial<WillLeadStore>
    | ((state: WillLeadStore) => Partial<WillLeadStore>)
  ) => void,
  ownerAddress: string,
  connectionSource: WalletState['connectionSource'],
  executionEnvironment: WalletState['executionEnvironment']
) {
  const requestKey = `${ownerAddress}:${connectionSource}:destination:${executionEnvironment}`
  if (detailedSnapshotInFlightKey === requestKey) {
    return
  }

  detailedSnapshotInFlightKey = requestKey

  try {
    const snapshot = await readWalletState(
      ownerAddress,
      connectionSource,
      'full',
      executionEnvironment
    )

    set((state) => {
      if (
        state.isPending ||
        state.wallet.ownerAddress !== ownerAddress ||
        state.wallet.connectionSource !== connectionSource ||
        state.wallet.executionEnvironment !== executionEnvironment
      ) {
        return {}
      }

        return {
          ...snapshot,
          wallet: {
            ...snapshot.wallet,
            historyStatus: snapshot.historyWarning ? 'partial' : 'ready',
            historyDiagnostics: snapshot.historyDiagnostics
          },
          isPending: false,
          errorMessage: snapshot.historyWarning,
          statusMessage: state.statusMessage
      }
    })
  } catch (error) {
    set((state) => {
      if (
        state.isPending ||
        state.wallet.ownerAddress !== ownerAddress ||
        state.wallet.connectionSource !== connectionSource ||
        state.wallet.executionEnvironment !== executionEnvironment
      ) {
        return {}
      }

      return {
        wallet: {
          ...state.wallet,
          historyStatus: 'error',
          historyDiagnostics: state.wallet.historyDiagnostics
        },
        isPending: false,
        errorMessage:
          error instanceof Error ? error.message : copy().executionHistoryRefreshFailed,
        statusMessage: state.statusMessage
      }
    })
  }
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
  signalPollId: number,
  expectedNonce: number,
  initialLastExecutionNonce: number,
  initialExecutedCount: number,
  existingProofReferences: Set<string>
) {
  const initialOwnerAddress = get().wallet.ownerAddress
  const initialConnectionSource = get().wallet.connectionSource
  const initialExecutionEnvironment = get().wallet.executionEnvironment

  if (!initialOwnerAddress) return

  for (let attempt = 0; attempt < signalOutcomeMaxAttempts; attempt += 1) {
    if (attempt > 0) {
      await sleep(signalOutcomePollIntervalMs)
    }

    if (signalPollId !== activeSignalPollId) {
      return
    }

    const state = get()
    if (
      state.wallet.ownerAddress !== initialOwnerAddress ||
      state.wallet.connectionSource !== initialConnectionSource ||
      state.wallet.executionEnvironment !== initialExecutionEnvironment ||
      state.isPending
    ) {
      return
    }

    try {
      const coreSnapshot = await readWalletState(
        initialOwnerAddress,
        initialConnectionSource,
        'core',
        initialExecutionEnvironment
      )
      const destinationAdvanced =
        coreSnapshot.wallet.lastExecutionNonce > initialLastExecutionNonce ||
        coreSnapshot.intent.executedCount > initialExecutedCount

      if (coreSnapshot.wallet.lastExecutionNonce >= expectedNonce && destinationAdvanced) {
        set((state) => ({
          ...(signalPollId !== activeSignalPollId ? {} : mergeCoreSnapshotIntoState(state, coreSnapshot)),
          ...(signalPollId !== activeSignalPollId
            ? {}
            : {
                isPending: false,
                statusMessage: copy().destinationExecutionDetected,
                errorMessage: null
              })
        }))

        if (signalPollId !== activeSignalPollId) {
          return
        }

        void hydrateDetailedSnapshot(
          set,
          initialOwnerAddress,
          initialConnectionSource,
          initialExecutionEnvironment
        )
        return
      }

      const fullSnapshot = await readWalletState(
        initialOwnerAddress,
        initialConnectionSource,
        'full',
        initialExecutionEnvironment
      )
      const proofOutcome = findDestinationOutcome(
        fullSnapshot.executionProofs,
        expectedNonce,
        existingProofReferences
      )
      const settled = proofOutcome !== null

      set((state) => {
        if (signalPollId !== activeSignalPollId) {
          return {}
        }

        const destinationAlreadyAdvanced =
          state.wallet.lastExecutionNonce > initialLastExecutionNonce ||
          state.intent.executedCount > initialExecutedCount

        if (!settled && destinationAlreadyAdvanced) {
          return {
            isPending: false,
            statusMessage: copy().destinationExecutionDetected,
            errorMessage: null
          }
        }

        return {
          ...fullSnapshot,
          isPending: false,
          statusMessage: settled
            ? statusMessageForDestinationOutcome(proofOutcome)
            : copy().awaitingAutomationResult,
          errorMessage: null
        }
      })

      if (settled) {
        return
      }
    } catch {}
  }

  if (signalPollId !== activeSignalPollId) {
    return
  }

  set((state) => {
    if (signalPollId !== activeSignalPollId) {
      return {}
    }

    const destinationAlreadyAdvanced =
      state.wallet.lastExecutionNonce > initialLastExecutionNonce ||
      state.intent.executedCount > initialExecutedCount

    if (destinationAlreadyAdvanced) {
      return {
        isPending: false,
        statusMessage: copy().destinationExecutionDetected,
        errorMessage: null
      }
    }

    return {
      isPending: false,
      statusMessage: copy().automationStillPending
    }
  })
}

async function pollForListenerActivation(
  set: (partial:
    | Partial<WillLeadStore>
    | ((state: WillLeadStore) => Partial<WillLeadStore>)
  ) => void,
  get: () => WillLeadStore,
  listenerPollId: number
) {
  const initialOwnerAddress = get().wallet.ownerAddress
  const initialConnectionSource = get().wallet.connectionSource
  const initialExecutionEnvironment = get().wallet.executionEnvironment

  if (!initialOwnerAddress) return

  set((state) => {
    if (listenerPollId !== activeListenerPollId || state.isPending) {
      return {}
    }

    return {
      statusMessage: copy().awaitingListenerArming,
      errorMessage: null
    }
  })

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (attempt > 0) {
      await sleep(signalOutcomePollIntervalMs)
    }

    if (listenerPollId !== activeListenerPollId) {
      return
    }

    const state = get()
    if (
      state.wallet.ownerAddress !== initialOwnerAddress ||
      state.wallet.connectionSource !== initialConnectionSource ||
      state.wallet.executionEnvironment !== initialExecutionEnvironment ||
      state.isPending
    ) {
      return
    }

    try {
      const snapshot = await readWalletState(
        initialOwnerAddress,
        initialConnectionSource,
        'full',
        initialExecutionEnvironment
      )
      const listenerArmed =
        snapshot.wallet.runtimeStatus === 'active' &&
        snapshot.wallet.runtimeRoute.listenerPaused === false &&
        snapshot.wallet.runtimeRoute.subscriptionStatus === 'armed'

      set(() => {
        if (listenerPollId !== activeListenerPollId) {
          return {}
        }

        return {
          ...snapshot,
          isPending: false,
          statusMessage: listenerArmed ? copy().listenerArmedForIntent : copy().awaitingListenerArming,
          errorMessage: null
        }
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
