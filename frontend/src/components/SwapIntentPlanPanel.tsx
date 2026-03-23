import { useEffect, useState } from 'react'

import { swapFaucetDemoIntent } from '../lib/intentCatalog'
import { useCopy } from '../lib/i18n'
import type {
  ExecutionEnvironment,
  SwapIntentFormValues,
  SwapIntentState,
  WalletAccessState
} from '../types/willlead'

type SwapIntentPlanPanelProps = {
  swapIntent: SwapIntentState
  executionEnvironment: ExecutionEnvironment
  walletAccessState: WalletAccessState
  isPending: boolean
  onFundAutomation: (amount: string) => void
  onSubmit: (values: SwapIntentFormValues) => void
  onPause: () => void
  onResume: () => void
}

export function SwapIntentPlanPanel(props: SwapIntentPlanPanelProps) {
  const { copy } = useCopy()
  const watchedPoolsLabel = swapFaucetDemoIntent.watchedPoolAddresses
    ? swapFaucetDemoIntent.watchedPoolAddresses
        .map((address, index) => `${swapFaucetDemoIntent.watchedPoolFeeTiers[index]}: ${address}`)
        .join(' | ')
    : swapFaucetDemoIntent.watchedPoolAddress
  const [form, setForm] = useState<SwapIntentFormValues>({
    recipient:
      props.swapIntent.recipient === 'Not configured' ? '' : props.swapIntent.recipient,
    requestValue: props.swapIntent.requestValue,
    maxExecutions: props.swapIntent.maxExecutions || 1
  })
  const [topUpAmount, setTopUpAmount] = useState('0.01')

  useEffect(() => {
    setForm({
      recipient:
        props.swapIntent.recipient === 'Not configured' ? '' : props.swapIntent.recipient,
      requestValue: props.swapIntent.requestValue,
      maxExecutions: props.swapIntent.maxExecutions || 1
    })
  }, [props.swapIntent.maxExecutions, props.swapIntent.recipient, props.swapIntent.requestValue])

  const environmentWarning =
    props.executionEnvironment !== 'primary' ? copy.swapIntentPrimaryEnvironmentNote : null
  const isEditable =
    props.executionEnvironment === 'primary' &&
    props.walletAccessState === 'bound' &&
    props.swapIntent.canManage
  const remainingExecutions = Math.max(props.swapIntent.maxExecutions - props.swapIntent.executedCount, 0)
  const formIsValid =
    /^0x[a-fA-F0-9]{40}$/.test(form.recipient.trim()) &&
    Number(form.requestValue) > 0 &&
    form.maxExecutions > 0
  const helperMessage =
    props.executionEnvironment !== 'primary'
      ? copy.swapIntentPrimaryEnvironmentNote
      : props.walletAccessState === 'needs_wallet'
        ? copy.initializeAutonomousWalletNote
        : props.walletAccessState === 'mismatch'
          ? copy.connectedWalletMismatch
          : props.walletAccessState === 'unavailable'
            ? copy.walletAccessUnavailable
            : !props.swapIntent.canManage
              ? copy.connectedWalletMismatch
              : copy.swapIntentSaveNote

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.swapIntentKicker}</p>
          <p className="section-note">{copy.swapIntentNote}</p>
        </div>
        <span className={`status-pill status-${props.swapIntent.runtimeStatus.toLowerCase()}`}>
          {props.swapIntent.runtimeStatus === 'active'
            ? copy.active
            : props.swapIntent.runtimeStatus === 'paused'
              ? copy.paused
              : props.swapIntent.runtimeStatus === 'exhausted'
                ? copy.exhausted
                : copy.inactive}
        </span>
      </div>
      <dl className="data-list form-grid">
        <div>
          <dt>{copy.upstreamProtocol}</dt>
          <dd>{swapFaucetDemoIntent.upstreamProtocol}</dd>
        </div>
        <div>
          <dt>{copy.triggerEvent}</dt>
          <dd>{swapFaucetDemoIntent.triggerEvent}</dd>
        </div>
        <div>
          <dt>{copy.sourcePair}</dt>
          <dd>{swapFaucetDemoIntent.sourcePairLabel}</dd>
        </div>
        <div>
          <dt>{copy.watchedPool}</dt>
          <dd>{watchedPoolsLabel}</dd>
        </div>
        <div>
          <dt>{copy.listenerContract}</dt>
          <dd>{swapFaucetDemoIntent.listenerAddress}</dd>
        </div>
        <div>
          <dt>{copy.executionContract}</dt>
          <dd>{swapFaucetDemoIntent.executionContractAddress}</dd>
        </div>
        <div>
          <dt>{copy.recipient}</dt>
          <dd>
            <input
              className="field"
              disabled={!isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, recipient: event.target.value }))
              }
              value={form.recipient}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.executionFundingPerTrigger}</dt>
          <dd>
            <input
              className="field"
              disabled={!isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, requestValue: event.target.value }))
              }
              placeholder="0.01 ETH"
              value={form.requestValue}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.maxExecutions}</dt>
          <dd>
            <input
              className="field"
              disabled={!isEditable}
              min={1}
              onChange={(event) =>
                setForm((state) => ({ ...state, maxExecutions: Number(event.target.value || 0) }))
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
          <dt>{copy.callbackReserve}</dt>
          <dd>{props.swapIntent.callbackReserve} Sepolia ETH</dd>
        </div>
        <div>
          <dt>{copy.callbackDebt}</dt>
          <dd>{props.swapIntent.callbackDebt} Sepolia ETH</dd>
        </div>
        <div>
          <dt>{copy.originChainRoute}</dt>
          <dd>{props.swapIntent.sourceChainId}</dd>
        </div>
        <div>
          <dt>{copy.destinationNetwork}</dt>
          <dd>{swapFaucetDemoIntent.destinationNetworkLabel}</dd>
        </div>
        <div>
          <dt>{copy.destinationAsset}</dt>
          <dd>{swapFaucetDemoIntent.destinationAssetLabel}</dd>
        </div>
        <div>
          <dt>{copy.executionAction}</dt>
          <dd>{swapFaucetDemoIntent.executionAction}</dd>
        </div>
      </dl>
      <p className="wallet-footnote">{copy.swapIntentLiveRouteNote}</p>
      <p className="wallet-footnote">{copy.swapIntentNoManualSignal}</p>
      <div className="action-row">
        <button
          className="primary-button"
          disabled={!isEditable || !formIsValid || props.isPending}
          onClick={() => props.onSubmit(form)}
          type="button"
        >
          {props.isPending ? copy.saving : copy.saveSwapIntent}
        </button>
        <button
          className="secondary-button"
          disabled={!isEditable || props.isPending}
          onClick={props.onPause}
          type="button"
        >
          {copy.pausePlan}
        </button>
        <button
          className="secondary-button"
          disabled={!isEditable || props.isPending}
          onClick={props.onResume}
          type="button"
        >
          {copy.resumePlan}
        </button>
      </div>
      <div className="action-row">
        <input
          className="field compact-field"
          disabled={!isEditable || props.isPending}
          onChange={(event) => setTopUpAmount(event.target.value)}
          value={topUpAmount}
        />
        <button
          className="primary-button"
          disabled={!isEditable || props.isPending || Number(topUpAmount) <= 0}
          onClick={() => props.onFundAutomation(topUpAmount)}
          type="button"
        >
          {copy.topUpAutomation}
        </button>
      </div>
      <p className="wallet-footnote">{copy.swapIntentFundingNote}</p>
      <p className="wallet-footnote">{helperMessage}</p>
      {environmentWarning ? <p className="wallet-footnote">{environmentWarning}</p> : null}
    </article>
  )
}
