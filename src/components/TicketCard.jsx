import { CATEGORIES, STATUSES, labelFor } from '../lib/constants'

/**
 * One ticket on the board: who filed it, what it is, and a dropdown to move it
 * along. The screenshot is shown as a thumbnail that opens full size in a new
 * tab — Phase 6 replaces that with a proper detail view.
 */
export default function TicketCard({ ticket, onStatusChange, busy }) {
  const filedOn = new Date(ticket.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <li className={`ticket ticket-${ticket.status}`}>
      <div className="ticket-head">
        <span className="ticket-number">#{ticket.ticket_number}</span>
        <h3 className="ticket-title">{ticket.title}</h3>
        {ticket.priority === 'urgent' && <span className="badge badge-urgent">Urgent</span>}
      </div>

      <p className="ticket-meta">
        {ticket.submitter_name} · {labelFor(CATEGORIES, ticket.category)} · {filedOn}
      </p>

      {ticket.description && <p className="ticket-description">{ticket.description}</p>}

      {ticket.screenshot_url && (
        <a href={ticket.screenshot_url} target="_blank" rel="noreferrer">
          <img className="ticket-thumb" src={ticket.screenshot_url} alt="Ticket screenshot" />
        </a>
      )}

      <div className="ticket-actions">
        <label htmlFor={`status-${ticket.id}`} className="ticket-status-label">
          Status
        </label>
        <select
          id={`status-${ticket.id}`}
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
      </div>
    </li>
  )
}
