import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Tracks who is signed in.
 *
 * Supabase stores the login session in the browser's localStorage and refreshes
 * it automatically, so a page reload keeps you signed in. This hook does two
 * things:
 *
 *   1. Asks for the session that already exists (the reload case).
 *   2. Subscribes to future changes, so signing in or out re-renders the app
 *      without us wiring anything up by hand.
 *
 * `loading` matters: on the first render we genuinely do not know yet whether
 * there is a session. Without it, the login form would flash on screen for a
 * moment every time an already-signed-in rep opens the app.
 */
export function useSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // No client at all (env vars missing) — nothing to wait for.
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    // Cleanup: React calls this when the component unmounts. Without it we
    // would leak a listener every time the component remounts.
    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}
