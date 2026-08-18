import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Is the signed-in account an admin?
 *
 * Looks the account's email up in the `admins` table. This decides whether the
 * board shows a status dropdown or a plain status badge.
 *
 * It is a UI convenience, NOT the security boundary. Anyone can edit the
 * JavaScript in their browser to make this return true; what actually stops a
 * rep changing a status is the RLS policy on `tickets`, which calls the same
 * table from inside the database and rejects the write.
 */
export function useIsAdmin(email) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      // `maybeSingle` returns null instead of erroring when there is no row,
      // which is the normal case for a rep.
      const { data } = await supabase
        .from('admins')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (cancelled) return
      setIsAdmin(Boolean(data))
      setChecked(true)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [email])

  return { isAdmin, checked }
}
