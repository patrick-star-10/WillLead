import { useWalletStore } from '../store/walletStore'

export function useExecutionEvents() {
  return useWalletStore((state) => state.executionProofs)
}

