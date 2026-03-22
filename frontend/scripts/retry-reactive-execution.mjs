#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createPublicClient,
  createWalletClient,
  fallback,
  getAddress,
  http,
  isAddressEqual,
  parseAbi,
  parseAbiItem
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendDir, '..')

const reactiveSystemAddress = '0x0000000000000000000000000000000000fffFfF'
const subscribeContractTopic0 =
  '0xf2856a60f496a79f2738ebb36013248bb2f4a85116d90c2a595a96ef780137d2'
const reactiveIgnore = BigInt(
  '0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad'
)
const zeroAddress = '0x0000000000000000000000000000000000000000'

const walletAbi = parseAbi([
  'function owner() view returns (address)',
  'function callbackProxy() view returns (address)',
  'function authorizedRvmId() view returns (address)',
  'function listener() view returns (address)',
  'function signalEmitter() view returns (address)',
  'function sourceChainId() view returns (uint256)',
  'function destinationChainId() view returns (uint256)',
  'function runtimeStatus() view returns (uint8)',
  'function lastExecutionNonce() view returns (uint256)',
  'function getIntentSummary() view returns (uint8 status,address token,address recipient,uint256 amountPerExecution,uint256 maxExecutions,uint256 executedCount,uint256 automationBalanceFloor)'
])
const signalEmitterAbi = parseAbi([
  'function emitSignal(address wallet,address token,address recipient,uint256 amount,uint256 executionNonce)'
])
const listenerAbi = parseAbi([
  'function isPaused() view returns (bool)',
  'function callbackGasLimit() view returns (uint64)',
  'function signalEmitter() view returns (address)',
  'function ownerAddress() view returns (address)',
  'function originChainId() view returns (uint256)',
  'function destinationChainId() view returns (uint256)',
  'function strategySignalTopic0() view returns (uint256)',
  'function resume()',
  'function coverDebt()'
])
const reactiveSystemAbi = parseAbi([
  'function subscribeContract(address contractAddress,uint256 chainId,address sourceContract,uint256 topic0,uint256 topic1,uint256 topic2,uint256 topic3)',
  'function debt(address _contract) view returns (uint256)'
])
const callbackProxyAbi = parseAbi([
  'function reserves(address) view returns (uint256)',
  'function debts(address) view returns (uint256)'
])
const callbackEvent = parseAbiItem(
  'event Callback(uint256 indexed chain_id, address indexed _contract, uint64 indexed gas_limit, bytes payload)'
)
const intentExecutedEvent = parseAbiItem(
  'event IntentExecuted(address indexed wallet, address indexed token, address indexed recipient, uint256 amount, uint256 executionNonce, bytes32 signalHash, uint256 originTxHash)'
)
const intentSkippedEvent = parseAbiItem(
  'event IntentExecutionSkipped(address indexed wallet, uint256 executionNonce, bytes32 signalHash, string reason)'
)

function normalizeExecutionEnvironment(value) {
  return value === 'lasna' ? 'lasna' : 'primary'
}

function executionEnvPrefix(executionEnvironment) {
  return executionEnvironment === 'lasna' ? 'LASNA_EXECUTION_' : ''
}

function readExecutionEnvValue(merged, executionEnvironment, baseName, viteBaseName = baseName) {
  const prefix = executionEnvPrefix(executionEnvironment)
  if (executionEnvironment === 'lasna') {
    return (
      merged[`${prefix}${baseName}`] ||
      merged[`VITE_${prefix}${viteBaseName}`] ||
      merged[baseName] ||
      merged[`VITE_${viteBaseName}`]
    )
  }

  return merged[baseName] || merged[`VITE_${viteBaseName}`]
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const content = fs.readFileSync(filePath, 'utf8')
  const values = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    values[key] = value.replace(/^['"]|['"]$/g, '')
  }

  return values
}

function normalizePrivateKey(value) {
  if (!value) {
    throw new Error('Missing OWNER_PRIVATE_KEY')
  }

  return value.startsWith('0x') ? value : `0x${value}`
}

function parseRpcUrls(value) {
  if (!value) return []

  return value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function uniqueRpcUrls(urls) {
  return [...new Set(urls)]
}

function createRpcTransport(urls) {
  if (urls.length === 0) {
    throw new Error('Missing RPC URL')
  }

  const transports = urls.map((url) =>
    http(url, {
      retryCount: 0,
      timeout: 20_000
    })
  )

  if (transports.length === 1) {
    return transports[0]
  }

  return fallback(transports, {
    rank: false
  })
}

function topicForAddress(address) {
  return `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`
}

function topicForUint(value) {
  return `0x${value.toString(16).padStart(64, '0')}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseArgs(argv) {
  const options = {
    executionEnvironment: normalizeExecutionEnvironment(process.env.EXECUTION_ENV),
    timeoutMs: 90_000,
    pollMs: 4_000,
    listenerBufferWei: BigInt(process.env.WILLLEAD_OPERATOR_LISTENER_BUFFER_WEI || '1000000000000000'),
    checkOnly: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help') {
      options.help = true
    } else if (arg === '--check-only') {
      options.checkOnly = true
    } else if (arg === '--execution-env' && argv[index + 1]) {
      options.executionEnvironment = normalizeExecutionEnvironment(argv[index + 1])
      index += 1
    } else if (arg === '--timeout-ms' && argv[index + 1]) {
      options.timeoutMs = Number(argv[index + 1])
      index += 1
    } else if (arg === '--poll-ms' && argv[index + 1]) {
      options.pollMs = Number(argv[index + 1])
      index += 1
    } else if (arg === '--listener-buffer-wei' && argv[index + 1]) {
      options.listenerBufferWei = BigInt(argv[index + 1])
      index += 1
    }
  }

  return options
}

function printHelp() {
  console.log(`Usage: node frontend/scripts/retry-reactive-execution.mjs [options]

Options:
  --execution-env <primary|lasna>
  --check-only
  --timeout-ms <ms>
  --poll-ms <ms>
  --listener-buffer-wei <wei>
  --help`)
}

function buildConfig(executionEnvironment) {
  const merged = {
    ...loadEnvFile(path.join(repoRoot, '.env')),
    ...loadEnvFile(path.join(frontendDir, '.env.local')),
    ...process.env
  }

  return {
    executionEnvironment,
    ownerPrivateKey: normalizePrivateKey(merged.OWNER_PRIVATE_KEY),
    authorizedRvmId: getAddress(merged.AUTHORIZED_RVM_ID || merged.VITE_AUTHORIZED_RVM_ID),
    originRpcUrls: uniqueRpcUrls(parseRpcUrls(merged.ORIGIN_RPC_URL || merged.VITE_ORIGIN_RPC_URL)),
    reactiveRpcUrls: uniqueRpcUrls(parseRpcUrls(merged.REACTIVE_RPC_URL || merged.VITE_REACTIVE_RPC_URL)),
    destinationRpcUrls: uniqueRpcUrls(
      parseRpcUrls(readExecutionEnvValue(merged, executionEnvironment, 'DESTINATION_RPC_URL'))
    ),
    originChainId: BigInt(merged.ORIGIN_CHAIN_ID || merged.VITE_ORIGIN_CHAIN_ID || '0'),
    destinationChainId: BigInt(
      readExecutionEnvValue(merged, executionEnvironment, 'DESTINATION_CHAIN_ID') || '0'
    ),
    walletAddress: getAddress(
      readExecutionEnvValue(merged, executionEnvironment, 'WILLLEAD_WALLET', 'WALLET_ADDRESS')
    ),
    listenerAddress: getAddress(
      readExecutionEnvValue(
        merged,
        executionEnvironment,
        'WILLLEAD_REACTIVE_LISTENER',
        'REACTIVE_LISTENER_ADDRESS'
      )
    ),
    signalEmitterAddress: getAddress(
      readExecutionEnvValue(
        merged,
        executionEnvironment,
        'WILLLEAD_SIGNAL_EMITTER',
        'SIGNAL_EMITTER_ADDRESS'
      )
    ),
    callbackProxy: getAddress(
      readExecutionEnvValue(merged, executionEnvironment, 'CALLBACK_PROXY')
    )
  }
}

async function readWalletRuntime(destinationClient, walletAddress) {
  const [
    owner,
    callbackProxy,
    authorizedRvmId,
    listener,
    signalEmitter,
    sourceChainId,
    destinationChainId,
    runtimeStatus,
    lastExecutionNonce,
    intentSummary
  ] = await Promise.all([
    destinationClient.readContract({ address: walletAddress, abi: walletAbi, functionName: 'owner' }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'callbackProxy'
    }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'authorizedRvmId'
    }),
    destinationClient.readContract({ address: walletAddress, abi: walletAbi, functionName: 'listener' }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'signalEmitter'
    }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'sourceChainId'
    }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'destinationChainId'
    }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'runtimeStatus'
    }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'lastExecutionNonce'
    }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'getIntentSummary'
    })
  ])

  return {
    owner,
    callbackProxy,
    authorizedRvmId,
    listener,
    signalEmitter,
    sourceChainId,
    destinationChainId,
    runtimeStatus: Number(runtimeStatus),
    lastExecutionNonce,
    status: Number(intentSummary[0]),
    token: intentSummary[1],
    recipient: intentSummary[2],
    amountPerExecution: intentSummary[3],
    maxExecutions: intentSummary[4],
    executedCount: intentSummary[5],
    automationBalanceFloor: intentSummary[6]
  }
}

async function readListenerState(reactiveClient, listenerAddress) {
  const [
    listenerPaused,
    callbackGasLimit,
    signalEmitter,
    ownerAddress,
    originChainId,
    destinationChainId,
    strategySignalTopic0
  ] = await Promise.all([
    reactiveClient.readContract({ address: listenerAddress, abi: listenerAbi, functionName: 'isPaused' }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'callbackGasLimit'
    }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'signalEmitter'
    }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'ownerAddress'
    }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'originChainId'
    }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'destinationChainId'
    }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'strategySignalTopic0'
    })
  ])

  return {
    listenerPaused,
    callbackGasLimit,
    signalEmitter,
    ownerAddress,
    originChainId,
    destinationChainId,
    strategySignalTopic0
  }
}

async function readCallbackCredit(destinationClient, callbackProxy, walletAddress) {
  const [reserves, debts] = await Promise.all([
    destinationClient.readContract({
      address: callbackProxy,
      abi: callbackProxyAbi,
      functionName: 'reserves',
      args: [walletAddress]
    }),
    destinationClient.readContract({
      address: callbackProxy,
      abi: callbackProxyAbi,
      functionName: 'debts',
      args: [walletAddress]
    })
  ])

  return {
    reserves,
    debts
  }
}

async function readListenerFundingState(reactiveClient, listenerAddress) {
  const [listenerBalance, listenerDebt] = await Promise.all([
    reactiveClient.getBalance({ address: listenerAddress }),
    reactiveClient.readContract({
      address: reactiveSystemAddress,
      abi: reactiveSystemAbi,
      functionName: 'debt',
      args: [listenerAddress]
    })
  ])

  return {
    listenerBalance,
    listenerDebt
  }
}

async function ensureListenerFunded({
  reactiveClient,
  reactiveWalletClient,
  operatorAccount,
  listenerAddress,
  listenerBufferWei
}) {
  const before = await readListenerFundingState(reactiveClient, listenerAddress)
  const requiredBalance = before.listenerDebt + listenerBufferWei
  let topUpTx = null
  let coverDebtTx = null

  if (before.listenerBalance < requiredBalance) {
    topUpTx = await reactiveWalletClient.sendTransaction({
      account: operatorAccount,
      to: listenerAddress,
      value: requiredBalance - before.listenerBalance
    })
    await reactiveClient.waitForTransactionReceipt({ hash: topUpTx })
  }

  if (before.listenerDebt > 0n) {
    coverDebtTx = await reactiveWalletClient.writeContract({
      account: operatorAccount,
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'coverDebt'
    })
    await reactiveClient.waitForTransactionReceipt({ hash: coverDebtTx })
  }

  return {
    before,
    after: await readListenerFundingState(reactiveClient, listenerAddress),
    topUpTx,
    coverDebtTx
  }
}

async function hasArmedSubscription({
  reactiveClient,
  listenerAddress,
  originChainId,
  signalEmitter,
  strategySignalTopic0,
  authorizedRvmId
}) {
  const latest = await reactiveClient.getBlockNumber()
  const window = 29_999n
  const fromBlock = latest > window ? latest - window : 0n

  const logs = await reactiveClient.request({
    method: 'eth_getLogs',
    params: [
      {
        address: reactiveSystemAddress,
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${latest.toString(16)}`,
        topics: [
          subscribeContractTopic0,
          topicForAddress(listenerAddress),
          topicForUint(originChainId),
          topicForAddress(signalEmitter)
        ]
      }
    ]
  })

  const expectedStrategyTopic = strategySignalTopic0.toString(16).padStart(64, '0').toLowerCase()
  const expectedAuthorizedRvmId = authorizedRvmId.toLowerCase().replace(/^0x/, '').padStart(40, '0')

  return logs.some((entry) => {
    const data = (entry.data || '').toLowerCase()
    return data.slice(2, 66) === expectedStrategyTopic && data.slice(282, 322) === expectedAuthorizedRvmId
  })
}

async function ensureListenerArmed({
  reactiveClient,
  reactiveWalletClient,
  operatorAccount,
  listenerAddress,
  authorizedRvmId
}) {
  const listenerState = await readListenerState(reactiveClient, listenerAddress)
  const subscriptionArmed = await hasArmedSubscription({
    reactiveClient,
    listenerAddress,
    originChainId: listenerState.originChainId,
    signalEmitter: listenerState.signalEmitter,
    strategySignalTopic0: listenerState.strategySignalTopic0,
    authorizedRvmId
  })

  let resumeTx = null
  let subscribeTx = null

  if (listenerState.listenerPaused) {
    resumeTx = await reactiveWalletClient.writeContract({
      account: operatorAccount,
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'resume'
    })
    await reactiveClient.waitForTransactionReceipt({ hash: resumeTx })
  }

  if (!subscriptionArmed) {
    subscribeTx = await reactiveWalletClient.writeContract({
      account: operatorAccount,
      address: reactiveSystemAddress,
      abi: reactiveSystemAbi,
      functionName: 'subscribeContract',
      args: [
        listenerAddress,
        listenerState.originChainId,
        listenerState.signalEmitter,
        listenerState.strategySignalTopic0,
        reactiveIgnore,
        reactiveIgnore,
        reactiveIgnore
      ]
    })
    await reactiveClient.waitForTransactionReceipt({ hash: subscribeTx })
  }

  return {
    before: listenerState,
    after: await readListenerState(reactiveClient, listenerAddress),
    subscriptionArmedBefore: subscriptionArmed,
    subscriptionArmedAfter: await hasArmedSubscription({
      reactiveClient,
      listenerAddress,
      originChainId: listenerState.originChainId,
      signalEmitter: listenerState.signalEmitter,
      strategySignalTopic0: listenerState.strategySignalTopic0,
      authorizedRvmId
    }),
    resumeTx,
    subscribeTx
  }
}

async function emitSourceSignal({
  originClient,
  originWalletClient,
  operatorAccount,
  signalEmitterAddress,
  walletAddress,
  walletRuntime
}) {
  if (walletRuntime.runtimeStatus !== 1) {
    throw new Error(`Wallet runtime is not active: ${walletRuntime.runtimeStatus}`)
  }

  if (walletRuntime.recipient === zeroAddress || walletRuntime.amountPerExecution === 0n) {
    throw new Error('Wallet intent is not configured with a valid recipient and amount')
  }

  const nextNonce = walletRuntime.lastExecutionNonce + 1n
  const hash = await originWalletClient.writeContract({
    account: operatorAccount,
    address: signalEmitterAddress,
    abi: signalEmitterAbi,
    functionName: 'emitSignal',
    args: [
      walletAddress,
      walletRuntime.token,
      walletRuntime.recipient,
      walletRuntime.amountPerExecution,
      nextNonce
    ]
  })

  await originClient.waitForTransactionReceipt({ hash })

  return {
    hash,
    nextNonce
  }
}

async function collectRecentStatus({
  reactiveClient,
  destinationClient,
  listenerAddress,
  walletAddress,
  fromReactiveBlock,
  fromDestinationBlock
}) {
  const [callbackLogs, executedLogs, skippedLogs] = await Promise.all([
    reactiveClient.getLogs({
      address: listenerAddress,
      event: callbackEvent,
      args: {
        _contract: walletAddress
      },
      fromBlock: fromReactiveBlock,
      toBlock: 'latest',
      strict: true
    }),
    destinationClient.getLogs({
      address: walletAddress,
      event: intentExecutedEvent,
      args: {
        wallet: walletAddress
      },
      fromBlock: fromDestinationBlock,
      toBlock: 'latest',
      strict: true
    }),
    destinationClient.getLogs({
      address: walletAddress,
      event: intentSkippedEvent,
      args: {
        wallet: walletAddress
      },
      fromBlock: fromDestinationBlock,
      toBlock: 'latest',
      strict: true
    })
  ])

  return {
    callbackLogs,
    executedLogs,
    skippedLogs
  }
}

async function waitForOutcome({
  reactiveClient,
  destinationClient,
  listenerAddress,
  walletAddress,
  expectedNonce,
  timeoutMs,
  pollMs
}) {
  const reactiveStart = await reactiveClient.getBlockNumber()
  const destinationStart = await destinationClient.getBlockNumber()
  const deadline = Date.now() + timeoutMs
  let lastPollError = null

  while (Date.now() <= deadline) {
    try {
      const walletRuntime = await readWalletRuntime(destinationClient, walletAddress)
      const recent = await collectRecentStatus({
        reactiveClient,
        destinationClient,
        listenerAddress,
        walletAddress,
        fromReactiveBlock: reactiveStart,
        fromDestinationBlock: destinationStart
      })

      const executed = recent.executedLogs.find(
        (log) => log.args.executionNonce === expectedNonce
      )
      const skipped = recent.skippedLogs.find(
        (log) => log.args.executionNonce === expectedNonce
      )
      const callbackSeen = recent.callbackLogs.length > 0

      if (executed) {
        return {
          status: 'executed',
          callbackSeen,
          walletRuntime,
          transactionHash: executed.transactionHash
        }
      }

      if (skipped) {
        return {
          status: 'skipped',
          callbackSeen,
          walletRuntime,
          transactionHash: skipped.transactionHash,
          reason: skipped.args.reason
        }
      }

      if (walletRuntime.lastExecutionNonce >= Number(expectedNonce)) {
        return {
          status: 'executed',
          callbackSeen,
          walletRuntime,
          transactionHash: null
        }
      }
      lastPollError = null
    } catch (error) {
      lastPollError = error instanceof Error ? error.message : String(error)
    }

    await sleep(pollMs)
  }

  let finalRuntime
  let finalRecent

  try {
    finalRuntime = await readWalletRuntime(destinationClient, walletAddress)
    finalRecent = await collectRecentStatus({
      reactiveClient,
      destinationClient,
      listenerAddress,
      walletAddress,
      fromReactiveBlock: reactiveStart,
      fromDestinationBlock: destinationStart
    })
  } catch (error) {
    return {
      status: 'timeout',
      callbackSeen: false,
      walletRuntime: {
        lastExecutionNonce: 0
      },
      callbackCount: 0,
      executedCount: 0,
      skippedCount: 0,
      lastPollError: lastPollError ?? (error instanceof Error ? error.message : String(error))
    }
  }

  return {
    status: 'timeout',
    callbackSeen: finalRecent.callbackLogs.length > 0,
    walletRuntime: finalRuntime,
    callbackCount: finalRecent.callbackLogs.length,
    executedCount: finalRecent.executedLogs.length,
    skippedCount: finalRecent.skippedLogs.length,
    lastPollError
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const config = buildConfig(options.executionEnvironment)
  const operatorAccount = privateKeyToAccount(config.ownerPrivateKey)
  const originClient = createPublicClient({
    transport: createRpcTransport(config.originRpcUrls)
  })
  const reactiveClient = createPublicClient({
    transport: createRpcTransport(config.reactiveRpcUrls)
  })
  const destinationClient = createPublicClient({
    transport: createRpcTransport(config.destinationRpcUrls)
  })
  const originWalletClient = createWalletClient({
    account: operatorAccount,
    transport: createRpcTransport(config.originRpcUrls)
  })
  const reactiveWalletClient = createWalletClient({
    account: operatorAccount,
    transport: createRpcTransport(config.reactiveRpcUrls)
  })

  const walletRuntime = await readWalletRuntime(destinationClient, config.walletAddress)
  const listenerState = await readListenerState(reactiveClient, config.listenerAddress)
  const callbackCredit = await readCallbackCredit(
    destinationClient,
    config.callbackProxy,
    config.walletAddress
  )

  console.log(`execution_env=${config.executionEnvironment}`)
  console.log(`wallet=${config.walletAddress}`)
  console.log(`listener=${config.listenerAddress}`)
  console.log(`signal_emitter=${config.signalEmitterAddress}`)
  console.log(`wallet_runtime_status=${walletRuntime.runtimeStatus}`)
  console.log(`wallet_last_execution_nonce=${walletRuntime.lastExecutionNonce}`)
  console.log(`wallet_executed_count=${walletRuntime.executedCount}`)
  console.log(`listener_paused=${listenerState.listenerPaused}`)
  console.log(`callback_reserve=${callbackCredit.reserves}`)
  console.log(`callback_debt=${callbackCredit.debts}`)

  if (!isAddressEqual(walletRuntime.owner, operatorAccount.address)) {
    throw new Error(
      `Wallet owner ${walletRuntime.owner} does not match operator ${operatorAccount.address}`
    )
  }

  if (!isAddressEqual(walletRuntime.callbackProxy, config.callbackProxy)) {
    throw new Error(
      `Wallet callback proxy ${walletRuntime.callbackProxy} does not match configured ${config.callbackProxy}`
    )
  }

  if (!isAddressEqual(walletRuntime.authorizedRvmId, config.authorizedRvmId)) {
    throw new Error(
      `Wallet authorized RVM ID ${walletRuntime.authorizedRvmId} does not match configured ${config.authorizedRvmId}`
    )
  }

  if (!isAddressEqual(walletRuntime.listener, config.listenerAddress)) {
    throw new Error(
      `Wallet listener ${walletRuntime.listener} does not match configured ${config.listenerAddress}`
    )
  }

  if (!isAddressEqual(walletRuntime.signalEmitter, config.signalEmitterAddress)) {
    throw new Error(
      `Wallet emitter ${walletRuntime.signalEmitter} does not match configured ${config.signalEmitterAddress}`
    )
  }

  if (options.checkOnly) {
    console.log(`status=checked`)
    return
  }

  if (walletRuntime.runtimeStatus !== 1) {
    throw new Error(`Wallet runtime is not active: ${walletRuntime.runtimeStatus}`)
  }

  const funding = await ensureListenerFunded({
    reactiveClient,
    reactiveWalletClient,
    operatorAccount,
    listenerAddress: config.listenerAddress,
    listenerBufferWei: options.listenerBufferWei
  })
  console.log(`listener_balance_before=${funding.before.listenerBalance}`)
  console.log(`listener_debt_before=${funding.before.listenerDebt}`)
  console.log(`listener_balance_after=${funding.after.listenerBalance}`)
  console.log(`listener_debt_after=${funding.after.listenerDebt}`)
  console.log(`listener_top_up_tx=${funding.topUpTx ?? 'none'}`)
  console.log(`listener_cover_debt_tx=${funding.coverDebtTx ?? 'none'}`)

  const armed = await ensureListenerArmed({
    reactiveClient,
    reactiveWalletClient,
    operatorAccount,
    listenerAddress: config.listenerAddress,
    authorizedRvmId: config.authorizedRvmId
  })
  console.log(`listener_subscription_armed_before=${armed.subscriptionArmedBefore}`)
  console.log(`listener_subscription_armed_after=${armed.subscriptionArmedAfter}`)
  console.log(`listener_resume_tx=${armed.resumeTx ?? 'none'}`)
  console.log(`listener_subscribe_tx=${armed.subscribeTx ?? 'none'}`)

  const emitted = await emitSourceSignal({
    originClient,
    originWalletClient,
    operatorAccount,
    signalEmitterAddress: config.signalEmitterAddress,
    walletAddress: config.walletAddress,
    walletRuntime
  })
  console.log(`source_signal_tx=${emitted.hash}`)
  console.log(`target_nonce=${emitted.nextNonce}`)

  const outcome = await waitForOutcome({
    reactiveClient,
    destinationClient,
    listenerAddress: config.listenerAddress,
    walletAddress: config.walletAddress,
    expectedNonce: emitted.nextNonce,
    timeoutMs: options.timeoutMs,
    pollMs: options.pollMs
  })

  console.log(`callback_seen=${outcome.callbackSeen}`)
  console.log(`final_last_execution_nonce=${outcome.walletRuntime.lastExecutionNonce}`)

  if (outcome.status === 'executed') {
    console.log(`status=executed`)
    console.log(`destination_tx=${outcome.transactionHash ?? 'unavailable'}`)
    return
  }

  if (outcome.status === 'skipped') {
    console.log(`status=skipped`)
    console.log(`destination_tx=${outcome.transactionHash ?? 'unavailable'}`)
    console.log(`skip_reason=${outcome.reason ?? 'unknown'}`)
    process.exitCode = 1
    return
  }

  console.log(`status=timeout`)
  console.log(`callback_count=${outcome.callbackCount}`)
  console.log(`executed_count=${outcome.executedCount}`)
  console.log(`skipped_count=${outcome.skippedCount}`)
  if (outcome.lastPollError) {
    console.log(`last_poll_error=${outcome.lastPollError}`)
  }
  console.log(`hint=source signal was emitted but Reactive did not finish the callback/execution path within the timeout window`)
  process.exitCode = 1
}

main().catch((error) => {
  console.error(`status=failed`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
