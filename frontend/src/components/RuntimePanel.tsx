import { translateRuntimeStatus, translateSubscriptionStatus, useCopy } from '../lib/i18n'

type RuntimePanelProps = {
  runtimeStatus: string
  lastExecutionNonce: number
  lastExecutedAt: string
  lastSignalHash: string
  destinationBalanceDelta: string
  listenerAddress: string
  signalEmitterAddress: string
  listenerPaused: boolean | null
  subscriptionStatus: string
  subscriptionOriginChainId: string
  subscriptionDestinationChainId: string
  subscriptionTopic0: string
  callbackGasLimit: string
  isPending: boolean
  onTriggerSignal: () => void
  onPauseListener: () => void
  onResumeListener: () => void
}

function shortenAddress(value: string) {
  if (!value || value.startsWith('Unavailable') || value.startsWith('0x0000000000000000000000000000000000000000')) {
    return 'Unavailable'
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function RuntimePanel(props: RuntimePanelProps) {
  const { copy, locale } = useCopy()
  const listenerUnavailable = props.listenerPaused === null
  const listenerStatusLabel = listenerUnavailable
    ? copy.listenerNotListening
    : props.listenerPaused
      ? copy.paused
      : copy.active

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
          <dd>{listenerStatusLabel}</dd>
        </div>
        <div>
          <dt>{copy.subscriptionStatus}</dt>
          <dd>{translateSubscriptionStatus(props.subscriptionStatus, locale)}</dd>
        </div>
        <div>
          <dt>{copy.callbackGasLimit}</dt>
          <dd>{props.callbackGasLimit}</dd>
        </div>
        <div>
          <dt>{copy.listenerContract}</dt>
          <dd>{shortenAddress(props.listenerAddress)}</dd>
        </div>
        <div>
          <dt>{copy.signalSource}</dt>
          <dd>{shortenAddress(props.signalEmitterAddress)}</dd>
        </div>
        <div>
          <dt>{copy.originChainRoute}</dt>
          <dd>{props.subscriptionOriginChainId}</dd>
        </div>
        <div>
          <dt>{copy.destinationChainRoute}</dt>
          <dd>{props.subscriptionDestinationChainId}</dd>
        </div>
        <div>
          <dt>{copy.signalTopic}</dt>
          <dd>{props.subscriptionTopic0}</dd>
        </div>
      </dl>
      <div className="action-row">
        <button className="primary-button" onClick={props.onTriggerSignal} type="button">
          {props.isPending ? copy.triggering : copy.emitSourceSignal}
        </button>
        <button
          className="secondary-button"
          disabled={listenerUnavailable}
          onClick={props.onPauseListener}
          type="button"
        >
          {copy.pauseListener}
        </button>
        <button
          className="secondary-button"
          disabled={listenerUnavailable}
          onClick={props.onResumeListener}
          type="button"
        >
          {copy.resumeListener}
        </button>
      </div>
    </article>
  )
}
