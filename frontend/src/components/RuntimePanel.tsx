import { translateDisplayValue, translateRuntimeStatus, translateSubscriptionStatus, useCopy } from '../lib/i18n'
import type { WalletAccessState } from '../types/willlead'

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
  operatorServiceStatus: string
  operatorRelayAvailable: boolean
  operatorMirroredIntentActive: boolean | null
  canManageListener: boolean
  isPending: boolean
  walletAccessState: WalletAccessState
  onPauseListener: () => void
  onResumeListener: () => void
  onTriggerSignal: () => void
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
  const hasBoundWallet = props.walletAccessState === 'bound'
  const triggerBlockedReason =
    !hasBoundWallet
      ? props.walletAccessState === 'needs_wallet'
        ? copy.initializeWalletToContinue
        : props.walletAccessState === 'mismatch'
          ? copy.connectedWalletMismatch
          : props.walletAccessState === 'unavailable'
            ? copy.walletAccessUnavailable
            : copy.connectWalletToLoadRuntime
      : !props.operatorRelayAvailable
        ? copy.operatorServiceRequiredForTestSignal
      : props.runtimeStatus === 'exhausted'
        ? copy.testSignalBlockedExhausted
        : props.runtimeStatus === 'paused'
          ? copy.testSignalBlockedPaused
          : props.runtimeStatus !== 'active'
            ? copy.testSignalBlockedInactive
            : props.signalEmitterAddress === 'Unavailable' ||
                  props.signalEmitterAddress.startsWith('0x0000000000000000000000000000000000000000')
                ? copy.sourceSignalUnavailable
                : null
  const canTriggerTestSignal = triggerBlockedReason === null
  const triggerReadinessNote =
    triggerBlockedReason === null && props.operatorMirroredIntentActive === false
      ? copy.testSignalMirrorPending
      : null
  const listenerStatusLabel = listenerUnavailable
    ? props.walletAccessState === 'mismatch'
      ? copy.connectedWalletMismatch
      : props.walletAccessState === 'needs_wallet'
        ? copy.initializeWalletToContinue
      : props.walletAccessState === 'unavailable'
        ? copy.walletAccessUnavailable
        : copy.connectWalletToLoadRuntime
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
          <dd>{translateDisplayValue(props.lastExecutedAt, locale)}</dd>
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
          <dd>{translateDisplayValue(props.callbackGasLimit, locale)}</dd>
        </div>
        <div>
          <dt>{copy.listenerContract}</dt>
          <dd>{translateDisplayValue(shortenAddress(props.listenerAddress), locale)}</dd>
        </div>
        <div>
          <dt>{copy.signalSource}</dt>
          <dd>{translateDisplayValue(shortenAddress(props.signalEmitterAddress), locale)}</dd>
        </div>
        <div>
          <dt>{copy.originChainRoute}</dt>
          <dd>{translateDisplayValue(props.subscriptionOriginChainId, locale)}</dd>
        </div>
        <div>
          <dt>{copy.destinationChainRoute}</dt>
          <dd>{translateDisplayValue(props.subscriptionDestinationChainId, locale)}</dd>
        </div>
        <div>
          <dt>{copy.signalTopic}</dt>
          <dd>{translateDisplayValue(props.subscriptionTopic0, locale)}</dd>
        </div>
      </dl>
      <div className="action-row">
        <button
          className="primary-button"
          disabled={props.isPending || !canTriggerTestSignal}
          onClick={props.onTriggerSignal}
          type="button"
        >
          {props.isPending ? copy.triggering : copy.testSourceEvent}
        </button>
        <button
          className="secondary-button"
          disabled={props.isPending || listenerUnavailable || !props.canManageListener}
          onClick={props.onPauseListener}
          type="button"
        >
          {copy.pauseListener}
        </button>
        <button
          className="secondary-button"
          disabled={props.isPending || listenerUnavailable || !props.canManageListener}
          onClick={props.onResumeListener}
          type="button"
        >
          {copy.resumeListener}
        </button>
      </div>
      <p className="wallet-footnote">{copy.externalSignalNote}</p>
      <p className="wallet-footnote">{copy.testSourceEventNote}</p>
      {triggerBlockedReason ? (
        <p className="wallet-footnote">{triggerBlockedReason}</p>
      ) : null}
      {triggerReadinessNote ? (
        <p className="wallet-footnote">{triggerReadinessNote}</p>
      ) : null}
      {hasBoundWallet && !props.canManageListener ? (
        <p className="wallet-footnote">{copy.listenerManagedByOperator}</p>
      ) : null}
    </article>
  )
}
