import { translateRuntimeStatus, useCopy } from '../lib/i18n'

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
  const { copy, locale } = useCopy()
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.automationEngineKicker}</p>
          <p className="section-note">{copy.automationEngineNote}</p>
        </div>
        <span className={`status-pill status-${props.runtimeStatus.toLowerCase()}`}>{translateRuntimeStatus(props.runtimeStatus, locale)}</span>
      </div>
      <dl className="data-list">
        <div>
          <dt>{copy.lastExecutionNonce}</dt>
          <dd>{props.lastExecutionNonce}</dd>
        </div>
        <div>
          <dt>{copy.lastExecutedAt}</dt>
          <dd>{props.lastExecutedAt}</dd>
        </div>
        <div>
          <dt>{copy.lastSignalHash}</dt>
          <dd>{props.lastSignalHash}</dd>
        </div>
        <div>
          <dt>{copy.balanceDelta}</dt>
          <dd>{props.destinationBalanceDelta}</dd>
        </div>
        <div>
          <dt>{copy.listenerStatus}</dt>
          <dd>{props.listenerPaused ? copy.paused : copy.active}</dd>
        </div>
        <div>
          <dt>{copy.callbackGasLimit}</dt>
          <dd>{props.callbackGasLimit}</dd>
        </div>
      </dl>
      <div className="action-row">
        <button className="primary-button" onClick={props.onTriggerSignal} type="button">
          {props.isPending ? copy.triggering : copy.emitSourceSignal}
        </button>
        <button className="secondary-button" onClick={props.onPauseListener} type="button">
          {copy.pauseListener}
        </button>
        <button className="secondary-button" onClick={props.onResumeListener} type="button">
          {copy.resumeListener}
        </button>
      </div>
    </article>
  )
}
