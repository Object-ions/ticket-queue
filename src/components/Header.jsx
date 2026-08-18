import { supabase } from '../lib/supabase'

/**
 * Top bar for the signed-in app: title on the left, sign out on the right.
 *
 * Signing out clears the stored session, which makes onAuthStateChange fire and
 * sends the user back to the login screen. We do not need to redirect by hand.
 */
export default function Header({ email }) {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <header className="header">
      <div>
        <strong>Ticket Queue</strong>
        {/* Shared login, so this is the team account, not a person. */}
        {email && <span className="header-email">{email}</span>}
      </div>
      <button type="button" className="button-quiet" onClick={handleSignOut}>
        Sign out
      </button>
    </header>
  )
}
