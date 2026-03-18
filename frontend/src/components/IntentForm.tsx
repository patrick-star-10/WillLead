import { useEffect, useState } from 'react'

import type { IntentFormValues } from '../types/willlead'

type IntentFormProps = {
  token: string
  recipient: string
  amountPerExecution: string
  maxExecutions: number
  executedCount: number
  minAutomationBalance: string
  enabled: boolean
  isPending: boolean
  onSubmit: (values: IntentFormValues) => void
  onPause: () => void
  onResume: () => void
}

export function IntentForm(props: IntentFormProps) {
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

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Transfer Plan</p>
          <p className="section-note">Define the transfer this wallet should keep executing.</p>
        </div>
        <span className={`status-pill ${props.enabled ? 'status-active' : 'status-inactive'}`}>
          {props.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <dl className="data-list form-grid">
        <div>
          <dt>Token</dt>
          <dd>
            <input
              className="field"
              onChange={(event) => setForm((state) => ({ ...state, token: event.target.value }))}
              value={form.token}
            />
          </dd>
        </div>
        <div>
          <dt>Recipient</dt>
          <dd>
            <input
              className="field"
              onChange={(event) =>
                setForm((state) => ({ ...state, recipient: event.target.value }))
              }
              value={form.recipient}
            />
          </dd>
        </div>
        <div>
          <dt>Amount / Execution</dt>
          <dd>
            <input
              className="field"
              onChange={(event) =>
                setForm((state) => ({ ...state, amountPerExecution: event.target.value }))
              }
              value={form.amountPerExecution}
            />
          </dd>
        </div>
        <div>
          <dt>Max Executions</dt>
          <dd>
            <input
              className="field"
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
          <dt>Remaining</dt>
          <dd>{remainingExecutions}</dd>
        </div>
        <div>
          <dt>Min Automation Balance</dt>
          <dd>
            <input
              className="field"
              onChange={(event) =>
                setForm((state) => ({ ...state, minAutomationBalance: event.target.value }))
              }
              value={form.minAutomationBalance}
            />
          </dd>
        </div>
      </dl>
      <div className="action-row">
        <button className="primary-button" onClick={() => props.onSubmit(form)} type="button">
          {props.isPending ? 'Saving...' : 'Save Transfer Plan'}
        </button>
        <button className="secondary-button" onClick={props.onPause} type="button">
          Pause Plan
        </button>
        <button className="secondary-button" onClick={props.onResume} type="button">
          Resume Plan
        </button>
      </div>
    </article>
  )
}
