import { hasSupabaseConfig } from './lib/supabase'

// Phase 0 placeholder screen. Its only job is to prove the app builds and runs,
// and to tell us at a glance whether .env is filled in yet.
// Phase 2 replaces this with the login gate.
export default function App() {
  return (
    <main className="app">
      <h1>Ticket Queue</h1>
      <p className="subtitle">Internal ticket queue for sales reps.</p>

      <div className={hasSupabaseConfig ? 'status status-ok' : 'status status-warn'}>
        {hasSupabaseConfig
          ? 'Supabase environment variables are set.'
          : 'Supabase is not configured yet. Add your project URL and anon key to .env (see .env.example), then restart the dev server.'}
      </div>

      <p className="phase">Phase 0 complete — repo + tooling. Next: Phase 1, Supabase backend.</p>
    </main>
  )
}
