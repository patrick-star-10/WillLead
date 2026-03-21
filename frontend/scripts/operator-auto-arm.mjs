#!/usr/bin/env node

import fs from 'node:fs'
import nodeHttp from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPublicClient, createWalletClient, fallback, getAddress, http, parseAbi, parseAbiItem } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendDir, '..')
const runtimeDir = path.join(frontendDir, 'public', 'runtime')
const runtimeStatusPath = path.join(runtimeDir, 'operator-status.json')

const reactiveSystemAddress = '0x0000000000000000000000000000000000fffFfF'
const subscribeContractTopic0 =
  '0xf2856a60f496a79f2738ebb36013248bb2f4a85116d90c2a595a96ef780137d2'
const reactiveIgnore = BigInt(
  '0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad'
)
const defaultEthereumSepoliaRpcUrls = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://eth-sepolia.public.blastapi.io'
]
const defaultReactiveRpcUrls = ['https://lasna-rpc.rnk.dev/']

const walletAbi = parseAbi([
  'function getIntentSummary() view returns (uint8 status, address token, address recipient, uint256 amountPerExecution, uint256 maxExecutions, uint256 executedCount, uint256 automationBalanceFloor)',
  'function lastExecutionNonce() view returns (uint256)'
])
const signalEmitterAbi = parseAbi([
  'function emitSignal(address wallet,address token,address recipient,uint256 amount,uint256 executionNonce)'
])
const listenerAbi = parseAbi([
  'function isPaused() view returns (bool)',
  'function signalEmitter() view returns (address)',
  'function ownerAddress() view returns (address)',
  'function originChainId() view returns (uint256)',
  'function strategySignalTopic0() view returns (uint256)',
  'function resume()'
])
const reactiveSystemAbi = parseAbi([
  'function subscribeContract(address contractAddress,uint256 chainId,address sourceContract,uint256 topic0,uint256 topic1,uint256 topic2,uint256 topic3)',
  'function debt(address _contract) view returns (uint256)'
])
const intentConfiguredEvent = parseAbiItem(
  'event IntentConfigured(address indexed wallet, address indexed token, address indexed recipient, uint256 amountPerExecution, uint256 maxExecutions, uint256 minAutomationBalance)'
)

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
  if (!value) throw new Error('Missing operator private key')
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

function resolveRpcUrls(configuredValue, fallbackUrls) {
  return uniqueRpcUrls([...parseRpcUrls(configuredValue), ...fallbackUrls])
}

function createRpcTransport(urls) {
  if (urls.length === 0) {
    throw new Error('Missing RPC URL')
  }

  const transports = urls.map((url) =>
    http(url, {
      retryCount: 0,
      timeout: 8_000
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

function buildConfig() {
  const merged = {
    ...loadEnvFile(path.join(repoRoot, '.env')),
    ...loadEnvFile(path.join(frontendDir, '.env.local')),
    ...process.env
  }

  const operatorPrivateKey = normalizePrivateKey(
    merged.WILLLEAD_OPERATOR_PRIVATE_KEY || merged.OWNER_PRIVATE_KEY
  )

  const reactiveChainId = Number(merged.REACTIVE_CHAIN_ID || merged.VITE_REACTIVE_CHAIN_ID || 0)
  if (!reactiveChainId) {
    throw new Error('Missing REACTIVE_CHAIN_ID or VITE_REACTIVE_CHAIN_ID')
  }

  return {
    originRpcUrls: resolveRpcUrls(
      merged.ORIGIN_RPC_URL || merged.VITE_ORIGIN_RPC_URL,
      defaultEthereumSepoliaRpcUrls
    ),
    destinationRpcUrls: resolveRpcUrls(
      merged.DESTINATION_RPC_URL || merged.VITE_DESTINATION_RPC_URL,
      defaultEthereumSepoliaRpcUrls
    ),
    reactiveRpcUrls: resolveRpcUrls(
      merged.REACTIVE_RPC_URL || merged.VITE_REACTIVE_RPC_URL,
      defaultReactiveRpcUrls
    ),
    walletAddress: getAddress(merged.WILLLEAD_WALLET || merged.VITE_WALLET_ADDRESS),
    listenerAddress: getAddress(
      merged.WILLLEAD_REACTIVE_LISTENER || merged.VITE_REACTIVE_LISTENER_ADDRESS
    ),
    authorizedRvmId: getAddress(merged.AUTHORIZED_RVM_ID || merged.VITE_AUTHORIZED_RVM_ID),
    reactiveChainId,
    listenerFundingBufferWei: BigInt(
      merged.WILLLEAD_OPERATOR_LISTENER_BUFFER_WEI || merged.WILLLEAD_REACTIVE_BUFFER_WEI || '1000000000000000'
    ),
    operatorApiHost: merged.WILLLEAD_OPERATOR_API_HOST || '127.0.0.1',
    operatorApiPort: Number(merged.WILLLEAD_OPERATOR_API_PORT || 8787),
    operatorPrivateKey
  }
}

function writeRuntimeStatus(state) {
  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.writeFileSync(runtimeStatusPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

async function hasArmedSubscription({
  reactiveClient,
  listenerAddress,
  originChainId,
  signalEmitter,
  strategySignalTopic0,
  authorizedRvmId
}) {
  const logs = await reactiveClient.request({
    method: 'eth_getLogs',
    params: [
      {
        address: reactiveSystemAddress,
        fromBlock: '0x0',
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
  const [listenerPaused, signalEmitter, listenerOwner, originChainId, strategySignalTopic0] =
    await Promise.all([
      reactiveClient.readContract({
        address: listenerAddress,
        abi: listenerAbi,
        functionName: 'isPaused'
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
        functionName: 'strategySignalTopic0'
      })
    ])

  if (listenerOwner.toLowerCase() !== operatorAccount.address.toLowerCase()) {
    throw new Error(
      `Operator key ${operatorAccount.address} does not own listener ${listenerAddress} (${listenerOwner})`
    )
  }

  const subscriptionArmed = await hasArmedSubscription({
    reactiveClient,
    listenerAddress,
    originChainId,
    signalEmitter,
    strategySignalTopic0,
    authorizedRvmId
  })

  if (!listenerPaused && subscriptionArmed) {
    return 'already_armed'
  }

  let hash
  if (listenerPaused) {
    hash = await reactiveWalletClient.writeContract({
      account: operatorAccount,
      chain: undefined,
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'resume'
    })
  } else {
    hash = await reactiveWalletClient.writeContract({
      account: operatorAccount,
      chain: undefined,
      address: reactiveSystemAddress,
      abi: reactiveSystemAbi,
      functionName: 'subscribeContract',
      args: [
        listenerAddress,
        originChainId,
        signalEmitter,
        strategySignalTopic0,
        reactiveIgnore,
        reactiveIgnore,
        reactiveIgnore
      ]
    })
  }

  await reactiveClient.waitForTransactionReceipt({ hash })
  return hash
}

async function readListenerFundingState({ reactiveClient, listenerAddress }) {
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
  fundingBufferWei
}) {
  const before = await readListenerFundingState({ reactiveClient, listenerAddress })
  const requiredBalance = before.listenerDebt + fundingBufferWei

  let topUpTx = null
  if (before.listenerBalance < requiredBalance) {
    topUpTx = await reactiveWalletClient.sendTransaction({
      account: operatorAccount,
      chain: undefined,
      to: listenerAddress,
      value: requiredBalance - before.listenerBalance
    })
    await reactiveClient.waitForTransactionReceipt({ hash: topUpTx })
  }

  let coverDebtTx = null
  if (before.listenerDebt > 0n) {
    coverDebtTx = await reactiveWalletClient.writeContract({
      account: operatorAccount,
      chain: undefined,
      address: listenerAddress,
      abi: parseAbi(['function coverDebt()']),
      functionName: 'coverDebt'
    })
    await reactiveClient.waitForTransactionReceipt({ hash: coverDebtTx })
  }

  const after = await readListenerFundingState({ reactiveClient, listenerAddress })

  return {
    status:
      topUpTx || coverDebtTx
        ? coverDebtTx
          ? 'funded_and_cleared'
          : 'funded'
        : 'already_funded',
    topUpTx,
    coverDebtTx,
    before,
    after
  }
}

async function readWalletRuntime(destinationClient, walletAddress) {
  const [status] = await destinationClient.readContract({
    address: walletAddress,
    abi: walletAbi,
    functionName: 'getIntentSummary'
  })

  return {
    runtimeStatus: Number(status)
  }
}

async function emitTestSignal({
  destinationClient,
  reactiveClient,
  originClient,
  originWalletClient,
  operatorAccount,
  walletAddress,
  listenerAddress
}) {
  const [summary, lastExecutionNonce, signalEmitter] = await Promise.all([
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'getIntentSummary'
    }),
    destinationClient.readContract({
      address: walletAddress,
      abi: walletAbi,
      functionName: 'lastExecutionNonce'
    }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerAbi,
      functionName: 'signalEmitter'
    })
  ])

  const [status, token, recipient, amountPerExecution] = summary
  if (Number(status) !== 1) {
    throw new Error('Intent is not active. Save or resume the plan before triggering a test signal.')
  }

  if (
    recipient.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
    amountPerExecution === 0n
  ) {
    throw new Error('Intent is not configured with a valid recipient and amount.')
  }

  const nextNonce = lastExecutionNonce + 1n
  const hash = await originWalletClient.writeContract({
    account: operatorAccount,
    chain: undefined,
    address: signalEmitter,
    abi: signalEmitterAbi,
    functionName: 'emitSignal',
    args: [walletAddress, token, recipient, amountPerExecution, nextNonce]
  })

  await originClient.waitForTransactionReceipt({ hash })
  return {
    hash,
    nextNonce
  }
}

async function prepareListenerForTestSignal({
  reactiveClient,
  reactiveWalletClient,
  operatorAccount,
  listenerAddress,
  authorizedRvmId,
  fundingBufferWei,
  runtimeState
}) {
  const fundingResult = await ensureListenerFunded({
    reactiveClient,
    reactiveWalletClient,
    operatorAccount,
    listenerAddress,
    fundingBufferWei
  })
  runtimeState.listenerBalanceWei = fundingResult.after.listenerBalance.toString()
  runtimeState.listenerDebtWei = fundingResult.after.listenerDebt.toString()
  runtimeState.lastFundingResult = fundingResult.status
  runtimeState.lastFundingTx = fundingResult.coverDebtTx || fundingResult.topUpTx

  const armResult = await ensureListenerArmed({
    reactiveClient,
    reactiveWalletClient,
    operatorAccount,
    listenerAddress,
    authorizedRvmId
  })
  runtimeState.lastArmResult = String(armResult)
  runtimeState.lastArmTx = typeof armResult === 'string' && armResult.startsWith('0x') ? armResult : null
}

function writeJsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  response.end(`${JSON.stringify(payload)}\n`)
}

function startOperatorApi({
  host,
  port,
  runtimeState,
  emitTestSignalHandler
}) {
  let inFlight = null

  const server = nodeHttp.createServer(async (request, response) => {
    if (!request.url) {
      writeJsonResponse(response, 404, { error: 'Not found' })
      return
    }

    if (request.method === 'OPTIONS') {
      writeJsonResponse(response, 204, {})
      return
    }

    if (request.method === 'GET' && request.url === '/health') {
      writeJsonResponse(response, 200, {
        serviceStatus: runtimeState.serviceStatus,
        heartbeatAt: runtimeState.heartbeatAt,
        apiUrl: runtimeState.apiUrl
      })
      return
    }

    if (request.method === 'POST' && request.url === '/test-signal') {
      if (inFlight) {
        writeJsonResponse(response, 409, { error: 'A test signal is already being emitted.' })
        return
      }

      inFlight = (async () => {
        await prepareListenerForTestSignal({
          reactiveClient: emitTestSignalHandler.reactiveClient,
          reactiveWalletClient: emitTestSignalHandler.reactiveWalletClient,
          operatorAccount: emitTestSignalHandler.operatorAccount,
          listenerAddress: emitTestSignalHandler.listenerAddress,
          authorizedRvmId: emitTestSignalHandler.authorizedRvmId,
          fundingBufferWei: emitTestSignalHandler.fundingBufferWei,
          runtimeState
        })
        const result = await emitTestSignalHandler()
        runtimeState.lastTestSignalTx = result.hash
        runtimeState.lastTestSignalNonce = result.nextNonce.toString()
        runtimeState.lastError = null
        runtimeState.heartbeatAt = new Date().toISOString()
        writeRuntimeStatus(runtimeState)
        return result
      })()

      try {
        const result = await inFlight
        writeJsonResponse(response, 200, {
          ok: true,
          hash: result.hash,
          nextNonce: result.nextNonce.toString()
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        runtimeState.lastError = message
        runtimeState.heartbeatAt = new Date().toISOString()
        writeRuntimeStatus(runtimeState)
        writeJsonResponse(response, 500, { error: message })
      } finally {
        inFlight = null
      }

      return
    }

    writeJsonResponse(response, 404, { error: 'Not found' })
  })

  server.listen(port, host)
  return server
}

async function main() {
  const config = buildConfig()
  const operatorAccount = privateKeyToAccount(config.operatorPrivateKey)
  const originClient = createPublicClient({
    transport: createRpcTransport(config.originRpcUrls)
  })
  const destinationClient = createPublicClient({
    transport: createRpcTransport(config.destinationRpcUrls)
  })
  const reactiveClient = createPublicClient({
    transport: createRpcTransport(config.reactiveRpcUrls)
  })
  const reactiveWalletClient = createWalletClient({
    account: operatorAccount,
    transport: createRpcTransport(config.reactiveRpcUrls)
  })
  const originWalletClient = createWalletClient({
    account: operatorAccount,
    transport: createRpcTransport(config.originRpcUrls)
  })

  const once = process.argv.includes('--once')
  const pollIntervalMs = Number(process.env.WILLLEAD_OPERATOR_POLL_MS || 4000)
  const lookbackBlocks = BigInt(process.env.WILLLEAD_OPERATOR_LOOKBACK || 200)

  let lastSeenBlock = 0n
  let lastSeenKey = ''

  console.log(`operator_service=starting`)
  console.log(`wallet=${config.walletAddress}`)
  console.log(`listener=${config.listenerAddress}`)
  console.log(`operator=${operatorAccount.address}`)

  const runtimeState = {
    serviceStatus: 'online',
    heartbeatAt: new Date().toISOString(),
    operatorAddress: operatorAccount.address,
    apiUrl: `http://${config.operatorApiHost}:${config.operatorApiPort}`,
    walletAddress: config.walletAddress,
    listenerAddress: config.listenerAddress,
    listenerBalanceWei: null,
    listenerDebtWei: null,
    lastFundingResult: null,
    lastFundingTx: null,
    lastIntentTx: null,
    lastTestSignalTx: null,
    lastTestSignalNonce: null,
    lastArmResult: null,
    lastArmTx: null,
    lastError: null
  }
  writeRuntimeStatus(runtimeState)

  let apiServer = null
  if (!once) {
    const emitTestSignalHandler = Object.assign(
      () =>
        emitTestSignal({
          destinationClient,
          reactiveClient,
          originClient,
          originWalletClient,
          operatorAccount,
          walletAddress: config.walletAddress,
          listenerAddress: config.listenerAddress
        }),
      {
        reactiveClient,
        reactiveWalletClient,
        operatorAccount,
        listenerAddress: config.listenerAddress,
        authorizedRvmId: config.authorizedRvmId,
        fundingBufferWei: config.listenerFundingBufferWei
      }
    )

    apiServer = startOperatorApi({
      host: config.operatorApiHost,
      port: config.operatorApiPort,
      runtimeState,
      emitTestSignalHandler
    })
    console.log(`operator_api=${runtimeState.apiUrl}`)
  }

  const initialRuntime = await readWalletRuntime(destinationClient, config.walletAddress)
  if (initialRuntime.runtimeStatus === 1) {
    const fundingResult = await ensureListenerFunded({
      reactiveClient,
      reactiveWalletClient,
      operatorAccount,
      listenerAddress: config.listenerAddress,
      fundingBufferWei: config.listenerFundingBufferWei
    })
    console.log(`startup_funding=${fundingResult.status}`)
    runtimeState.listenerBalanceWei = fundingResult.after.listenerBalance.toString()
    runtimeState.listenerDebtWei = fundingResult.after.listenerDebt.toString()
    runtimeState.lastFundingResult = fundingResult.status
    runtimeState.lastFundingTx = fundingResult.coverDebtTx || fundingResult.topUpTx

    const armResult = await ensureListenerArmed({
      reactiveClient,
      reactiveWalletClient,
      operatorAccount,
      listenerAddress: config.listenerAddress,
      authorizedRvmId: config.authorizedRvmId
    })
    console.log(`startup_arm=${armResult}`)
    runtimeState.lastArmResult = String(armResult)
    runtimeState.lastArmTx = typeof armResult === 'string' && armResult.startsWith('0x') ? armResult : null
    runtimeState.heartbeatAt = new Date().toISOString()
    writeRuntimeStatus(runtimeState)
  } else {
    console.log(`startup_arm=skipped`)
  }

  while (true) {
    const latestBlock = await destinationClient.getBlockNumber()
    if (lastSeenBlock > 0n && latestBlock <= lastSeenBlock) {
      runtimeState.heartbeatAt = new Date().toISOString()
      writeRuntimeStatus(runtimeState)

      if (once) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      continue
    }

    const fromBlock =
      lastSeenBlock > 0n ? lastSeenBlock + 1n : latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : 0n

    const logs = await destinationClient.getLogs({
      address: config.walletAddress,
      event: intentConfiguredEvent,
      fromBlock,
      toBlock: latestBlock,
      strict: true
    })

    for (const log of logs) {
      const logKey = `${log.blockNumber}-${log.logIndex}-${log.transactionHash}`
      if (logKey === lastSeenKey) continue

      lastSeenKey = logKey
      console.log(`intent_detected=${log.transactionHash}`)
      runtimeState.lastIntentTx = log.transactionHash
      const fundingResult = await ensureListenerFunded({
        reactiveClient,
        reactiveWalletClient,
        operatorAccount,
        listenerAddress: config.listenerAddress,
        fundingBufferWei: config.listenerFundingBufferWei
      })
      console.log(`listener_funding=${fundingResult.status}`)
      runtimeState.listenerBalanceWei = fundingResult.after.listenerBalance.toString()
      runtimeState.listenerDebtWei = fundingResult.after.listenerDebt.toString()
      runtimeState.lastFundingResult = fundingResult.status
      runtimeState.lastFundingTx = fundingResult.coverDebtTx || fundingResult.topUpTx

      const armResult = await ensureListenerArmed({
        reactiveClient,
        reactiveWalletClient,
        operatorAccount,
        listenerAddress: config.listenerAddress,
        authorizedRvmId: config.authorizedRvmId
      })
      console.log(`listener_arm=${armResult}`)
      runtimeState.lastArmResult = String(armResult)
      runtimeState.lastArmTx = typeof armResult === 'string' && armResult.startsWith('0x') ? armResult : null
      runtimeState.lastError = null
      runtimeState.heartbeatAt = new Date().toISOString()
      writeRuntimeStatus(runtimeState)
    }

    lastSeenBlock = latestBlock
    try {
      const fundingState = await readListenerFundingState({
        reactiveClient,
        listenerAddress: config.listenerAddress
      })
      runtimeState.listenerBalanceWei = fundingState.listenerBalance.toString()
      runtimeState.listenerDebtWei = fundingState.listenerDebt.toString()
    } catch {}
    runtimeState.heartbeatAt = new Date().toISOString()
    writeRuntimeStatus(runtimeState)

    if (once) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  if (apiServer) {
    apiServer.close()
  }
}

main().catch((error) => {
  writeRuntimeStatus({
    serviceStatus: 'offline',
    heartbeatAt: new Date().toISOString(),
    lastError: error instanceof Error ? error.message : String(error)
  })
  console.error(`operator_service=failed`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
