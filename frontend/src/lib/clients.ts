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

import { destinationChain, originChain, reactiveChain } from './chains'

function ensureInjectedWallet() {
  if (!window.ethereum) {
    throw new Error('No injected wallet detected')
  }

  return window.ethereum
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

export async function requestWalletAddress(): Promise<Address> {
  const provider = ensureInjectedWallet()
  const addresses = (await provider.request({
    method: 'eth_requestAccounts'
  })) as Address[]

  return getAddress(addresses[0]!)
}

export async function getOriginWalletClient(): Promise<{ account: Address; client: WalletClient }> {
  const provider = ensureInjectedWallet()
  const account = await requestWalletAddress()

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
  const provider = ensureInjectedWallet()
  const account = await requestWalletAddress()

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
  const provider = ensureInjectedWallet()
  const account = await requestWalletAddress()

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
