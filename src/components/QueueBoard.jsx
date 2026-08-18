import { useEffect, useState } from 'react'
import { fetchTickets, updateTicketStatus } from '../lib/tickets'
import { STATUSES } from '../lib/constants'
import TicketCard from './TicketCard'

// 'all' is a UI-only value; it is never stored on a ticket.
const FILTERS = [{ value: 'all', label: 'All' }, ...STATUSES]

export default function QueueBoard() {
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Which ticket is mid-save, so only that card's dropdown is disabled.
  const [savingId, setSavingId] = useState(null)

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

  const visible =
    filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter)

  return (
    <>
      <div className="board-head">
        <h2>Queue</h2>
        <button type="button" className="tool" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="toolbar-group filters">
        {FILTERS.map((option) => {
          const count =
            option.value === 'all'
              ? tickets.length
              : tickets.filter((ticket) => ticket.status === option.value).length
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
          {tickets.length === 0 ? 'No tickets yet.' : 'No tickets with that status.'}
        </p>
      ) : (
        <ul className="ticket-list">
          {visible.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onStatusChange={handleStatusChange}
              busy={savingId === ticket.id}
            />
          ))}
        </ul>
      )}
    </>
  )
}
