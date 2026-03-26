import { getAddress, type Address } from 'viem'

import { willLeadReactiveListenerAbi } from '../../../contracts/abi/willLeadReactiveListener'
import { willLeadWalletAbi } from '../../../contracts/abi/willLeadWallet'
import { willLeadWalletFactoryAbi } from '../../../contracts/abi/willLeadWalletFactory'
import { getExecutionContractAddresses } from '../../../contracts/addresses'
import type { ExecutionEnvironment, IntentFormValues } from '../../../types/willlead'
import { getExecutionChainConfig, originChain } from '../../chains'
import { getDestinationPublicClient, getReactivePublicClient } from '../../clients'
import { emptyAddress } from '../../constants'
import { getMessages, useLanguageStore } from '../../i18n'
import { readReactiveListenerState } from '../reactive/listener'
import { configuredAddressOrNull, isConfiguredAddress, isSameAddress } from '../address'
import { readExecutionEnvironment } from '../storage'
import type {
  BoundWalletBindingContext,
  RuntimeRouteInput,
  WalletBindingContext,
  WalletRuntimeBinding
} from '../types'

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

function normalizeTopicHex(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Signal topic must be configured.')
  }

  return trimmed.startsWith('0x') ? trimmed.toLowerCase() : `0x${trimmed.toLowerCase()}`
}

export function resolveRuntimeRouteInput(values: IntentFormValues): RuntimeRouteInput {
  const sourceChainId = BigInt(values.sourceChainId.trim())
  const destinationChainId = BigInt(values.destinationChainId.trim())
  const strategySignalTopic0 = BigInt(normalizeTopicHex(values.signalTopic0))

  if (sourceChainId <= 0n || destinationChainId <= 0n || strategySignalTopic0 <= 0n) {
    throw new Error('Runtime route values must be greater than zero.')
  }

  return {
    listener: getAddress(values.listenerAddress),
    signalEmitter: getAddress(values.signalEmitterAddress),
    sourceChainId,
    destinationChainId,
    strategySignalTopic0
  }
}

export function runtimeRouteMatches(
  currentBinding: WalletRuntimeBinding | null,
  nextRoute: RuntimeRouteInput
) {
  if (!currentBinding) return false

  return (
    isSameAddress(currentBinding.listener, nextRoute.listener) &&
    isSameAddress(currentBinding.signalEmitter, nextRoute.signalEmitter) &&
    currentBinding.sourceChainId === nextRoute.sourceChainId.toString() &&
    currentBinding.destinationChainId === nextRoute.destinationChainId.toString() &&
    normalizeTopicHex(currentBinding.strategySignalTopic0) ===
      `0x${nextRoute.strategySignalTopic0.toString(16)}`
  )
}

export async function readWalletRuntimeBinding(
  destinationClient: NonNullable<ReturnType<typeof getDestinationPublicClient>>,
  walletAddress: Address
): Promise<WalletRuntimeBinding | null> {
  try {
    const [listener, signalEmitter, sourceChainId, destinationChainId, strategySignalTopic0] =
      (await destinationClient.readContract({
        address: walletAddress,
        abi: willLeadWalletAbi,
        functionName: 'getRuntimeBinding'
      })) as readonly [Address, Address, bigint, bigint, bigint]

    return {
      listener,
      signalEmitter,
      sourceChainId: sourceChainId.toString(),
      destinationChainId: destinationChainId.toString(),
      strategySignalTopic0: `0x${strategySignalTopic0.toString(16)}`
    }
  } catch {
    return null
  }
}

export async function validateRuntimeRouteInputForExecution(
  route: RuntimeRouteInput,
  executionEnvironment: ExecutionEnvironment
) {
  if (route.sourceChainId !== BigInt(originChain.id)) {
    throw new Error(copy().runtimeRouteOriginConfigMismatch)
  }

  if (route.destinationChainId !== BigInt(getExecutionChainConfig(executionEnvironment).id)) {
    throw new Error(copy().runtimeRouteDestinationConfigMismatch)
  }

  const reactiveClient = getReactivePublicClient()
  if (!reactiveClient) {
    throw new Error(copy().reactiveRouteVerificationUnavailable)
  }

  try {
    const [listenerSignalEmitter, listenerOriginChainId, listenerDestinationChainId, listenerTopic0] =
      await Promise.all([
        reactiveClient.readContract({
          address: route.listener,
          abi: willLeadReactiveListenerAbi,
          functionName: 'signalEmitter'
        }) as Promise<Address>,
        reactiveClient.readContract({
          address: route.listener,
          abi: willLeadReactiveListenerAbi,
          functionName: 'originChainId'
        }) as Promise<bigint>,
        reactiveClient.readContract({
          address: route.listener,
          abi: willLeadReactiveListenerAbi,
          functionName: 'destinationChainId'
        }) as Promise<bigint>,
        reactiveClient.readContract({
          address: route.listener,
          abi: willLeadReactiveListenerAbi,
          functionName: 'strategySignalTopic0'
        }) as Promise<bigint>
      ])

    if (!isSameAddress(listenerSignalEmitter, route.signalEmitter)) {
      throw new Error(copy().runtimeRouteEmitterMismatch)
    }

    if (listenerOriginChainId !== route.sourceChainId) {
      throw new Error(copy().runtimeRouteSourceChainMismatch)
    }

    if (listenerDestinationChainId !== route.destinationChainId) {
      throw new Error(copy().runtimeRouteDestinationChainMismatch)
    }

    if (listenerTopic0 !== route.strategySignalTopic0) {
      throw new Error(copy().runtimeRouteTopicMismatch)
    }
  } catch (error) {
    const knownMessages: string[] = [
      copy().runtimeRouteEmitterMismatch,
      copy().runtimeRouteSourceChainMismatch,
      copy().runtimeRouteDestinationChainMismatch,
      copy().runtimeRouteTopicMismatch
    ]

    if (error instanceof Error && knownMessages.includes(error.message)) {
      throw error
    }

    throw new Error(copy().runtimeRouteListenerUnreadable)
  }
}

export async function resolveWalletBinding(
  ownerAddress: string | null,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
): Promise<WalletBindingContext> {
  const executionAddresses = getExecutionContractAddresses(executionEnvironment)
  const destinationClient = getDestinationPublicClient(executionEnvironment)
  const factoryAddress = configuredAddressOrNull(executionAddresses.walletFactory)

  if (destinationClient && factoryAddress) {
    const [walletAddress, listenerAddress, signalEmitterAddress, sourceChainId, destinationChainId, signalTopic0] =
      ownerAddress !== null
        ? ((await destinationClient.readContract({
            address: factoryAddress,
            abi: willLeadWalletFactoryAbi,
            functionName: 'getWalletContext',
            args: [getAddress(ownerAddress)]
          })) as readonly [Address, Address, Address, bigint, bigint, bigint])
        : [
            emptyAddress as Address,
            emptyAddress as Address,
            emptyAddress as Address,
            0n,
            0n,
            0n
          ]

    return {
      walletAddress: isConfiguredAddress(walletAddress) ? walletAddress : null,
      listenerAddress: isConfiguredAddress(listenerAddress) ? listenerAddress : null,
      signalEmitterAddress: isConfiguredAddress(signalEmitterAddress) ? signalEmitterAddress : null,
      sourceChainId: sourceChainId > 0n ? sourceChainId.toString() : null,
      destinationChainId: destinationChainId > 0n ? destinationChainId.toString() : null,
      strategySignalTopic0: signalTopic0 > 0n ? `0x${signalTopic0.toString(16)}` : null,
      source: 'factory'
    }
  }

  const walletAddress = configuredAddressOrNull(executionAddresses.wallet)
  const listenerAddress = configuredAddressOrNull(executionAddresses.reactiveListener)
  const signalEmitterAddress = configuredAddressOrNull(executionAddresses.signalEmitter)

  return {
    walletAddress,
    listenerAddress,
    signalEmitterAddress,
    sourceChainId: null,
    destinationChainId: null,
    strategySignalTopic0: null,
    source: walletAddress ? 'legacy' : 'none'
  }
}

export async function resolveWalletAddressForOwner(
  ownerAddress: Address,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
): Promise<BoundWalletBindingContext> {
  const binding = await resolveWalletBinding(ownerAddress, executionEnvironment)
  if (!binding.walletAddress) {
    throw new Error(copy().walletNotInitialized)
  }

  const destinationClient = getDestinationPublicClient(executionEnvironment)
  if (!destinationClient) {
    throw new Error(copy().walletAccessUnavailable)
  }

  const walletOwner = (await destinationClient.readContract({
    address: binding.walletAddress,
    abi: willLeadWalletAbi,
    functionName: 'owner'
  })) as Address

  if (!isSameAddress(walletOwner, ownerAddress)) {
    throw new Error(copy().connectedWalletMismatch)
  }

  return {
    ...binding,
    walletAddress: binding.walletAddress
  }
}

export async function resolveReactiveListenerForManager(
  ownerAddress: Address,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
) {
  const binding = await resolveWalletAddressForOwner(ownerAddress, executionEnvironment)
  const executionAddresses = getExecutionContractAddresses(executionEnvironment)
  const destinationClient = getDestinationPublicClient(executionEnvironment)
  const runtimeBinding =
    destinationClient ? await readWalletRuntimeBinding(destinationClient, binding.walletAddress) : null
  const reactiveListenerAddress =
    runtimeBinding?.listener ??
    binding.listenerAddress ??
    configuredAddressOrNull(executionAddresses.reactiveListener)

  if (!reactiveListenerAddress) {
    throw new Error(copy().reactiveListenerMissing)
  }

  const listenerState = await readReactiveListenerState(reactiveListenerAddress, executionEnvironment)
  if (!listenerState.canManageListener(ownerAddress)) {
    throw new Error(copy().listenerManagedByOperator)
  }

  return reactiveListenerAddress
}
