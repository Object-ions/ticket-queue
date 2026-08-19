import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { LOGIN_DOMAIN, usernameToEmail } from '../lib/auth'

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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    // Stop the browser's default behaviour of reloading the page on submit.
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      // Supabase authenticates on an email, so a bare username is expanded to
      // one here. Typing the full address still works.
      email: usernameToEmail(username),
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
        <label htmlFor="username">Username</label>
        <input
          id="username"
          // Deliberately type="text", not "email": what's typed here usually
          // isn't a valid email, and the browser would refuse to submit it.
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={`e.g. all (for all@${LOGIN_DOMAIN})`}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck="false"
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

      <p className="phase">
        Just your username — the <code>@{LOGIN_DOMAIN}</code> part is added for
        you. Ask the admin for the team credentials.
      </p>
    </main>
  )
}
