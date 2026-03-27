import { willLeadReactiveListenerAbi } from '../../contracts/abi/willLeadReactiveListener'
import type { ActionResult } from '../../types/willlead'
import { reactiveChain } from '../chains'
import { getReactivePublicClient, getReactiveWalletClient } from '../clients'
import { getMessages, useLanguageStore } from '../i18n'
import {
  ensureReactiveListenerArmedWithClient,
  invalidateReactiveListenerState
} from '../internal/reactive/listener'
import { resolveReactiveListenerForManager } from '../internal/wallet/binding'
import { readExecutionEnvironment } from '../internal/storage'

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export async function ensureReactiveListenerArmed(): Promise<ActionResult | null> {
  const executionEnvironment = readExecutionEnvironment()
  const { account, client } = await getReactiveWalletClient()
  const reactiveListenerAddress = await resolveReactiveListenerForManager(account, executionEnvironment)
  return ensureReactiveListenerArmedWithClient({
    account,
    client,
    reactiveListenerAddress,
    executionEnvironment
  })
}

export async function pauseReactiveListener(): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const { account, client } = await getReactiveWalletClient()
  const reactiveListenerAddress = await resolveReactiveListenerForManager(account, executionEnvironment)
  const hash = await client.writeContract({
    account,
    address: reactiveListenerAddress,
    abi: willLeadReactiveListenerAbi,
    chain: reactiveChain,
    functionName: 'pause'
  })

  const reactiveClient = getReactivePublicClient()
  if (reactiveClient) {
    await reactiveClient.waitForTransactionReceipt({ hash })
  }
  invalidateReactiveListenerState(reactiveListenerAddress, executionEnvironment)

  return {
    hash,
    label: copy().reactiveListenerPausedAction,
    description: copy().reactiveListenerPausedDesc
  }
}

export async function resumeReactiveListener(): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const { account, client } = await getReactiveWalletClient()
  const reactiveListenerAddress = await resolveReactiveListenerForManager(account, executionEnvironment)
  const hash = await client.writeContract({
    account,
    address: reactiveListenerAddress,
    abi: willLeadReactiveListenerAbi,
    chain: reactiveChain,
    functionName: 'resume'
  })

  const reactiveClient = getReactivePublicClient()
  if (reactiveClient) {
    await reactiveClient.waitForTransactionReceipt({ hash })
  }
  invalidateReactiveListenerState(reactiveListenerAddress, executionEnvironment)

  return {
    hash,
    label: copy().reactiveListenerResumedAction,
    description: copy().reactiveListenerResumedDesc
  }
}
