import type { ExecutionProof } from '../types/willlead'
import {
  translateChainLabel,
  translateProofDescription,
  translateProofLabel,
  translateProofStatus,
  useCopy
} from '../lib/i18n'

type ProofPanelProps = {
  events: ExecutionProof[]
  emptyStateMessage: string
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
        {props.events.length === 0 ? (
          <li className="proof-empty-state">{props.emptyStateMessage}</li>
        ) : null}
        {props.events.map((event) => (
          <li className="proof-item" key={event.id}>
            <div className="proof-main">
              <div className="proof-headline">
                <strong>{translateProofLabel(event.label, locale)}</strong>
                <div className="proof-badges">
                  <span className={`status-pill history-status history-status-${event.status}`}>
                    {translateProofStatus(event.status, locale)}
                  </span>
                  <span className={`chain-badge chain-${event.chain}`}>{translateChainLabel(event.chain, locale)}</span>
                </div>
              </div>
              <p>{translateProofDescription(event.label, event.description, locale)}</p>
              <dl className="proof-meta">
                <div>
                  <dt>{copy.observedAt}</dt>
                  <dd>{event.timestampLabel}</dd>
                </div>
                {event.nonceLabel ? (
                  <div>
                    <dt>{copy.executionNonceLabel}</dt>
                    <dd>{event.nonceLabel}</dd>
                  </div>
                ) : null}
              </dl>
              {event.detailLabel ? (
                <div className="proof-detail">
                  <span>{copy.skipReason}</span>
                  <strong>{event.detailLabel}</strong>
                </div>
              ) : null}
            </div>
            <div className="proof-reference">
              {event.href ? (
                <a className="proof-link" href={event.href} rel="noreferrer" target="_blank">
                  <code>{event.reference}</code>
                </a>
              ) : (
                <code>{event.reference}</code>
              )}
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}
