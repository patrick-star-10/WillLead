import { formatEther, getAddress, type Address, type Hex } from 'viem'

import { willLeadWalletAbi } from '../../../contracts/abi/willLeadWallet'
import { getExecutionContractAddresses } from '../../../contracts/addresses'
import type {
  AssetBalance,
  ExecutionEnvironment,
  WalletAccessState,
  WalletConnectionSource,
  WalletState
} from '../../../types/willlead'
import { getExecutionChainConfig } from '../../chains'
import { getDestinationPublicClient, getOriginPublicClient } from '../../clients'
import { getMessages, useLanguageStore } from '../../i18n'
import { emptyAddress, zeroHash } from '../../constants'
import {
  configuredAddressOrNull,
  isSameAddress
} from '../address'
import { formatAmount, formatNativeAmount, formatRuntimeStatus, formatTimestamp } from '../format'
import {
  computeAutomationReadiness,
  computeSingleSignatureReadiness,
  readOperatorRuntime,
  scopeOperatorRuntime
} from '../operator'
import {
  executionEnvironmentLabel,
  formatConnectionLabel,
  mergeTrackedTokenAddresses,
  readExecutionEnvironment,
  readWatchedTokenAddresses,
  resolveControllerAssetView
} from '../storage'
import type { WalletSnapshot } from '../types'
import { readAutomationCredit } from '../reactive/credit'
import { readReactiveListenerState } from '../reactive/listener'
import { readExecutionProofs } from '../reactive/proofs'
import { readTrackedAssets } from './assets'
import { readWalletRuntimeBinding, resolveWalletBinding } from './binding'

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

function buildUnboundSnapshot(params: {
  ownerAddress: string | null
  connectionSource: WalletConnectionSource
  executionEnvironment: ExecutionEnvironment
  connectedBalanceLabel: string
  connectedAssetBalances: AssetBalance[]
  walletAccessState: WalletAccessState
  runtimeRoute?: Partial<WalletState['runtimeRoute']>
}): WalletSnapshot {
  const {
    ownerAddress,
    connectionSource,
    executionEnvironment,
    connectedBalanceLabel,
    connectedAssetBalances,
    walletAccessState,
    runtimeRoute
  } = params

  return {
    wallet: {
      contractAddress: 'Unavailable',
      ownerAddress,
      connectionSource,
      connectionLabel: formatConnectionLabel(connectionSource),
      executionEnvironment,
      executionEnvironmentLabel: executionEnvironmentLabel(executionEnvironment),
      balanceContextLabel: 'Autonomous wallet contract balance',
      balanceLabel: 'Unavailable',
      assetBalances: [],
      connectedBalanceLabel,
      connectedAssetBalances,
      walletAccessState,
      runtimeStatus: 'inactive',
      isConnected: ownerAddress !== null,
      lastSyncedAt: formatTimestamp(BigInt(Math.floor(Date.now() / 1000))),
      lastExecutionNonce: 0,
      lastExecutedAt: 'Never',
      lastSignalHash: zeroHash,
      destinationBalanceDelta: '0 ETH',
      runtimeRoute: {
        listenerAddress: runtimeRoute?.listenerAddress ?? 'Unavailable',
        signalEmitterAddress: runtimeRoute?.signalEmitterAddress ?? 'Unavailable',
        sourceChainId: runtimeRoute?.sourceChainId ?? 'Unavailable',
        destinationChainId: runtimeRoute?.destinationChainId ?? 'Unavailable',
        signalTopic0: runtimeRoute?.signalTopic0 ?? 'Unavailable',
        listenerPaused: runtimeRoute?.listenerPaused ?? null,
        callbackGasLimit: runtimeRoute?.callbackGasLimit ?? 'Unavailable',
        subscriptionStatus: runtimeRoute?.subscriptionStatus ?? 'unavailable',
        canManageListener: runtimeRoute?.canManageListener ?? false
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
    },
    intent: {
      token: 'native',
      recipient: 'Not configured',
      amountPerExecution: '0',
      maxExecutions: 0,
      executedCount: 0,
      minAutomationBalance: '0',
      enabled: false
    },
    automation: {
      creditLabel: 'Unavailable',
      availableBalance: 'Unavailable',
      minRequiredBalance: 'Unavailable'
    },
    executionProofs: [],
    historyWarning: null,
    historyDiagnostics: null
  }
}

export async function readWalletState(
  ownerAddress: string | null,
  connectionSource: WalletConnectionSource = 'disconnected',
  detailLevel: 'core' | 'full' = 'full',
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
): Promise<WalletSnapshot> {
  const executionChainConfig = getExecutionChainConfig(executionEnvironment)
  const executionAddresses = getExecutionContractAddresses(executionEnvironment)
  const destinationClient = getDestinationPublicClient(executionEnvironment)
  const originClient = detailLevel === 'full' ? getOriginPublicClient() : null
  const controllerAssetView = resolveControllerAssetView(executionEnvironment)
  const operatorRuntime = await readOperatorRuntime()
  const destinationWatchedTokens = readWatchedTokenAddresses(executionChainConfig.id)
  let connectedBalance = 0n

  if (controllerAssetView.client && ownerAddress !== null) {
    try {
      connectedBalance = await controllerAssetView.client.getBalance({ address: getAddress(ownerAddress) })
    } catch {}
  }

  const connectedBalanceLabel =
    ownerAddress !== null && controllerAssetView.client
      ? formatNativeAmount(connectedBalance, controllerAssetView.nativeSymbol)
      : 'Unavailable'
  let connectedAssetBalances: AssetBalance[] =
    ownerAddress !== null && controllerAssetView.client
      ? [
          {
            symbol: controllerAssetView.nativeSymbol,
            balanceLabel: connectedBalanceLabel,
            kind: 'native'
          }
        ]
      : []

  if (!destinationClient) {
    return buildUnboundSnapshot({
      ownerAddress,
      connectionSource,
      executionEnvironment,
      connectedBalanceLabel,
      connectedAssetBalances,
      walletAccessState: 'unavailable'
    })
  }

  try {
    if (ownerAddress !== null && controllerAssetView.client) {
      connectedAssetBalances = await readTrackedAssets(
        controllerAssetView.client,
        getAddress(ownerAddress),
        connectedBalance,
        controllerAssetView.watchedTokens,
        controllerAssetView.nativeSymbol
      )
    }

    const binding = await resolveWalletBinding(ownerAddress, executionEnvironment)
    const bindingRuntimeRoute = {
      listenerAddress: binding.listenerAddress ?? 'Unavailable',
      signalEmitterAddress: binding.signalEmitterAddress ?? 'Unavailable',
      sourceChainId: binding.sourceChainId ?? 'Unavailable',
      destinationChainId: binding.destinationChainId ?? 'Unavailable',
      signalTopic0: binding.strategySignalTopic0 ?? 'Unavailable'
    } satisfies Partial<WalletState['runtimeRoute']>
    const walletAddress = binding.walletAddress
    const reactiveListenerAddress = binding.listenerAddress

    if (!walletAddress || !reactiveListenerAddress || ownerAddress === null) {
      return buildUnboundSnapshot({
        ownerAddress,
        connectionSource,
        executionEnvironment,
        connectedBalanceLabel,
        connectedAssetBalances,
        walletAccessState:
          ownerAddress === null
            ? 'needs_connection'
            : binding.source === 'factory'
              ? 'needs_wallet'
              : 'unavailable',
        runtimeRoute: bindingRuntimeRoute
      })
    }

    const configuredWalletOwner = (await destinationClient.readContract({
      address: walletAddress,
      abi: willLeadWalletAbi,
      functionName: 'owner'
    })) as Address

    if (!isSameAddress(configuredWalletOwner, ownerAddress)) {
      return buildUnboundSnapshot({
        ownerAddress,
        connectionSource,
        executionEnvironment,
        connectedBalanceLabel,
        connectedAssetBalances,
        walletAccessState: 'mismatch',
        runtimeRoute: bindingRuntimeRoute
      })
    }

    const [summary, balance, lastExecutionNonce, lastExecutedAt, lastSignalHash, runtimeBinding] =
      await Promise.all([
        destinationClient.readContract({
          address: walletAddress,
          abi: willLeadWalletAbi,
          functionName: 'getIntentSummary'
        }) as Promise<readonly [number, Address, Address, bigint, bigint, bigint, bigint]>,
        destinationClient.getBalance({ address: walletAddress }),
        destinationClient.readContract({
          address: walletAddress,
          abi: willLeadWalletAbi,
          functionName: 'lastExecutionNonce'
        }) as Promise<bigint>,
        destinationClient.readContract({
          address: walletAddress,
          abi: willLeadWalletAbi,
          functionName: 'lastExecutedAt'
        }) as Promise<bigint>,
        destinationClient.readContract({
          address: walletAddress,
          abi: willLeadWalletAbi,
          functionName: 'lastSignalHash'
        }) as Promise<Hex>,
        readWalletRuntimeBinding(destinationClient, walletAddress)
      ])

    const [status, token, recipient, amountPerExecution, maxExecutions, executedCount, automationFloor] =
      summary
    const trackedWalletTokens = mergeTrackedTokenAddresses(destinationWatchedTokens, [token])
    const trackedControllerTokens = mergeTrackedTokenAddresses(controllerAssetView.watchedTokens, [token])
    const assetBalances = await readTrackedAssets(
      destinationClient,
      walletAddress,
      balance,
      trackedWalletTokens,
      executionChainConfig.nativeCurrency.symbol
    )

    if (ownerAddress !== null && controllerAssetView.client) {
      connectedAssetBalances = await readTrackedAssets(
        controllerAssetView.client,
        getAddress(ownerAddress),
        connectedBalance,
        trackedControllerTokens,
        controllerAssetView.nativeSymbol
      )
    }

    const runtimeStatus = formatRuntimeStatus(status)
    const scopedOperatorRuntime = scopeOperatorRuntime(operatorRuntime, walletAddress)

    if (detailLevel === 'core') {
      const automation = await readAutomationCredit(walletAddress, automationFloor, executionEnvironment)

      return {
        wallet: {
          contractAddress: walletAddress,
          ownerAddress,
          connectionSource,
          connectionLabel: formatConnectionLabel(connectionSource),
          executionEnvironment,
          executionEnvironmentLabel: executionEnvironmentLabel(executionEnvironment),
          balanceContextLabel: 'Autonomous wallet contract balance',
          balanceLabel: formatAmount(balance, executionChainConfig.nativeCurrency.symbol),
          assetBalances,
          connectedBalanceLabel,
          connectedAssetBalances,
          walletAccessState: 'bound',
          runtimeStatus,
          isConnected: ownerAddress !== null,
          lastSyncedAt: formatTimestamp(BigInt(Math.floor(Date.now() / 1000))),
          lastExecutionNonce: Number(lastExecutionNonce),
          lastExecutedAt: formatTimestamp(lastExecutedAt),
          lastSignalHash,
          destinationBalanceDelta:
            executedCount > 0n
              ? `-${formatAmount(amountPerExecution, executionChainConfig.nativeCurrency.symbol)}`
              : `0 ${executionChainConfig.nativeCurrency.symbol}`,
          runtimeRoute: {
            listenerAddress: runtimeBinding?.listener ?? reactiveListenerAddress,
            signalEmitterAddress:
              runtimeBinding?.signalEmitter ?? binding.signalEmitterAddress ?? emptyAddress,
            sourceChainId: runtimeBinding?.sourceChainId ?? binding.sourceChainId ?? 'Unavailable',
            destinationChainId:
              runtimeBinding?.destinationChainId ?? binding.destinationChainId ?? 'Unavailable',
            signalTopic0:
              runtimeBinding?.strategySignalTopic0 ?? binding.strategySignalTopic0 ?? 'Unavailable',
            canManageListener: false,
            listenerPaused: null,
            callbackGasLimit: 'Unavailable',
            subscriptionStatus: 'unavailable'
          },
          operatorServiceStatus: scopedOperatorRuntime.serviceStatus,
          operatorRelayAvailable: scopedOperatorRuntime.apiUrl !== null,
          operatorLastHeartbeat: scopedOperatorRuntime.lastHeartbeat,
          operatorListenerBalance: scopedOperatorRuntime.listenerBalance,
          operatorListenerDebt: scopedOperatorRuntime.listenerDebt,
          operatorLastFundingResult: scopedOperatorRuntime.lastFundingResult,
          operatorMirroredIntentActive: scopedOperatorRuntime.mirroredIntentActive,
          automationReadiness: 'unavailable',
          singleSignatureReadiness: 'unavailable',
          historyStatus: 'idle',
          historyDiagnostics: null
        },
        intent: {
          token: token === emptyAddress ? 'native' : token,
          recipient,
          amountPerExecution: formatEther(amountPerExecution),
          maxExecutions: Number(maxExecutions),
          executedCount: Number(executedCount),
          minAutomationBalance: formatEther(automationFloor),
          enabled: status === 1
        },
        automation,
        executionProofs: [],
        historyWarning: null,
        historyDiagnostics: null
      }
    }

    const listenerState = await readReactiveListenerState(
      runtimeBinding?.listener ?? reactiveListenerAddress,
      executionEnvironment
    )
    const runtimeListenerAddress = runtimeBinding?.listener ?? reactiveListenerAddress
    const runtimeSignalEmitter = runtimeBinding?.signalEmitter ?? listenerState.signalEmitter
    const automation = await readAutomationCredit(walletAddress, automationFloor, executionEnvironment)
    const { proofs, historyWarning, historyDiagnostics } = await readExecutionProofs(
      getAddress(ownerAddress),
      walletAddress,
      configuredAddressOrNull(executionAddresses.walletFactory),
      runtimeListenerAddress,
      runtimeSignalEmitter,
      originClient,
      destinationClient,
      executionEnvironment
    )
    const automationReadiness = computeAutomationReadiness({
      runtimeStatus,
      listenerPaused: listenerState.listenerPaused,
      subscriptionStatus: listenerState.subscriptionStatus
    })

    return {
      wallet: {
        contractAddress: walletAddress,
        ownerAddress,
        connectionSource,
        connectionLabel: formatConnectionLabel(connectionSource),
        executionEnvironment,
        executionEnvironmentLabel: executionEnvironmentLabel(executionEnvironment),
        balanceContextLabel: 'Autonomous wallet contract balance',
        balanceLabel: formatAmount(balance, executionChainConfig.nativeCurrency.symbol),
        assetBalances,
        connectedBalanceLabel,
        connectedAssetBalances,
        walletAccessState: 'bound',
        runtimeStatus,
        isConnected: ownerAddress !== null,
        lastSyncedAt: formatTimestamp(BigInt(Math.floor(Date.now() / 1000))),
        lastExecutionNonce: Number(lastExecutionNonce),
        lastExecutedAt: formatTimestamp(lastExecutedAt),
        lastSignalHash,
        destinationBalanceDelta:
          executedCount > 0n
            ? `-${formatAmount(amountPerExecution, executionChainConfig.nativeCurrency.symbol)}`
            : `0 ${executionChainConfig.nativeCurrency.symbol}`,
        runtimeRoute: {
          listenerAddress: runtimeListenerAddress,
          signalEmitterAddress: runtimeSignalEmitter,
          sourceChainId:
            runtimeBinding?.sourceChainId ?? binding.sourceChainId ?? listenerState.originChainId,
          destinationChainId:
            runtimeBinding?.destinationChainId ??
            binding.destinationChainId ??
            listenerState.destinationChainId,
          signalTopic0:
            runtimeBinding?.strategySignalTopic0 ??
            binding.strategySignalTopic0 ??
            listenerState.strategySignalTopic0,
          canManageListener: listenerState.canManageListener(ownerAddress),
          listenerPaused: listenerState.listenerPaused,
          callbackGasLimit: listenerState.callbackGasLimit,
          subscriptionStatus: listenerState.subscriptionStatus
        },
        operatorServiceStatus: scopedOperatorRuntime.serviceStatus,
        operatorRelayAvailable: scopedOperatorRuntime.apiUrl !== null,
        operatorLastHeartbeat: scopedOperatorRuntime.lastHeartbeat,
        operatorListenerBalance: scopedOperatorRuntime.listenerBalance,
        operatorListenerDebt: scopedOperatorRuntime.listenerDebt,
        operatorLastFundingResult: scopedOperatorRuntime.lastFundingResult,
        operatorMirroredIntentActive: scopedOperatorRuntime.mirroredIntentActive,
        automationReadiness,
        singleSignatureReadiness: computeSingleSignatureReadiness({
          operatorRelayAvailable: scopedOperatorRuntime.apiUrl !== null,
          automationReadiness
        }),
        historyStatus: 'idle',
        historyDiagnostics
      },
      intent: {
        token: token === emptyAddress ? 'native' : token,
        recipient,
        amountPerExecution: formatEther(amountPerExecution),
        maxExecutions: Number(maxExecutions),
        executedCount: Number(executedCount),
        minAutomationBalance: formatEther(automationFloor),
        enabled: status === 1
      },
      automation,
      executionProofs: proofs,
      historyWarning,
      historyDiagnostics
    }
  } catch (error) {
    if (detailLevel === 'full') {
      const fallbackSnapshot = await readWalletState(
        ownerAddress,
        connectionSource,
        'core',
        executionEnvironment
      )

      return {
        ...fallbackSnapshot,
        historyWarning:
          error instanceof Error && error.message
            ? error.message
            : copy().executionHistoryRefreshFailed,
        historyDiagnostics: fallbackSnapshot.historyDiagnostics
      }
    }

    return buildUnboundSnapshot({
      ownerAddress,
      connectionSource,
      executionEnvironment,
      connectedBalanceLabel,
      connectedAssetBalances,
      walletAccessState: 'unavailable',
      runtimeRoute: {
        listenerAddress: executionAddresses.reactiveListener,
        signalEmitterAddress: executionAddresses.signalEmitter
      }
    })
  }
}
