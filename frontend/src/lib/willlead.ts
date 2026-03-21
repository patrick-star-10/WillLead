import {
  formatEther,
  getAddress,
  parseAbi,
  parseAbiItem,
  parseEther,
  zeroAddress,
  type Address,
  type Hex
} from 'viem'

import { callbackProxyAbi } from '../contracts/abi/callbackProxy'
import { willLeadReactiveListenerAbi } from '../contracts/abi/willLeadReactiveListener'
import { willLeadWalletFactoryAbi } from '../contracts/abi/willLeadWalletFactory'
import { willLeadWalletAbi } from '../contracts/abi/willLeadWallet'
import { contractAddresses } from '../contracts/addresses'
import type {
  ActionResult,
  AutomationReadiness,
  AssetBalance,
  AutomationCreditState,
  ExecutionProof,
  AutomationFundingValues,
  IntentFormValues,
  IntentState,
  WalletFundingValues,
  OperatorServiceStatus,
  SingleSignatureReadiness,
  WalletAccessState,
  WalletConnectResult,
  WalletConnectionSource,
  WalletState
} from '../types/willlead'
import {
  disconnectBrowserWalletSession,
  getDestinationPublicClient,
  getDestinationWalletClient,
  getInjectedWalletOptions,
  getOriginPublicClient,
  getReactivePublicClient,
  getReactiveWalletClient,
  requestWalletAddress
} from './clients'
import { destinationChain, reactiveChain } from './chains'
import { txExplorerLink } from './explorers'
import { getMessages, useLanguageStore } from './i18n'
import {
  createWebWallet,
  disconnectWalletSession,
  importWebWallet,
  restoreWebWallet
} from './webWallet'

const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
const emptyAddress = '0x0000000000000000000000000000000000000000'
const reactiveSystemContract = '0x0000000000000000000000000000000000fffFfF'
const subscribeContractTopic0 =
  '0xf2856a60f496a79f2738ebb36013248bb2f4a85116d90c2a595a96ef780137d2'
const erc20Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
])
const reactiveSystemAbi = parseAbi([
  'function subscribeContract(address contractAddress,uint256 chainId,address sourceContract,uint256 topic0,uint256 topic1,uint256 topic2,uint256 topic3)'
])
const reactiveIgnore =
  '0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad' as Hex

function isConfiguredAddress(value: string) {
  return value.toLowerCase() !== emptyAddress
}

function isSameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase()
}

function configuredAddressOrNull(value: string | undefined) {
  if (!value) return null
  return isConfiguredAddress(value) ? getAddress(value) : null
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

function formatAmount(amount: bigint) {
  return `${formatDecimalString(formatEther(amount), 3)} ETH`
}

function formatUint256Topic(value: bigint) {
  return `0x${value.toString(16).padStart(64, '0')}`
}

function formatAddressTopic(value: Address) {
  return `0x${value.toLowerCase().replace('0x', '').padStart(64, '0')}`
}

function formatTokenAmount(amount: bigint, decimals: number) {
  const decimalFactor = 10n ** BigInt(decimals)
  const whole = amount / decimalFactor
  const fraction = amount % decimalFactor

  if (fraction === 0n) return whole.toString()

  const paddedFraction = fraction.toString().padStart(decimals, '0').slice(0, 3).replace(/0+$/, '')
  return paddedFraction ? `${whole}.${paddedFraction}` : whole.toString()
}

function formatDecimalString(value: string, maxDecimals: number) {
  const [whole, fraction] = value.split('.')
  if (!fraction) return whole

  const trimmedFraction = fraction.slice(0, maxDecimals).replace(/0+$/, '')
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole
}

function toTokenAddress(tokenInput: string): Address {
  if (!tokenInput.trim() || tokenInput === 'native') {
    return zeroAddress
  }

  return getAddress(tokenInput)
}

export function getBrowserWalletOptions() {
  return getInjectedWalletOptions()
}

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export async function connectOwnerWallet(providerId: string) {
  const { address, providerId: connectedProviderId, providerLabel } = await requestWalletAddress(
    providerId
  )
  await getDestinationWalletClient()
  return {
    address,
    source: 'browser',
    providerId: connectedProviderId,
    providerLabel
  } satisfies WalletConnectResult
}

export async function createOwnerWebWallet() {
  return createWebWallet()
}

export async function importOwnerWebWallet(mnemonic: string) {
  return importWebWallet(mnemonic)
}

export async function restoreOwnerWallet() {
  return restoreWebWallet()
}

export async function disconnectOwnerWallet() {
  disconnectWalletSession()
  disconnectBrowserWalletSession()
}

function formatConnectionLabel(source: WalletConnectionSource) {
  if (source === 'browser') return 'Browser Wallet'
  if (source === 'web') return 'Web Wallet'
  return 'Not connected'
}

type WalletBindingContext = {
  walletAddress: Address | null
  listenerAddress: Address | null
  signalEmitterAddress: Address | null
  source: 'factory' | 'legacy' | 'none'
}

type BoundWalletBindingContext = Omit<WalletBindingContext, 'walletAddress'> & {
  walletAddress: Address
}

type OperatorRuntime = {
  serviceStatus: OperatorServiceStatus
  lastHeartbeat: string
  listenerBalance: string
  listenerDebt: string
  lastFundingResult: string
  apiUrl: string | null
}

const unknownOperatorRuntime: OperatorRuntime = {
  serviceStatus: 'unknown',
  lastHeartbeat: 'Never',
  listenerBalance: 'Unavailable',
  listenerDebt: 'Unavailable',
  lastFundingResult: 'Unknown',
  apiUrl: null
}

async function resolveWalletBinding(ownerAddress: string | null): Promise<WalletBindingContext> {
  const destinationClient = getDestinationPublicClient()
  const factoryAddress = configuredAddressOrNull(contractAddresses.walletFactory)

  if (destinationClient && factoryAddress) {
    const [listenerAddress, signalEmitterAddress, walletAddress] = await Promise.all([
      destinationClient.readContract({
        address: factoryAddress,
        abi: willLeadWalletFactoryAbi,
        functionName: 'reactiveListener'
      }) as Promise<Address>,
      destinationClient.readContract({
        address: factoryAddress,
        abi: willLeadWalletFactoryAbi,
        functionName: 'signalEmitter'
      }) as Promise<Address>,
      ownerAddress !== null
        ? (destinationClient.readContract({
            address: factoryAddress,
            abi: willLeadWalletFactoryAbi,
            functionName: 'walletOf',
            args: [getAddress(ownerAddress)]
          }) as Promise<Address>)
        : Promise.resolve(emptyAddress as Address)
    ])

    return {
      walletAddress: isConfiguredAddress(walletAddress) ? walletAddress : null,
      listenerAddress,
      signalEmitterAddress,
      source: 'factory'
    }
  }

  const walletAddress = configuredAddressOrNull(contractAddresses.wallet)
  const listenerAddress = configuredAddressOrNull(contractAddresses.reactiveListener)
  const signalEmitterAddress = configuredAddressOrNull(contractAddresses.signalEmitter)

  return {
    walletAddress,
    listenerAddress,
    signalEmitterAddress,
    source: walletAddress ? 'legacy' : 'none'
  }
}

async function resolveWalletAddressForOwner(ownerAddress: Address): Promise<BoundWalletBindingContext> {
  const binding = await resolveWalletBinding(ownerAddress)
  if (!binding.walletAddress) {
    throw new Error(copy().walletNotInitialized)
  }

  const destinationClient = getDestinationPublicClient()
  if (!destinationClient) {
    throw new Error(copy().walletAccessUnavailable)
  }

  const walletOwner = await destinationClient.readContract({
    address: binding.walletAddress,
    abi: willLeadWalletAbi,
    functionName: 'owner'
  }) as Address

  if (!isSameAddress(walletOwner, ownerAddress)) {
    throw new Error(copy().connectedWalletMismatch)
  }

  return {
    ...binding,
    walletAddress: binding.walletAddress
  }
}

async function resolveReactiveListenerForManager(ownerAddress: Address) {
  const binding = await resolveWalletBinding(ownerAddress)
  const reactiveListenerAddress =
    binding.listenerAddress ?? configuredAddressOrNull(contractAddresses.reactiveListener)

  if (!reactiveListenerAddress) {
    throw new Error(copy().reactiveListenerMissing)
  }

  const listenerState = await readReactiveListenerState(reactiveListenerAddress)
  if (!listenerState.canManageListener(ownerAddress)) {
    throw new Error(copy().listenerManagedByOperator)
  }

  return reactiveListenerAddress
}

function buildUnboundSnapshot(params: {
  ownerAddress: string | null
  connectionSource: WalletConnectionSource
  connectedBalanceLabel: string
  connectedAssetBalances: AssetBalance[]
  walletAccessState: WalletAccessState
}) {
  const { ownerAddress, connectionSource, connectedBalanceLabel, connectedAssetBalances, walletAccessState } =
    params

  return {
    wallet: {
      contractAddress: 'Unavailable',
      listenerAddress: 'Unavailable',
      signalEmitterAddress: 'Unavailable',
      ownerAddress,
      connectionSource,
      connectionLabel: formatConnectionLabel(connectionSource),
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
      canManageListener: false,
      listenerPaused: null,
      callbackGasLimit: 'Unavailable',
      subscriptionStatus: 'unavailable' as const,
      subscriptionOriginChainId: 'Unavailable',
      subscriptionDestinationChainId: 'Unavailable',
      subscriptionTopic0: 'Unavailable',
      operatorServiceStatus: 'unknown' as const,
      operatorLastHeartbeat: 'Never',
      operatorListenerBalance: 'Unavailable',
      operatorListenerDebt: 'Unavailable',
      operatorLastFundingResult: 'Unknown',
      automationReadiness: 'unavailable' as const,
      singleSignatureReadiness: 'unavailable' as const
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
    executionProofs: []
  } satisfies {
    wallet: WalletState
    intent: IntentState
    automation: AutomationCreditState
    executionProofs: ExecutionProof[]
  }
}

async function readOperatorRuntime(): Promise<OperatorRuntime> {
  if (typeof window === 'undefined') {
    return unknownOperatorRuntime
  }

  try {
    const response = await fetch(`/runtime/operator-status.json?ts=${Date.now()}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return {
        serviceStatus: 'offline',
        lastHeartbeat: 'Never',
        listenerBalance: 'Unavailable',
        listenerDebt: 'Unavailable',
        lastFundingResult: 'Unknown',
        apiUrl: null
      }
    }

    const payload = await response.json() as {
      heartbeatAt?: string
      serviceStatus?: string
      listenerBalanceWei?: string
      listenerDebtWei?: string
      lastFundingResult?: string
      apiUrl?: string
    }
    if (!payload.heartbeatAt) {
      return {
        serviceStatus: 'unknown',
        lastHeartbeat: 'Never',
        listenerBalance: 'Unavailable',
        listenerDebt: 'Unavailable',
        lastFundingResult: 'Unknown',
        apiUrl: null
      }
    }

    const heartbeatDate = new Date(payload.heartbeatAt)
    const fresh = Date.now() - heartbeatDate.getTime() <= 15_000

    return {
      serviceStatus: payload.serviceStatus === 'online' && fresh ? 'online' : 'offline',
      lastHeartbeat: heartbeatDate.toLocaleString('en-US', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }),
      listenerBalance: payload.listenerBalanceWei
        ? formatAmount(BigInt(payload.listenerBalanceWei))
        : 'Unavailable',
      listenerDebt: payload.listenerDebtWei ? formatAmount(BigInt(payload.listenerDebtWei)) : 'Unavailable',
      lastFundingResult: payload.lastFundingResult ?? 'Unknown',
      apiUrl: payload.apiUrl ?? null
    }
  } catch {
    return {
      serviceStatus: 'offline',
      lastHeartbeat: 'Never',
      listenerBalance: 'Unavailable',
      listenerDebt: 'Unavailable',
      lastFundingResult: 'Unknown',
      apiUrl: null
    }
  }
}

function computeAutomationReadiness(params: {
  runtimeStatus: WalletState['runtimeStatus']
  listenerPaused: boolean | null
  subscriptionStatus: WalletState['subscriptionStatus']
}): AutomationReadiness {
  if (params.runtimeStatus === 'paused') return 'intent_paused'
  if (params.runtimeStatus === 'exhausted') return 'intent_exhausted'
  if (params.runtimeStatus !== 'active') return 'intent_inactive'
  if (params.listenerPaused === null) return 'unavailable'
  if (params.listenerPaused) return 'listener_paused'
  if (params.subscriptionStatus !== 'armed') return 'arming_listener'
  return 'waiting_signal'
}

function computeSingleSignatureReadiness(params: {
  operatorServiceStatus: WalletState['operatorServiceStatus']
  automationReadiness: AutomationReadiness
}): SingleSignatureReadiness {
  if (params.automationReadiness === 'unavailable') return 'unavailable'
  if (params.operatorServiceStatus !== 'online') return 'requires_operator'
  return 'ready'
}

export async function readWalletState(
  ownerAddress: string | null,
  connectionSource: WalletConnectionSource = 'disconnected',
  detailLevel: 'core' | 'full' = 'full'
): Promise<{
  wallet: WalletState
  intent: IntentState
  automation: AutomationCreditState
  executionProofs: ExecutionProof[]
}> {
  const destinationClient = getDestinationPublicClient()
  const originClient = detailLevel === 'full' ? getOriginPublicClient() : null
  const reactiveClient = detailLevel === 'full' ? getReactivePublicClient() : null
  const operatorRuntime = await readOperatorRuntime()
  let connectedBalance = 0n
  if (destinationClient && ownerAddress !== null) {
    try {
      connectedBalance = await destinationClient.getBalance({ address: getAddress(ownerAddress) })
    } catch {}
  }
  const connectedBalanceLabel = ownerAddress !== null ? formatAmount(connectedBalance) : 'Unavailable'
  const connectedAssetBalances =
    ownerAddress !== null
      ? [
          {
            symbol: 'ETH',
            balanceLabel: connectedBalanceLabel,
            kind: 'native' as const
          }
        ]
      : []

  if (!destinationClient) {
    return buildUnboundSnapshot({
      ownerAddress,
      connectionSource,
      connectedBalanceLabel,
      connectedAssetBalances,
      walletAccessState: 'unavailable'
    })
  }

  try {
    const binding = await resolveWalletBinding(ownerAddress)
    const walletAddress = binding.walletAddress
    const reactiveListenerAddress = binding.listenerAddress

    if (!walletAddress || !reactiveListenerAddress || ownerAddress === null) {
      return buildUnboundSnapshot({
        ownerAddress,
        connectionSource,
        connectedBalanceLabel,
        connectedAssetBalances,
        walletAccessState:
          ownerAddress === null
            ? 'needs_connection'
            : binding.source === 'factory'
              ? 'needs_wallet'
              : 'unavailable'
      })
    }

    const configuredWalletOwner = await destinationClient.readContract({
      address: walletAddress,
      abi: willLeadWalletAbi,
      functionName: 'owner'
    }) as Address

    if (!isSameAddress(configuredWalletOwner, ownerAddress)) {
      return buildUnboundSnapshot({
        ownerAddress,
        connectionSource,
        connectedBalanceLabel,
        connectedAssetBalances,
        walletAccessState: 'mismatch'
      })
    }

    const [summary, balance, lastExecutionNonce, lastExecutedAt, lastSignalHash] = await Promise.all([
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
      }) as Promise<Hex>
    ])

    const [status, token, recipient, amountPerExecution, maxExecutions, executedCount, automationFloor] =
      summary
    const assetBalances = await readTrackedAssets(destinationClient, walletAddress, balance, token)
    const runtimeStatus = formatRuntimeStatus(status)
    if (detailLevel === 'core') {
      return {
        wallet: {
          contractAddress: walletAddress,
          listenerAddress: reactiveListenerAddress,
          signalEmitterAddress: binding.signalEmitterAddress ?? emptyAddress,
          ownerAddress,
          connectionSource,
          connectionLabel: formatConnectionLabel(connectionSource),
          balanceContextLabel: 'Autonomous wallet contract balance',
          balanceLabel: formatAmount(balance),
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
          destinationBalanceDelta: executedCount > 0n ? `-${formatAmount(amountPerExecution)}` : '0 ETH',
          canManageListener: false,
          listenerPaused: null,
          callbackGasLimit: 'Unavailable',
          subscriptionStatus: 'unavailable',
          subscriptionOriginChainId: 'Unavailable',
          subscriptionDestinationChainId: 'Unavailable',
          subscriptionTopic0: 'Unavailable',
          operatorServiceStatus: operatorRuntime.serviceStatus,
          operatorLastHeartbeat: operatorRuntime.lastHeartbeat,
          operatorListenerBalance: operatorRuntime.listenerBalance,
          operatorListenerDebt: operatorRuntime.listenerDebt,
          operatorLastFundingResult: operatorRuntime.lastFundingResult,
          automationReadiness: 'unavailable',
          singleSignatureReadiness: 'unavailable'
        },
        intent: {
          token: token === zeroAddress ? 'native' : token,
          recipient,
          amountPerExecution: formatEther(amountPerExecution),
          maxExecutions: Number(maxExecutions),
          executedCount: Number(executedCount),
          minAutomationBalance: formatEther(automationFloor),
          enabled: status === 1
        },
        automation: {
          creditLabel: 'Unknown',
          availableBalance: 'Unknown',
          minRequiredBalance: formatAmount(automationFloor)
        },
        executionProofs: []
      }
    }

    const listenerState = await readReactiveListenerState(reactiveListenerAddress)
    const automation = await readAutomationCredit(walletAddress, automationFloor)
    const proofs = await readExecutionProofs(
      walletAddress,
      reactiveListenerAddress,
      listenerState.signalEmitter,
      originClient,
      reactiveClient,
      destinationClient
    )
    const automationReadiness = computeAutomationReadiness({
      runtimeStatus,
      listenerPaused: listenerState.listenerPaused,
      subscriptionStatus: listenerState.subscriptionStatus
    })

    return {
      wallet: {
        contractAddress: walletAddress,
        listenerAddress: reactiveListenerAddress,
        signalEmitterAddress: listenerState.signalEmitter,
        ownerAddress,
        connectionSource,
        connectionLabel: formatConnectionLabel(connectionSource),
        balanceContextLabel: 'Autonomous wallet contract balance',
        balanceLabel: formatAmount(balance),
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
        destinationBalanceDelta: executedCount > 0n ? `-${formatAmount(amountPerExecution)}` : '0 ETH',
        canManageListener: listenerState.canManageListener(ownerAddress),
        listenerPaused: listenerState.listenerPaused,
        callbackGasLimit: listenerState.callbackGasLimit,
        subscriptionStatus: listenerState.subscriptionStatus,
        subscriptionOriginChainId: listenerState.originChainId,
        subscriptionDestinationChainId: listenerState.destinationChainId,
        subscriptionTopic0: listenerState.strategySignalTopic0,
        operatorServiceStatus: operatorRuntime.serviceStatus,
        operatorLastHeartbeat: operatorRuntime.lastHeartbeat,
        operatorListenerBalance: operatorRuntime.listenerBalance,
        operatorListenerDebt: operatorRuntime.listenerDebt,
        operatorLastFundingResult: operatorRuntime.lastFundingResult,
        automationReadiness,
        singleSignatureReadiness: computeSingleSignatureReadiness({
          operatorServiceStatus: operatorRuntime.serviceStatus,
          automationReadiness
        })
      },
      intent: {
        token: token === zeroAddress ? 'native' : token,
        recipient,
        amountPerExecution: formatEther(amountPerExecution),
        maxExecutions: Number(maxExecutions),
        executedCount: Number(executedCount),
        minAutomationBalance: formatEther(automationFloor),
        enabled: status === 1
      },
      automation,
      executionProofs: proofs
    }
  } catch {
    return buildUnboundSnapshot({
      ownerAddress,
      connectionSource,
      connectedBalanceLabel,
      connectedAssetBalances,
      walletAccessState: 'unavailable'
    })
  }
}

async function readTrackedAssets(
  destinationClient: NonNullable<ReturnType<typeof getDestinationPublicClient>>,
  walletAddress: Address,
  nativeBalance: bigint,
  intentToken: Address
): Promise<AssetBalance[]> {
  const balances: AssetBalance[] = [
    {
      symbol: 'ETH',
      balanceLabel: formatAmount(nativeBalance),
      kind: 'native'
    }
  ]

  if (intentToken === zeroAddress) return balances

  try {
    const [tokenBalance, decimals, symbol] = await Promise.all([
      destinationClient.readContract({
        address: intentToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress]
      }) as Promise<bigint>,
      destinationClient.readContract({
        address: intentToken,
        abi: erc20Abi,
        functionName: 'decimals'
      }) as Promise<number>,
      destinationClient.readContract({
        address: intentToken,
        abi: erc20Abi,
        functionName: 'symbol'
      }) as Promise<string>
    ])

    balances.push({
      symbol,
      balanceLabel: `${formatTokenAmount(tokenBalance, decimals)} ${symbol}`,
      kind: 'erc20'
    })
  } catch {}

  return balances
}

async function readReactiveListenerState(reactiveListenerAddress: Address) {
  type ListenerRuntime = {
    listenerPaused: boolean | null
    callbackGasLimit: string
    signalEmitter: Address
    ownerAddress: Address
    originChainId: string
    destinationChainId: string
    strategySignalTopic0: string
    subscriptionStatus: 'armed' | 'missing' | 'unavailable'
    canManageListener: (ownerAddress: string | null) => boolean
  }

  const reactiveClient = getReactivePublicClient()
  const unavailableRuntime = {
    listenerPaused: null,
    callbackGasLimit: '1000000',
    signalEmitter: emptyAddress as Address,
    ownerAddress: emptyAddress as Address,
    originChainId: 'Unavailable',
    destinationChainId: 'Unavailable',
    strategySignalTopic0: 'Unavailable',
    subscriptionStatus: 'unavailable' as const,
    canManageListener: (_ownerAddress: string | null) => false
  } satisfies ListenerRuntime

  if (!reactiveClient || !isConfiguredAddress(reactiveListenerAddress)) {
    return unavailableRuntime
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

    let subscriptionStatus: 'armed' | 'missing' | 'unavailable' = 'missing'

    try {
      const logs = await reactiveClient.request({
        method: 'eth_getLogs',
        params: [
          {
            address: reactiveSystemContract as Hex,
            fromBlock: '0x0',
            topics: [
              subscribeContractTopic0,
              formatAddressTopic(reactiveListenerAddress),
              formatUint256Topic(originChainId),
              formatAddressTopic(signalEmitter)
            ] as [Hex, Hex, Hex, Hex]
          }
        ]
      })

      const expectedStrategySignalTopic0 = strategySignalTopic0
        .toString(16)
        .padStart(64, '0')
        .toLowerCase()
      const expectedAuthorizedRvmId = contractAddresses.authorizedRvmId
        .toLowerCase()
        .replace('0x', '')
        .padStart(40, '0')

      const matchingLogs = (logs as Array<{ data?: string }>).filter((entry) => {
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

    return {
      listenerPaused,
      callbackGasLimit: callbackGasLimit.toString(),
      signalEmitter,
      ownerAddress: listenerOwnerAddress,
      originChainId: originChainId.toString(),
      destinationChainId: destinationChainId.toString(),
      strategySignalTopic0: `0x${strategySignalTopic0.toString(16)}`,
      subscriptionStatus,
      canManageListener: (ownerAddress: string | null) =>
        ownerAddress !== null && isSameAddress(listenerOwnerAddress, ownerAddress)
    } satisfies ListenerRuntime
  } catch {
    return unavailableRuntime
  }
}

async function readAutomationCredit(
  walletAddress: Address,
  automationFloor: bigint
): Promise<AutomationCreditState> {
  const destinationClient = getDestinationPublicClient()

  if (!destinationClient || !isConfiguredAddress(contractAddresses.callbackProxy)) {
    return {
      creditLabel: 'Unknown',
      availableBalance: 'Unknown',
      minRequiredBalance: formatAmount(automationFloor)
    }
  }

  const callbackProxy = getAddress(contractAddresses.callbackProxy)
  try {
    const [reserves, debts] = await Promise.all([
      destinationClient.readContract({
        address: callbackProxy,
        abi: callbackProxyAbi,
        functionName: 'reserves',
        args: [walletAddress]
      }) as Promise<bigint>,
      destinationClient.readContract({
        address: callbackProxy,
        abi: callbackProxyAbi,
        functionName: 'debts',
        args: [walletAddress]
      }) as Promise<bigint>
    ])

    const net = reserves > debts ? reserves - debts : 0n
    const creditLabel = net >= automationFloor ? 'Healthy' : 'Low'

    return {
      creditLabel,
      availableBalance: formatAmount(net),
      minRequiredBalance: formatAmount(automationFloor)
    }
  } catch {
    return {
      creditLabel: 'Unknown',
      availableBalance: 'Unknown',
      minRequiredBalance: formatAmount(automationFloor)
    }
  }
}

async function readExecutionProofs(
  walletAddress: Address,
  reactiveListenerAddress: Address,
  signalEmitterAddress: Address,
  originClient: ReturnType<typeof getOriginPublicClient>,
  reactiveClient: ReturnType<typeof getReactivePublicClient>,
  destinationClient: NonNullable<ReturnType<typeof getDestinationPublicClient>>
): Promise<ExecutionProof[]> {
  type HistoryItem = ExecutionProof & {
    blockNumber: bigint
    logIndex: number
  }

  const proofs: HistoryItem[] = []

  try {
    const executionLogs = await destinationClient.getLogs({
      address: walletAddress,
      event: parseAbiItem(
        'event IntentExecuted(address indexed wallet, address indexed token, address indexed recipient, uint256 amount, uint256 executionNonce, bytes32 signalHash, uint256 originTxHash)'
      ),
      fromBlock: 0n,
      strict: true
    })

    for (const executionLog of executionLogs) {
      const block = await destinationClient.getBlock({ blockNumber: executionLog.blockNumber! })
      proofs.push({
        id: `wallet-${executionLog.transactionHash}`,
        label: 'Destination Execution',
        description: 'Autonomous wallet executed the transfer on the destination chain.',
        status: 'success',
        reference: executionLog.transactionHash ?? 'unknown',
        chain: 'destination',
        timestampLabel: formatTimestamp(block.timestamp),
        nonceLabel: executionLog.args.executionNonce?.toString() ?? null,
        detailLabel: null,
        href: txExplorerLink('destination', executionLog.transactionHash),
        blockNumber: executionLog.blockNumber ?? 0n,
        logIndex: Number(executionLog.logIndex ?? 0)
      })
    }
  } catch {}

  try {
    const skippedLogs = await destinationClient.getLogs({
      address: walletAddress,
      event: parseAbiItem(
        'event IntentExecutionSkipped(address indexed wallet, uint256 executionNonce, bytes32 signalHash, string reason)'
      ),
      fromBlock: 0n,
      strict: true
    })

    for (const skippedLog of skippedLogs) {
      const block = await destinationClient.getBlock({ blockNumber: skippedLog.blockNumber! })
      proofs.push({
        id: `skipped-${skippedLog.transactionHash}-${skippedLog.logIndex}`,
        label: 'Destination Skipped',
        description: 'Autonomous wallet skipped execution and recorded the reason.',
        status: 'skipped',
        reference: skippedLog.transactionHash ?? 'unknown',
        chain: 'destination',
        timestampLabel: formatTimestamp(block.timestamp),
        nonceLabel: skippedLog.args.executionNonce?.toString() ?? null,
        detailLabel: typeof skippedLog.args.reason === 'string' ? skippedLog.args.reason : null,
        href: txExplorerLink('destination', skippedLog.transactionHash),
        blockNumber: skippedLog.blockNumber ?? 0n,
        logIndex: Number(skippedLog.logIndex ?? 0)
      })
    }
  } catch {}

  try {
    if (reactiveClient && isConfiguredAddress(reactiveListenerAddress)) {
      const callbackLogs = await reactiveClient.getLogs({
        address: reactiveSystemContract as Address,
        event: parseAbiItem('event WhitelistContract(address indexed contractAddress)'),
        args: {
          contractAddress: reactiveListenerAddress
        },
        fromBlock: 0n,
        strict: true
      })

      for (const callbackLog of callbackLogs) {
        const block = await reactiveClient.getBlock({ blockNumber: callbackLog.blockNumber! })
        proofs.push({
          id: `callback-${callbackLog.transactionHash}-${callbackLog.logIndex}`,
          label: 'Reactive Dispatch',
          description: 'Reactive system accepted the listener job and dispatched the destination callback.',
          status: 'observed',
          reference: callbackLog.transactionHash ?? 'unknown',
          chain: 'reactive',
          timestampLabel: formatTimestamp(block.timestamp),
          nonceLabel: null,
          detailLabel: null,
          href: txExplorerLink('reactive', callbackLog.transactionHash),
          blockNumber: callbackLog.blockNumber ?? 0n,
          logIndex: Number(callbackLog.logIndex ?? 0)
        })
      }
    }
  } catch {}

  try {
    if (originClient && isConfiguredAddress(signalEmitterAddress)) {
      const signalLogs = await originClient.getLogs({
        address: signalEmitterAddress,
        event: parseAbiItem(
          'event StrategySignal(address indexed wallet, address indexed token, address indexed recipient, uint256 amount, uint256 executionNonce, uint256 emittedAt)'
        ),
        fromBlock: 0n,
        strict: true
      })

      for (const signalLog of signalLogs) {
        const block = await originClient.getBlock({ blockNumber: signalLog.blockNumber! })
        proofs.push({
          id: `signal-${signalLog.transactionHash}-${signalLog.logIndex}`,
          label: 'Origin Signal',
          description: 'Source chain signal emitted for the wallet intent.',
          status: 'observed',
          reference: signalLog.transactionHash ?? 'unknown',
          chain: 'origin',
          timestampLabel: formatTimestamp(block.timestamp),
          nonceLabel: signalLog.args.executionNonce?.toString() ?? null,
          detailLabel: null,
          href: txExplorerLink('origin', signalLog.transactionHash),
          blockNumber: signalLog.blockNumber ?? 0n,
          logIndex: Number(signalLog.logIndex ?? 0)
        })
      }
    }
  } catch {}

  return proofs
    .sort((left, right) => {
      if (left.blockNumber === right.blockNumber) {
        return right.logIndex - left.logIndex
      }
      return left.blockNumber > right.blockNumber ? -1 : 1
    })
    .slice(0, 12)
    .map(({ blockNumber: _blockNumber, logIndex: _logIndex, ...proof }) => proof)
}

export async function configureIntent(values: IntentFormValues): Promise<ActionResult> {
  const { account, client } = await getDestinationWalletClient()
  const { walletAddress } = await resolveWalletAddressForOwner(account)
  const token = toTokenAddress(values.token)
  const recipient = getAddress(values.recipient)
  const amountPerExecution = parseEther(values.amountPerExecution)
  const automationFloor = parseEther(values.minAutomationBalance)

  if (amountPerExecution <= 0n) {
    throw new Error('Amount per execution must be greater than 0.')
  }
  if (values.maxExecutions <= 0) {
    throw new Error('Max executions must be greater than 0.')
  }

  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain: destinationChain,
    functionName: 'configureIntent',
    args: [token, recipient, amountPerExecution, BigInt(values.maxExecutions), automationFloor],
    gas: 300_000n
  })

  const destinationClient = getDestinationPublicClient()
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().intentConfiguredAction,
    description: copy().intentConfiguredDesc
  }
}

export async function ensureReactiveListenerArmed(): Promise<ActionResult | null> {
  const { account, client } = await getReactiveWalletClient()
  const reactiveListenerAddress = await resolveReactiveListenerForManager(account)
  const listenerState = await readReactiveListenerState(reactiveListenerAddress)

  if (listenerState.listenerPaused === false && listenerState.subscriptionStatus === 'armed') {
    return null
  }

  let hash: Hex

  if (listenerState.listenerPaused) {
    hash = await client.writeContract({
      account,
      address: reactiveListenerAddress,
      abi: willLeadReactiveListenerAbi,
      chain: reactiveChain,
      functionName: 'resume'
    })
  } else {
    hash = await client.writeContract({
      account,
      address: reactiveSystemContract as Address,
      abi: reactiveSystemAbi,
      chain: reactiveChain,
      functionName: 'subscribeContract',
      args: [
        reactiveListenerAddress,
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

  return {
    hash,
    label: copy().reactiveListenerArmedAction,
    description: copy().reactiveListenerArmedDesc
  }
}

export async function pauseIntent(): Promise<ActionResult> {
  const { account, client } = await getDestinationWalletClient()
  const { walletAddress } = await resolveWalletAddressForOwner(account)
  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain: destinationChain,
    functionName: 'pauseIntent'
  })

  const destinationClient = getDestinationPublicClient()
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().intentPausedAction,
    description: copy().intentPausedDesc
  }
}

export async function resumeIntent(): Promise<ActionResult> {
  const { account, client } = await getDestinationWalletClient()
  const { walletAddress } = await resolveWalletAddressForOwner(account)
  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain: destinationChain,
    functionName: 'resumeIntent'
  })

  const destinationClient = getDestinationPublicClient()
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().intentResumedAction,
    description: copy().intentResumedDesc
  }
}

export async function emitSignal(_values: {
  token: string
  recipient: string
  amountPerExecution: string
  nextNonce: number
}): Promise<ActionResult> {
  const operatorRuntime = await readOperatorRuntime()
  if (operatorRuntime.serviceStatus !== 'online' || !operatorRuntime.apiUrl) {
    throw new Error(copy().operatorServiceRequiredForTestSignal)
  }

  const response = await fetch(`${operatorRuntime.apiUrl}/test-signal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  })

  const payload = await response
    .json()
    .catch(() => ({ error: copy().failedEmitSourceSignal })) as { hash?: string; error?: string }

  if (!response.ok || !payload.hash) {
    throw new Error(payload.error || copy().failedEmitSourceSignal)
  }

  return {
    hash: payload.hash,
    label: copy().sourceSignalEmittedAction,
    description: copy().sourceSignalEmittedDesc
  }
}

export async function topUpAutomationCredit(
  values: AutomationFundingValues
): Promise<ActionResult> {
  const callbackProxyAddress = getAddress(contractAddresses.callbackProxy)
  if (!isConfiguredAddress(callbackProxyAddress)) {
    throw new Error(copy().callbackProxyOrWalletMissing)
  }

  const { account, client } = await getDestinationWalletClient()
  const { walletAddress } = await resolveWalletAddressForOwner(account)
  const hash = await client.writeContract({
    account,
    address: callbackProxyAddress,
    abi: callbackProxyAbi,
    chain: destinationChain,
    functionName: 'depositTo',
    args: [walletAddress],
    value: parseEther(values.amount)
  })

  const destinationClient = getDestinationPublicClient()
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().automationCreditToppedUpAction,
    description: copy().automationCreditToppedUpDesc
  }
}

export async function fundAutonomousWallet(
  values: WalletFundingValues
): Promise<ActionResult> {
  const { account, client } = await getDestinationWalletClient()
  const { walletAddress } = await resolveWalletAddressForOwner(account)
  const hash = await client.sendTransaction({
    account,
    chain: destinationChain,
    to: walletAddress,
    value: parseEther(values.amount)
  })

  const destinationClient = getDestinationPublicClient()
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().autonomousWalletFundedAction,
    description: copy().autonomousWalletFundedDesc
  }
}

export async function initializeAutonomousWallet(): Promise<ActionResult> {
  const factoryAddress = configuredAddressOrNull(contractAddresses.walletFactory)
  if (!factoryAddress) {
    throw new Error(copy().walletFactoryMissing)
  }

  const { account, client } = await getDestinationWalletClient()
  const hash = await client.writeContract({
    account,
    address: factoryAddress,
    abi: willLeadWalletFactoryAbi,
    chain: destinationChain,
    functionName: 'createWallet'
  })

  const destinationClient = getDestinationPublicClient()
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().autonomousWalletCreatedAction,
    description: copy().autonomousWalletCreatedDesc
  }
}

export async function pauseReactiveListener(): Promise<ActionResult> {
  const { account, client } = await getReactiveWalletClient()
  const reactiveListenerAddress = await resolveReactiveListenerForManager(account)
  const hash = await client.writeContract({
    account,
    address: reactiveListenerAddress,
    abi: willLeadReactiveListenerAbi,
    chain: reactiveChain,
    functionName: 'pause'
  })

  const reactiveClient = getReactivePublicClient()
  if (reactiveClient) {
    await reactiveClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().reactiveListenerPausedAction,
    description: copy().reactiveListenerPausedDesc
  }
}

export async function resumeReactiveListener(): Promise<ActionResult> {
  const { account, client } = await getReactiveWalletClient()
  const reactiveListenerAddress = await resolveReactiveListenerForManager(account)
  const hash = await client.writeContract({
    account,
    address: reactiveListenerAddress,
    abi: willLeadReactiveListenerAbi,
    chain: reactiveChain,
    functionName: 'resume'
  })

  const reactiveClient = getReactivePublicClient()
  if (reactiveClient) {
    await reactiveClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().reactiveListenerResumedAction,
    description: copy().reactiveListenerResumedDesc
  }
}
