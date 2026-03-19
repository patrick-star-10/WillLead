import { useState } from 'react'
import { translateCreditLabel, useCopy } from '../lib/i18n'

type AutomationCapabilityPanelProps = {
  creditLabel: string
  availableBalance: string
  minRequiredBalance: string
  listenerPaused: boolean
  callbackGasLimit: string
  lastSyncedAt: string
  isPending: boolean
  onRefresh: () => void
  onFundAutomation: (amount: string) => void
}

export function AutomationCapabilityPanel(props: AutomationCapabilityPanelProps) {
  const { copy, locale } = useCopy()
  const [topUpAmount, setTopUpAmount] = useState('0.01')

  return (
    <article className="panel automation-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.automationKicker}</p>
          <p className="section-note">{copy.automationNote}</p>
        </div>
        <span className={`status-pill ${props.listenerPaused ? 'status-paused' : 'status-active'}`}>
          {props.listenerPaused ? copy.listenerPaused : copy.listenerArmed}
        </span>
      </div>

      <div className="automation-hero">
        <div>
          <p className="section-note">{copy.availableAutomationCredit}</p>
          <p className="wallet-balance">{props.availableBalance}</p>
        </div>
        <div className="identity-stack">
          <div className="identity-chip">
            <span>{copy.health}</span>
            <strong>{translateCreditLabel(props.creditLabel, locale)}</strong>
          </div>
          <div className="identity-chip">
            <span>{copy.requiredFloor}</span>
            <strong>{props.minRequiredBalance}</strong>
          </div>
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-tile">
          <span>{copy.listenerStatus}</span>
          <strong>{props.listenerPaused ? copy.paused : copy.active}</strong>
          <small>{copy.readyForCallback}</small>
        </div>
        <div className="metric-tile">
          <span>{copy.callbackGasLimit}</span>
          <strong>{props.callbackGasLimit}</strong>
          <small>{copy.callbackBudget}</small>
        </div>
      </div>

      <div className="action-row">
        <button className="secondary-button" onClick={props.onRefresh} type="button">
          {props.isPending ? copy.refreshing : copy.refreshCredit}
        </button>
        <input
          className="field compact-field"
          onChange={(event) => setTopUpAmount(event.target.value)}
          value={topUpAmount}
        />
        <button
          className="primary-button"
          onClick={() => props.onFundAutomation(topUpAmount)}
          type="button"
        >
          {copy.topUpAutomation}
        </button>
      </div>

      <p className="wallet-footnote">
        {copy.lastSync} {props.lastSyncedAt}
      </p>
    </article>
  )
}
