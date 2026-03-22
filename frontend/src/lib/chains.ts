import type { Chain } from 'viem'

import chainRegistry from './chainRegistry.json'

type AppChainRole = 'origin' | 'destination' | 'reactive'

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
  destination: 11155111,
  reactive: 5318007
}

const defaultChainNames: Record<AppChainRole, string> = {
  origin: 'Origin Chain',
  destination: 'Destination Chain',
  reactive: 'Reactive Chain'
}

const defaultCurrencies: Record<AppChainRole, Chain['nativeCurrency']> = {
  origin: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  },
  destination: {
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

function envValue(role: AppChainRole, key: 'CHAIN_ID' | 'RPC_URL' | 'EXPLORER_BASE_URL' | 'CHAIN_NAME') {
  if (role === 'origin') {
    return import.meta.env[`VITE_ORIGIN_${key}`]
  }

  if (role === 'destination') {
    return import.meta.env[`VITE_DESTINATION_${key}`]
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

export const originChainConfig = createChain('origin', resolveChainId('origin'))
export const destinationChainConfig = createChain('destination', resolveChainId('destination'))
export const reactiveChainConfig = createChain('reactive', resolveChainId('reactive'))

export const originChain: Chain = originChainConfig.chain
export const destinationChain: Chain = destinationChainConfig.chain
export const reactiveChain: Chain = reactiveChainConfig.chain
