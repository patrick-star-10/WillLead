import { formatEther, type Address } from 'viem'

import { destinationChain } from '../chains'

export function formatTimestamp(timestamp: bigint) {
  if (timestamp === 0n) return 'Never'

  return new Date(Number(timestamp) * 1000).toLocaleString('en-US', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

export function formatRuntimeStatus(status: number) {
  switch (status) {
    case 1:
      return 'active'
    case 2:
      return 'paused'
    case 3:
      return 'exhausted'
    default:
      return 'inactive'
  }
}

export function formatNativeAmount(amount: bigint, symbol: string) {
  return `${formatDecimalString(formatEther(amount), 3)} ${symbol}`
}

export function formatAmount(amount: bigint, symbol: string = destinationChain.nativeCurrency.symbol) {
  return formatNativeAmount(amount, symbol)
}

export function formatUint256Topic(value: bigint) {
  return `0x${value.toString(16).padStart(64, '0')}`
}

export function formatAddressTopic(value: Address) {
  return `0x${value.toLowerCase().replace('0x', '').padStart(64, '0')}`
}

export function formatTokenAmount(amount: bigint, decimals: number) {
  const decimalFactor = 10n ** BigInt(decimals)
  const whole = amount / decimalFactor
  const fraction = amount % decimalFactor

  if (fraction === 0n) return whole.toString()

  const paddedFraction = fraction.toString().padStart(decimals, '0').slice(0, 3).replace(/0+$/, '')
  return paddedFraction ? `${whole}.${paddedFraction}` : whole.toString()
}

export function formatDecimalString(value: string, maxDecimals: number) {
  const [whole, fraction] = value.split('.')
  if (!fraction) return whole

  const trimmedFraction = fraction.slice(0, maxDecimals).replace(/0+$/, '')
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole
}

export function formatOperatorHeartbeat(heartbeatAt: string) {
  return new Date(heartbeatAt).toLocaleString('en-US', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  })
}
