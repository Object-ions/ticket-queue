import { useState } from 'react'
import { hasSupabaseConfig } from './lib/supabase'
import { useSession } from './lib/useSession'
import SetupCheck from './components/SetupCheck'
import Login from './components/Login'
import Header from './components/Header'
import TicketForm from './components/TicketForm'
import QueueBoard from './components/QueueBoard'

/**
 * The auth gate. Nothing in this app renders until there is a valid session.
 *
 * Note this is a convenience, not the security boundary — someone could edit
 * the JavaScript in their browser to skip past it. The real protection is the
 * RLS policies in supabase/schema.sql, which reject unauthenticated requests at
 * the database. This gate just means reps see the right screen.
 */
export default function App() {
  const { session, loading } = useSession()
  const [view, setView] = useState('submit')

  // Env vars missing (usually a fresh clone, or a deploy without env vars set).
  // Show the Phase 1 diagnostics instead of a broken login form.
  if (!hasSupabaseConfig) {
    return (
      <main className="app">
        <h1>Ticket Queue</h1>
        <SetupCheck />
      </main>
    )
  }

  if (loading) {
    return (
      <main className="app">
        <p className="subtitle">Loading…</p>
      </main>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <>
      <Header email={session.user.email} />
      <main className="app app-wide">
        <nav className="tabs">
          <button
            type="button"
            className={`tool ${view === 'submit' ? 'tool-active' : ''}`}
            onClick={() => setView('submit')}
          >
            Submit a ticket
          </button>
          <button
            type="button"
            className={`tool ${view === 'queue' ? 'tool-active' : ''}`}
            onClick={() => setView('queue')}
          >
            Queue
          </button>
        </nav>

        {/* Swapping views unmounts the other one. That is deliberate for the
            board: coming back to it remounts and refetches, so a ticket you
            just submitted is there without a manual refresh. */}
        {view === 'submit' ? <TicketForm /> : <QueueBoard />}
      </main>
    </>
  )
}
