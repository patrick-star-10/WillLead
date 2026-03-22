import { useState } from 'react'
import {
  translateAutomationReadiness,
  translateCreditLabel,
  translateDisplayValue,
  translateOperatorServiceStatus,
  translateSingleSignatureReadiness,
  translateSubscriptionStatus,
  useCopy
} from '../lib/i18n'
import type { WalletAccessState } from '../types/willlead'

type AutomationCapabilityPanelProps = {
  creditLabel: string
  availableBalance: string
  minRequiredBalance: string
  listenerPaused: boolean | null
  listenerAddress: string
  signalEmitterAddress: string
  subscriptionStatus: string
  subscriptionOriginChainId: string
  subscriptionDestinationChainId: string
  subscriptionTopic0: string
  callbackGasLimit: string
  lastSyncedAt: string
  operatorServiceStatus: string
  operatorLastHeartbeat: string
  operatorListenerBalance: string
  operatorListenerDebt: string
  operatorLastFundingResult: string
  automationReadiness: string
  singleSignatureReadiness: string
  isPending: boolean
  walletAccessState: WalletAccessState
  onRefresh: () => void
  onFundAutomation: (amount: string) => void
}

function shortenAddress(value: string) {
  if (!value || value.startsWith('Unavailable') || value.startsWith('0x0000000000000000000000000000000000000000')) {
    return 'Unavailable'
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function AutomationCapabilityPanel(props: AutomationCapabilityPanelProps) {
  const { copy, locale } = useCopy()
  const [topUpAmount, setTopUpAmount] = useState('0.01')
  const listenerUnavailable = props.listenerPaused === null
  const hasBoundWallet = props.walletAccessState === 'bound'
  const listenerClassName = listenerUnavailable
    ? 'status-pill status-unavailable'
    : props.subscriptionStatus === 'missing'
      ? 'status-pill status-inactive'
    : `status-pill ${props.listenerPaused ? 'status-paused' : 'status-active'}`
  const listenerBadgeLabel = listenerUnavailable
    ? copy.listenerNotListening
    : props.listenerPaused
      ? copy.listenerPaused
      : props.subscriptionStatus === 'missing'
        ? copy.subscriptionMissing
        : copy.listenerArmed
  const listenerStatusLabel = listenerUnavailable
    ? copy.listenerNotListening
    : props.listenerPaused
      ? copy.paused
      : copy.active
  const listenerHelperLabel = listenerUnavailable
    ? props.walletAccessState === 'mismatch'
      ? copy.connectedWalletMismatch
      : props.walletAccessState === 'needs_wallet'
        ? copy.initializeWalletToContinue
      : props.walletAccessState === 'unavailable'
        ? copy.walletAccessUnavailable
        : copy.connectWalletToLoadRuntime
    : props.subscriptionStatus === 'missing'
      ? copy.subscriptionRepairNeeded
      : copy.subscriptionReady
  const singleSignatureHelper =
    props.singleSignatureReadiness === 'ready'
      ? copy.singleSignatureReadyNote
      : props.singleSignatureReadiness === 'requires_operator'
        ? copy.singleSignatureRequiresOperatorNote
        : copy.connectWalletToLoadRuntime

  return (
    <article className="panel automation-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.automationKicker}</p>
          <p className="section-note">{copy.automationNote}</p>
        </div>
        <span className={listenerClassName}>{listenerBadgeLabel}</span>
      </div>

      <div className="automation-hero">
        <div>
          <p className="section-note">{copy.availableAutomationCredit}</p>
          <p className="wallet-balance">{translateDisplayValue(props.availableBalance, locale)}</p>
        </div>
        <div className="identity-stack">
          <div className="identity-chip">
            <span>{copy.singleSignatureMode}</span>
            <strong>{translateSingleSignatureReadiness(props.singleSignatureReadiness, locale)}</strong>
          </div>
          <div className="identity-chip">
            <span>{copy.health}</span>
            <strong>{translateCreditLabel(props.creditLabel, locale)}</strong>
          </div>
          <div className="identity-chip">
            <span>{copy.requiredFloor}</span>
            <strong>{translateDisplayValue(props.minRequiredBalance, locale)}</strong>
          </div>
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-tile">
          <span>{copy.listenerStatus}</span>
          <strong>{listenerStatusLabel}</strong>
          <small>{listenerHelperLabel}</small>
        </div>
        <div className="metric-tile">
          <span>{copy.subscriptionStatus}</span>
          <strong>{translateSubscriptionStatus(props.subscriptionStatus, locale)}</strong>
          <small>{props.subscriptionOriginChainId === 'Unavailable' ? copy.unavailable : `${copy.originChainRoute} ${props.subscriptionOriginChainId}`}</small>
        </div>
        <div className="metric-tile">
          <span>{copy.callbackGasLimit}</span>
          <strong>{translateDisplayValue(props.callbackGasLimit, locale)}</strong>
          <small>{copy.callbackBudget}</small>
        </div>
        <div className="metric-tile">
          <span>{copy.operatorService}</span>
          <strong>{translateOperatorServiceStatus(props.operatorServiceStatus, locale)}</strong>
          <small>
            {copy.operatorLastHeartbeat} {translateDisplayValue(props.operatorLastHeartbeat, locale)}
          </small>
        </div>
        <div className="metric-tile">
          <span>{copy.listenerRuntimeBalance}</span>
          <strong>{translateDisplayValue(props.operatorListenerBalance, locale)}</strong>
          <small>{copy.listenerRuntimeHealthyNote}</small>
        </div>
        <div className="metric-tile">
          <span>{copy.listenerRuntimeDebt}</span>
          <strong>{translateDisplayValue(props.operatorListenerDebt, locale)}</strong>
          <small>
            {copy.lastFundingAction} {translateDisplayValue(props.operatorLastFundingResult, locale)}
          </small>
        </div>
        <div className="metric-tile">
          <span>{copy.automationReadinessLabel}</span>
          <strong>{translateAutomationReadiness(props.automationReadiness, locale)}</strong>
          <small>{singleSignatureHelper}</small>
        </div>
      </div>

      <div>
        <p className="panel-kicker">{copy.listenerRoutingKicker}</p>
        <p className="section-note">{copy.listenerRoutingNote}</p>
      </div>

      <div className="listener-route-grid">
        <div className="identity-chip">
          <span>{copy.listenerContract}</span>
          <strong>{translateDisplayValue(shortenAddress(props.listenerAddress), locale)}</strong>
        </div>
        <div className="identity-chip">
          <span>{copy.signalSource}</span>
          <strong>{translateDisplayValue(shortenAddress(props.signalEmitterAddress), locale)}</strong>
        </div>
        <div className="identity-chip">
          <span>{copy.originChainRoute}</span>
          <strong>{translateDisplayValue(props.subscriptionOriginChainId, locale)}</strong>
        </div>
        <div className="identity-chip">
          <span>{copy.destinationChainRoute}</span>
          <strong>{translateDisplayValue(props.subscriptionDestinationChainId, locale)}</strong>
        </div>
        <div className="identity-chip">
          <span>{copy.signalTopic}</span>
          <strong>{translateDisplayValue(props.subscriptionTopic0, locale)}</strong>
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
          disabled={props.isPending || !hasBoundWallet}
          onClick={() => props.onFundAutomation(topUpAmount)}
          type="button"
        >
          {copy.topUpAutomation}
        </button>
      </div>

      <p className="wallet-footnote">
        {copy.lastSync} {translateDisplayValue(props.lastSyncedAt, locale)}
      </p>
    </article>
  )
}
