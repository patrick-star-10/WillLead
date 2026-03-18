import { startTransition, useDeferredValue, useEffect, useState, useTransition } from 'react'

import { IntentForm } from '../components/IntentForm'
import { ProofPanel } from '../components/ProofPanel'
import { RuntimePanel } from '../components/RuntimePanel'
import { WalletConnectModal } from '../components/WalletConnectModal'
import { WalletHeader } from '../components/WalletHeader'
import { useAutomationCredit } from '../hooks/useAutomationCredit'
import { useExecutionEvents } from '../hooks/useExecutionEvents'
import { useIntentState } from '../hooks/useIntentState'
import { useWalletState } from '../hooks/useWalletState'
import { useWalletStore } from '../store/walletStore'
import { getBrowserWalletOptions } from '../lib/willlead'

const sections = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'Wallet Overview',
    description: 'Balance, identity, execution runway, and automation credit.'
  },
  {
    id: 'plan',
    label: 'Transfer Plan',
    title: 'Transfer Plan',
    description: 'Configure the onchain transfer this wallet should keep executing.'
  },
  {
    id: 'automation',
    label: 'Automation',
    title: 'Automation Engine',
    description: 'Operate the reactive listener and simulate the source trigger.'
  },
  {
    id: 'activity',
    label: 'Activity',
    title: 'Activity Ledger',
    description: 'Review origin, reactive, and destination proof records.'
  }
] as const

export function App() {
  const wallet = useWalletState()
  const intent = useIntentState()
  const automation = useAutomationCredit()
  const executionEvents = useExecutionEvents()
  const deferredEvents = useDeferredValue(executionEvents)
  const initializeWallet = useWalletStore((state) => state.initializeWallet)
  const connectBrowserWallet = useWalletStore((state) => state.connectBrowserWallet)
  const createWebWallet = useWalletStore((state) => state.createWebWallet)
  const importWebWallet = useWalletStore((state) => state.importWebWallet)
  const disconnectWallet = useWalletStore((state) => state.disconnectWallet)
  const refreshChainState = useWalletStore((state) => state.refreshChainState)
  const submitIntent = useWalletStore((state) => state.submitIntent)
  const fundAutomation = useWalletStore((state) => state.fundAutomation)
  const pauseWalletIntent = useWalletStore((state) => state.pauseWalletIntent)
  const resumeWalletIntent = useWalletStore((state) => state.resumeWalletIntent)
  const pauseListener = useWalletStore((state) => state.pauseListener)
  const resumeListener = useWalletStore((state) => state.resumeListener)
  const triggerSignal = useWalletStore((state) => state.triggerSignal)
  const isActionPending = useWalletStore((state) => state.isPending)
  const statusMessage = useWalletStore((state) => state.statusMessage)
  const errorMessage = useWalletStore((state) => state.errorMessage)
  const [, startUiTransition] = useTransition()
  const [activeSection, setActiveSection] =
    useState<(typeof sections)[number]['id']>('overview')
  const [isWalletModalOpen, setWalletModalOpen] = useState(false)
  const browserWalletOptions = getBrowserWalletOptions()

  useEffect(() => {
    void initializeWallet()
  }, [initializeWallet])

  const handleRefresh = () => {
    startUiTransition(() => {
      startTransition(() => {
        void refreshChainState()
      })
    })
  }

  const activeSectionMeta = sections.find((section) => section.id === activeSection) ?? sections[0]

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-header">
          <div className="hero-copy-block">
            <p className="eyebrow">Reactive-native Wallet MVP</p>
            <h1>WillLead</h1>
            <p className="hero-copy">
              A wallet that treats event-driven execution as a default capability, not an add-on
              bot.
            </p>
          </div>
          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => {
                if (wallet.isConnected) {
                  void disconnectWallet()
                  return
                }
                setWalletModalOpen(true)
              }}
              type="button"
            >
              {wallet.isConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
            </button>
            <p className="hero-action-note">
              {wallet.isConnected
                ? `${wallet.connectionLabel} connected. Click above to disconnect this session.`
                : 'Connect first, then configure the transfer plan.'}
            </p>
          </div>
        </div>
      </section>

      <section className="section-nav" aria-label="Wallet sections">
        {sections.map((section) => (
          <button
            className={`section-tab ${section.id === activeSection ? 'section-tab-active' : ''}`}
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            <span className="section-tab-label">{section.label}</span>
            <small>{section.description}</small>
          </button>
        ))}
      </section>

      <section className="status-banner">
        <span>{statusMessage}</span>
        {errorMessage ? <strong>{errorMessage}</strong> : null}
      </section>

      <section className="view-frame">
        <div className="view-header">
          <p className="panel-kicker">Wallet View</p>
          <h2>{activeSectionMeta.title}</h2>
          <p className="section-note">{activeSectionMeta.description}</p>
        </div>

        <section className="section-stage">
          {activeSection === 'overview' ? (
            <WalletHeader
              contractAddress={wallet.contractAddress}
              ownerAddress={wallet.ownerAddress}
              connectionLabel={wallet.connectionLabel}
              balanceContextLabel={wallet.balanceContextLabel}
              balanceLabel={wallet.balanceLabel}
              assetBalances={wallet.assetBalances}
              runtimeStatus={wallet.runtimeStatus}
              isConnected={wallet.isConnected}
              automationCreditLabel={automation.creditLabel}
              automationAvailableBalance={automation.availableBalance}
              automationMinRequiredBalance={automation.minRequiredBalance}
              executedCount={intent.executedCount}
              maxExecutions={intent.maxExecutions}
              listenerPaused={wallet.listenerPaused}
              lastSyncedAt={wallet.lastSyncedAt}
              isPending={isActionPending}
              onRefresh={handleRefresh}
              onFundAutomation={(amount) => void fundAutomation({ amount })}
            />
          ) : null}

          {activeSection === 'plan' ? (
            <IntentForm
              token={intent.token}
              recipient={intent.recipient}
              amountPerExecution={intent.amountPerExecution}
              maxExecutions={intent.maxExecutions}
              executedCount={intent.executedCount}
              minAutomationBalance={intent.minAutomationBalance}
              enabled={intent.enabled}
              isPending={isActionPending}
              onSubmit={(values) => void submitIntent(values)}
              onPause={() => void pauseWalletIntent()}
              onResume={() => void resumeWalletIntent()}
            />
          ) : null}

          {activeSection === 'automation' ? (
            <RuntimePanel
              runtimeStatus={wallet.runtimeStatus}
              lastExecutionNonce={wallet.lastExecutionNonce}
              lastExecutedAt={wallet.lastExecutedAt}
              lastSignalHash={wallet.lastSignalHash}
              destinationBalanceDelta={wallet.destinationBalanceDelta}
              listenerPaused={wallet.listenerPaused}
              callbackGasLimit={wallet.callbackGasLimit}
              isPending={isActionPending}
              onTriggerSignal={() => void triggerSignal()}
              onPauseListener={() => void pauseListener()}
              onResumeListener={() => void resumeListener()}
            />
          ) : null}

          {activeSection === 'activity' ? <ProofPanel events={deferredEvents} /> : null}
        </section>
      </section>

      <WalletConnectModal
        browserWalletOptions={browserWalletOptions}
        currentAddress={wallet.ownerAddress}
        currentConnectionLabel={wallet.connectionLabel}
        isOpen={isWalletModalOpen}
        isPending={isActionPending}
        onClose={() => setWalletModalOpen(false)}
        onConnectBrowserWallet={async (providerId) => {
          await connectBrowserWallet(providerId)
        }}
        onCreateWebWallet={async () => createWebWallet()}
        onImportWebWallet={async (mnemonic) => {
          await importWebWallet(mnemonic)
        }}
      />
    </main>
  )
}
