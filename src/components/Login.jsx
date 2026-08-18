import { useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * The shared team login.
 *
 * Everyone on the team signs in with the SAME email and password — there are no
 * individual accounts. That is a deliberate trade-off for a ~10-person internal
 * tool: no user management, no invites, no password resets. The cost is that
 * the database cannot tell reps apart, which is why the submit form (Phase 3)
 * asks for "Your name".
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    // Stop the browser's default behaviour of reloading the page on submit.
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      // Supabase returns a deliberately vague message for bad credentials so it
      // cannot be used to discover which emails exist. We pass it straight
      // through rather than inventing a friendlier but misleading one.
      setError(signInError.message)
      setSubmitting(false)
      return
    }

    // On success we do nothing else. The onAuthStateChange listener in
    // useSession fires, App re-renders, and the queue appears.
  }

  return (
    <main className="app app-narrow">
      <h1>Ticket Queue</h1>
      <p className="subtitle">Sign in with the shared team login.</p>

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="phase">Ask the admin for the team credentials.</p>
    </main>
  )
}
