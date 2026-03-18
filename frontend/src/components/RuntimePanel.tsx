type RuntimePanelProps = {
  runtimeStatus: string
  lastExecutionNonce: number
  lastExecutedAt: string
  lastSignalHash: string
  destinationBalanceDelta: string
  listenerPaused: boolean
  callbackGasLimit: string
  isPending: boolean
  onTriggerSignal: () => void
  onPauseListener: () => void
  onResumeListener: () => void
}

export function RuntimePanel(props: RuntimePanelProps) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Automation Engine</p>
          <p className="section-note">Monitor the relay path that turns source signals into transfers.</p>
        </div>
        <span className={`status-pill status-${props.runtimeStatus.toLowerCase()}`}>
          {props.runtimeStatus}
        </span>
      </div>
      <dl className="data-list">
        <div>
          <dt>Last Execution Nonce</dt>
          <dd>{props.lastExecutionNonce}</dd>
        </div>
        <div>
          <dt>Last Executed At</dt>
          <dd>{props.lastExecutedAt}</dd>
        </div>
        <div>
          <dt>Last Signal Hash</dt>
          <dd>{props.lastSignalHash}</dd>
        </div>
        <div>
          <dt>Balance Delta</dt>
          <dd>{props.destinationBalanceDelta}</dd>
        </div>
        <div>
          <dt>Listener Status</dt>
          <dd>{props.listenerPaused ? 'Paused' : 'Active'}</dd>
        </div>
        <div>
          <dt>Callback Gas Limit</dt>
          <dd>{props.callbackGasLimit}</dd>
        </div>
      </dl>
      <div className="action-row">
        <button className="primary-button" onClick={props.onTriggerSignal} type="button">
          {props.isPending ? 'Triggering...' : 'Emit Source Signal'}
        </button>
        <button className="secondary-button" onClick={props.onPauseListener} type="button">
          Pause Listener
        </button>
        <button className="secondary-button" onClick={props.onResumeListener} type="button">
          Resume Listener
        </button>
      </div>
    </article>
  )
}
