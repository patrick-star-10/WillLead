import { startTransition, useDeferredValue, useEffect, useState, useTransition } from 'react'

import willLeadLogo from '../assets/willlead-logo.jpg'
import { AutomationCapabilityPanel } from '../components/AutomationCapabilityPanel'
import { IntentForm } from '../components/IntentForm'
import { ProofPanel } from '../components/ProofPanel'
import { RuntimePanel } from '../components/RuntimePanel'
import { WalletConnectModal } from '../components/WalletConnectModal'
import { WalletHeader } from '../components/WalletHeader'
import { useAutomationCredit } from '../hooks/useAutomationCredit'
import { useExecutionEvents } from '../hooks/useExecutionEvents'
import { useIntentState } from '../hooks/useIntentState'
import { useWalletState } from '../hooks/useWalletState'
import { useCopy, useLocaleActions, translateConnectionLabel } from '../lib/i18n'
import { useWalletStore } from '../store/walletStore'
import { getBrowserWalletOptions } from '../lib/willlead'

export function App() {
  const { copy, locale } = useCopy()
  const setLocale = useLocaleActions()
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
  const syncIdleCopy = useWalletStore((state) => state.syncIdleCopy)
  const isActionPending = useWalletStore((state) => state.isPending)
  const statusMessage = useWalletStore((state) => state.statusMessage)
  const errorMessage = useWalletStore((state) => state.errorMessage)
  const [, startUiTransition] = useTransition()
  const [activeSection, setActiveSection] = useState<'overview' | 'plan' | 'automation' | 'activity'>('overview')
  const [isWalletModalOpen, setWalletModalOpen] = useState(false)
  const browserWalletOptions = getBrowserWalletOptions()
  const hasBoundWallet = wallet.walletAccessState === 'bound'
  const activityEmptyMessage =
    wallet.walletAccessState === 'mismatch'
      ? copy.connectedWalletMismatch
      : wallet.walletAccessState === 'unavailable'
        ? copy.walletAccessUnavailable
        : hasBoundWallet
          ? copy.activityEmpty
          : copy.connectWalletToLoadRuntime

  const sections = [
    {
      id: 'overview',
      label: copy.overviewTab,
      title: copy.walletOverviewTitle,
      description: copy.overviewDesc
    },
    {
      id: 'plan',
      label: copy.planTab,
      title: copy.transferPlanTitle,
      description: copy.planDesc
    },
    {
      id: 'automation',
      label: copy.automationTab,
      title: copy.automationTitle,
      description: copy.automationDesc
    },
    {
      id: 'activity',
      label: copy.activityTab,
      title: copy.activityTitle,
      description: copy.activityDesc
    }
  ] as const

  useEffect(() => {
    void initializeWallet()
  }, [initializeWallet])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    syncIdleCopy()
  }, [locale, syncIdleCopy])

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
            <div className="hero-brand-lockup">
              <div className="hero-logo-frame">
                <img alt="WillLead logo" className="hero-logo" src={willLeadLogo} />
              </div>
              <div className="hero-brand-copy">
                <p className="eyebrow">{copy.heroEyebrow}</p>
                <h1>WillLead</h1>
              </div>
            </div>
            <p className="hero-copy">{copy.heroCopy}</p>
          </div>
          <div className="hero-actions">
            <div className="language-toggle" aria-label="Language">
              <button
                className={`language-button ${locale === 'en' ? 'language-button-active' : ''}`}
                onClick={() => setLocale('en')}
                type="button"
              >
                {copy.localeEnglish}
              </button>
              <button
                className={`language-button ${locale === 'zh-CN' ? 'language-button-active' : ''}`}
                onClick={() => setLocale('zh-CN')}
                type="button"
              >
                {copy.localeChinese}
              </button>
            </div>
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
              {wallet.isConnected ? copy.disconnectWallet : copy.connectWallet}
            </button>
            <p className="hero-action-note">
              {wallet.isConnected
                ? `${translateConnectionLabel(wallet.connectionLabel, locale)} ${copy.connectedHint}`
                : copy.connectHint}
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
          <p className="panel-kicker">{copy.walletView}</p>
          <h2>{activeSectionMeta.title}</h2>
          <p className="section-note">{activeSectionMeta.description}</p>
        </div>

        <section className="section-stage">
          {activeSection === 'overview' ? (
            <WalletHeader
              contractAddress={wallet.contractAddress}
              ownerAddress={wallet.ownerAddress}
              connectionLabel={wallet.connectionLabel}
              connectedBalanceLabel={wallet.connectedBalanceLabel}
              connectedAssetBalances={wallet.connectedAssetBalances}
              balanceContextLabel={wallet.balanceContextLabel}
              balanceLabel={wallet.balanceLabel}
              assetBalances={wallet.assetBalances}
              runtimeStatus={wallet.runtimeStatus}
              isConnected={wallet.isConnected}
              executedCount={intent.executedCount}
              maxExecutions={intent.maxExecutions}
              lastSyncedAt={wallet.lastSyncedAt}
            />
          ) : null}

          {activeSection === 'overview' ? (
            <AutomationCapabilityPanel
              availableBalance={automation.availableBalance}
              callbackGasLimit={wallet.callbackGasLimit}
              creditLabel={automation.creditLabel}
              isPending={isActionPending}
              lastSyncedAt={wallet.lastSyncedAt}
              listenerAddress={wallet.listenerAddress}
              listenerPaused={wallet.listenerPaused}
              minRequiredBalance={automation.minRequiredBalance}
              walletAccessState={wallet.walletAccessState}
              onFundAutomation={(amount) => void fundAutomation({ amount })}
              onRefresh={handleRefresh}
              signalEmitterAddress={wallet.signalEmitterAddress}
              subscriptionOriginChainId={wallet.subscriptionOriginChainId}
              subscriptionStatus={wallet.subscriptionStatus}
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
              isEditable={hasBoundWallet}
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
              listenerAddress={wallet.listenerAddress}
              listenerPaused={wallet.listenerPaused}
              signalEmitterAddress={wallet.signalEmitterAddress}
              subscriptionStatus={wallet.subscriptionStatus}
              subscriptionOriginChainId={wallet.subscriptionOriginChainId}
              subscriptionDestinationChainId={wallet.subscriptionDestinationChainId}
              subscriptionTopic0={wallet.subscriptionTopic0}
              callbackGasLimit={wallet.callbackGasLimit}
              isPending={isActionPending}
              walletAccessState={wallet.walletAccessState}
              onTriggerSignal={() => void triggerSignal()}
              onPauseListener={() => void pauseListener()}
              onResumeListener={() => void resumeListener()}
            />
          ) : null}

          {activeSection === 'activity' ? (
            <ProofPanel emptyStateMessage={activityEmptyMessage} events={deferredEvents} />
          ) : null}
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
