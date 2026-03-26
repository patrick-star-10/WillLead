import { getAddress, parseEther } from 'viem'

import { callbackProxyAbi } from '../../contracts/abi/callbackProxy'
import { willLeadWalletFactoryAbi } from '../../contracts/abi/willLeadWalletFactory'
import { getExecutionContractAddresses } from '../../contracts/addresses'
import type { ActionResult, AutomationFundingValues, WalletFundingValues } from '../../types/willlead'
import { getExecutionChain } from '../chains'
import { getDestinationPublicClient, getExecutionWalletClient } from '../clients'
import { getMessages, useLanguageStore } from '../i18n'
import { isConfiguredAddress } from '../internal/address'
import { readExecutionEnvironment } from '../internal/storage'
import { resolveWalletAddressForOwner } from '../internal/wallet/binding'

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export async function topUpAutomationCredit(
  values: AutomationFundingValues
): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const executionChain = getExecutionChain(executionEnvironment)
  const callbackProxyAddress = getExecutionContractAddresses(executionEnvironment).callbackProxy
  if (!isConfiguredAddress(callbackProxyAddress)) {
    throw new Error(copy().callbackProxyOrWalletMissing)
  }

  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const { walletAddress } = await resolveWalletAddressForOwner(account, executionEnvironment)
  const targetAddress =
    values.targetAddress && /^0x[a-fA-F0-9]{40}$/.test(values.targetAddress)
      ? getAddress(values.targetAddress)
      : walletAddress
  const hash = await client.writeContract({
    account,
    address: getAddress(callbackProxyAddress),
    abi: callbackProxyAbi,
    chain: executionChain,
    functionName: 'depositTo',
    args: [targetAddress],
    value: parseEther(values.amount)
  })

  const destinationClient = getDestinationPublicClient(executionEnvironment)
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().automationCreditToppedUpAction,
    description: copy().automationCreditToppedUpDesc
  }
}

export async function fundAutonomousWallet(
  values: WalletFundingValues
): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const executionChain = getExecutionChain(executionEnvironment)
  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const { walletAddress } = await resolveWalletAddressForOwner(account, executionEnvironment)
  const hash = await client.sendTransaction({
    account,
    chain: executionChain,
    to: walletAddress,
    value: parseEther(values.amount)
  })

  const destinationClient = getDestinationPublicClient(executionEnvironment)
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().autonomousWalletFundedAction,
    description: copy().autonomousWalletFundedDesc
  }
}

export async function initializeAutonomousWallet(): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const executionChain = getExecutionChain(executionEnvironment)
  const factoryAddress = getExecutionContractAddresses(executionEnvironment).walletFactory
  if (!isConfiguredAddress(factoryAddress)) {
    throw new Error(copy().walletFactoryMissing)
  }

  const { account, client } = await getExecutionWalletClient(executionEnvironment)
  const hash = await client.writeContract({
    account,
    address: getAddress(factoryAddress),
    abi: willLeadWalletFactoryAbi,
    chain: executionChain,
    functionName: 'createWallet'
  })

  const destinationClient = getDestinationPublicClient(executionEnvironment)
  if (destinationClient) {
    await destinationClient.waitForTransactionReceipt({ hash })
  }

  return {
    hash,
    label: copy().autonomousWalletCreatedAction,
    description: copy().autonomousWalletCreatedDesc
  }
}
