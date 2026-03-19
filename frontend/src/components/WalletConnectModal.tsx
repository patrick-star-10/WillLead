import { useEffect, useMemo, useState } from 'react'

import {
  translateConnectionLabel,
  useCopy
} from '../lib/i18n'
import type { InjectedWalletOption } from '../types/willlead'

type WalletConnectModalProps = {
  isOpen: boolean
  isPending: boolean
  currentAddress: string | null
  currentConnectionLabel: string
  browserWalletOptions: InjectedWalletOption[]
  onClose: () => void
  onConnectBrowserWallet: (providerId: string) => Promise<void>
  onCreateWebWallet: () => Promise<string>
  onImportWebWallet: (mnemonic: string) => Promise<void>
}

function shortenAddress(value: string | null, fallback: string) {
  if (!value) return fallback
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function WalletConnectModal(props: WalletConnectModalProps) {
  const { copy, locale } = useCopy()
  const [activeMode, setActiveMode] = useState<'choose' | 'browser' | 'web'>('choose')
  const [createdMnemonic, setCreatedMnemonic] = useState('')
  const [importMnemonic, setImportMnemonic] = useState('')
  const mnemonicWords = useMemo(() => createdMnemonic.split(' ').filter(Boolean), [createdMnemonic])

  useEffect(() => {
    if (!props.isOpen) {
      setActiveMode('choose')
      setCreatedMnemonic('')
      setImportMnemonic('')
    }
  }, [props.isOpen])

  if (!props.isOpen) return null

  const handleCreateWebWallet = async () => {
    const mnemonic = await props.onCreateWebWallet()
    setCreatedMnemonic(mnemonic)
    setActiveMode('web')
  }

  const handleImportWebWallet = async () => {
    await props.onImportWebWallet(importMnemonic)
    setImportMnemonic('')
    props.onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label="Connect wallet"
        aria-modal="true"
        className="wallet-modal"
        role="dialog"
      >
        <div className="wallet-modal-header">
          <div>
            <p className="panel-kicker">{copy.walletAccess}</p>
            <h3>{copy.chooseSigningMethod}</h3>
            <p className="section-note">
              {copy.currentSigner}: {translateConnectionLabel(props.currentConnectionLabel, locale)} ·{' '}
              {shortenAddress(props.currentAddress, copy.noWalletConnected)}
            </p>
          </div>
          <button className="secondary-button" onClick={props.onClose} type="button">
            {copy.close}
          </button>
        </div>

        <div className="wallet-choice-grid">
          <button
            className={`wallet-choice-card ${activeMode === 'choose' ? 'wallet-choice-active' : ''}`}
            onClick={() => setActiveMode('browser')}
            type="button"
          >
            <span className="wallet-choice-kicker">{copy.option1}</span>
            <strong>{copy.connectOtherWallet}</strong>
            <p>{copy.connectOtherWalletNote}</p>
          </button>

          <button
            className={`wallet-choice-card ${activeMode === 'web' ? 'wallet-choice-active' : ''}`}
            onClick={() => setActiveMode('web')}
            type="button"
          >
            <span className="wallet-choice-kicker">{copy.option2}</span>
            <strong>{copy.createWallet}</strong>
            <p>{copy.createWalletNote}</p>
          </button>
        </div>

        {activeMode === 'browser' ? (
          <div className="wallet-list-panel">
            <div className="wallet-list-header">
              <button className="secondary-button" onClick={() => setActiveMode('choose')} type="button">
                {copy.back}
              </button>
              <div>
                <strong>{copy.chooseBrowserWallet}</strong>
                <p className="section-note">{copy.chooseBrowserWalletNote}</p>
              </div>
            </div>
            <div className="browser-wallet-list">
              {props.browserWalletOptions.length > 0 ? (
                props.browserWalletOptions.map((wallet) => (
                  <button
                    className="browser-wallet-button"
                    key={wallet.id}
                    onClick={async () => {
                      await props.onConnectBrowserWallet(wallet.id)
                      props.onClose()
                    }}
                    type="button"
                  >
                    <span>{wallet.label}</span>
                    <strong>{copy.connect}</strong>
                  </button>
                ))
              ) : (
                <div className="browser-wallet-empty">{copy.noInjectedWallet}</div>
              )}
            </div>
          </div>
        ) : null}

        {activeMode === 'web' ? (
          <div className="web-wallet-panel">
            <div className="web-wallet-actions">
              <button className="primary-button" onClick={handleCreateWebWallet} type="button">
                {props.isPending ? copy.generating : copy.generateMnemonic}
              </button>
              <p className="section-note">{copy.generatedWalletNote}</p>
            </div>

            {mnemonicWords.length > 0 ? (
              <div className="mnemonic-panel">
                <div className="mnemonic-panel-header">
                  <strong>{copy.recoveryPhrase}</strong>
                  <span>{copy.recoveryPhraseNote}</span>
                </div>
                <div className="mnemonic-grid">
                  {mnemonicWords.map((word, index) => (
                    <div className="mnemonic-word" key={`${word}-${index + 1}`}>
                      <span>{index + 1}</span>
                      <strong>{word}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="import-panel">
              <label className="import-label" htmlFor="mnemonic-import">
                {copy.importMnemonic}
              </label>
              <textarea
                className="field mnemonic-textarea"
                id="mnemonic-import"
                onChange={(event) => setImportMnemonic(event.target.value)}
                placeholder={copy.importMnemonicPlaceholder}
                value={importMnemonic}
              />
              <div className="action-row">
                <button
                  className="secondary-button"
                  disabled={!importMnemonic.trim()}
                  onClick={handleImportWebWallet}
                  type="button"
                >
                  {props.isPending ? copy.importing : copy.importWebWallet}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
