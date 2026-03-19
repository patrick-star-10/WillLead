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
import { willLeadSignalEmitterAbi } from '../contracts/abi/willLeadSignalEmitter'
import { willLeadWalletAbi } from '../contracts/abi/willLeadWallet'
import { contractAddresses } from '../contracts/addresses'
import type {
  ActionResult,
  AssetBalance,
  AutomationCreditState,
  ExecutionProof,
  AutomationFundingValues,
  IntentFormValues,
  IntentState,
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
  getOriginWalletClient,
  getReactivePublicClient,
  getReactiveWalletClient,
  requestWalletAddress
} from './clients'
import { destinationChain, originChain, reactiveChain } from './chains'
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
const erc20Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
])

function isConfiguredAddress(value: string) {
  return value.toLowerCase() !== emptyAddress
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

export async function readWalletState(
  ownerAddress: string | null,
  connectionSource: WalletConnectionSource = 'disconnected'
): Promise<{
  wallet: WalletState
  intent: IntentState
  automation: AutomationCreditState
  executionProofs: ExecutionProof[]
}> {
  const destinationClient = getDestinationPublicClient()
  const originClient = getOriginPublicClient()
  const reactiveClient = getReactivePublicClient()
  const walletAddress = getAddress(contractAddresses.wallet)
  const reactiveListenerAddress = getAddress(contractAddresses.reactiveListener)
  const isWalletContractConfigured = isConfiguredAddress(walletAddress)
  const connectedBalance =
    destinationClient && ownerAddress !== null
      ? await destinationClient.getBalance({ address: getAddress(ownerAddress) })
      : 0n
  const connectedAssetBalances =
    ownerAddress !== null
      ? [
          {
            symbol: 'ETH',
            balanceLabel: formatAmount(connectedBalance),
            kind: 'native' as const
          }
        ]
      : []

  if (!destinationClient) {
    return {
      wallet: {
        contractAddress: walletAddress,
        ownerAddress,
        connectionSource,
        connectionLabel: formatConnectionLabel(connectionSource),
        balanceContextLabel: 'Controller wallet balance',
        balanceLabel: 'Unavailable',
        assetBalances: [],
        connectedBalanceLabel: ownerAddress !== null ? formatAmount(connectedBalance) : 'Unavailable',
        connectedAssetBalances,
        runtimeStatus: 'active',
        isConnected: ownerAddress !== null,
        lastSyncedAt: formatTimestamp(BigInt(Math.floor(Date.now() / 1000))),
        lastExecutionNonce: 3,
        lastExecutedAt: 'Mock state',
        lastSignalHash: zeroHash,
        destinationBalanceDelta: '-0.01 ETH',
        listenerPaused: null,
        callbackGasLimit: 'Unavailable'
      },
      intent: {
        token: 'native',
        recipient: '0xF00D00000000000000000000000000000000CAFE',
        amountPerExecution: '0.01',
        maxExecutions: 5,
        executedCount: 3,
        minAutomationBalance: '0.005',
        enabled: true
      },
      automation: {
        creditLabel: 'Mock',
        availableBalance: 'Unavailable',
        minRequiredBalance: 'Unavailable'
      },
      executionProofs: [
        {
          id: 'origin-log',
          label: 'Origin Signal',
          description: 'StrategySignal emitted on Base Sepolia.',
          reference: 'mock://origin-signal',
          chain: 'origin',
          href: null
        },
        {
          id: 'reactive-callback',
          label: 'Reactive Callback',
          description: 'Reactive listener emitted a callback request.',
          reference: 'mock://reactive-callback',
          chain: 'reactive',
          href: null
        },
        {
          id: 'destination-exec',
          label: 'Destination Execution',
          description: 'WillLeadWallet executed the fixed transfer intent.',
          reference: 'mock://destination-execution',
          chain: 'destination',
          href: null
        }
      ]
    }
  }

  if (!isWalletContractConfigured) {
    const connectedBalance =
      ownerAddress !== null ? await destinationClient.getBalance({ address: getAddress(ownerAddress) }) : 0n

    return {
      wallet: {
        contractAddress: walletAddress,
        ownerAddress,
        connectionSource,
        connectionLabel: formatConnectionLabel(connectionSource),
        balanceContextLabel: 'Controller wallet balance',
        balanceLabel: ownerAddress !== null ? formatAmount(connectedBalance) : 'Unavailable',
        assetBalances:
          ownerAddress !== null
            ? [
                {
                  symbol: 'ETH',
                  balanceLabel: formatAmount(connectedBalance),
                  kind: 'native'
                }
              ]
            : [],
        connectedBalanceLabel: ownerAddress !== null ? formatAmount(connectedBalance) : 'Unavailable',
        connectedAssetBalances,
        runtimeStatus: 'inactive',
        isConnected: ownerAddress !== null,
        lastSyncedAt: formatTimestamp(BigInt(Math.floor(Date.now() / 1000))),
        lastExecutionNonce: 0,
        lastExecutedAt: 'Never',
        lastSignalHash: zeroHash,
        destinationBalanceDelta: '0 ETH',
        listenerPaused: null,
        callbackGasLimit: 'Unavailable'
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
    }
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
  const listenerState = await readReactiveListenerState(reactiveListenerAddress)
  const assetBalances = await readTrackedAssets(destinationClient, walletAddress, balance, token)

  const automation = await readAutomationCredit(walletAddress, automationFloor)
  const proofs = await readExecutionProofs(
    walletAddress,
    reactiveListenerAddress,
    originClient,
    reactiveClient,
    destinationClient
  )

  return {
    wallet: {
      contractAddress: walletAddress,
      ownerAddress,
      connectionSource,
      connectionLabel: formatConnectionLabel(connectionSource),
      balanceContextLabel: 'Autonomous wallet contract balance',
      balanceLabel: formatAmount(balance),
      assetBalances,
      connectedBalanceLabel: ownerAddress !== null ? formatAmount(connectedBalance) : 'Unavailable',
      connectedAssetBalances,
      runtimeStatus: formatRuntimeStatus(status),
      isConnected: ownerAddress !== null,
      lastSyncedAt: formatTimestamp(BigInt(Math.floor(Date.now() / 1000))),
      lastExecutionNonce: Number(lastExecutionNonce),
      lastExecutedAt: formatTimestamp(lastExecutedAt),
      lastSignalHash,
      destinationBalanceDelta: executedCount > 0n ? `-${formatAmount(amountPerExecution)}` : '0 ETH',
      listenerPaused: ownerAddress !== null ? listenerState.listenerPaused : null,
      callbackGasLimit: ownerAddress !== null ? listenerState.callbackGasLimit : 'Unavailable'
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
  const reactiveClient = getReactivePublicClient()
  if (!reactiveClient || !isConfiguredAddress(reactiveListenerAddress)) {
    return {
      listenerPaused: null,
      callbackGasLimit: '1000000'
    }
  }

  const [listenerPaused, callbackGasLimit] = await Promise.all([
    reactiveClient.readContract({
      address: reactiveListenerAddress,
      abi: willLeadReactiveListenerAbi,
      functionName: 'isPaused'
    }) as Promise<boolean>,
    reactiveClient.readContract({
      address: reactiveListenerAddress,
      abi: willLeadReactiveListenerAbi,
      functionName: 'callbackGasLimit'
    }) as Promise<bigint>
  ])

  return {
    listenerPaused,
    callbackGasLimit: callbackGasLimit.toString()
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
}

async function readExecutionProofs(
  walletAddress: Address,
  reactiveListenerAddress: Address,
  originClient: ReturnType<typeof getOriginPublicClient>,
  reactiveClient: ReturnType<typeof getReactivePublicClient>,
  destinationClient: NonNullable<ReturnType<typeof getDestinationPublicClient>>
): Promise<ExecutionProof[]> {
  const proofs: ExecutionProof[] = []

  try {
    const executionLogs = await destinationClient.getLogs({
      address: walletAddress,
      event: parseAbiItem(
        'event IntentExecuted(address indexed wallet, address indexed token, address indexed recipient, uint256 amount, uint256 executionNonce, bytes32 signalHash, uint256 originTxHash)'
      ),
      fromBlock: 0n,
      strict: true
    })

    const latestExecution = executionLogs.at(-1)
    if (latestExecution) {
      proofs.push({
        id: `wallet-${latestExecution.transactionHash}`,
        label: 'Destination Execution',
        description: `Intent executed with nonce ${latestExecution.args.executionNonce?.toString() ?? 'unknown'}.`,
        reference: latestExecution.transactionHash ?? 'unknown',
        chain: 'destination',
        href: txExplorerLink('destination', latestExecution.transactionHash)
      })
    }
  } catch {}

  try {
    if (reactiveClient && isConfiguredAddress(reactiveListenerAddress)) {
      const callbackLogs = await reactiveClient.getLogs({
        address: reactiveListenerAddress,
        event: parseAbiItem(
          'event Callback(uint256 indexed chain_id, address indexed _contract, uint64 indexed gas_limit, bytes payload)'
        ),
        fromBlock: 0n,
        strict: true
      })

      const latestCallback = callbackLogs.at(-1)
      if (latestCallback) {
        proofs.push({
          id: `callback-${latestCallback.transactionHash}`,
          label: 'Reactive Callback',
          description: 'Reactive listener emitted a callback toward the destination wallet.',
          reference: latestCallback.transactionHash ?? 'unknown',
          chain: 'reactive',
          href: txExplorerLink('reactive', latestCallback.transactionHash)
        })
      }
    }
  } catch {}

  try {
    if (originClient && isConfiguredAddress(contractAddresses.signalEmitter)) {
      const signalLogs = await originClient.getLogs({
        address: getAddress(contractAddresses.signalEmitter),
        event: parseAbiItem(
          'event StrategySignal(address indexed wallet, address indexed token, address indexed recipient, uint256 amount, uint256 executionNonce, uint256 emittedAt)'
        ),
        fromBlock: 0n,
        strict: true
      })

      const latestSignal = signalLogs.at(-1)
      if (latestSignal) {
        proofs.push({
          id: `signal-${latestSignal.transactionHash}`,
          label: 'Origin Signal',
          description: 'Source chain signal emitted for the wallet intent.',
          reference: latestSignal.transactionHash ?? 'unknown',
          chain: 'origin',
          href: txExplorerLink('origin', latestSignal.transactionHash)
        })
      }
    }
  } catch {}

  return proofs
}

export async function configureIntent(values: IntentFormValues): Promise<ActionResult> {
  const walletAddress = getAddress(contractAddresses.wallet)
  if (!isConfiguredAddress(walletAddress)) {
    throw new Error(copy().walletAddressMissing)
  }

  const { account, client } = await getDestinationWalletClient()
  const token = toTokenAddress(values.token)
  const recipient = getAddress(values.recipient)
  const amountPerExecution = parseEther(values.amountPerExecution)
  const automationFloor = parseEther(values.minAutomationBalance)

  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain: destinationChain,
    functionName: 'configureIntent',
    args: [token, recipient, amountPerExecution, BigInt(values.maxExecutions), automationFloor]
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

export async function pauseIntent(): Promise<ActionResult> {
  const walletAddress = getAddress(contractAddresses.wallet)
  if (!isConfiguredAddress(walletAddress)) {
    throw new Error(copy().walletAddressMissing)
  }

  const { account, client } = await getDestinationWalletClient()
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
  const walletAddress = getAddress(contractAddresses.wallet)
  if (!isConfiguredAddress(walletAddress)) {
    throw new Error(copy().walletAddressMissing)
  }

  const { account, client } = await getDestinationWalletClient()
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

export async function emitSignal(values: {
  token: string
  recipient: string
  amountPerExecution: string
  nextNonce: number
}): Promise<ActionResult> {
  const signalEmitterAddress = getAddress(contractAddresses.signalEmitter)
  const walletAddress = getAddress(contractAddresses.wallet)
  if (!isConfiguredAddress(signalEmitterAddress) || !isConfiguredAddress(walletAddress)) {
    throw new Error(copy().signalEmitterOrWalletMissing)
  }

  const { account, client } = await getOriginWalletClient()
  const token = toTokenAddress(values.token)
  const recipient = getAddress(values.recipient)
  const amount = parseEther(values.amountPerExecution)

  const hash = await client.writeContract({
    account,
    address: signalEmitterAddress,
    abi: willLeadSignalEmitterAbi,
    chain: originChain,
    functionName: 'emitSignal',
    args: [walletAddress, token, recipient, amount, BigInt(values.nextNonce)]
  })

  const originClient = getOriginPublicClient()
  if (originClient) {
    await originClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().sourceSignalEmittedAction,
    description: copy().sourceSignalEmittedDesc
  }
}

export async function topUpAutomationCredit(
  values: AutomationFundingValues
): Promise<ActionResult> {
  const callbackProxyAddress = getAddress(contractAddresses.callbackProxy)
  const walletAddress = getAddress(contractAddresses.wallet)
  if (!isConfiguredAddress(callbackProxyAddress) || !isConfiguredAddress(walletAddress)) {
    throw new Error(copy().callbackProxyOrWalletMissing)
  }

  const { account, client } = await getDestinationWalletClient()
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

export async function pauseReactiveListener(): Promise<ActionResult> {
  const reactiveListenerAddress = getAddress(contractAddresses.reactiveListener)
  if (!isConfiguredAddress(reactiveListenerAddress)) {
    throw new Error(copy().reactiveListenerMissing)
  }

  const { account, client } = await getReactiveWalletClient()
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
  const reactiveListenerAddress = getAddress(contractAddresses.reactiveListener)
  if (!isConfiguredAddress(reactiveListenerAddress)) {
    throw new Error(copy().reactiveListenerMissing)
  }

  const { account, client } = await getReactiveWalletClient()
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
