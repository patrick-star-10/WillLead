import type { ExecutionProof } from '../types/willlead'

type ProofPanelProps = {
  events: ExecutionProof[]
}

export function ProofPanel(props: ProofPanelProps) {
  return (
    <article className="panel proof-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Activity Ledger</p>
          <p className="section-note">Three transactions that prove the wallet moved without the frontend staying online.</p>
        </div>
        <span className="status-pill status-proof">Chain Evidence</span>
      </div>
      <ul className="proof-list">
        {props.events.map((event) => (
          <li className="proof-item" key={event.id}>
            <div>
              <strong>
                {event.label} <span className={`chain-badge chain-${event.chain}`}>{event.chain}</span>
              </strong>
              <p>{event.description}</p>
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
