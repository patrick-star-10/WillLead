import type { Hex } from 'viem'

function parseBlockLookback(value: string | undefined, fallback: bigint) {
  if (!value) return fallback

  try {
    const parsed = BigInt(value)
    return parsed > 0n ? parsed : fallback
  } catch {
    return fallback
  }
}

export const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const emptyAddress = '0x0000000000000000000000000000000000000000'
export const reactiveSystemContract = '0x0000000000000000000000000000000000fffFfF'
export const subscribeContractTopic0 =
  '0xf2856a60f496a79f2738ebb36013248bb2f4a85116d90c2a595a96ef780137d2'
export const reactiveIgnore =
  '0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad' as Hex
export const executionEnvironmentStorageKey = 'willlead.execution-environment'
export const logQueryChunkSize = 25_000n
export const historyLookbackBlocks = parseBlockLookback(
  import.meta.env.VITE_HISTORY_LOOKBACK_BLOCKS,
  20_000n
)
export const subscriptionLookbackBlocks = parseBlockLookback(
  import.meta.env.VITE_SUBSCRIPTION_LOOKBACK_BLOCKS,
  200_000n
)
