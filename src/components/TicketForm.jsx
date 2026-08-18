import { useState } from 'react'
import { createTicket } from '../lib/tickets'
import { CATEGORIES, PRIORITIES } from '../lib/constants'
import ScreenshotPicker from './ScreenshotPicker'

// The login is shared, so the database can't tell reps apart — the name field
// is the only attribution we get. Remembering it locally means a rep types it
// once on their own machine instead of on every ticket.
const NAME_KEY = 'ticketQueue.submitterName'

export default function TicketForm() {
  const [submitterName, setSubmitterName] = useState(
    () => localStorage.getItem(NAME_KEY) || '',
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [priority, setPriority] = useState('normal')
  const [file, setFile] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successNumber, setSuccessNumber] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccessNumber(null)
    setSubmitting(true)

    try {
      const ticketNumber = await createTicket({
        submitterName,
        title,
        description,
        category,
        priority,
        file,
      })

      localStorage.setItem(NAME_KEY, submitterName.trim())
      setSuccessNumber(ticketNumber)

      // Clear the ticket fields but keep the name — the same rep is likely to
      // file the next one, and retyping it every time is friction for nothing.
      setTitle('')
      setDescription('')
      setCategory('other')
      setPriority('normal')
      setFile(null)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      // `finally` so the button is re-enabled whether we succeeded or failed —
      // otherwise a failed submit would leave the form stuck on "Submitting…".
      setSubmitting(false)
    }
  }

  return (
    <>
      <h2>Submit a ticket</h2>

      {successNumber !== null && (
        <div className="status status-ok submit-success">
          Ticket #{successNumber} submitted. The admin can see it in the queue.
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="submitterName">Your name</label>
        <input
          id="submitterName"
          value={submitterName}
          onChange={(event) => setSubmitterName(event.target.value)}
          placeholder="e.g. Jordan"
          autoComplete="name"
          required
        />

        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Short summary of the problem"
          maxLength={120}
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What happened? Which contact or pipeline? What did you expect?"
          rows={5}
        />

        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          {PRIORITIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ScreenshotPicker file={file} onChange={setFile} disabled={submitting} />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit ticket'}
        </button>
      </form>
    </>
  )
}
