import { formatEther, getAddress, parseEther, type Address } from 'viem'

import { getExecutionContractAddresses } from '../contracts/addresses'
import { callbackProxyAbi } from '../contracts/abi/callbackProxy'
import { willLeadPoolSwapListenerAbi } from '../contracts/abi/willLeadPoolSwapListener'
import { willLeadWalletAbi } from '../contracts/abi/willLeadWallet'
import { willLeadWalletFactoryAbi } from '../contracts/abi/willLeadWalletFactory'
import { getExecutionChain, reactiveChain } from './chains'
import { getDestinationPublicClient, getExecutionWalletClient, getReactivePublicClient, getReactiveWalletClient } from './clients'
import { getMessages, useLanguageStore } from './i18n'
import { getSwapFaucetDemoIntent } from './intentCatalog'
import type {
  ActionResult,
  ExecutionEnvironment,
  SwapIntentFormValues,
  SwapIntentState
} from '../types/willlead'

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

function formatRuntimeStatus(status: number) {
  switch (status) {
    case 1:
      return 'active'
    case 2:
      return 'paused'
    case 3:
      return 'exhausted'
    default:
      return 'inactive'
  }
}

function formatDecimalString(value: string, maxDecimals: number) {
  const [whole, fraction] = value.split('.')
  if (!fraction) return whole

  const trimmedFraction = fraction.slice(0, maxDecimals).replace(/0+$/, '')
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole
}

function formatTimestamp(timestamp: bigint) {
  if (timestamp === 0n) return 'Never'

  return new Date(Number(timestamp) * 1000).toLocaleString('en-US', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

function formatOriginTxHash(value: bigint) {
  if (value === 0n) return 'Unavailable'
  return `0x${value.toString(16).padStart(64, '0')}`
}

async function resolveSwapWalletAddress(
  ownerAddress: string | null,
  executionEnvironment: ExecutionEnvironment
): Promise<Address | null> {
  const client = getDestinationPublicClient(executionEnvironment)
  if (!client) return null

  const executionAddresses = getExecutionContractAddresses(executionEnvironment)
  const configuredWallet = executionAddresses.wallet
  const factoryAddress = executionAddresses.walletFactory

  if (ownerAddress && factoryAddress && factoryAddress !== '0x0000000000000000000000000000000000000000') {
    const walletAddress = await client.readContract({
      address: getAddress(factoryAddress),
      abi: willLeadWalletFactoryAbi,
      functionName: 'walletOf',
      args: [getAddress(ownerAddress)]
    }) as Address

    if (walletAddress.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
      return walletAddress
    }
  }

  if (configuredWallet && configuredWallet !== '0x0000000000000000000000000000000000000000') {
    return getAddress(configuredWallet)
  }

  return null
}

async function ensureSwapListenerArmed(config: NonNullable<ReturnType<typeof getSwapFaucetDemoIntent>>) {
  const reactiveClient = getReactivePublicClient()
  if (!reactiveClient) {
    throw new Error(copy().reactiveRouteVerificationUnavailable)
  }

  const listenerAddress = getAddress(config.listenerAddress)
  const [listenerPaused] = await Promise.all([
    reactiveClient.readContract({
      address: listenerAddress,
      abi: willLeadPoolSwapListenerAbi,
      functionName: 'isPaused'
    }) as Promise<boolean>
  ])

  const { account, client } = await getReactiveWalletClient()
  const ownerAddress = await reactiveClient.readContract({
    address: listenerAddress,
    abi: willLeadPoolSwapListenerAbi,
    functionName: 'ownerAddress'
  }) as Address

  if (ownerAddress.toLowerCase() !== account.toLowerCase()) {
    throw new Error(copy().connectedWalletMismatch)
  }

  if (listenerPaused) {
    const hash = await client.writeContract({
      account,
      address: listenerAddress,
      abi: willLeadPoolSwapListenerAbi,
      chain: reactiveChain,
      functionName: 'resume'
    })
    await reactiveClient.waitForTransactionReceipt({ hash })
  }

  const hash = await client.writeContract({
    account,
    address: listenerAddress,
    abi: willLeadPoolSwapListenerAbi,
    chain: reactiveChain,
    functionName: 'repairSubscriptions'
  })

  await reactiveClient.waitForTransactionReceipt({ hash })
}

function swapRuntimeRouteMatches(
  currentBinding: [Address, Address, `0x${string}`, bigint, bigint, bigint],
  config: NonNullable<ReturnType<typeof getSwapFaucetDemoIntent>>
) {
  return (
    currentBinding[0].toLowerCase() === config.listenerAddress.toLowerCase() &&
    currentBinding[1].toLowerCase() === config.poolManagerAddress.toLowerCase() &&
    currentBinding[2].toLowerCase() === config.watchedPoolId.toLowerCase() &&
    currentBinding[3] === BigInt(config.sourceChainId) &&
    currentBinding[4] === BigInt(config.destinationChainId) &&
    currentBinding[5] === BigInt(config.swapTopic0)
  )
}

function buildUnsupportedSwapIntentState(): SwapIntentState {
  return {
    supported: false,
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
}

export async function readSwapIntentState(
  ownerAddress: string | null,
  executionEnvironment: ExecutionEnvironment
): Promise<SwapIntentState> {
  const config = getSwapFaucetDemoIntent(executionEnvironment)
  if (!config) {
    return buildUnsupportedSwapIntentState()
  }

  const client = getDestinationPublicClient(executionEnvironment)
  if (!client) {
    return {
      ...buildUnsupportedSwapIntentState(),
      supported: true
    }
  }

  const walletAddress = await resolveSwapWalletAddress(ownerAddress, executionEnvironment)
  if (!walletAddress) {
    return {
      ...buildUnsupportedSwapIntentState(),
      supported: true
    }
  }

  const callbackProxyAddress = getExecutionContractAddresses(executionEnvironment).callbackProxy
  const [contractOwner, summary, runtimeBinding, lastExecutedAt, lastOriginTxHash, callbackReserve, callbackDebt, contractBalance] =
    await Promise.all([
    client.readContract({
      address: walletAddress,
      abi: willLeadWalletAbi,
      functionName: 'owner'
    }) as Promise<Address>,
    client.readContract({
      address: walletAddress,
      abi: willLeadWalletAbi,
      functionName: 'getSwapIntentSummary'
    }) as Promise<[number, Address, Address, bigint, bigint, bigint]>,
    client.readContract({
      address: walletAddress,
      abi: willLeadWalletAbi,
      functionName: 'getSwapRuntimeBinding'
    }) as Promise<[Address, Address, `0x${string}`, bigint, bigint, bigint]>,
    client.readContract({
      address: walletAddress,
      abi: willLeadWalletAbi,
      functionName: 'lastSwapExecutedAt'
    }) as Promise<bigint>,
    client.readContract({
      address: walletAddress,
      abi: willLeadWalletAbi,
      functionName: 'lastSwapOriginTxHash'
    }) as Promise<bigint>,
    callbackProxyAddress && callbackProxyAddress !== '0x0000000000000000000000000000000000fffFfF'
      ? (client.readContract({
          address: getAddress(callbackProxyAddress),
          abi: callbackProxyAbi,
          functionName: 'reserves',
          args: [walletAddress]
        }) as Promise<bigint>)
      : Promise.resolve(0n),
    callbackProxyAddress && callbackProxyAddress !== '0x0000000000000000000000000000000000fffFfF'
      ? (client.readContract({
          address: getAddress(callbackProxyAddress),
          abi: callbackProxyAbi,
          functionName: 'debts',
          args: [walletAddress]
        }) as Promise<bigint>)
      : Promise.resolve(0n),
    client.getBalance({ address: walletAddress })
  ])

  const [status, faucet, recipient, requestValue, maxExecutions, executedCount] = summary
  const [listenerAddress, poolManagerAddress, watchedPoolId, sourceChainId, destinationChainId, swapTopic0] =
    runtimeBinding

  return {
    supported: true,
    canManage:
      !!ownerAddress && contractOwner.toLowerCase() === ownerAddress.toLowerCase(),
    runtimeStatus: formatRuntimeStatus(Number(status)),
    executionContractAddress: walletAddress,
    executionContractBalance: formatDecimalString(formatEther(contractBalance), 4),
    faucetAddress: faucet,
    recipient:
      recipient.toLowerCase() === '0x0000000000000000000000000000000000000000'
        ? 'Not configured'
        : recipient,
    requestValue: formatDecimalString(formatEther(requestValue), 4),
    maxExecutions: Number(maxExecutions),
    executedCount: Number(executedCount),
    callbackReserve: formatDecimalString(formatEther(callbackReserve), 4),
    callbackDebt: formatDecimalString(formatEther(callbackDebt), 6),
    listenerAddress,
    poolManagerAddress,
    watchedPoolId,
    sourceChainId: sourceChainId.toString(),
    destinationChainId: destinationChainId.toString(),
    swapTopic0: `0x${swapTopic0.toString(16)}`,
    lastExecutedAt: formatTimestamp(lastExecutedAt),
    lastOriginTxHash: formatOriginTxHash(lastOriginTxHash)
  }
}

async function assertSwapIntentOwnership(
  account: Address,
  executionEnvironment: ExecutionEnvironment,
  walletAddress: Address
) {
  const client = getDestinationPublicClient(executionEnvironment)
  if (!client) {
    throw new Error(copy().walletAccessUnavailable)
  }

  const contractOwner = await client.readContract({
    address: walletAddress,
    abi: willLeadWalletAbi,
    functionName: 'owner'
  }) as Address

  if (contractOwner.toLowerCase() !== account.toLowerCase()) {
    throw new Error(copy().connectedWalletMismatch)
  }
}

export async function configureSwapIntent(values: SwapIntentFormValues): Promise<ActionResult> {
  const executionEnvironment: ExecutionEnvironment = 'primary'
  const config = getSwapFaucetDemoIntent(executionEnvironment)
  if (!config) {
    throw new Error(copy().swapIntentUnsupported)
  }

  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const chain = getExecutionChain(executionEnvironment)
  const walletAddress = await resolveSwapWalletAddress(account, executionEnvironment)
  if (!walletAddress) {
    throw new Error(copy().initializeAutonomousWalletNote)
  }

  await assertSwapIntentOwnership(account, executionEnvironment, walletAddress)

  const publicClient = getDestinationPublicClient(executionEnvironment)
  if (!publicClient) {
    throw new Error(copy().walletAccessUnavailable)
  }

  const currentRuntimeBinding = await publicClient.readContract({
    address: walletAddress,
    abi: willLeadWalletAbi,
    functionName: 'getSwapRuntimeBinding'
  }) as [Address, Address, `0x${string}`, bigint, bigint, bigint]

  if (!swapRuntimeRouteMatches(currentRuntimeBinding, config)) {
    const routeHash = await client.writeContract({
      account,
      address: walletAddress,
      abi: willLeadWalletAbi,
      chain,
      functionName: 'configureSwapRuntimeRoute',
      args: [
        getAddress(config.listenerAddress),
        getAddress(config.poolManagerAddress),
        config.watchedPoolId as `0x${string}`,
        BigInt(config.sourceChainId),
        BigInt(config.destinationChainId),
        BigInt(config.swapTopic0)
      ],
      gas: 250_000n
    })

    await publicClient.waitForTransactionReceipt({ hash: routeHash })
  }

  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain,
    functionName: 'configureSwapIntent',
    args: [
      getAddress(config.faucetAddress),
      getAddress(values.recipient),
      parseEther(values.requestValue),
      BigInt(values.maxExecutions)
    ],
    gas: 250_000n
  })

  await publicClient.waitForTransactionReceipt({ hash })
  await ensureSwapListenerArmed(config)

  return {
    hash,
    label: copy().swapIntentConfiguredAction,
    description: copy().swapIntentConfiguredDesc
  }
}

export async function pauseSwapIntent(): Promise<ActionResult> {
  const executionEnvironment: ExecutionEnvironment = 'primary'
  const config = getSwapFaucetDemoIntent(executionEnvironment)
  if (!config) {
    throw new Error(copy().swapIntentUnsupported)
  }

  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const chain = getExecutionChain(executionEnvironment)
  const walletAddress = await resolveSwapWalletAddress(account, executionEnvironment)
  if (!walletAddress) {
    throw new Error(copy().initializeAutonomousWalletNote)
  }
  await assertSwapIntentOwnership(account, executionEnvironment, walletAddress)
  const publicClient = getDestinationPublicClient(executionEnvironment)
  if (!publicClient) {
    throw new Error(copy().walletAccessUnavailable)
  }

  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain,
    functionName: 'pauseSwapIntent'
  })
  await publicClient.waitForTransactionReceipt({ hash })

  return {
    hash,
    label: copy().swapIntentPausedAction,
    description: copy().swapIntentPausedDesc
  }
}

export async function resumeSwapIntent(): Promise<ActionResult> {
  const executionEnvironment: ExecutionEnvironment = 'primary'
  const config = getSwapFaucetDemoIntent(executionEnvironment)
  if (!config) {
    throw new Error(copy().swapIntentUnsupported)
  }

  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const chain = getExecutionChain(executionEnvironment)
  const walletAddress = await resolveSwapWalletAddress(account, executionEnvironment)
  if (!walletAddress) {
    throw new Error(copy().initializeAutonomousWalletNote)
  }
  await assertSwapIntentOwnership(account, executionEnvironment, walletAddress)
  const publicClient = getDestinationPublicClient(executionEnvironment)
  if (!publicClient) {
    throw new Error(copy().walletAccessUnavailable)
  }

  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain,
    functionName: 'resumeSwapIntent'
  })
  await publicClient.waitForTransactionReceipt({ hash })

  return {
    hash,
    label: copy().swapIntentResumedAction,
    description: copy().swapIntentResumedDesc
  }
}

export async function topUpSwapIntentAutomationCredit(amount: string): Promise<ActionResult> {
  const executionEnvironment: ExecutionEnvironment = 'primary'
  const config = getSwapFaucetDemoIntent(executionEnvironment)
  if (!config) {
    throw new Error(copy().swapIntentUnsupported)
  }

  const callbackProxyAddress = getExecutionContractAddresses(executionEnvironment).callbackProxy
  if (
    !callbackProxyAddress ||
    callbackProxyAddress === '0x0000000000000000000000000000000000fffFfF'
  ) {
    throw new Error(copy().callbackProxyOrWalletMissing)
  }

  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const chain = getExecutionChain(executionEnvironment)
  const walletAddress = await resolveSwapWalletAddress(account, executionEnvironment)
  if (!walletAddress) {
    throw new Error(copy().initializeAutonomousWalletNote)
  }
  const publicClient = getDestinationPublicClient(executionEnvironment)
  if (!publicClient) {
    throw new Error(copy().walletAccessUnavailable)
  }

  await assertSwapIntentOwnership(account, executionEnvironment, walletAddress)

  const hash = await client.writeContract({
    account,
    address: getAddress(callbackProxyAddress),
    abi: callbackProxyAbi,
    chain,
    functionName: 'depositTo',
    args: [walletAddress],
    value: parseEther(amount)
  })

  await publicClient.waitForTransactionReceipt({ hash })

  return {
    hash,
    label: copy().topUpAutomation,
    description: copy().swapIntentFundingNote
  }
}
