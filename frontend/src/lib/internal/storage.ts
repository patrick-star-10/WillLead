import { getAddress, type Address } from 'viem'
import { emptyAddress, executionEnvironmentStorageKey } from '../constants'
import type { ExecutionEnvironment, WalletConnectionSource } from '../../types/willlead'
import { getExecutionChainConfig } from '../chains'
import { getDestinationPublicClient } from '../clients'
import { getMessages, useLanguageStore } from '../i18n'

export function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function watchedTokensStorageKeyForChainId(chainId: number) {
  return `willlead.watched-erc20.v1:${chainId}`
}

export function readExecutionEnvironment(): ExecutionEnvironment {
  if (!canUseBrowserStorage()) return 'primary'
  return window.localStorage.getItem(executionEnvironmentStorageKey) === 'lasna' ? 'lasna' : 'primary'
}

export function writeExecutionEnvironment(executionEnvironment: ExecutionEnvironment) {
  if (!canUseBrowserStorage()) return
  window.localStorage.setItem(executionEnvironmentStorageKey, executionEnvironment)
}

export function readWatchedTokenAddresses(chainId: number): Address[] {
  if (!canUseBrowserStorage()) return []

  try {
    const raw = window.localStorage.getItem(watchedTokensStorageKeyForChainId(chainId))
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const deduped = new Set<string>()
    const addresses: Address[] = []

    for (const value of parsed) {
      if (typeof value !== 'string') continue
      try {
        const normalized = getAddress(value)
        if (deduped.has(normalized.toLowerCase())) continue
        deduped.add(normalized.toLowerCase())
        addresses.push(normalized)
      } catch {}
    }

    return addresses
  } catch {
    return []
  }
}

export function writeWatchedTokenAddresses(chainId: number, tokens: Address[]) {
  if (!canUseBrowserStorage()) return
  window.localStorage.setItem(watchedTokensStorageKeyForChainId(chainId), JSON.stringify(tokens))
}

export function mergeTrackedTokenAddresses(
  ...tokenLists: Array<Array<Address | null | undefined>>
): Address[] {
  const deduped = new Set<string>()
  const merged: Address[] = []

  for (const tokenList of tokenLists) {
    for (const token of tokenList) {
      if (!token || token === emptyAddress) continue
      const normalized = getAddress(token)
      const key = normalized.toLowerCase()
      if (deduped.has(key)) continue
      deduped.add(key)
      merged.push(normalized)
    }
  }

  return merged
}

export function resolveControllerAssetView(executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()) {
  const executionChainConfig = getExecutionChainConfig(executionEnvironment)

  return {
    client: getDestinationPublicClient(executionEnvironment),
    label: executionChainConfig.name,
    nativeSymbol: executionChainConfig.nativeCurrency.symbol,
    watchedTokens: readWatchedTokenAddresses(executionChainConfig.id)
  }
}

export function executionEnvironmentLabel(executionEnvironment: ExecutionEnvironment) {
  return executionEnvironment === 'lasna'
    ? getMessages(useLanguageStore.getState().locale).lasnaExecutionView
    : getMessages(useLanguageStore.getState().locale).primaryExecutionView
}

export function formatConnectionLabel(source: WalletConnectionSource) {
  if (source === 'browser') return 'Browser Wallet'
  if (source === 'web') return 'Web Wallet'
  return 'Not connected'
}
