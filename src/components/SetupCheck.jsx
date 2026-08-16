import { useEffect, useState } from 'react'
import { hasSupabaseConfig } from '../lib/supabase'
import { checkDatabase, checkStorage } from '../lib/setupCheck'

// Phase 1 screen: runs the three setup checks and shows the results.
// This is scaffolding to prove the backend is wired up — Phase 2 replaces it
// with the login gate.

const PENDING = { state: 'pending', message: 'Checking…' }

export default function SetupCheck() {
  const [env, setEnv] = useState(PENDING)
  const [database, setDatabase] = useState(PENDING)
  const [storage, setStorage] = useState(PENDING)

  // The empty dependency array means "run once, after the first render".
  useEffect(() => {
    setEnv(
      hasSupabaseConfig
        ? { state: 'ok', message: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.' }
        : {
            state: 'warn',
            message:
              'Not set. Copy your Project URL and anon key into .env, then RESTART the dev server — Vite only reads .env at startup.',
          }
    )

    // Both checks are independent, so let them run at the same time rather
    // than making one wait for the other.
    checkDatabase().then(setDatabase)
    checkStorage().then(setStorage)
  }, [])

  const checks = [
    { label: '1. Environment variables', result: env },
    { label: '2. Database — tickets table + RLS', result: database },
    { label: '3. Storage — ticket-screenshots bucket', result: storage },
  ]

  const allGood = checks.every((check) => check.result.state === 'ok')

  return (
    <section>
      <h2>Phase 1 setup check</h2>
      <ul className="check-list">
        {checks.map((check) => (
          <li key={check.label} className={`check check-${check.result.state}`}>
            <span className="check-icon" aria-hidden="true">
              {ICONS[check.result.state]}
            </span>
            <div>
              <strong>{check.label}</strong>
              <p>{check.result.message}</p>
            </div>
          </li>
        ))}
      </ul>

      {allGood && (
        <div className="status status-ok">
          Backend is ready. Next: Phase 2 — shared team login.
        </div>
      )}
    </section>
  )
}

const ICONS = {
  pending: '…',
  ok: '✓',
  warn: '!',
  error: '✕',
}
