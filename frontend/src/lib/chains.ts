import type { Chain } from 'viem'
import type { ExecutionEnvironment } from '../types/willlead'

import chainRegistry from './chainRegistry.json'

type AppChainRole = 'origin' | 'reactive'

type ChainRegistryEntry = {
  name: string
  nativeCurrency: {
    decimals: number
    name: string
    symbol: string
  }
  defaultRpcUrls: string[]
  explorerBaseUrl?: string
}

type ResolvedChainConfig = {
  id: number
  name: string
  nativeCurrency: Chain['nativeCurrency']
  defaultRpcUrls: string[]
  explorerBaseUrl: string
  chain: Chain
}

const registry = chainRegistry as Record<string, ChainRegistryEntry>

const defaultChainIds: Record<AppChainRole, number> = {
  origin: 84532,
  reactive: 5318007
}

const defaultChainNames: Record<AppChainRole, string> = {
  origin: 'Origin Chain',
  reactive: 'Reactive Chain'
}

const defaultCurrencies: Record<AppChainRole, Chain['nativeCurrency']> = {
  origin: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  },
  reactive: {
    decimals: 18,
    name: 'REACT',
    symbol: 'REACT'
  }
}

type ChainEnvKey = 'CHAIN_ID' | 'RPC_URL' | 'EXPLORER_BASE_URL' | 'CHAIN_NAME'

function envValue(role: AppChainRole, key: ChainEnvKey) {
  if (role === 'origin') {
    return import.meta.env[`VITE_ORIGIN_${key}`]
  }

  return import.meta.env[`VITE_REACTIVE_${key}`]
}

function resolveChainId(role: AppChainRole) {
  const raw = envValue(role, 'CHAIN_ID')
  const parsed = Number(raw || defaultChainIds[role])
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultChainIds[role]
  }
  return parsed
}

function executionEnvValue(
  executionEnvironment: ExecutionEnvironment,
  key: ChainEnvKey
) {
  if (executionEnvironment === 'lasna') {
    return import.meta.env[`VITE_LASNA_EXECUTION_DESTINATION_${key}`]
  }

  return import.meta.env[`VITE_DESTINATION_${key}`]
}

function defaultExecutionChainId(executionEnvironment: ExecutionEnvironment) {
  if (executionEnvironment === 'lasna') {
    return 5318007
  }

  return 11155111
}

function defaultExecutionChainName(executionEnvironment: ExecutionEnvironment) {
  if (executionEnvironment === 'lasna') {
    return 'Lasna Execution'
  }

  return 'Destination Chain'
}

function defaultExecutionNativeCurrency(executionEnvironment: ExecutionEnvironment): Chain['nativeCurrency'] {
  if (executionEnvironment === 'lasna') {
    return {
      decimals: 18,
      name: 'REACT',
      symbol: 'REACT'
    }
  }

  return {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  }
}

function createChain(role: AppChainRole, id: number): ResolvedChainConfig {
  const entry = registry[String(id)]
  const rpcUrl = envValue(role, 'RPC_URL') || ''
  const explorerBaseUrl = envValue(role, 'EXPLORER_BASE_URL') || entry?.explorerBaseUrl || ''
  const name = envValue(role, 'CHAIN_NAME') || entry?.name || `${defaultChainNames[role]} ${id}`
  const nativeCurrency = entry?.nativeCurrency || defaultCurrencies[role]

  const chain: Chain = {
    id,
    name,
    nativeCurrency,
    rpcUrls: {
      default: {
        http: rpcUrl ? [rpcUrl] : []
      }
    }
  }

  if (explorerBaseUrl) {
    chain.blockExplorers = {
      default: {
        name: `${name} Explorer`,
        url: explorerBaseUrl
      }
    }
  }

  return {
    id,
    name,
    nativeCurrency,
    defaultRpcUrls: entry?.defaultRpcUrls || [],
    explorerBaseUrl,
    chain
  }
}

function resolveExecutionChainId(executionEnvironment: ExecutionEnvironment) {
  const raw = executionEnvValue(executionEnvironment, 'CHAIN_ID')
  const fallback = defaultExecutionChainId(executionEnvironment)
  const parsed = Number(raw || fallback)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function createExecutionChain(executionEnvironment: ExecutionEnvironment): ResolvedChainConfig {
  const id = resolveExecutionChainId(executionEnvironment)
  const entry = registry[String(id)]
  const rpcUrl = executionEnvValue(executionEnvironment, 'RPC_URL') || ''
  const explorerBaseUrl =
    executionEnvValue(executionEnvironment, 'EXPLORER_BASE_URL') || entry?.explorerBaseUrl || ''
  const name =
    executionEnvValue(executionEnvironment, 'CHAIN_NAME') ||
    entry?.name ||
    `${defaultExecutionChainName(executionEnvironment)} ${id}`
  const nativeCurrency = entry?.nativeCurrency || defaultExecutionNativeCurrency(executionEnvironment)

  const chain: Chain = {
    id,
    name,
    nativeCurrency,
    rpcUrls: {
      default: {
        http: rpcUrl ? [rpcUrl] : []
      }
    }
  }

  if (explorerBaseUrl) {
    chain.blockExplorers = {
      default: {
        name: `${name} Explorer`,
        url: explorerBaseUrl
      }
    }
  }

  return {
    id,
    name,
    nativeCurrency,
    defaultRpcUrls: entry?.defaultRpcUrls || [],
    explorerBaseUrl,
    chain
  }
}

export const originChainConfig = createChain('origin', resolveChainId('origin'))
export const reactiveChainConfig = createChain('reactive', resolveChainId('reactive'))
export const primaryExecutionChainConfig = createExecutionChain('primary')
export const lasnaExecutionChainConfig = createExecutionChain('lasna')

export const originChain: Chain = originChainConfig.chain
export const reactiveChain: Chain = reactiveChainConfig.chain
export const destinationChain: Chain = primaryExecutionChainConfig.chain

export function getExecutionChainConfig(executionEnvironment: ExecutionEnvironment = 'primary') {
  return executionEnvironment === 'lasna' ? lasnaExecutionChainConfig : primaryExecutionChainConfig
}

export function getExecutionChain(executionEnvironment: ExecutionEnvironment = 'primary') {
  return getExecutionChainConfig(executionEnvironment).chain
}
