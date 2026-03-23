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
      <select
        className="field"
        onChange={(event) => props.onChange(event.target.value as DisplayIntentKind)}
        value={props.value}
      >
        <option value="transfer">{copy.transferIntentLabel}</option>
        <option value="swap_faucet">{copy.swapIntentLabel}</option>
      </select>
    </div>
  )
}
