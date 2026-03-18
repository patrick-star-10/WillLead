import { useState } from 'react'

import type { AssetBalance } from '../types/willlead'

type WalletHeaderProps = {
  contractAddress: string
  ownerAddress: string | null
  connectionLabel: string
  balanceContextLabel: string
  balanceLabel: string
  assetBalances: AssetBalance[]
  runtimeStatus: string
  isConnected: boolean
  automationCreditLabel: string
  automationAvailableBalance: string
  automationMinRequiredBalance: string
  executedCount: number
  maxExecutions: number
  listenerPaused: boolean
  lastSyncedAt: string
  isPending: boolean
  onRefresh: () => void
  onFundAutomation: (amount: string) => void
}

function shortenAddress(value: string | null) {
  if (!value) return 'Not connected'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function WalletHeader(props: WalletHeaderProps) {
  const [topUpAmount, setTopUpAmount] = useState('0.01')
  const remainingExecutions = Math.max(props.maxExecutions - props.executedCount, 0)

  return (
    <article className="panel wallet-panel">
      <div className="panel-header">
        <p className="panel-kicker">Wallet Overview</p>
        <span className={`status-pill status-${props.runtimeStatus.toLowerCase()}`}>
          {props.runtimeStatus}
        </span>
      </div>
      <div className="wallet-balance-row">
        <div>
          <p className="section-note">{props.balanceContextLabel}</p>
          <p className="wallet-balance">{props.balanceLabel}</p>
        </div>
        <div className="identity-stack">
          <div className="identity-chip">
            <span>Owner</span>
            <strong>{shortenAddress(props.ownerAddress)}</strong>
          </div>
          <div className="identity-chip">
            <span>Wallet</span>
            <strong>{shortenAddress(props.contractAddress)}</strong>
          </div>
        </div>
      </div>
      {props.assetBalances.length > 0 ? (
        <div className="asset-strip">
          {props.assetBalances.map((asset) => (
            <div className="asset-chip" key={`${asset.kind}-${asset.symbol}`}>
              <span>{asset.symbol}</span>
              <strong>{asset.balanceLabel}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="asset-empty-state">
          Asset balances are unavailable until a Sepolia RPC or destination wallet contract is
          configured.
        </div>
      )}
      <div className="metric-strip">
        <div className="metric-tile">
          <span>Connection</span>
          <strong>{props.isConnected ? 'Wallet connected' : 'Connect wallet'}</strong>
          <small>{props.connectionLabel}</small>
        </div>
        <div className="metric-tile">
          <span>Automation credit</span>
          <strong>{props.automationAvailableBalance}</strong>
          <small>{props.automationCreditLabel}</small>
        </div>
        <div className="metric-tile">
          <span>Execution runway</span>
          <strong>{remainingExecutions} left</strong>
          <small>{props.executedCount} / {props.maxExecutions} used</small>
        </div>
        <div className="metric-tile">
          <span>Listener</span>
          <strong>{props.listenerPaused ? 'Paused' : 'Armed'}</strong>
          <small>Floor {props.automationMinRequiredBalance}</small>
        </div>
      </div>
      <div className="action-row">
        <button className="secondary-button" onClick={props.onRefresh} type="button">
          {props.isPending ? 'Refreshing...' : 'Refresh Wallet'}
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
          Fund Automation
        </button>
      </div>
      <p className="wallet-footnote">Last sync {props.lastSyncedAt}</p>
    </article>
  )
}
