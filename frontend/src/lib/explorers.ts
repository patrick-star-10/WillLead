import type { ExecutionEnvironment } from '../types/willlead'
import {
  getExecutionChainConfig,
  originChainConfig,
  reactiveChainConfig
} from './chains'

const explorerBases = {
  origin: import.meta.env.VITE_ORIGIN_EXPLORER_BASE_URL || originChainConfig.explorerBaseUrl || '',
  reactive: import.meta.env.VITE_REACTIVE_EXPLORER_BASE_URL || reactiveChainConfig.explorerBaseUrl || ''
} as const

function destinationExplorerBase(executionEnvironment: ExecutionEnvironment) {
  if (executionEnvironment === 'lasna') {
    return (
      import.meta.env.VITE_LASNA_EXECUTION_DESTINATION_EXPLORER_BASE_URL ||
      getExecutionChainConfig('lasna').explorerBaseUrl ||
      ''
    )
  }

  return (
    import.meta.env.VITE_DESTINATION_EXPLORER_BASE_URL ||
    getExecutionChainConfig('primary').explorerBaseUrl ||
    ''
  )
}

export function txExplorerLink(
  chain: 'origin' | 'destination' | 'reactive',
  hash: string | null | undefined,
  executionEnvironment: ExecutionEnvironment = 'primary'
) {
  if (!hash) return null

  const base = chain === 'destination' ? destinationExplorerBase(executionEnvironment) : explorerBases[chain]
  if (!base) return null

  return `${base.replace(/\/$/, '')}/tx/${hash}`
}
