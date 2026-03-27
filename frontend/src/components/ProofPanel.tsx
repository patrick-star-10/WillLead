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
  historyStatus: 'idle' | 'loading' | 'ready' | 'partial' | 'error'
  historyDiagnostics: string | null
}

export function ProofPanel(props: ProofPanelProps) {
  const { copy, locale } = useCopy()
  const emptyMessage =
    props.historyStatus === 'loading'
      ? copy.loadingExecutionHistory
      : props.historyStatus === 'error'
        ? copy.executionHistoryRefreshFailed
        : props.emptyStateMessage
  const proofCounts = props.events.reduce(
    (counts, event) => {
      if (event.chain === 'origin') counts.origin += 1
      if (event.chain === 'reactive') counts.reactive += 1
      if (event.chain === 'destination') counts.destination += 1
      return counts
    },
    { origin: 0, reactive: 0, destination: 0 }
  )

  return (
    <article className="panel proof-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{copy.activityKicker}</p>
          <p className="section-note">{copy.activityNote}</p>
        </div>
        <span className="status-pill status-proof">{copy.chainEvidence}</span>
      </div>
      <div className="proof-flow">
        <div className="proof-flow-copy">
          <p className="panel-kicker">{copy.proofFlowTitle}</p>
          <p className="section-note">{copy.proofFlowNote}</p>
        </div>
        <div className="proof-flow-track" aria-label="Proof flow">
          <div className="proof-flow-node">
            <span>{copy.sourceStage}</span>
            <strong>{proofCounts.origin}</strong>
          </div>
          <div className="proof-flow-arrow" aria-hidden="true">-&gt;</div>
          <div className="proof-flow-node">
            <span>{copy.reactiveStage}</span>
            <strong>{proofCounts.reactive}</strong>
          </div>
          <div className="proof-flow-arrow" aria-hidden="true">-&gt;</div>
          <div className="proof-flow-node">
            <span>{copy.destinationStage}</span>
            <strong>{proofCounts.destination}</strong>
          </div>
        </div>
      </div>
      <ul className="proof-list">
        {props.events.length === 0 ? (
          <li className="proof-empty-state">
            <span>{emptyMessage}</span>
            {props.historyDiagnostics ? <code>{props.historyDiagnostics}</code> : null}
          </li>
        ) : null}
        {props.events.map((event) => (
          <li className={`proof-item proof-item-${event.chain}`} key={event.id}>
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
      {props.events.length > 0 && props.historyDiagnostics ? (
        <p className="wallet-footnote">
          {copy.historyDiagnosticsLabel} <code>{props.historyDiagnostics}</code>
        </p>
      ) : null}
    </article>
  )
}
