import { CATEGORIES, PRIORITIES, STATUSES, labelFor } from '../lib/constants'
import { ticketImages } from '../lib/ticketImages'

/**
 * The whole ticket on one screen: full description, every screenshot at full
 * width, and the status control for admins.
 *
 * The board deliberately truncates; this is where a ticket is actually read.
 */
export default function TicketDetail({ ticket, isAdmin, onStatusChange, onBack, busy }) {
  const images = ticketImages(ticket)
  const filedOn = new Date(ticket.created_at).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return (
    <article className="detail">
      <button type="button" className="tool" onClick={onBack}>
        ← Back to queue
      </button>

      <div className="detail-head">
        <span className="ticket-number">#{ticket.ticket_number}</span>
        <h2 className="detail-title">{ticket.title}</h2>
      </div>

      <div className="detail-badges">
        <span className={`badge badge-${ticket.priority}`}>
          {labelFor(PRIORITIES, ticket.priority)}
        </span>
        <span className={`badge badge-status badge-${ticket.status}`}>
          {labelFor(STATUSES, ticket.status)}
        </span>
      </div>

      <dl className="detail-facts">
        <dt>From</dt>
        <dd>{ticket.submitter_name}</dd>
        <dt>Category</dt>
        <dd>{labelFor(CATEGORIES, ticket.category)}</dd>
        <dt>Filed</dt>
        <dd>{filedOn}</dd>
      </dl>

      <h3 className="detail-section">Description</h3>
      {/* white-space: pre-wrap in CSS, so the rep's line breaks survive. */}
      <p className="detail-description">
        {ticket.description || 'No description was given.'}
      </p>

      <h3 className="detail-section">
        {images.length === 0
          ? 'Screenshots'
          : `Screenshots (${images.length})`}
      </h3>
      {images.length === 0 ? (
        <p className="subtitle">No screenshots attached.</p>
      ) : (
        <div className="detail-images">
          {images.map((url, index) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={`Screenshot ${index + 1}`} />
            </a>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="detail-actions">
          <label htmlFor="detail-status">Status</label>
          <select
            id="detail-status"
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
      )}
    </article>
  )
}
