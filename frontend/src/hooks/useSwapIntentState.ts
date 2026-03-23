import { useWalletStore } from '../store/walletStore'

export function useSwapIntentState() {
  return useWalletStore((state) => state.swapIntent)
}
