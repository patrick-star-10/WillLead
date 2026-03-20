import { useEffect, useState } from 'react'

import { useCopy } from '../lib/i18n'
import type { IntentFormValues, WalletAccessState } from '../types/willlead'

type IntentFormProps = {
  token: string
  recipient: string
  amountPerExecution: string
  maxExecutions: number
  executedCount: number
  minAutomationBalance: string
  enabled: boolean
  isPending: boolean
  isEditable: boolean
  walletAccessState: WalletAccessState
  onInitializeWallet: () => void
  onSubmit: (values: IntentFormValues) => void
  onPause: () => void
  onResume: () => void
}

export function IntentForm(props: IntentFormProps) {
  const { copy } = useCopy()
  const [form, setForm] = useState<IntentFormValues>({
    token: props.token,
    recipient: props.recipient,
    amountPerExecution: props.amountPerExecution,
    maxExecutions: props.maxExecutions,
    minAutomationBalance: props.minAutomationBalance
  })

  useEffect(() => {
    setForm({
      token: props.token,
      recipient: props.recipient,
      amountPerExecution: props.amountPerExecution,
      maxExecutions: props.maxExecutions,
      minAutomationBalance: props.minAutomationBalance
    })
  }, [
    props.amountPerExecution,
    props.maxExecutions,
    props.minAutomationBalance,
    props.recipient,
    props.token
  ])

  const remainingExecutions = props.maxExecutions - props.executedCount
  const helperMessage =
    props.walletAccessState === 'needs_wallet'
      ? copy.initializeAutonomousWalletNote
      : props.walletAccessState === 'mismatch'
        ? copy.connectedWalletMismatch
        : props.walletAccessState === 'unavailable'
          ? copy.walletAccessUnavailable
          : copy.connectWalletToLoadRuntime

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.transferPlanKicker}</p>
          <p className="section-note">{copy.transferPlanNote}</p>
        </div>
        <span className={`status-pill ${props.enabled ? 'status-active' : 'status-inactive'}`}>
          {props.enabled ? copy.enabled : copy.disabled}
        </span>
      </div>
      <dl className="data-list form-grid">
        <div>
          <dt>{copy.token}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) => setForm((state) => ({ ...state, token: event.target.value }))}
              value={form.token}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.recipient}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, recipient: event.target.value }))
              }
              value={form.recipient}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.amountPerExecution}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, amountPerExecution: event.target.value }))
              }
              value={form.amountPerExecution}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.maxExecutions}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              min={1}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  maxExecutions: Number(event.target.value || 0)
                }))
              }
              type="number"
              value={form.maxExecutions}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.remaining}</dt>
          <dd>{remainingExecutions}</dd>
        </div>
        <div>
          <dt>{copy.minAutomationBalance}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, minAutomationBalance: event.target.value }))
              }
              value={form.minAutomationBalance}
            />
          </dd>
        </div>
      </dl>
      <div className="action-row">
        <button className="primary-button" disabled={!props.isEditable} onClick={() => props.onSubmit(form)} type="button">
          {props.isPending ? copy.saving : copy.saveTransferPlan}
        </button>
        <button className="secondary-button" disabled={!props.isEditable} onClick={props.onPause} type="button">
          {copy.pausePlan}
        </button>
        <button className="secondary-button" disabled={!props.isEditable} onClick={props.onResume} type="button">
          {copy.resumePlan}
        </button>
        {props.walletAccessState === 'needs_wallet' ? (
          <button className="secondary-button" onClick={props.onInitializeWallet} type="button">
            {props.isPending ? copy.initializingAutonomousWallet : copy.initializeAutonomousWallet}
          </button>
        ) : null}
      </div>
      {!props.isEditable ? <p className="wallet-footnote">{helperMessage}</p> : null}
    </article>
  )
}
