// The domain every team login sits on. Reps type a username; this is what gets
// appended to make the email address Supabase Auth actually needs.
//
// Not a secret — it is just the address accounts are created under. Set to
// joemarketing11.com (not the client's own domain) because this app is meant
// to serve several clients, each with their own account — a client-specific
// domain wouldn't make sense once a second client is added.
export const LOGIN_DOMAIN = 'joemarketing11.com'

/**
 * Turn what someone typed into the email Supabase expects.
 *
 * Supabase's password auth has no concept of a username — the identifier is
 * always an email. Rather than make reps type `all@joemarketing11.com` every time,
 * the form asks for a username and this fills in the rest.
 *
 * Anything containing an "@" is passed through untouched, so an account on a
 * different domain (the admin's Gmail address, for instance) still works.
 */
export function usernameToEmail(input) {
  const trimmed = input.trim()
  if (trimmed.includes('@')) return trimmed
  return `${trimmed.toLowerCase()}@${LOGIN_DOMAIN}`
}
