import { useWalletStore } from '../store/walletStore'

export function useWalletState() {
  return useWalletStore((state) => state.wallet)
}

