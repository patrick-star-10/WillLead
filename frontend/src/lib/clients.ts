import 'viem/window'

import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  getAddress,
  http,
  toHex,
  type Address,
  type PublicClient,
  type WalletClient
} from 'viem'
import { mnemonicToAccount } from 'viem/accounts'

import {
  destinationChain,
  destinationChainConfig,
  originChain,
  originChainConfig,
  reactiveChain,
  reactiveChainConfig
} from './chains'
import { getActiveWalletSource, getStoredWebWallet, setActiveWalletSource } from './webWallet'
import type { InjectedWalletOption } from '../types/willlead'

const activeInjectedProviderKey = 'willlead.active-injected-provider'

type InjectedProvider = {
  isMetaMask?: boolean
  isRabby?: boolean
  isCoinbaseWallet?: boolean
  isOKXWallet?: boolean
  providers?: InjectedProvider[]
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function setActiveInjectedProviderId(providerId: string) {
  if (!canUseStorage()) return
  window.localStorage.setItem(activeInjectedProviderKey, providerId)
}

function getActiveInjectedProviderId() {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(activeInjectedProviderKey)
}

function clearActiveInjectedProviderId() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(activeInjectedProviderKey)
}

function parseRpcUrls(value: string | undefined) {
  if (!value) return []

  return value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function uniqueRpcUrls(urls: string[]) {
  return [...new Set(urls)]
}

function resolveRpcUrls(configuredValue: string | undefined, fallbackUrls: string[]) {
  return uniqueRpcUrls([...parseRpcUrls(configuredValue), ...fallbackUrls])
}

function createRpcTransport(urls: string[]) {
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
    return transports[0]!
  }

  return fallback(transports, {
    rank: false
  })
}

function getInjectedProviders(): InjectedProvider[] {
  const ethereum = window.ethereum as InjectedProvider | undefined
  if (!ethereum) return []
  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    return ethereum.providers
  }

  return [ethereum]
}

function identifyProvider(provider: InjectedProvider) {
  if (provider.isRabby) return { id: 'rabby', label: 'Rabby' }
  if (provider.isCoinbaseWallet) return { id: 'coinbase', label: 'Coinbase Wallet' }
  if (provider.isOKXWallet) return { id: 'okx', label: 'OKX Wallet' }
  if (provider.isMetaMask) return { id: 'metamask', label: 'MetaMask' }
  return { id: 'injected', label: 'Injected Wallet' }
}

function ensureInjectedWallet() {
  const ethereum = window.ethereum as InjectedProvider | undefined
  if (!ethereum) {
    throw new Error('No injected wallet detected')
  }

  return ethereum
}

function resolveInjectedProvider(providerId?: string) {
  const providers = getInjectedProviders()
  if (providers.length === 0) {
    throw new Error('No injected wallet detected')
  }

  const targetProviderId = providerId ?? getActiveInjectedProviderId()
  if (!targetProviderId) {
    return providers[0]!
  }

  const provider =
    providers.find((candidate) => identifyProvider(candidate).id === targetProviderId) ?? providers[0]!

  return provider
}

export function getInjectedWalletOptions(): InjectedWalletOption[] {
  const options = getInjectedProviders().map((provider) => identifyProvider(provider))
  const unique = new Map<string, InjectedWalletOption>()

  for (const option of options) {
    if (!unique.has(option.id)) {
      unique.set(option.id, option)
    }
  }

  return [...unique.values()]
}

export function disconnectBrowserWalletSession() {
  clearActiveInjectedProviderId()
}

export function getOriginPublicClient(): PublicClient | null {
  const rpcUrls = resolveRpcUrls(import.meta.env.VITE_ORIGIN_RPC_URL, originChainConfig.defaultRpcUrls)
  if (rpcUrls.length === 0) return null

  return createPublicClient({
    batch: {
      multicall: true
    },
    chain: originChain,
    transport: createRpcTransport(rpcUrls)
  })
}

export function getDestinationPublicClient(): PublicClient | null {
  const rpcUrls = resolveRpcUrls(
    import.meta.env.VITE_DESTINATION_RPC_URL,
    destinationChainConfig.defaultRpcUrls
  )
  if (rpcUrls.length === 0) return null

  return createPublicClient({
    batch: {
      multicall: true
    },
    chain: destinationChain,
    transport: createRpcTransport(rpcUrls)
  })
}

export function getReactivePublicClient(): PublicClient | null {
  const rpcUrls = resolveRpcUrls(import.meta.env.VITE_REACTIVE_RPC_URL, reactiveChainConfig.defaultRpcUrls)
  if (rpcUrls.length === 0) return null

  return createPublicClient({
    batch: {
      multicall: true
    },
    chain: reactiveChain,
    transport: createRpcTransport(rpcUrls)
  })
}

export async function requestWalletAddress(providerId?: string): Promise<{
  address: Address
  providerId: string
  providerLabel: string
}> {
  ensureInjectedWallet()
  const provider = resolveInjectedProvider(providerId)
  const providerMeta = identifyProvider(provider)

  try {
    await provider.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    })
  } catch {}

  const addresses = (await provider.request({
    method: 'eth_requestAccounts'
  })) as Address[]

  setActiveWalletSource('browser')
  setActiveInjectedProviderId(providerMeta.id)
  return {
    address: getAddress(addresses[0]!),
    providerId: providerMeta.id,
    providerLabel: providerMeta.label
  }
}

async function getConnectedInjectedAddress(provider: InjectedProvider) {
  const existingAddresses = (await provider.request({
    method: 'eth_accounts'
  })) as Address[]

  if (existingAddresses[0]) {
    return getAddress(existingAddresses[0])
  }

  const requested = await requestWalletAddress(identifyProvider(provider).id)
  return requested.address
}

function resolveLocalWallet() {
  const wallet = getStoredWebWallet()
  if (!wallet) {
    throw new Error('No web wallet found. Create or import one first.')
  }

  return wallet
}

function createLocalWalletClient(
  rpcUrls: string[],
  chain: typeof originChain | typeof destinationChain | typeof reactiveChain
) {
  if (rpcUrls.length === 0) {
    throw new Error(`Missing RPC for ${chain.name}`)
  }

  const wallet = resolveLocalWallet()
  const account = mnemonicToAccount(wallet.mnemonic)
  const client = createWalletClient({
    account,
    chain,
    transport: createRpcTransport(rpcUrls)
  })

  return {
    account: getAddress(account.address),
    client
  }
}

async function switchInjectedChain(
  provider: InjectedProvider,
  chain: typeof originChain | typeof destinationChain | typeof reactiveChain
) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHex(chain.id) }]
    })
    return
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : null
    if (code !== 4902) {
      throw error
    }
  }

  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: toHex(chain.id),
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: chain.rpcUrls.default.http,
        blockExplorerUrls: chain.blockExplorers?.default?.url
          ? [chain.blockExplorers.default.url]
          : undefined
      }
    ]
  })
}

export async function getOriginWalletClient(): Promise<{ account: Address; client: WalletClient }> {
  if (getActiveWalletSource() === 'web') {
    return createLocalWalletClient(
      resolveRpcUrls(import.meta.env.VITE_ORIGIN_RPC_URL, originChainConfig.defaultRpcUrls),
      originChain
    )
  }

  ensureInjectedWallet()
  const provider = resolveInjectedProvider()
  const account = await getConnectedInjectedAddress(provider)

  await switchInjectedChain(provider, originChain)

  const client = createWalletClient({
    account,
    chain: originChain,
    transport: custom(provider)
  })

  return { account, client }
}

export async function getDestinationWalletClient(): Promise<{
  account: Address
  client: WalletClient
}> {
  if (getActiveWalletSource() === 'web') {
    return createLocalWalletClient(
      resolveRpcUrls(import.meta.env.VITE_DESTINATION_RPC_URL, destinationChainConfig.defaultRpcUrls),
      destinationChain
    )
  }

  ensureInjectedWallet()
  const provider = resolveInjectedProvider()
  const account = await getConnectedInjectedAddress(provider)

  await switchInjectedChain(provider, destinationChain)

  const client = createWalletClient({
    account,
    chain: destinationChain,
    transport: custom(provider)
  })

  return { account, client }
}

export async function getReactiveWalletClient(): Promise<{
  account: Address
  client: WalletClient
}> {
  if (getActiveWalletSource() === 'web') {
    return createLocalWalletClient(
      resolveRpcUrls(import.meta.env.VITE_REACTIVE_RPC_URL, reactiveChainConfig.defaultRpcUrls),
      reactiveChain
    )
  }

  ensureInjectedWallet()
  const provider = resolveInjectedProvider()
  const account = await getConnectedInjectedAddress(provider)

  await switchInjectedChain(provider, reactiveChain)

  const client = createWalletClient({
    account,
    chain: reactiveChain,
    transport: custom(provider)
  })

  return { account, client }
}
