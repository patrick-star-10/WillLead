import { getAddress, parseEther } from 'viem'

import { willLeadWalletAbi } from '../../contracts/abi/willLeadWallet'
import type { ActionResult, IntentFormValues } from '../../types/willlead'
import { getExecutionChain } from '../chains'
import { getDestinationPublicClient, getExecutionWalletClient } from '../clients'
import { getMessages, useLanguageStore } from '../i18n'
import { toTokenAddress } from '../internal/address'
import { readExecutionEnvironment } from '../internal/storage'
import {
  readWalletRuntimeBinding,
  resolveRuntimeRouteInput,
  resolveWalletAddressForOwner,
  runtimeRouteMatches,
  validateRuntimeRouteInputForExecution
} from '../internal/wallet/binding'

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export async function configureIntent(
  values: IntentFormValues,
  options?: {
    skipRuntimeRouteSync?: boolean
  }
): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const executionChain = getExecutionChain(executionEnvironment)
  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const { walletAddress } = await resolveWalletAddressForOwner(account, executionEnvironment)
  const destinationClient = getDestinationPublicClient(executionEnvironment)
  const currentRuntimeBinding =
    destinationClient ? await readWalletRuntimeBinding(destinationClient, walletAddress) : null
  const runtimeRoute = resolveRuntimeRouteInput(values)
  const token = toTokenAddress(values.token)
  const recipient = getAddress(values.recipient)
  const amountPerExecution = parseEther(values.amountPerExecution)
  const automationFloor = parseEther(values.minAutomationBalance)

  if (amountPerExecution <= 0n) {
    throw new Error('Amount per execution must be greater than 0.')
  }
  if (values.maxExecutions <= 0) {
    throw new Error('Max executions must be greater than 0.')
  }

  if (!options?.skipRuntimeRouteSync && !runtimeRouteMatches(currentRuntimeBinding, runtimeRoute)) {
    await validateRuntimeRouteInputForExecution(runtimeRoute, executionEnvironment)

    const runtimeHash = await client.writeContract({
      account,
      address: walletAddress,
      abi: willLeadWalletAbi,
      chain: executionChain,
      functionName: 'configureRuntimeRoute',
      args: [
        runtimeRoute.listener,
        runtimeRoute.signalEmitter,
        runtimeRoute.sourceChainId,
        runtimeRoute.destinationChainId,
        runtimeRoute.strategySignalTopic0
      ],
      gas: 250_000n
    })

    if (destinationClient) {
      await destinationClient.waitForTransactionReceipt({ hash: runtimeHash })
    }
  }

  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain: executionChain,
    functionName: 'configureIntent',
    args: [token, recipient, amountPerExecution, BigInt(values.maxExecutions), automationFloor],
    gas: 300_000n
  })

  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().intentConfiguredAction,
    description: copy().intentConfiguredDesc
  }
}

export async function pauseIntent(): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const executionChain = getExecutionChain(executionEnvironment)
  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const { walletAddress } = await resolveWalletAddressForOwner(account, executionEnvironment)
  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain: executionChain,
    functionName: 'pauseIntent'
  })

  const destinationClient = getDestinationPublicClient(executionEnvironment)
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().intentPausedAction,
    description: copy().intentPausedDesc
  }
}

export async function resumeIntent(): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const executionChain = getExecutionChain(executionEnvironment)
  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const { walletAddress } = await resolveWalletAddressForOwner(account, executionEnvironment)
  const hash = await client.writeContract({
    account,
    address: walletAddress,
    abi: willLeadWalletAbi,
    chain: executionChain,
    functionName: 'resumeIntent'
  })

  const destinationClient = getDestinationPublicClient(executionEnvironment)
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().intentResumedAction,
    description: copy().intentResumedDesc
  }
}
