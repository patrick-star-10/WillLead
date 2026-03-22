import { useEffect, useState } from 'react'

import { getExecutionChainConfig } from '../lib/chains'
import { translateDisplayValue, useCopy } from '../lib/i18n'
import { buildRuntimeRouteChainOptions, formatRuntimeRouteChainLabel } from '../lib/runtimeRouteOptions'
import type { ExecutionEnvironment, IntentFormValues, WalletAccessState } from '../types/willlead'

type IntentFormProps = {
  token: string
  recipient: string
  amountPerExecution: string
  maxExecutions: number
  executedCount: number
  minAutomationBalance: string
  listenerAddress: string
  signalEmitterAddress: string
  sourceChainId: string
  destinationChainId: string
  signalTopic0: string
  executionEnvironment: ExecutionEnvironment
  enabled: boolean
  isPending: boolean
  isEditable: boolean
  walletAccessState: WalletAccessState
  onInitializeWallet: () => void
  onSubmit: (values: IntentFormValues) => void
  onPause: () => void
  onResume: () => void
}

export function IntentForm(props: IntentFormProps) {
  const { copy, locale } = useCopy()
  const [form, setForm] = useState<IntentFormValues>({
    token: props.token,
    recipient: props.recipient,
    amountPerExecution: props.amountPerExecution,
    maxExecutions: props.maxExecutions,
    minAutomationBalance: props.minAutomationBalance,
    listenerAddress: props.listenerAddress,
    signalEmitterAddress: props.signalEmitterAddress,
    sourceChainId: props.sourceChainId,
    destinationChainId: props.destinationChainId,
    signalTopic0: props.signalTopic0
  })

  useEffect(() => {
    setForm({
      token: props.token,
      recipient: props.recipient,
      amountPerExecution: props.amountPerExecution,
      maxExecutions: props.maxExecutions,
      minAutomationBalance: props.minAutomationBalance,
      listenerAddress: props.listenerAddress,
      signalEmitterAddress: props.signalEmitterAddress,
      sourceChainId: props.sourceChainId,
      destinationChainId: props.destinationChainId,
      signalTopic0: props.signalTopic0
    })
  }, [
    props.amountPerExecution,
    props.destinationChainId,
    props.listenerAddress,
    props.maxExecutions,
    props.minAutomationBalance,
    props.recipient,
    props.signalEmitterAddress,
    props.signalTopic0,
    props.sourceChainId,
    props.token
  ])

  const remainingExecutions = props.maxExecutions - props.executedCount
  const isNativeAsset = form.token.trim().toLowerCase() === 'native'
  const hasValidTokenConfig =
    isNativeAsset || /^0x[a-fA-F0-9]{40}$/.test(form.token.trim())
  const chainOptions = buildRuntimeRouteChainOptions([
    form.sourceChainId,
    props.sourceChainId,
    props.destinationChainId
  ])
  const executionNativeSymbol = getExecutionChainConfig(props.executionEnvironment).nativeCurrency.symbol
  const destinationChainLabel = formatRuntimeRouteChainLabel(form.destinationChainId)
  const formIsValid =
    hasValidTokenConfig &&
    form.recipient.trim().length > 0 &&
    form.amountPerExecution.trim().length > 0 &&
    Number(form.amountPerExecution) > 0 &&
    form.maxExecutions > 0 &&
    form.listenerAddress.trim().length > 0 &&
    form.signalEmitterAddress.trim().length > 0 &&
    Number(form.sourceChainId) > 0 &&
    Number(form.destinationChainId) > 0 &&
    form.signalTopic0.trim().startsWith('0x')
  const helperMessage =
    props.walletAccessState === 'needs_wallet'
      ? copy.initializeAutonomousWalletNote
      : props.walletAccessState === 'mismatch'
        ? copy.connectedWalletMismatch
        : props.walletAccessState === 'unavailable'
          ? copy.walletAccessUnavailable
          : props.isEditable
            ? copy.planSigningNote
            : copy.connectWalletToLoadRuntime

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.transferPlanKicker}</p>
          <p className="section-note">{copy.transferPlanNote}</p>
        </div>
        <span className={`status-pill ${props.enabled ? 'status-active' : 'status-inactive'}`}>
          {props.enabled ? copy.enabled : copy.disabled}
        </span>
      </div>
      <dl className="data-list form-grid">
        <div>
          <dt>{copy.assetType}</dt>
          <dd>
            <select
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  token: event.target.value === 'native' ? 'native' : ''
                }))
              }
              value={isNativeAsset ? 'native' : 'erc20'}
            >
              <option value="native">{copy.nativeAsset}</option>
              <option value="erc20">{copy.erc20Asset}</option>
            </select>
          </dd>
        </div>
        <div>
          <dt>{copy.token}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable || isNativeAsset}
              onChange={(event) => setForm((state) => ({ ...state, token: event.target.value }))}
              placeholder={isNativeAsset ? copy.nativeAsset : copy.erc20TokenAddress}
              value={
                props.isEditable
                  ? (isNativeAsset ? copy.nativeAsset : form.token)
                  : translateDisplayValue(isNativeAsset ? copy.nativeAsset : form.token, locale)
              }
            />
          </dd>
        </div>
        <div>
          <dt>{copy.recipient}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, recipient: event.target.value }))
              }
              value={props.isEditable ? form.recipient : translateDisplayValue(form.recipient, locale)}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.amountPerExecution}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, amountPerExecution: event.target.value }))
              }
              placeholder={`0.01 ${executionNativeSymbol}`}
              value={form.amountPerExecution}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.maxExecutions}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
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
          <dt>{copy.remaining}</dt>
          <dd>{remainingExecutions}</dd>
        </div>
        <div>
          <dt>{copy.minAutomationBalance}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, minAutomationBalance: event.target.value }))
              }
              placeholder={`0.005 ${executionNativeSymbol}`}
              value={form.minAutomationBalance}
            />
          </dd>
        </div>
      </dl>
      <p className="wallet-footnote">{copy.tokenFieldNote}</p>
      <p className="wallet-footnote">
        {copy.destinationAmountNote} {executionNativeSymbol}.
      </p>
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.listenerRoutingKicker}</p>
          <p className="section-note">{copy.planRouteNote}</p>
        </div>
      </div>
      <dl className="data-list form-grid">
        <div>
          <dt>{copy.listenerContract}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, listenerAddress: event.target.value }))
              }
              value={props.isEditable ? form.listenerAddress : translateDisplayValue(form.listenerAddress, locale)}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.signalSource}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, signalEmitterAddress: event.target.value }))
              }
              value={
                props.isEditable
                  ? form.signalEmitterAddress
                  : translateDisplayValue(form.signalEmitterAddress, locale)
              }
            />
          </dd>
        </div>
        <div>
          <dt>{copy.originChainRoute}</dt>
          <dd>
            <select
              className="field"
              disabled={!props.isEditable}
              onChange={(event) =>
                setForm((state) => ({ ...state, sourceChainId: event.target.value }))
              }
              value={form.sourceChainId}
            >
              {chainOptions.map((option) => (
                <option key={`source-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </dd>
        </div>
        <div>
          <dt>{copy.destinationChainRoute}</dt>
          <dd>
            <input
              className="field"
              disabled
              value={destinationChainLabel}
            />
          </dd>
        </div>
        <div>
          <dt>{copy.signalTopic}</dt>
          <dd>
            <input
              className="field"
              disabled={!props.isEditable}
              onChange={(event) => setForm((state) => ({ ...state, signalTopic0: event.target.value }))}
              value={form.signalTopic0}
            />
          </dd>
        </div>
      </dl>
      <p className="wallet-footnote">{copy.destinationChainLockedNote}</p>
      <div className="action-row">
        <button
          className="secondary-button"
          disabled={!props.isEditable}
          onClick={() =>
            setForm((state) => ({
              ...state,
              listenerAddress: props.listenerAddress,
              signalEmitterAddress: props.signalEmitterAddress,
              sourceChainId: props.sourceChainId,
              destinationChainId: props.destinationChainId,
              signalTopic0: props.signalTopic0
            }))
          }
          type="button"
        >
          {copy.useCurrentRoute}
        </button>
      </div>
      <div className="action-row">
        <button
          className="primary-button"
          disabled={!props.isEditable || !formIsValid}
          onClick={() => props.onSubmit(form)}
          type="button"
        >
          {props.isPending ? copy.saving : copy.saveTransferPlan}
        </button>
        <button className="secondary-button" disabled={!props.isEditable} onClick={props.onPause} type="button">
          {copy.pausePlan}
        </button>
        <button className="secondary-button" disabled={!props.isEditable} onClick={props.onResume} type="button">
          {copy.resumePlan}
        </button>
        {props.walletAccessState === 'needs_wallet' ? (
          <button className="secondary-button" onClick={props.onInitializeWallet} type="button">
            {props.isPending ? copy.initializingAutonomousWallet : copy.initializeAutonomousWallet}
          </button>
        ) : null}
      </div>
      <p className="wallet-footnote">{helperMessage}</p>
    </article>
  )
}
