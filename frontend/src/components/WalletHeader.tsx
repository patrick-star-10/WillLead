import type { AssetBalance, ControllerAssetViewNetwork } from '../types/willlead'
import {
  translateBalanceContextLabel,
  translateConnectionLabel,
  translateDisplayValue,
  translateRuntimeStatus,
  useCopy
} from '../lib/i18n'
import type { WalletAccessState } from '../types/willlead'
import { useState } from 'react'

type WalletHeaderProps = {
  contractAddress: string
  ownerAddress: string | null
  connectionLabel: string
  controllerAssetViewNetwork: ControllerAssetViewNetwork
  controllerAssetViewLabel: string
  connectedBalanceLabel: string
  connectedAssetBalances: AssetBalance[]
  balanceContextLabel: string
  balanceLabel: string
  assetBalances: AssetBalance[]
  runtimeStatus: string
  isConnected: boolean
  isPending: boolean
  executedCount: number
  maxExecutions: number
  lastSyncedAt: string
  walletAccessState: WalletAccessState
  onFundWallet: (amount: string) => void
  onWatchToken: (tokenAddress: string) => void
  onSetControllerAssetViewNetwork: (viewNetwork: ControllerAssetViewNetwork) => void
}

function shortenAddress(value: string | null) {
  if (!value) return 'Not connected'
  if (value === 'Unavailable' || value === '0x0000000000000000000000000000000000000000') {
    return 'Unavailable'
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function WalletHeader(props: WalletHeaderProps) {
  const { copy, locale } = useCopy()
  const [fundAmount, setFundAmount] = useState('0.05')
  const [watchedToken, setWatchedToken] = useState('')
  const remainingExecutions = Math.max(props.maxExecutions - props.executedCount, 0)
  const hasBoundWallet = props.walletAccessState === 'bound'
  const fundingHelper =
    props.walletAccessState === 'bound'
      ? copy.autonomousWalletFundingNote
      : props.walletAccessState === 'needs_wallet'
        ? copy.initializeWalletToContinue
        : props.walletAccessState === 'mismatch'
          ? copy.connectedWalletMismatch
          : props.walletAccessState === 'unavailable'
            ? copy.walletAccessUnavailable
            : copy.connectWalletToLoadRuntime

  return (
    <article className="panel wallet-panel">
      <div className="panel-header">
        <p className="panel-kicker">{copy.walletOverviewKicker}</p>
        <span className={`status-pill status-${props.runtimeStatus.toLowerCase()}`}>{translateRuntimeStatus(props.runtimeStatus, locale)}</span>
      </div>
      <div className="wallet-balance-grid">
        <div className="wallet-balance-row">
          <div>
            <p className="section-note">
              {copy.controllerWalletBalance} · {props.controllerAssetViewLabel}
            </p>
            <p className="wallet-balance">{translateDisplayValue(props.connectedBalanceLabel, locale)}</p>
          </div>
          <div className="identity-stack">
            <div className="identity-chip">
              <span>{copy.controller}</span>
              <strong>{translateDisplayValue(shortenAddress(props.ownerAddress), locale)}</strong>
            </div>
            <div className="identity-chip">
              <span>{copy.signingSource}</span>
              <strong>{translateConnectionLabel(props.connectionLabel, locale)}</strong>
            </div>
          </div>
        </div>
        <div className="wallet-balance-row">
          <div>
            <p className="section-note">{translateBalanceContextLabel(props.balanceContextLabel, locale)}</p>
            <p className="wallet-balance">{translateDisplayValue(props.balanceLabel, locale)}</p>
          </div>
          <div className="identity-stack">
            <div className="identity-chip">
              <span>{copy.autonomousWallet}</span>
              <strong>{translateDisplayValue(shortenAddress(props.contractAddress), locale)}</strong>
            </div>
            <div className="identity-chip">
              <span>{copy.executionMode}</span>
              <strong>{copy.reactiveCallback}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="action-row">
        <button
          className={props.controllerAssetViewNetwork === 'destination' ? 'primary-button' : 'secondary-button'}
          disabled={props.isPending}
          onClick={() => props.onSetControllerAssetViewNetwork('destination')}
          type="button"
        >
          {copy.executionChainView}
        </button>
        <button
          className={props.controllerAssetViewNetwork === 'reactive' ? 'primary-button' : 'secondary-button'}
          disabled={props.isPending}
          onClick={() => props.onSetControllerAssetViewNetwork('reactive')}
          type="button"
        >
          {copy.reactiveNetworkView}
        </button>
      </div>
      <p className="wallet-footnote">{copy.assetViewNote}</p>
      <div className="action-row">
        <input
          className="field compact-field"
          disabled={!hasBoundWallet || props.isPending}
          onChange={(event) => setFundAmount(event.target.value)}
          value={fundAmount}
        />
        <button
          className="primary-button"
          disabled={!hasBoundWallet || props.isPending}
          onClick={() => props.onFundWallet(fundAmount)}
          type="button"
        >
          {props.isPending ? copy.fundingAutonomousWalletShort : copy.fundAutonomousWallet}
        </button>
      </div>
      <p className="wallet-footnote">{fundingHelper}</p>
      <div className="action-row">
        <input
          className="field compact-field"
          disabled={!props.isConnected || props.isPending}
          onChange={(event) => setWatchedToken(event.target.value)}
          placeholder={copy.watchTokenPlaceholder}
          value={watchedToken}
        />
        <button
          className="secondary-button"
          disabled={!props.isConnected || props.isPending || watchedToken.trim().length === 0}
          onClick={() => {
            props.onWatchToken(watchedToken)
            setWatchedToken('')
          }}
          type="button"
        >
          {copy.watchToken}
        </button>
      </div>
      <p className="wallet-footnote">{copy.watchTokenNote}</p>
      <div className="dual-asset-grid">
        <div>
          <p className="section-note">{copy.controllerWalletAssets}</p>
          {props.connectedAssetBalances.length > 0 ? (
            <div className="asset-strip">
              {props.connectedAssetBalances.map((asset) => (
                <div className="asset-chip" key={`connected-${asset.kind}-${asset.symbol}`}>
                  <span>{asset.symbol}</span>
                  <strong>{asset.balanceLabel}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="asset-empty-state">{copy.controllerAssetsEmpty}</div>
          )}
        </div>
        <div>
          <p className="section-note">{copy.autonomousWalletAssets}</p>
          {props.assetBalances.length > 0 ? (
            <div className="asset-strip">
              {props.assetBalances.map((asset) => (
                <div className="asset-chip" key={`destination-${asset.kind}-${asset.symbol}`}>
                  <span>{asset.symbol}</span>
                  <strong>{asset.balanceLabel}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="asset-empty-state">{copy.autonomousAssetsEmpty}</div>
          )}
        </div>
      </div>
      <div className="metric-strip">
        <div className="metric-tile">
          <span>{copy.connection}</span>
          <strong>{props.isConnected ? copy.walletConnected : copy.connectWalletShort}</strong>
          <small>{translateConnectionLabel(props.connectionLabel, locale)}</small>
        </div>
        <div className="metric-tile">
          <span>{copy.executionRunway}</span>
          <strong>
            {locale === 'zh-CN'
              ? `${remainingExecutions}${copy.remainingLeft}`
              : `${remainingExecutions} ${copy.remainingLeft}`}
          </strong>
          <small>
            {locale === 'zh-CN'
              ? `${copy.usedCount} ${props.executedCount} / ${props.maxExecutions}`
              : `${props.executedCount} / ${props.maxExecutions} ${copy.usedCount}`}
          </small>
        </div>
        <div className="metric-tile">
          <span>{copy.runtimeStatus}</span>
          <strong>{translateRuntimeStatus(props.runtimeStatus, locale)}</strong>
          <small>{copy.runtimeStatus}</small>
        </div>
        <div className="metric-tile">
          <span>{copy.lastSync}</span>
          <strong>{translateDisplayValue(props.lastSyncedAt, locale)}</strong>
          <small>{copy.latestChainSnapshot}</small>
        </div>
      </div>
    </article>
  )
}
