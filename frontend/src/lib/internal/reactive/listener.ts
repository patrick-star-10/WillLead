import { parseAbi, type Address, type Hex } from 'viem'

import { willLeadReactiveListenerAbi } from '../../../contracts/abi/willLeadReactiveListener'
import { getExecutionContractAddresses } from '../../../contracts/addresses'
import type { ActionResult, ExecutionEnvironment } from '../../../types/willlead'
import { getReactivePublicClient, getReactiveWalletClient } from '../../clients'
import { getMessages, useLanguageStore } from '../../i18n'
import {
  emptyAddress,
  reactiveIgnore,
  reactiveSystemContract,
  subscribeContractTopic0,
  subscriptionLookbackBlocks
} from '../../constants'
import { reactiveChain } from '../../chains'
import { getRawLogsPaged } from '../logs'
import { formatAddressTopic, formatUint256Topic } from '../format'
import { isConfiguredAddress, isSameAddress } from '../address'
import { readExecutionEnvironment } from '../storage'
import type { ListenerRuntime } from '../types'

const reactiveSystemAbi = parseAbi([
  'function subscribeContract(address contractAddress,uint256 chainId,address sourceContract,uint256 topic0,uint256 topic1,uint256 topic2,uint256 topic3)'
])
const listenerStateCacheTtlMs = 30_000
const listenerStateCache = new Map<
  string,
  {
    expiresAt: number
    value: Omit<ListenerRuntime, 'canManageListener'>
  }
>()

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

function createListenerRuntime(
  value: Omit<ListenerRuntime, 'canManageListener'>
): ListenerRuntime {
  return {
    ...value,
    canManageListener: (ownerAddress: string | null) =>
      ownerAddress !== null && isSameAddress(value.ownerAddress, ownerAddress)
  }
}

export function invalidateReactiveListenerState(
  reactiveListenerAddress: Address,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
) {
  listenerStateCache.delete(`${executionEnvironment}:${reactiveListenerAddress.toLowerCase()}`)
}

export async function readReactiveListenerState(
  reactiveListenerAddress: Address,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
): Promise<ListenerRuntime> {
  const reactiveClient = getReactivePublicClient()
  const unavailableRuntime = {
    listenerPaused: null,
    callbackGasLimit: '1000000',
    signalEmitter: emptyAddress as Address,
    ownerAddress: emptyAddress as Address,
    originChainId: 'Unavailable',
    destinationChainId: 'Unavailable',
    strategySignalTopic0: 'Unavailable',
    subscriptionStatus: 'unavailable'
  } satisfies Omit<ListenerRuntime, 'canManageListener'>

  if (!reactiveClient || !isConfiguredAddress(reactiveListenerAddress)) {
    return createListenerRuntime(unavailableRuntime)
  }

  const cacheKey = `${executionEnvironment}:${reactiveListenerAddress.toLowerCase()}`
  const cached = listenerStateCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return createListenerRuntime(cached.value)
  }

  try {
    const [
      listenerPaused,
      callbackGasLimit,
      signalEmitter,
      listenerOwnerAddress,
      originChainId,
      destinationChainId,
      strategySignalTopic0
    ] = await Promise.all([
      reactiveClient.readContract({
        address: reactiveListenerAddress,
        abi: willLeadReactiveListenerAbi,
        functionName: 'isPaused'
      }) as Promise<boolean>,
      reactiveClient.readContract({
        address: reactiveListenerAddress,
        abi: willLeadReactiveListenerAbi,
        functionName: 'callbackGasLimit'
      }) as Promise<bigint>,
      reactiveClient.readContract({
        address: reactiveListenerAddress,
        abi: willLeadReactiveListenerAbi,
        functionName: 'signalEmitter'
      }) as Promise<Address>,
      reactiveClient.readContract({
        address: reactiveListenerAddress,
        abi: willLeadReactiveListenerAbi,
        functionName: 'ownerAddress'
      }) as Promise<Address>,
      reactiveClient.readContract({
        address: reactiveListenerAddress,
        abi: willLeadReactiveListenerAbi,
        functionName: 'originChainId'
      }) as Promise<bigint>,
      reactiveClient.readContract({
        address: reactiveListenerAddress,
        abi: willLeadReactiveListenerAbi,
        functionName: 'destinationChainId'
      }) as Promise<bigint>,
      reactiveClient.readContract({
        address: reactiveListenerAddress,
        abi: willLeadReactiveListenerAbi,
        functionName: 'strategySignalTopic0'
      }) as Promise<bigint>
    ])

    let subscriptionStatus: ListenerRuntime['subscriptionStatus'] = 'missing'

    try {
      const latestBlock = await reactiveClient.getBlockNumber()
      const fromBlock =
        latestBlock > subscriptionLookbackBlocks ? latestBlock - subscriptionLookbackBlocks : 0n
      const logs = await getRawLogsPaged({
        client: reactiveClient,
        address: reactiveSystemContract as Address,
        topics: [
          subscribeContractTopic0,
          formatAddressTopic(reactiveListenerAddress),
          formatUint256Topic(originChainId),
          formatAddressTopic(signalEmitter)
        ] as [Hex, Hex, Hex, Hex],
        fromBlock,
        toBlock: latestBlock
      })

      const expectedStrategySignalTopic0 = strategySignalTopic0
        .toString(16)
        .padStart(64, '0')
        .toLowerCase()
      const expectedAuthorizedRvmId = getExecutionContractAddresses(executionEnvironment).authorizedRvmId
        .toLowerCase()
        .replace('0x', '')
        .padStart(40, '0')

      const matchingLogs = logs.filter((entry) => {
        const data = entry.data?.toLowerCase() ?? ''
        return (
          data.slice(2, 66) === expectedStrategySignalTopic0 &&
          data.slice(282, 322) === expectedAuthorizedRvmId
        )
      })

      subscriptionStatus = matchingLogs.length > 0 ? 'armed' : 'missing'
    } catch {
      subscriptionStatus = 'unavailable'
    }

    const runtimeValue = {
      listenerPaused,
      callbackGasLimit: callbackGasLimit.toString(),
      signalEmitter,
      ownerAddress: listenerOwnerAddress,
      originChainId: originChainId.toString(),
      destinationChainId: destinationChainId.toString(),
      strategySignalTopic0: `0x${strategySignalTopic0.toString(16)}`,
      subscriptionStatus
    } satisfies Omit<ListenerRuntime, 'canManageListener'>

    listenerStateCache.set(cacheKey, {
      expiresAt: Date.now() + listenerStateCacheTtlMs,
      value: runtimeValue
    })

    return createListenerRuntime(runtimeValue)
  } catch {
    return createListenerRuntime(unavailableRuntime)
  }
}

export async function ensureReactiveListenerArmedWithClient(params: {
  account: Address
  client: Awaited<ReturnType<typeof getReactiveWalletClient>>['client']
  reactiveListenerAddress: Address
  executionEnvironment: ExecutionEnvironment
}): Promise<ActionResult | null> {
  const listenerState = await readReactiveListenerState(
    params.reactiveListenerAddress,
    params.executionEnvironment
  )

  if (
    listenerState.originChainId === 'Unavailable' ||
    !isConfiguredAddress(listenerState.signalEmitter)
  ) {
    throw new Error(copy().reactiveRouteVerificationUnavailable)
  }

  if (listenerState.listenerPaused === false && listenerState.subscriptionStatus === 'armed') {
    return null
  }

  let hash: Hex

  if (listenerState.listenerPaused) {
    hash = await params.client.writeContract({
      account: params.account,
      address: params.reactiveListenerAddress,
      abi: willLeadReactiveListenerAbi,
      chain: reactiveChain,
      functionName: 'resume'
    })
  } else {
    hash = await params.client.writeContract({
      account: params.account,
      address: reactiveSystemContract as Address,
      abi: reactiveSystemAbi,
      chain: reactiveChain,
      functionName: 'subscribeContract',
      args: [
        params.reactiveListenerAddress,
        BigInt(listenerState.originChainId),
        listenerState.signalEmitter,
        BigInt(listenerState.strategySignalTopic0),
        BigInt(reactiveIgnore),
        BigInt(reactiveIgnore),
        BigInt(reactiveIgnore)
      ]
    })
  }

  const reactiveClient = getReactivePublicClient()
  if (reactiveClient) {
    await reactiveClient.waitForTransactionReceipt({ hash })
  }

  invalidateReactiveListenerState(params.reactiveListenerAddress, params.executionEnvironment)

  return {
    hash,
    label: copy().reactiveListenerArmedAction,
    description: copy().reactiveListenerArmedDesc
  }
}
