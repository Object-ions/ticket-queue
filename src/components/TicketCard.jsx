import { CATEGORIES, PRIORITIES, STATUSES, labelFor } from '../lib/constants'
import { ticketImages } from '../lib/ticketImages'

/**
 * One compact row on the board.
 *
 * Everything is one or two lines so a full queue fits on screen. The full
 * description and the full-size screenshot are one click away rather than
 * always expanded.
 */
export default function TicketCard({ ticket, isAdmin, onOpen, onStatusChange, busy }) {
  const images = ticketImages(ticket)
  const filedOn = new Date(ticket.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <li className={`ticket ticket-${ticket.status}`}>
      {/* The row body opens the ticket; the controls on the right are outside
          this button so clicking the status dropdown doesn't also navigate. */}
      <button type="button" className="ticket-main" onClick={() => onOpen(ticket.id)}>
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
      </button>

      <div className="ticket-side">
        {images.length > 0 && (
          <button
            type="button"
            className="thumb-button"
            onClick={() => onOpen(ticket.id)}
            title={`${images.length} screenshot${images.length > 1 ? 's' : ''}`}
          >
            <img className="ticket-thumb" src={images[0]} alt="Screenshot" />
            {images.length > 1 && <span className="thumb-count">{images.length}</span>}
          </button>
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
