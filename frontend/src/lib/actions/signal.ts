import type { ActionResult } from '../../types/willlead'
import { getExecutionWalletClient } from '../clients'
import { getMessages, useLanguageStore } from '../i18n'
import { readOperatorRuntime, scopeOperatorRuntime } from '../internal/operator'
import { readExecutionEnvironment } from '../internal/storage'
import { resolveWalletAddressForOwner } from '../internal/wallet/binding'

function copy() {
  return getMessages(useLanguageStore.getState().locale)
}

export async function emitSignal(_values: {
  token: string
  recipient: string
  amountPerExecution: string
  nextNonce: number
}): Promise<ActionResult> {
  const executionEnvironment = readExecutionEnvironment()
  const { account: destinationAccount } = await getExecutionWalletClient(executionEnvironment)
  const binding = await resolveWalletAddressForOwner(destinationAccount, executionEnvironment)
  const { walletAddress } = binding
  const operatorRuntime = scopeOperatorRuntime(await readOperatorRuntime(), walletAddress)

  if (operatorRuntime.apiUrl) {
    const response = await fetch(`${operatorRuntime.apiUrl}/test-signal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress,
        expectedNonce: _values.nextNonce
      })
    })

    if (!response.ok) {
      let message: string = copy().failedEmitSourceSignal
      try {
        const payload = (await response.json()) as { error?: string }
        if (payload.error) {
          message = payload.error
        }
      } catch {}

      throw new Error(message)
    }

    const payload = (await response.json()) as { hash?: string }
    const hash = payload.hash

    if (!hash) {
      throw new Error(copy().failedEmitSourceSignal)
    }

    return {
      hash,
      label: copy().sourceSignalEmittedAction,
      description: copy().sourceSignalEmittedDesc
    }
  }

  throw new Error(copy().operatorServiceRequiredForTestSignal)
}
