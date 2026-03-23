import { useState } from 'react'

import { swapFaucetDemoIntent } from '../lib/intentCatalog'
import { useCopy } from '../lib/i18n'
import type { ExecutionEnvironment, SwapIntentState } from '../types/willlead'

type SwapIntentRuntimePanelProps = {
  executionEnvironment: ExecutionEnvironment
  isPending: boolean
  onFundAutomation: (amount: string) => void
  swapIntent: SwapIntentState
}

export function SwapIntentRuntimePanel(props: SwapIntentRuntimePanelProps) {
  const { copy } = useCopy()
  const watchedPoolsLabel = swapFaucetDemoIntent.watchedPoolAddresses
    ? swapFaucetDemoIntent.watchedPoolAddresses
        .map((address, index) => `${swapFaucetDemoIntent.watchedPoolFeeTiers[index]}: ${address}`)
        .join(' | ')
    : props.swapIntent.poolManagerAddress
  const [topUpAmount, setTopUpAmount] = useState('0.01')
  const environmentWarning =
    props.executionEnvironment !== 'primary' ? copy.swapIntentPrimaryEnvironmentNote : null

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.swapRuntimeKicker}</p>
          <p className="section-note">{copy.swapRuntimeNote}</p>
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
      <dl className="data-list">
        <div>
          <dt>{copy.upstreamProtocol}</dt>
          <dd>{swapFaucetDemoIntent.upstreamProtocol}</dd>
        </div>
        <div>
          <dt>{copy.triggerEvent}</dt>
          <dd>{swapFaucetDemoIntent.triggerEvent}</dd>
        </div>
        <div>
          <dt>{copy.watchedPool}</dt>
          <dd>{watchedPoolsLabel}</dd>
        </div>
        <div>
          <dt>{copy.listenerContract}</dt>
          <dd>{props.swapIntent.listenerAddress}</dd>
        </div>
        <div>
          <dt>{copy.executionContract}</dt>
          <dd>{swapFaucetDemoIntent.executionContractAddress}</dd>
        </div>
        <div>
          <dt>{copy.executionFundingPerTrigger}</dt>
          <dd>{props.swapIntent.requestValue} Sepolia ETH</dd>
        </div>
        <div>
          <dt>{copy.maxExecutions}</dt>
          <dd>{props.swapIntent.maxExecutions}</dd>
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
          <dt>{copy.remaining}</dt>
          <dd>{Math.max(props.swapIntent.maxExecutions - props.swapIntent.executedCount, 0)}</dd>
        </div>
        <div>
          <dt>{copy.lastExecutedAt}</dt>
          <dd>{props.swapIntent.lastExecutedAt}</dd>
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
          <dt>{copy.latestSourceProof}</dt>
          <dd>{props.swapIntent.lastOriginTxHash}</dd>
        </div>
        <div>
          <dt>{copy.latestDestinationProof}</dt>
          <dd>{swapFaucetDemoIntent.latestExecutionTxHash}</dd>
        </div>
      </dl>
      <div className="action-row">
        <input
          className="field compact-field"
          disabled={props.executionEnvironment !== 'primary' || props.isPending}
          onChange={(event) => setTopUpAmount(event.target.value)}
          value={topUpAmount}
        />
        <button
          className="primary-button"
          disabled={
            props.executionEnvironment !== 'primary' || props.isPending || Number(topUpAmount) <= 0
          }
          onClick={() => props.onFundAutomation(topUpAmount)}
          type="button"
        >
          {copy.topUpAutomation}
        </button>
      </div>
      <p className="wallet-footnote">{copy.swapIntentFundingNote}</p>
      <p className="wallet-footnote">{copy.swapRuntimeExternalTriggerNote}</p>
      <p className="wallet-footnote">{copy.swapRuntimeNoManualTriggerNote}</p>
      {environmentWarning ? <p className="wallet-footnote">{environmentWarning}</p> : null}
    </article>
  )
}
