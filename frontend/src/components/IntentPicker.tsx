import { useCopy } from '../lib/i18n'
import type { DisplayIntentKind } from '../types/willlead'

type IntentPickerProps = {
  value: DisplayIntentKind
  onChange: (value: DisplayIntentKind) => void
}

export function IntentPicker(props: IntentPickerProps) {
  const { copy } = useCopy()

  return (
    <div className="intent-picker">
      <p className="panel-kicker">{copy.intentPickerKicker}</p>
      <p className="section-note">{copy.intentPickerNote}</p>
      <div className="intent-picker-grid" role="tablist" aria-label={copy.intentPickerKicker}>
        <button
          className={`intent-card ${props.value === 'transfer' ? 'intent-card-active' : ''}`}
          onClick={() => props.onChange('transfer')}
          type="button"
        >
          <span className="intent-card-kicker">01</span>
          <strong>{copy.transferIntentLabel}</strong>
          <small>{copy.transferIntentCardNote}</small>
        </button>
        <button
          className={`intent-card ${props.value === 'swap_faucet' ? 'intent-card-active' : ''}`}
          onClick={() => props.onChange('swap_faucet')}
          type="button"
        >
          <span className="intent-card-kicker">02</span>
          <strong>{copy.swapIntentLabel}</strong>
          <small>{copy.swapIntentCardNote}</small>
        </button>
      </div>
    </div>
  )
}
