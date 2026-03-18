import { getAddress, type Address } from 'viem'
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts'

import type { WalletConnectResult, WalletConnectionSource } from '../types/willlead'

const webWalletStorageKey = 'willlead.web-wallet'
const activeWalletSourceKey = 'willlead.active-wallet-source'

type StoredWebWallet = {
  address: Address
  mnemonic: string
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeMnemonic(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

function saveStoredWebWallet(wallet: StoredWebWallet) {
  if (!canUseStorage()) return
  window.localStorage.setItem(webWalletStorageKey, JSON.stringify(wallet))
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null

  const raw = window.localStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getActiveWalletSource(): WalletConnectionSource {
  if (!canUseStorage()) return 'disconnected'

  const source = window.localStorage.getItem(activeWalletSourceKey)
  if (source === 'browser' || source === 'web') return source
  return 'disconnected'
}

export function setActiveWalletSource(source: WalletConnectionSource) {
  if (!canUseStorage()) return

  if (source === 'disconnected') {
    window.localStorage.removeItem(activeWalletSourceKey)
    return
  }

  window.localStorage.setItem(activeWalletSourceKey, source)
}

export function getStoredWebWallet(): StoredWebWallet | null {
  const wallet = readJson<StoredWebWallet>(webWalletStorageKey)
  if (!wallet) return null

  try {
    return {
      address: getAddress(wallet.address),
      mnemonic: normalizeMnemonic(wallet.mnemonic)
    }
  } catch {
    return null
  }
}

export function createWebWallet(): WalletConnectResult {
  const mnemonic = generateMnemonic(english)
  const account = mnemonicToAccount(mnemonic)
  const result = {
    address: getAddress(account.address),
    source: 'web' as const,
    mnemonic
  }

  saveStoredWebWallet({
    address: result.address,
    mnemonic: result.mnemonic
  })
  setActiveWalletSource('web')

  return result
}

export function importWebWallet(mnemonicInput: string): WalletConnectResult {
  const mnemonic = normalizeMnemonic(mnemonicInput)
  const account = mnemonicToAccount(mnemonic)
  const result = {
    address: getAddress(account.address),
    source: 'web' as const,
    mnemonic
  }

  saveStoredWebWallet({
    address: result.address,
    mnemonic: result.mnemonic
  })
  setActiveWalletSource('web')

  return result
}

export function restoreWebWallet(): WalletConnectResult | null {
  const activeSource = getActiveWalletSource()
  if (activeSource !== 'web') return null

  const wallet = getStoredWebWallet()
  if (!wallet) return null

  return {
    address: wallet.address,
    source: 'web',
    mnemonic: wallet.mnemonic
  }
}

export function disconnectWalletSession() {
  setActiveWalletSource('disconnected')
}
