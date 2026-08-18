import { useEffect, useRef, useState } from 'react'
import { createTicket, fetchReps } from '../lib/tickets'
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
  const [files, setFiles] = useState([])
  const [reps, setReps] = useState([])
  // File -> { current: exportFunction }. Each annotator fills its own entry in
  // with a function that flattens that image and its drawings into one PNG.
  const exportRefs = useRef(new Map())

  useEffect(() => {
    // A failure here is not worth blocking the form over: the name field falls
    // back to free text, which is how it worked before the list existed.
    fetchReps()
      .then(setReps)
      .catch(() => setReps([]))
  }, [])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successNumber, setSuccessNumber] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccessNumber(null)
    setSubmitting(true)

    try {
      // Upload the flattened PNGs (screenshot + drawings) rather than the files
      // the rep chose. Falling back to the raw file means a canvas that failed
      // to build costs the annotations, not the whole ticket.
      const uploads = await Promise.all(
        files.map((file) => {
          const exportImage = exportRefs.current.get(file)?.current
          return exportImage ? exportImage() : file
        }),
      )

      const ticketNumber = await createTicket({
        submitterName,
        title,
        description,
        category,
        priority,
        files: uploads,
      })

      localStorage.setItem(NAME_KEY, submitterName.trim())
      setSuccessNumber(ticketNumber)

      // Clear the ticket fields but keep the name — the same rep is likely to
      // file the next one, and retyping it every time is friction for nothing.
      setTitle('')
      setDescription('')
      setCategory('other')
      setPriority('normal')
      setFiles([])
      exportRefs.current.clear()
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
        {reps.length > 0 ? (
          <select
            id="submitterName"
            value={submitterName}
            onChange={(event) => setSubmitterName(event.target.value)}
            required
          >
            {/* An empty first option forces a deliberate choice: without it the
                first rep in the list would be silently credited with the ticket. */}
            <option value="">Select your name…</option>
            {reps.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="submitterName"
            value={submitterName}
            onChange={(event) => setSubmitterName(event.target.value)}
            placeholder="e.g. Jordan"
            autoComplete="name"
            required
          />
        )}

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

        <ScreenshotPicker
          files={files}
          onChange={setFiles}
          exportRefs={exportRefs}
          disabled={submitting}
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit ticket'}
        </button>
      </form>
    </>
  )
}
