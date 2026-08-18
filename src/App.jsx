import { hasSupabaseConfig } from './lib/supabase'
import { useSession } from './lib/useSession'
import SetupCheck from './components/SetupCheck'
import Login from './components/Login'
import Header from './components/Header'

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
      <main className="app">
        <h2>Signed in</h2>
        <div className="status status-ok">
          Auth is working. Next: Phase 3 — the ticket submit form.
        </div>
        <p className="phase">
          Reload the page — you should stay signed in.
        </p>
      </main>
    </>
  )
}
