import { CATEGORIES, PRIORITIES, STATUSES, labelFor } from '../lib/constants'

/**
 * One compact row on the board.
 *
 * Everything is one or two lines so a full queue fits on screen. The full
 * description and the full-size screenshot are one click away rather than
 * always expanded.
 */
export default function TicketCard({ ticket, isAdmin, onStatusChange, busy }) {
  const filedOn = new Date(ticket.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <li className={`ticket ticket-${ticket.status}`}>
      <div className="ticket-main">
        <div className="ticket-head">
          <span className="ticket-number">#{ticket.ticket_number}</span>
          <span className={`badge badge-${ticket.priority}`}>
            {labelFor(PRIORITIES, ticket.priority)}
          </span>
          <h3 className="ticket-title">{ticket.title}</h3>
        </div>

        <p className="ticket-meta">
          {ticket.submitter_name} · {labelFor(CATEGORIES, ticket.category)} · {filedOn}
        </p>

        {/* Clamped to two lines in CSS; the full text is in the detail view. */}
        {ticket.description && <p className="ticket-description">{ticket.description}</p>}
      </div>

      <div className="ticket-side">
        {ticket.screenshot_url && (
          <a href={ticket.screenshot_url} target="_blank" rel="noreferrer" title="Open screenshot">
            <img className="ticket-thumb" src={ticket.screenshot_url} alt="Screenshot" />
          </a>
        )}

        {isAdmin ? (
          <select
            aria-label={`Status of ticket ${ticket.ticket_number}`}
            value={ticket.status}
            onChange={(event) => onStatusChange(ticket.id, event.target.value)}
            disabled={busy}
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          // Reps see the status but cannot change it. Rendering a disabled
          // dropdown would suggest it is theirs to use once something loads.
          <span className={`badge badge-status badge-${ticket.status}`}>
            {labelFor(STATUSES, ticket.status)}
          </span>
        )}
      </div>
    </li>
  )
}
