import type { ExecutionEnvironment } from '../types/willlead'

export type ExecutionContractAddresses = {
  wallet: string
  walletFactory: string
  signalEmitter: string
  reactiveListener: string
  callbackProxy: string
  authorizedRvmId: string
}

const primaryExecutionAddresses = {
  wallet: import.meta.env.VITE_WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000',
  walletFactory:
    import.meta.env.VITE_WALLET_FACTORY_ADDRESS ?? '0x0000000000000000000000000000000000000000',
  signalEmitter:
    import.meta.env.VITE_SIGNAL_EMITTER_ADDRESS ?? '0x0000000000000000000000000000000000000000',
  reactiveListener:
    import.meta.env.VITE_REACTIVE_LISTENER_ADDRESS ??
    '0x0000000000000000000000000000000000000000',
  callbackProxy: import.meta.env.VITE_CALLBACK_PROXY ?? '0x0000000000000000000000000000000000fffFfF',
  authorizedRvmId:
    import.meta.env.VITE_AUTHORIZED_RVM_ID ?? '0x0000000000000000000000000000000000000000'
} as const satisfies ExecutionContractAddresses

const lasnaExecutionAddresses = {
  wallet:
    import.meta.env.VITE_LASNA_EXECUTION_WALLET_ADDRESS ??
    '0x0000000000000000000000000000000000000000',
  walletFactory:
    import.meta.env.VITE_LASNA_EXECUTION_WALLET_FACTORY_ADDRESS ??
    '0x0000000000000000000000000000000000000000',
  signalEmitter:
    import.meta.env.VITE_LASNA_EXECUTION_SIGNAL_EMITTER_ADDRESS ??
    '0x0000000000000000000000000000000000000000',
  reactiveListener:
    import.meta.env.VITE_LASNA_EXECUTION_REACTIVE_LISTENER_ADDRESS ??
    '0x0000000000000000000000000000000000000000',
  callbackProxy:
    import.meta.env.VITE_LASNA_EXECUTION_CALLBACK_PROXY ??
    '0x0000000000000000000000000000000000fffFfF',
  authorizedRvmId:
    import.meta.env.VITE_AUTHORIZED_RVM_ID ?? '0x0000000000000000000000000000000000000000'
} as const satisfies ExecutionContractAddresses

export const contractAddresses = primaryExecutionAddresses

export function getExecutionContractAddresses(
  executionEnvironment: ExecutionEnvironment = 'primary'
): ExecutionContractAddresses {
  return executionEnvironment === 'lasna' ? lasnaExecutionAddresses : primaryExecutionAddresses
}

export function hasConfiguredExecutionEnvironment(
  executionEnvironment: ExecutionEnvironment = 'primary'
) {
  const addresses = getExecutionContractAddresses(executionEnvironment)
  return addresses.walletFactory !== '0x0000000000000000000000000000000000000000'
}
