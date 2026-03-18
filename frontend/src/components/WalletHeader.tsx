import type { AssetBalance } from '../types/willlead'

type WalletHeaderProps = {
  contractAddress: string
  ownerAddress: string | null
  connectionLabel: string
  connectedBalanceLabel: string
  connectedAssetBalances: AssetBalance[]
  balanceContextLabel: string
  balanceLabel: string
  assetBalances: AssetBalance[]
  runtimeStatus: string
  isConnected: boolean
  executedCount: number
  maxExecutions: number
  lastSyncedAt: string
}

function shortenAddress(value: string | null) {
  if (!value) return 'Not connected'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function WalletHeader(props: WalletHeaderProps) {
  const remainingExecutions = Math.max(props.maxExecutions - props.executedCount, 0)

  return (
    <article className="panel wallet-panel">
      <div className="panel-header">
        <p className="panel-kicker">Wallet Overview</p>
        <span className={`status-pill status-${props.runtimeStatus.toLowerCase()}`}>
          {props.runtimeStatus}
        </span>
      </div>
      <div className="wallet-balance-grid">
        <div className="wallet-balance-row">
          <div>
            <p className="section-note">Connected signing wallet balance</p>
            <p className="wallet-balance">{props.connectedBalanceLabel}</p>
          </div>
          <div className="identity-stack">
            <div className="identity-chip">
              <span>Owner</span>
              <strong>{shortenAddress(props.ownerAddress)}</strong>
            </div>
            <div className="identity-chip">
              <span>Signer</span>
              <strong>{props.connectionLabel}</strong>
            </div>
          </div>
        </div>
        <div className="wallet-balance-row">
          <div>
            <p className="section-note">{props.balanceContextLabel}</p>
            <p className="wallet-balance">{props.balanceLabel}</p>
          </div>
          <div className="identity-stack">
            <div className="identity-chip">
              <span>Destination wallet</span>
              <strong>{shortenAddress(props.contractAddress)}</strong>
            </div>
            <div className="identity-chip">
              <span>Execution mode</span>
              <strong>Reactive callback</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="dual-asset-grid">
        <div>
          <p className="section-note">Connected wallet assets</p>
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
            <div className="asset-empty-state">Connect a Sepolia wallet to load signer assets.</div>
          )}
        </div>
        <div>
          <p className="section-note">Destination wallet assets</p>
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
            <div className="asset-empty-state">
              Destination wallet assets are unavailable until a contract address is configured.
            </div>
          )}
        </div>
      </div>
      <div className="metric-strip">
        <div className="metric-tile">
          <span>Connection</span>
          <strong>{props.isConnected ? 'Wallet connected' : 'Connect wallet'}</strong>
          <small>{props.connectionLabel}</small>
        </div>
        <div className="metric-tile">
          <span>Execution runway</span>
          <strong>{remainingExecutions} left</strong>
          <small>{props.executedCount} / {props.maxExecutions} used</small>
        </div>
        <div className="metric-tile">
          <span>Runtime status</span>
          <strong>{props.runtimeStatus}</strong>
          <small>Wallet execution state</small>
        </div>
        <div className="metric-tile">
          <span>Last sync</span>
          <strong>{props.lastSyncedAt}</strong>
          <small>Latest chain snapshot</small>
        </div>
      </div>
    </article>
  )
}
