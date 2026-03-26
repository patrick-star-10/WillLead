import { getAddress, type Address } from 'viem'
import { emptyAddress } from '../constants'

export function isConfiguredAddress(value: string) {
  return value.toLowerCase() !== emptyAddress
}

export function isSameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase()
}

export function configuredAddressOrNull(value: string | undefined) {
  if (!value) return null
  return isConfiguredAddress(value) ? getAddress(value) : null
}

export function toTokenAddress(tokenInput: string): Address {
  if (!tokenInput.trim() || tokenInput === 'native') {
    return emptyAddress as Address
  }

  return getAddress(tokenInput)
}

export function formatUint256Topic(value: bigint) {
  return `0x${value.toString(16).padStart(64, '0')}`
}

export function formatAddressTopic(value: Address) {
  return `0x${value.toLowerCase().replace('0x', '').padStart(64, '0')}`
}
