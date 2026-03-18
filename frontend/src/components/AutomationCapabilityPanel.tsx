import { useState } from 'react'

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
  const [topUpAmount, setTopUpAmount] = useState('0.01')

  return (
    <article className="panel automation-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Automation Credit</p>
          <p className="section-note">
            This wallet keeps a separate execution balance so Reactive callbacks can still land
            after the frontend goes offline.
          </p>
        </div>
        <span className={`status-pill ${props.listenerPaused ? 'status-paused' : 'status-active'}`}>
          {props.listenerPaused ? 'Listener Paused' : 'Listener Armed'}
        </span>
      </div>

      <div className="automation-hero">
        <div>
          <p className="section-note">Available automation credit</p>
          <p className="wallet-balance">{props.availableBalance}</p>
        </div>
        <div className="identity-stack">
          <div className="identity-chip">
            <span>Health</span>
            <strong>{props.creditLabel}</strong>
          </div>
          <div className="identity-chip">
            <span>Required floor</span>
            <strong>{props.minRequiredBalance}</strong>
          </div>
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-tile">
          <span>Listener status</span>
          <strong>{props.listenerPaused ? 'Paused' : 'Active'}</strong>
          <small>Ready to receive Reactive callbacks</small>
        </div>
        <div className="metric-tile">
          <span>Callback gas limit</span>
          <strong>{props.callbackGasLimit}</strong>
          <small>Current execution budget per callback</small>
        </div>
      </div>

      <div className="action-row">
        <button className="secondary-button" onClick={props.onRefresh} type="button">
          {props.isPending ? 'Refreshing...' : 'Refresh Credit'}
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
          Top Up Automation
        </button>
      </div>

      <p className="wallet-footnote">Last sync {props.lastSyncedAt}</p>
    </article>
  )
}
