import { useWalletStore } from '../store/walletStore'

export function useIntentState() {
  return useWalletStore((state) => state.intent)
}

