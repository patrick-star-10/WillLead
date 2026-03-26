import type { WalletConnectResult } from '../types/willlead'

import {
  disconnectBrowserWalletSession,
  getExecutionWalletClient,
  getInjectedWalletOptions,
  requestWalletAddress
} from './clients'
import { createWebWallet, disconnectWalletSession, importWebWallet, restoreWebWallet } from './webWallet'

export { configureIntent, pauseIntent, resumeIntent } from './actions/intent'
export {
  fundAutonomousWallet,
  initializeAutonomousWallet,
  topUpAutomationCredit
} from './actions/funding'
export { emitSignal } from './actions/signal'
export {
  ensureReactiveListenerArmed,
  pauseReactiveListener,
  resumeReactiveListener
} from './actions/listener'
export { addWatchedToken } from './internal/wallet/assets'
export { readWalletState } from './internal/wallet/state'
export { readExecutionEnvironment, writeExecutionEnvironment } from './internal/storage'

export function getBrowserWalletOptions() {
  return getInjectedWalletOptions()
}

export async function connectOwnerWallet(providerId: string): Promise<WalletConnectResult> {
  const { address, providerId: connectedProviderId, providerLabel } = await requestWalletAddress(
    providerId
  )
  await getExecutionWalletClient()

  return {
    address,
    source: 'browser',
    providerId: connectedProviderId,
    providerLabel
  }
}

export async function createOwnerWebWallet() {
  return createWebWallet()
}

export async function importOwnerWebWallet(mnemonic: string) {
  return importWebWallet(mnemonic)
}

export async function restoreOwnerWallet() {
  return restoreWebWallet()
}

export async function disconnectOwnerWallet() {
  disconnectWalletSession()
  disconnectBrowserWalletSession()
}
