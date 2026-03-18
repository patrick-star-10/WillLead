import 'viem/window'

import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  toHex,
  type Address,
  type PublicClient,
  type WalletClient
} from 'viem'
import { mnemonicToAccount } from 'viem/accounts'

import { destinationChain, originChain, reactiveChain } from './chains'
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
  const rpcUrl = import.meta.env.VITE_ORIGIN_RPC_URL
  if (!rpcUrl) return null

  return createPublicClient({
    batch: {
      multicall: true
    },
    chain: originChain,
    transport: http(rpcUrl)
  })
}

export function getDestinationPublicClient(): PublicClient | null {
  const rpcUrl = import.meta.env.VITE_DESTINATION_RPC_URL
  if (!rpcUrl) return null

  return createPublicClient({
    batch: {
      multicall: true
    },
    chain: destinationChain,
    transport: http(rpcUrl)
  })
}

export function getReactivePublicClient(): PublicClient | null {
  const rpcUrl = import.meta.env.VITE_REACTIVE_RPC_URL
  if (!rpcUrl) return null

  return createPublicClient({
    batch: {
      multicall: true
    },
    chain: reactiveChain,
    transport: http(rpcUrl)
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

function createLocalWalletClient(rpcUrl: string | undefined, chain: typeof originChain | typeof destinationChain | typeof reactiveChain) {
  if (!rpcUrl) {
    throw new Error(`Missing RPC for ${chain.name}`)
  }

  const wallet = resolveLocalWallet()
  const account = mnemonicToAccount(wallet.mnemonic)
  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  })

  return {
    account: getAddress(account.address),
    client
  }
}

export async function getOriginWalletClient(): Promise<{ account: Address; client: WalletClient }> {
  if (getActiveWalletSource() === 'web') {
    return createLocalWalletClient(import.meta.env.VITE_ORIGIN_RPC_URL, originChain)
  }

  ensureInjectedWallet()
  const provider = resolveInjectedProvider()
  const account = await getConnectedInjectedAddress(provider)

  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: toHex(originChain.id) }]
  })

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
    return createLocalWalletClient(import.meta.env.VITE_DESTINATION_RPC_URL, destinationChain)
  }

  ensureInjectedWallet()
  const provider = resolveInjectedProvider()
  const account = await getConnectedInjectedAddress(provider)

  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: toHex(destinationChain.id) }]
  })

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
    return createLocalWalletClient(import.meta.env.VITE_REACTIVE_RPC_URL, reactiveChain)
  }

  ensureInjectedWallet()
  const provider = resolveInjectedProvider()
  const account = await getConnectedInjectedAddress(provider)

  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: toHex(reactiveChain.id) }]
  })

  const client = createWalletClient({
    account,
    chain: reactiveChain,
    transport: custom(provider)
  })

  return { account, client }
}
