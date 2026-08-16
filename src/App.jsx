import SetupCheck from './components/SetupCheck'

// Phase 1 shell. Shows whether the Supabase backend is set up correctly.
// Phase 2 replaces the body of this with the login gate.
export default function App() {
  return (
    <main className="app">
      <h1>Ticket Queue</h1>
      <p className="subtitle">Internal ticket queue for sales reps.</p>
      <SetupCheck />
    </main>
  )
}
