import chainRegistry from './chainRegistry.json'

type ChainRegistryEntry = {
  name: string
}

export type RuntimeRouteChainOption = {
  value: string
  label: string
}

const registry = chainRegistry as Record<string, ChainRegistryEntry>

export function buildRuntimeRouteChainOptions(values: string[]): RuntimeRouteChainOption[] {
  const unique = new Set<string>()
  const options: RuntimeRouteChainOption[] = []

  Object.entries(registry)
    .sort((left, right) => {
      const leftId = Number(left[0])
      const rightId = Number(right[0])
      return leftId - rightId
    })
    .forEach(([chainId, entry]) => {
      unique.add(chainId)
      options.push({
        value: chainId,
        label: `${entry.name} (${chainId})`
      })
    })

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (unique.has(value)) return

      unique.add(value)
      options.push({
        value,
        label: `Custom Chain (${value})`
      })
    })

  return options
}

export function formatRuntimeRouteChainLabel(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    return 'Unavailable'
  }

  const entry = registry[normalized]
  if (entry) {
    return `${entry.name} (${normalized})`
  }

  return `Custom Chain (${normalized})`
}
