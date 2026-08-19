import { useEffect, useState } from 'react'
import { deleteTicket, fetchTickets, updateTicketStatus } from '../lib/tickets'
import { ARCHIVED, STATUSES, isActive } from '../lib/constants'
import { useIsAdmin } from '../lib/useIsAdmin'
import TicketCard from './TicketCard'
import TicketDetail from './TicketDetail'

// 'all' is a UI-only value; it is never stored on a ticket. Note that "All"
// means all *active* tickets — archived ones are deliberately out of the way,
// which is the whole point of archiving.
const FILTERS = [{ value: 'all', label: 'All' }, ...STATUSES]

function matchesFilter(ticket, filter) {
  if (filter === 'all') return isActive(ticket)
  return ticket.status === filter
}

export default function QueueBoard({ email }) {
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Which ticket is mid-save, so only that card's dropdown is disabled.
  const [savingId, setSavingId] = useState(null)
  const { isAdmin } = useIsAdmin(email)
  // The ticket being read in full, by id. null means show the list.
  const [openId, setOpenId] = useState(null)

  async function load() {
    setError('')
    try {
      setTickets(await fetchTickets())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(ticket) {
    setSavingId(ticket.id)
    setError('')

    try {
      await deleteTicket(ticket)
      // Drop it from the list and go back — the detail view it was open in no
      // longer has a ticket to show.
      setTickets((current) => current.filter((row) => row.id !== ticket.id))
      setOpenId(null)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSavingId(null)
    }
  }

  async function handleStatusChange(id, status) {
    setSavingId(id)
    setError('')

    // Update the screen first so the dropdown responds immediately, then save.
    const previous = tickets
    setTickets((current) =>
      current.map((ticket) => (ticket.id === id ? { ...ticket, status } : ticket)),
    )

    try {
      await updateTicketStatus(id, status)
    } catch (saveError) {
      // The save failed, so put the old list back rather than leaving the board
      // showing a status the database doesn't have.
      setTickets(previous)
      setError(saveError.message)
    } finally {
      setSavingId(null)
    }
  }

  const visible = tickets.filter((ticket) => matchesFilter(ticket, filter))

  // Looked up rather than stored, so a status change updates the open ticket too.
  const openTicket = tickets.find((ticket) => ticket.id === openId)

  if (openTicket) {
    return (
      <>
        {error && <p className="form-error">{error}</p>}
        <TicketDetail
          ticket={openTicket}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onBack={() => setOpenId(null)}
          busy={savingId === openTicket.id}
        />
      </>
    )
  }

  return (
    <>
      <div className="board-head">
        <h2>Queue</h2>
        <div className="board-actions">
          {isAdmin && <span className="badge badge-admin">Admin</span>}
          <button type="button" className="tool" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="toolbar-group filters">
        {FILTERS.map((option) => {
          const count = tickets.filter((ticket) => matchesFilter(ticket, option.value)).length
          return (
            <button
              key={option.value}
              type="button"
              className={`tool ${filter === option.value ? 'tool-active' : ''}`}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
            >
              {option.label} ({count})
            </button>
          )
        })}
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p className="subtitle">Loading tickets…</p>
      ) : visible.length === 0 ? (
        <p className="subtitle">
          {tickets.length === 0
            ? 'No tickets yet.'
            : filter === ARCHIVED
              ? 'Nothing archived.'
              : 'No tickets with that status.'}
        </p>
      ) : (
        <ul className="ticket-list">
          {visible.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isAdmin={isAdmin}
              onOpen={setOpenId}
              onStatusChange={handleStatusChange}
              busy={savingId === ticket.id}
            />
          ))}
        </ul>
      )}
    </>
  )
}
