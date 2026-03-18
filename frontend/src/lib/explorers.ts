const explorerBases = {
  origin: import.meta.env.VITE_ORIGIN_EXPLORER_BASE_URL || '',
  destination: import.meta.env.VITE_DESTINATION_EXPLORER_BASE_URL || '',
  reactive: import.meta.env.VITE_REACTIVE_EXPLORER_BASE_URL || ''
} as const

export function txExplorerLink(
  chain: 'origin' | 'destination' | 'reactive',
  hash: string | null | undefined
) {
  if (!hash) return null

  const base = explorerBases[chain]
  if (!base) return null

  return `${base.replace(/\/$/, '')}/tx/${hash}`
}
