import type { ExecutionProof } from '../types/willlead'
import {
  translateChainLabel,
  translateProofDescription,
  translateProofLabel,
  useCopy
} from '../lib/i18n'

type ProofPanelProps = {
  events: ExecutionProof[]
}

export function ProofPanel(props: ProofPanelProps) {
  const { copy, locale } = useCopy()
  return (
    <article className="panel proof-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.activityKicker}</p>
          <p className="section-note">{copy.activityNote}</p>
        </div>
        <span className="status-pill status-proof">{copy.chainEvidence}</span>
      </div>
      <ul className="proof-list">
        {props.events.map((event) => (
          <li className="proof-item" key={event.id}>
            <div>
              <strong>
                {translateProofLabel(event.label, locale)}{' '}
                <span className={`chain-badge chain-${event.chain}`}>{translateChainLabel(event.chain, locale)}</span>
              </strong>
              <p>{translateProofDescription(event.label, event.description, locale)}</p>
            </div>
            {event.href ? (
              <a className="proof-link" href={event.href} rel="noreferrer" target="_blank">
                <code>{event.reference}</code>
              </a>
            ) : (
              <code>{event.reference}</code>
            )}
          </li>
        ))}
      </ul>
    </article>
  )
}
