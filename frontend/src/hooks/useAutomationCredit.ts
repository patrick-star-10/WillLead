import { useWalletStore } from '../store/walletStore'

export function useAutomationCredit() {
  return useWalletStore((state) => state.automation)
}

