import { useEffect, useMemo, useState } from 'react'

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

function shortenAddress(value: string | null) {
  if (!value) return 'No wallet connected'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function WalletConnectModal(props: WalletConnectModalProps) {
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
            <p className="panel-kicker">Wallet Access</p>
            <h3>Choose how this app should sign transactions</h3>
            <p className="section-note">
              Current signer: {props.currentConnectionLabel} · {shortenAddress(props.currentAddress)}
            </p>
          </div>
          <button className="secondary-button" onClick={props.onClose} type="button">
            Close
          </button>
        </div>

        <div className="wallet-choice-grid">
          <button
            className={`wallet-choice-card ${activeMode === 'choose' ? 'wallet-choice-active' : ''}`}
            onClick={() => setActiveMode('browser')}
            type="button"
          >
            <span className="wallet-choice-kicker">Option 1</span>
            <strong>Connect other wallet</strong>
            <p>Use the injected browser wallet flow you already had, such as MetaMask or Rabby.</p>
          </button>

          <button
            className={`wallet-choice-card ${activeMode === 'web' ? 'wallet-choice-active' : ''}`}
            onClick={() => setActiveMode('web')}
            type="button"
          >
            <span className="wallet-choice-kicker">Option 2</span>
            <strong>Create wallet</strong>
            <p>
              Generate or import a mnemonic and let this app act as an independent web wallet.
            </p>
          </button>
        </div>

        {activeMode === 'browser' ? (
          <div className="wallet-list-panel">
            <div className="wallet-list-header">
              <button className="secondary-button" onClick={() => setActiveMode('choose')} type="button">
                Back
              </button>
              <div>
                <strong>Choose browser wallet</strong>
                <p className="section-note">
                  Each click explicitly chooses which injected wallet to connect.
                </p>
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
                    <strong>Connect</strong>
                  </button>
                ))
              ) : (
                <div className="browser-wallet-empty">
                  No injected wallet detected in this browser.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeMode === 'web' ? (
          <div className="web-wallet-panel">
            <div className="web-wallet-actions">
              <button className="primary-button" onClick={handleCreateWebWallet} type="button">
                {props.isPending ? 'Generating...' : 'Generate mnemonic'}
              </button>
              <p className="section-note">
                A generated wallet is saved locally in this browser for this MVP.
              </p>
            </div>

            {mnemonicWords.length > 0 ? (
              <div className="mnemonic-panel">
                <div className="mnemonic-panel-header">
                  <strong>Recovery phrase</strong>
                  <span>Write these 12 words down before closing this dialog.</span>
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
                Import an existing mnemonic
              </label>
              <textarea
                className="field mnemonic-textarea"
                id="mnemonic-import"
                onChange={(event) => setImportMnemonic(event.target.value)}
                placeholder="paste your 12 or 24 word recovery phrase"
                value={importMnemonic}
              />
              <div className="action-row">
                <button
                  className="secondary-button"
                  disabled={!importMnemonic.trim()}
                  onClick={handleImportWebWallet}
                  type="button"
                >
                  {props.isPending ? 'Importing...' : 'Import web wallet'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
