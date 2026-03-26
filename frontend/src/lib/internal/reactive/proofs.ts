import { decodeFunctionData, parseAbi, parseAbiItem, type Address, type PublicClient } from 'viem'

import type { ExecutionEnvironment, ExecutionProof } from '../../../types/willlead'
import { getMessages, useLanguageStore } from '../../i18n'
import { txExplorerLink } from '../../explorers'
import { historyLookbackBlocks } from '../../constants'
import { getOriginPublicClient, getReactivePublicClient, getDestinationPublicClient } from '../../clients'
import { formatTimestamp } from '../format'
import { getLogsPaged } from '../logs'
import { isConfiguredAddress } from '../address'
import { readExecutionEnvironment } from '../storage'
import type { HistoryItem } from '../types'

const walletCallbackDecoderAbi = parseAbi([
  'function callback(address rvmId,address token,address recipient,uint256 amount,uint256 executionNonce,uint256 emittedAt,uint256 originTxHash)'
])

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export async function readExecutionProofs(
  ownerAddress: Address,
  walletAddress: Address,
  walletFactoryAddress: Address | null,
  reactiveListenerAddress: Address,
  signalEmitterAddress: Address,
  originClient: ReturnType<typeof getOriginPublicClient>,
  destinationClient: NonNullable<ReturnType<typeof getDestinationPublicClient>>,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
): Promise<{ proofs: ExecutionProof[]; historyWarning: string | null; historyDiagnostics: string | null }> {
  const proofs: HistoryItem[] = []
  let firstHistoryError: string | null = null

  function recordHistoryError(error: unknown) {
    if (firstHistoryError) return
    firstHistoryError = error instanceof Error && error.message ? error.message : null
  }

  const reactiveClient = getReactivePublicClient()
  const logResults = await Promise.allSettled([
    reactiveClient && isConfiguredAddress(reactiveListenerAddress)
      ? getLogsPaged({
          client: reactiveClient,
          address: reactiveListenerAddress,
          event: parseAbiItem(
            'event Callback(uint256 indexed chain_id, address indexed _contract, uint64 indexed gas_limit, bytes payload)'
          ),
          args: {
            _contract: walletAddress
          },
          lookbackBlocks: historyLookbackBlocks,
          strict: true
        })
      : Promise.resolve([]),
    walletFactoryAddress && isConfiguredAddress(walletFactoryAddress)
      ? getLogsPaged({
          client: destinationClient,
          address: walletFactoryAddress,
          event: parseAbiItem(
            'event WalletCreated(address indexed owner, address indexed wallet, address indexed reactiveListener)'
          ),
          args: {
            owner: ownerAddress,
            wallet: walletAddress
          },
          lookbackBlocks: historyLookbackBlocks,
          strict: true
        })
      : Promise.resolve([]),
    getLogsPaged({
      client: destinationClient,
      address: walletAddress,
      event: parseAbiItem(
        'event RuntimeBindingConfigured(address indexed wallet, address indexed listener, address indexed signalEmitter, uint256 sourceChainId, uint256 destinationChainId, uint256 strategySignalTopic0)'
      ),
      lookbackBlocks: historyLookbackBlocks,
      strict: true
    }),
    getLogsPaged({
      client: destinationClient,
      address: walletAddress,
      event: parseAbiItem(
        'event IntentConfigured(address indexed wallet, address indexed token, address indexed recipient, uint256 amountPerExecution, uint256 maxExecutions, uint256 minAutomationBalance)'
      ),
      args: {
        wallet: walletAddress
      },
      lookbackBlocks: historyLookbackBlocks,
      strict: true
    }),
    getLogsPaged({
      client: destinationClient,
      address: walletAddress,
      event: parseAbiItem('event RuntimeStatusUpdated(address indexed wallet, uint8 status)'),
      args: {
        wallet: walletAddress
      },
      lookbackBlocks: historyLookbackBlocks,
      strict: true
    }),
    getLogsPaged({
      client: destinationClient,
      address: walletAddress,
      event: parseAbiItem(
        'event IntentExecuted(address indexed wallet, address indexed token, address indexed recipient, uint256 amount, uint256 executionNonce, bytes32 signalHash, uint256 originTxHash)'
      ),
      lookbackBlocks: historyLookbackBlocks,
      strict: true
    }),
    getLogsPaged({
      client: destinationClient,
      address: walletAddress,
      event: parseAbiItem(
        'event IntentExecutionSkipped(address indexed wallet, uint256 executionNonce, bytes32 signalHash, string reason)'
      ),
      lookbackBlocks: historyLookbackBlocks,
      strict: true
    }),
    originClient && isConfiguredAddress(signalEmitterAddress)
      ? getLogsPaged({
          client: originClient,
          address: signalEmitterAddress,
          event: parseAbiItem(
            'event StrategySignal(address indexed wallet, address indexed token, address indexed recipient, uint256 amount, uint256 executionNonce, uint256 emittedAt)'
          ),
          args: {
            wallet: walletAddress
          },
          lookbackBlocks: historyLookbackBlocks,
          strict: true
        })
      : Promise.resolve([])
  ])

  for (const result of logResults) {
    if (result.status === 'rejected') {
      recordHistoryError(result.reason)
    }
  }

  const [
    callbackLogs,
    walletCreatedLogs,
    runtimeBindingLogs,
    configuredLogs,
    runtimeStatusLogs,
    executionLogs,
    skippedLogs,
    signalLogs
  ] = logResults.map((result) => (result.status === 'fulfilled' ? result.value : [] as any[]))

  const configuredTxHashes = new Set<string>(
    configuredLogs.map((log) => log.transactionHash ?? 'unknown')
  )

  const blockClients = new Map<string, { blockNumber: bigint; client: PublicClient }>()
  const registerBlock = (
    chain: 'reactive' | 'origin' | 'destination',
    blockNumber: bigint | null | undefined,
    client: PublicClient | null
  ) => {
    if (blockNumber === null || blockNumber === undefined || !client) return
    const key = `${chain}:${blockNumber.toString()}`
    blockClients.set(key, { blockNumber, client })
  }

  for (const log of callbackLogs) registerBlock('reactive', log.blockNumber, reactiveClient)
  for (const log of signalLogs) registerBlock('origin', log.blockNumber, originClient)
  for (const log of [
    ...walletCreatedLogs,
    ...runtimeBindingLogs,
    ...configuredLogs,
    ...runtimeStatusLogs,
    ...executionLogs,
    ...skippedLogs
  ]) {
    registerBlock('destination', log.blockNumber, destinationClient)
  }

  const blockTimestampCache = new Map<string, bigint>()
  await Promise.all(
    [...blockClients.entries()].map(async ([key, { blockNumber, client }]) => {
      try {
        const block = await client.getBlock({ blockNumber })
        blockTimestampCache.set(key, block.timestamp)
      } catch (error) {
        recordHistoryError(error)
      }
    })
  )

  const timestampFor = (
    chain: 'reactive' | 'origin' | 'destination',
    blockNumber: bigint | null | undefined
  ) =>
    blockNumber !== null && blockNumber !== undefined
      ? (blockTimestampCache.get(`${chain}:${blockNumber.toString()}`) ?? 0n)
      : 0n

  for (const callbackLog of callbackLogs) {
    let nonceLabel: string | null = null

    try {
      const decoded = decodeFunctionData({
        abi: walletCallbackDecoderAbi,
        data: callbackLog.args.payload
      })

      const executionNonce = decoded.args?.[4]
      nonceLabel = typeof executionNonce === 'bigint' ? executionNonce.toString() : null
    } catch {}

    const observedAt = timestampFor('reactive', callbackLog.blockNumber)
    proofs.push({
      id: `reactive-callback-${callbackLog.transactionHash}-${callbackLog.logIndex}`,
      label: 'Reactive Callback',
      description: 'Reactive runtime dispatched the callback payload toward the destination wallet.',
      status: 'observed',
      reference: callbackLog.transactionHash ?? 'unknown',
      chain: 'reactive',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel,
      detailLabel: null,
      href: txExplorerLink('reactive', callbackLog.transactionHash, executionEnvironment),
      observedAt,
      blockNumber: callbackLog.blockNumber ?? 0n,
      logIndex: Number(callbackLog.logIndex ?? 0)
    })
  }

  for (const walletCreatedLog of walletCreatedLogs) {
    const observedAt = timestampFor('destination', walletCreatedLog.blockNumber)
    proofs.push({
      id: `wallet-created-${walletCreatedLog.transactionHash}-${walletCreatedLog.logIndex}`,
      label: 'Autonomous Wallet Ready',
      description: 'Created or recovered the autonomous wallet bound to this owner.',
      status: 'observed',
      reference: walletCreatedLog.transactionHash ?? 'unknown',
      chain: 'destination',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel: null,
      detailLabel: null,
      href: txExplorerLink('destination', walletCreatedLog.transactionHash, executionEnvironment),
      observedAt,
      blockNumber: walletCreatedLog.blockNumber ?? 0n,
      logIndex: Number(walletCreatedLog.logIndex ?? 0)
    })
  }

  for (const runtimeBindingLog of runtimeBindingLogs) {
    const observedAt = timestampFor('destination', runtimeBindingLog.blockNumber)
    proofs.push({
      id: `runtime-binding-${runtimeBindingLog.transactionHash}-${runtimeBindingLog.logIndex}`,
      label: 'Wallet Runtime Bound',
      description: 'Autonomous wallet declared its Reactive runtime route onchain.',
      status: 'observed',
      reference: runtimeBindingLog.transactionHash ?? 'unknown',
      chain: 'destination',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel: null,
      detailLabel: null,
      href: txExplorerLink('destination', runtimeBindingLog.transactionHash, executionEnvironment),
      observedAt,
      blockNumber: runtimeBindingLog.blockNumber ?? 0n,
      logIndex: Number(runtimeBindingLog.logIndex ?? 0)
    })
  }

  for (const configuredLog of configuredLogs) {
    const observedAt = timestampFor('destination', configuredLog.blockNumber)
    const txHash = configuredLog.transactionHash ?? 'unknown'
    proofs.push({
      id: `intent-configured-${txHash}-${configuredLog.logIndex}`,
      label: 'Transfer Plan Saved',
      description: 'Saved the wallet intent onchain.',
      status: 'observed',
      reference: txHash,
      chain: 'destination',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel: null,
      detailLabel: null,
      href: txExplorerLink('destination', configuredLog.transactionHash, executionEnvironment),
      observedAt,
      blockNumber: configuredLog.blockNumber ?? 0n,
      logIndex: Number(configuredLog.logIndex ?? 0)
    })
  }

  for (const runtimeStatusLog of runtimeStatusLogs) {
    const status = Number(runtimeStatusLog.args.status)
    const txHash = runtimeStatusLog.transactionHash ?? 'unknown'

    if (status === 1 && configuredTxHashes.has(txHash)) continue
    if (status !== 1 && status !== 2) continue

    const observedAt = timestampFor('destination', runtimeStatusLog.blockNumber)
    proofs.push({
      id: `runtime-status-${txHash}-${runtimeStatusLog.logIndex}`,
      label: status === 2 ? 'Intent Paused' : 'Intent Resumed',
      description:
        status === 2
          ? 'Paused reactive execution on the destination wallet.'
          : 'Reactivated reactive execution on the destination wallet.',
      status: 'observed',
      reference: txHash,
      chain: 'destination',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel: null,
      detailLabel: null,
      href: txExplorerLink('destination', runtimeStatusLog.transactionHash, executionEnvironment),
      observedAt,
      blockNumber: runtimeStatusLog.blockNumber ?? 0n,
      logIndex: Number(runtimeStatusLog.logIndex ?? 0)
    })
  }

  for (const executionLog of executionLogs) {
    const observedAt = timestampFor('destination', executionLog.blockNumber)
    proofs.push({
      id: `wallet-${executionLog.transactionHash}`,
      label: 'Destination Execution',
      description: 'Autonomous wallet executed the transfer on the destination chain.',
      status: 'success',
      reference: executionLog.transactionHash ?? 'unknown',
      chain: 'destination',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel: executionLog.args.executionNonce?.toString() ?? null,
      detailLabel: null,
      href: txExplorerLink('destination', executionLog.transactionHash, executionEnvironment),
      observedAt,
      blockNumber: executionLog.blockNumber ?? 0n,
      logIndex: Number(executionLog.logIndex ?? 0)
    })
  }

  for (const skippedLog of skippedLogs) {
    const observedAt = timestampFor('destination', skippedLog.blockNumber)
    proofs.push({
      id: `skipped-${skippedLog.transactionHash}-${skippedLog.logIndex}`,
      label: 'Destination Skipped',
      description: 'Autonomous wallet skipped execution and recorded the reason.',
      status: 'skipped',
      reference: skippedLog.transactionHash ?? 'unknown',
      chain: 'destination',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel: skippedLog.args.executionNonce?.toString() ?? null,
      detailLabel: typeof skippedLog.args.reason === 'string' ? skippedLog.args.reason : null,
      href: txExplorerLink('destination', skippedLog.transactionHash, executionEnvironment),
      observedAt,
      blockNumber: skippedLog.blockNumber ?? 0n,
      logIndex: Number(skippedLog.logIndex ?? 0)
    })
  }

  for (const signalLog of signalLogs) {
    const observedAt = timestampFor('origin', signalLog.blockNumber)
    proofs.push({
      id: `signal-${signalLog.transactionHash}-${signalLog.logIndex}`,
      label: 'Origin Signal',
      description: 'Source chain signal emitted for the wallet intent.',
      status: 'observed',
      reference: signalLog.transactionHash ?? 'unknown',
      chain: 'origin',
      timestampLabel: formatTimestamp(observedAt),
      nonceLabel: signalLog.args.executionNonce?.toString() ?? null,
      detailLabel: null,
      href: txExplorerLink('origin', signalLog.transactionHash),
      observedAt,
      blockNumber: signalLog.blockNumber ?? 0n,
      logIndex: Number(signalLog.logIndex ?? 0)
    })
  }

  const sortedProofs = proofs
    .sort((left, right) => {
      if (left.observedAt === right.observedAt) {
        if (left.blockNumber === right.blockNumber) {
          return right.logIndex - left.logIndex
        }

        return left.blockNumber > right.blockNumber ? -1 : 1
      }

      if (left.observedAt > right.observedAt) return -1
      if (left.observedAt < right.observedAt) return 1

      if (left.blockNumber === right.blockNumber) {
        return right.logIndex - left.logIndex
      }

      return left.blockNumber > right.blockNumber ? -1 : 1
    })
    .slice(0, 12)
    .map(({ observedAt: _observedAt, blockNumber: _blockNumber, logIndex: _logIndex, ...proof }) => proof)

  return {
    proofs: sortedProofs,
    historyWarning: firstHistoryError
      ? `${copy().executionHistoryPartialWarning} ${firstHistoryError}`
      : null,
    historyDiagnostics: `walletCreated=${proofs.filter((item) => item.label === 'Autonomous Wallet Ready').length}, configured=${proofs.filter((item) => item.label === 'Transfer Plan Saved').length}, runtimeStatus=${proofs.filter((item) => item.label === 'Intent Paused' || item.label === 'Intent Resumed').length}, signals=${proofs.filter((item) => item.label === 'Origin Signal').length}, callbacks=${proofs.filter((item) => item.label === 'Reactive Callback').length}, executions=${proofs.filter((item) => item.label === 'Destination Execution').length}, skipped=${proofs.filter((item) => item.label === 'Destination Skipped').length}`
  }
}
