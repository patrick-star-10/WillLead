import type { Address } from 'viem'

import { callbackProxyAbi } from '../../../contracts/abi/callbackProxy'
import type { AutomationCreditState, ExecutionEnvironment } from '../../../types/willlead'
import { getExecutionChainConfig } from '../../chains'
import { getDestinationPublicClient } from '../../clients'
import { getExecutionContractAddresses } from '../../../contracts/addresses'
import { formatAmount } from '../format'
import { readExecutionEnvironment } from '../storage'
import { isConfiguredAddress } from '../address'

export async function readAutomationCredit(
  walletAddress: Address,
  automationFloor: bigint,
  executionEnvironment: ExecutionEnvironment = readExecutionEnvironment()
): Promise<AutomationCreditState> {
  const executionAddresses = getExecutionContractAddresses(executionEnvironment)
  const executionChainConfig = getExecutionChainConfig(executionEnvironment)
  const destinationClient = getDestinationPublicClient(executionEnvironment)

  if (!destinationClient || !isConfiguredAddress(executionAddresses.callbackProxy)) {
    return {
      creditLabel: 'Unknown',
      availableBalance: 'Unknown',
      minRequiredBalance: formatAmount(automationFloor, executionChainConfig.nativeCurrency.symbol)
    }
  }

  try {
    const [reserves, debts] = await Promise.all([
      destinationClient.readContract({
        address: executionAddresses.callbackProxy as Address,
        abi: callbackProxyAbi,
        functionName: 'reserves',
        args: [walletAddress]
      }) as Promise<bigint>,
      destinationClient.readContract({
        address: executionAddresses.callbackProxy as Address,
        abi: callbackProxyAbi,
        functionName: 'debts',
        args: [walletAddress]
      }) as Promise<bigint>
    ])

    const net = reserves > debts ? reserves - debts : 0n
    const creditLabel = net >= automationFloor ? 'Healthy' : 'Low'

    return {
      creditLabel,
      availableBalance: formatAmount(net, executionChainConfig.nativeCurrency.symbol),
      minRequiredBalance: formatAmount(automationFloor, executionChainConfig.nativeCurrency.symbol)
    }
  } catch {
    return {
      creditLabel: 'Unknown',
      availableBalance: 'Unknown',
      minRequiredBalance: formatAmount(automationFloor, executionChainConfig.nativeCurrency.symbol)
    }
  }
}
