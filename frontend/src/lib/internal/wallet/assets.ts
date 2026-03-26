import { getAddress, parseAbi, type Address } from 'viem'

import type { ActionResult, AssetBalance, ExecutionEnvironment } from '../../../types/willlead'
import { getExecutionChain } from '../../chains'
import { getDestinationPublicClient } from '../../clients'
import { getMessages, useLanguageStore } from '../../i18n'
import { formatAmount, formatTokenAmount } from '../format'
import {
  mergeTrackedTokenAddresses,
  readExecutionEnvironment,
  readWatchedTokenAddresses,
  writeWatchedTokenAddresses
} from '../storage'

const erc20Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
])

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export function addWatchedToken(
  tokenInput: string,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
): ActionResult {
  const tokenAddress = getAddress(tokenInput)
  const executionChain = getExecutionChain(executionEnvironment)
  const nextTokens = mergeTrackedTokenAddresses(readWatchedTokenAddresses(executionChain.id), [tokenAddress])
  writeWatchedTokenAddresses(executionChain.id, nextTokens)

  return {
    hash: tokenAddress,
    label: copy().watchedTokenAddedAction,
    description: `${copy().watchedTokenAddedDesc} ${tokenAddress}`
  }
}

export async function readTrackedAssets(
  destinationClient: NonNullable<ReturnType<typeof getDestinationPublicClient>>,
  holderAddress: Address,
  nativeBalance: bigint,
  trackedTokens: Address[],
  nativeSymbol: string
): Promise<AssetBalance[]> {
  const balances: AssetBalance[] = [
    {
      symbol: nativeSymbol,
      balanceLabel: formatAmount(nativeBalance, nativeSymbol),
      kind: 'native'
    }
  ]

  if (trackedTokens.length === 0) return balances

  const results = await Promise.allSettled(
    trackedTokens.map(async (tokenAddress) => {
      const [tokenBalance, decimals, symbol] = await Promise.all([
        destinationClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [holderAddress]
        }) as Promise<bigint>,
        destinationClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals'
        }) as Promise<number>,
        destinationClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'symbol'
        }) as Promise<string>
      ])

      return {
        symbol,
        balanceLabel: `${formatTokenAmount(tokenBalance, decimals)} ${symbol}`,
        kind: 'erc20' as const
      }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      balances.push(result.value)
    }
  }

  return balances
}
