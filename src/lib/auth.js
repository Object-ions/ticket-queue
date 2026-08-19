// The domain every team login sits on. Reps type a username; this is what gets
// appended to make the email address Supabase Auth actually needs.
//
// Not a secret — it is just the address the shared account was created under.
export const LOGIN_DOMAIN = 'morflorida.com'

/**
 * Turn what someone typed into the email Supabase expects.
 *
 * Supabase's password auth has no concept of a username — the identifier is
 * always an email. Rather than make reps type `all@morflorida.com` every time,
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
