#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPublicClient, createWalletClient, fallback, getAddress, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendDir, '..')
const chainRegistryPath = path.join(frontendDir, 'src', 'lib', 'chainRegistry.json')
const reactiveSystemAddress = '0x0000000000000000000000000000000000fffFfF'
const subscribeEventTopic0 =
  '0xe9b38458922e1af481b2244c7c2bb32e465e90c352946042d2a09472fad6c246'

const executionEnvironment = normalizeExecutionEnvironment(process.env.EXECUTION_ENV)
const args = parseArgs(process.argv.slice(2))

const listenerReadAbi = parseAbi([
  'function ownerAddress() view returns (address)',
  'function isPaused() view returns (bool)',
  'function originChainId() view returns (uint256)',
  'function watchedPool() view returns (address)',
  'function swapTopic0() view returns (uint256)',
  'function watchedSourceCount() view returns (uint256)',
  'function watchedSourceAt(uint256) view returns (address source, uint256 topic0, uint24 feeTag, bool useTopic1AsSender)',
  'function repairSubscriptions()',
  'function resume()'
])

function normalizeExecutionEnvironment(value) {
  return value === 'lasna' ? 'lasna' : 'primary'
}

function executionEnvPrefix(value) {
  return value === 'lasna' ? 'LASNA_EXECUTION_' : ''
}

function readExecutionEnvValue(values, envName, baseName, viteBaseName = baseName) {
  const prefix = executionEnvPrefix(envName)
  if (envName === 'lasna') {
    return (
      values[`${prefix}${baseName}`] ||
      values[`VITE_${prefix}${viteBaseName}`] ||
      values[baseName] ||
      values[`VITE_${viteBaseName}`]
    )
  }

  return values[baseName] || values[`VITE_${viteBaseName}`]
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const values = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    values[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
  }

  return values
}

function parseArgs(argv) {
  const options = {
    checkOnly: false,
    listenerAddress: null
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--check') {
      options.checkOnly = true
    } else if (arg === '--listener' && argv[index + 1]) {
      options.listenerAddress = argv[index + 1]
      index += 1
    } else if (!arg.startsWith('-') && options.listenerAddress === null) {
      options.listenerAddress = arg
    }
  }

  return options
}

function parseRpcUrls(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function uniqueRpcUrls(urls) {
  return [...new Set(urls)]
}

function createRpcTransport(urls) {
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

function topicForAddress(value) {
  return `0x${value.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`
}

function topicForUint(value) {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`
}

async function resolveSubscriptions(reactiveClient, listenerAddress) {
  const originChainId = await reactiveClient.readContract({
    address: listenerAddress,
    abi: listenerReadAbi,
    functionName: 'originChainId'
  })

  try {
    const watchedSourceCount = await reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerReadAbi,
      functionName: 'watchedSourceCount'
    })

    const subscriptions = []
    for (let index = 0n; index < watchedSourceCount; index += 1n) {
      const watched = await reactiveClient.readContract({
        address: listenerAddress,
        abi: listenerReadAbi,
        functionName: 'watchedSourceAt',
        args: [index]
      })

      subscriptions.push({
        source: watched[0],
        topic0: watched[1]
      })
    }

    return {
      originChainId,
      subscriptions,
      listenerType: 'multi_source'
    }
  } catch {
    const [watchedPool, swapTopic0] = await Promise.all([
      reactiveClient.readContract({
        address: listenerAddress,
        abi: listenerReadAbi,
        functionName: 'watchedPool'
      }),
      reactiveClient.readContract({
        address: listenerAddress,
        abi: listenerReadAbi,
        functionName: 'swapTopic0'
      })
    ])

    return {
      originChainId,
      subscriptions: [{ source: watchedPool, topic0: swapTopic0 }],
      listenerType: 'single_source'
    }
  }
}

async function hasSubscriptionLog(reactiveClient, listenerAddress, originChainId, source, topic0) {
  const logs = await reactiveClient.request({
    method: 'eth_getLogs',
    params: [
      {
        address: reactiveSystemAddress,
        fromBlock: '0x0',
        topics: [
          subscribeEventTopic0,
          topicForAddress(listenerAddress),
          topicForUint(originChainId),
          topicForAddress(source)
        ]
      }
    ]
  })

  const expectedTopic0 = BigInt(topic0).toString(16).padStart(64, '0').toLowerCase()
  return logs.some((entry) => {
    const data = String(entry.data || '').toLowerCase()
    return data.slice(2, 66) === expectedTopic0
  })
}

async function main() {
  const merged = {
    ...loadEnvFile(path.join(repoRoot, '.env')),
    ...loadEnvFile(path.join(frontendDir, '.env.local')),
    ...process.env
  }

  const chainRegistry = JSON.parse(fs.readFileSync(chainRegistryPath, 'utf8'))
  const reactiveChainId = Number(merged.REACTIVE_CHAIN_ID || merged.VITE_REACTIVE_CHAIN_ID || 0)
  if (!reactiveChainId) {
    throw new Error('Missing REACTIVE_CHAIN_ID')
  }

  const reactiveChain = chainRegistry[String(reactiveChainId)]
  const reactiveRpcUrls = uniqueRpcUrls(
    parseRpcUrls(merged.REACTIVE_RPC_URL || merged.VITE_REACTIVE_RPC_URL).concat(
      reactiveChain?.defaultRpcUrls || []
    )
  )
  if (reactiveRpcUrls.length === 0) {
    throw new Error('Missing REACTIVE_RPC_URL')
  }

  if (!args.listenerAddress) {
    throw new Error(
      'Missing swap listener address. Usage: ./contracts/script/sync-swap-listener-subscription.sh <listenerAddress> [--check]'
    )
  }

  const listenerAddress = getAddress(args.listenerAddress)
  const reactiveClient = createPublicClient({
    chain: {
      id: reactiveChainId,
      name: reactiveChain?.name || 'reactive',
      nativeCurrency:
        reactiveChain?.nativeCurrency || {
          name: 'REACT',
          symbol: 'REACT',
          decimals: 18
        },
      rpcUrls: { default: { http: reactiveRpcUrls } }
    },
    transport: createRpcTransport(reactiveRpcUrls)
  })

  const [ownerAddress, listenerPaused, subscriptionInfo] = await Promise.all([
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerReadAbi,
      functionName: 'ownerAddress'
    }),
    reactiveClient.readContract({
      address: listenerAddress,
      abi: listenerReadAbi,
      functionName: 'isPaused'
    }),
    resolveSubscriptions(reactiveClient, listenerAddress)
  ])

  const checks = await Promise.all(
    subscriptionInfo.subscriptions.map(async (subscription) => ({
      ...subscription,
      present: await hasSubscriptionLog(
        reactiveClient,
        listenerAddress,
        subscriptionInfo.originChainId,
        subscription.source,
        subscription.topic0
      )
    }))
  )

  const missing = checks.filter((subscription) => !subscription.present)

  console.log(`execution_env=${executionEnvironment}`)
  console.log(`listener=${listenerAddress}`)
  console.log(`listener_type=${subscriptionInfo.listenerType}`)
  console.log(`listener_owner=${ownerAddress}`)
  console.log(`listener_paused=${listenerPaused}`)
  console.log(`origin_chain_id=${subscriptionInfo.originChainId}`)
  console.log(`subscription_count=${checks.length}`)

  for (const [index, subscription] of checks.entries()) {
    console.log(
      `subscription_${index}=${subscription.present ? 'ok' : 'missing'} source=${subscription.source} topic0=${subscription.topic0}`
    )
  }

  if (missing.length === 0) {
    console.log('swap_listener_subscription=ok')
    return
  }

  if (args.checkOnly) {
    console.log('swap_listener_subscription=missing')
    process.exitCode = 1
    return
  }

  const privateKey = merged.OWNER_PRIVATE_KEY || merged.WILLLEAD_OPERATOR_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('Missing OWNER_PRIVATE_KEY')
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`)
  if (account.address.toLowerCase() !== ownerAddress.toLowerCase()) {
    throw new Error(
      `Operator key ${account.address} does not own listener ${listenerAddress} (${ownerAddress})`
    )
  }

  const walletClient = createWalletClient({
    account,
    chain: reactiveClient.chain,
    transport: createRpcTransport(reactiveRpcUrls)
  })

  if (listenerPaused) {
    const resumeHash = await walletClient.writeContract({
      address: listenerAddress,
      abi: listenerReadAbi,
      functionName: 'resume'
    })
    await reactiveClient.waitForTransactionReceipt({ hash: resumeHash })
    console.log(`listener_resume_tx=${resumeHash}`)
  }

  const repairHash = await walletClient.writeContract({
    address: listenerAddress,
    abi: listenerReadAbi,
    functionName: 'repairSubscriptions'
  })
  await reactiveClient.waitForTransactionReceipt({ hash: repairHash })
  console.log(`listener_repair_tx=${repairHash}`)
  console.log('swap_listener_subscription=repaired')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
