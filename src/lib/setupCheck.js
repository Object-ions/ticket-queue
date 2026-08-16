import { supabase, hasSupabaseConfig, SUPABASE_URL, SCREENSHOT_BUCKET } from './supabase'

// Phase 1 verification helpers.
//
// These answer one question: "did the Supabase dashboard setup actually work?"
// They run with the anon key and NOBODY logged in, which is exactly the state
// the app is in before Phase 2 adds login. That matters for reading the
// results below — see the comments on each check.
//
// Each check returns { state, message } where state is 'ok' | 'warn' | 'error'.

/**
 * Does the `tickets` table exist, and is RLS switched on?
 *
 * We ask for zero rows (`head: true` sends no body back) and just read the
 * count. Three outcomes, and they tell us different things:
 *
 *  - Error saying the table is missing  -> the schema SQL was never run.
 *  - No error, count of 0               -> the table exists AND RLS is doing
 *                                          its job. We are not logged in, so
 *                                          the "authenticated can read" policy
 *                                          does not match us and Postgres
 *                                          hides every row. An empty result
 *                                          here is the SUCCESS case.
 *  - No error, count above 0            -> the table exists but rows are
 *                                          visible to a logged-out visitor,
 *                                          which means RLS is off or a policy
 *                                          is too loose. That is a real
 *                                          problem on a public repo.
 */
export async function checkDatabase() {
  if (!hasSupabaseConfig) {
    return { state: 'warn', message: 'Skipped — .env is not filled in yet.' }
  }

  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })

  if (error) {
    // PostgREST reports an unknown table as 42P01 (Postgres) or PGRST205
    // (the table is missing from PostgREST's schema cache).
    const missing =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      /could not find the table|does not exist/i.test(error.message)

    if (missing) {
      return {
        state: 'error',
        message: 'The `tickets` table was not found. Run supabase/schema.sql in the Supabase SQL Editor.',
      }
    }
    return { state: 'error', message: `Unexpected error: ${error.message}` }
  }

  if (count > 0) {
    return {
      state: 'error',
      message: `The table exists, but ${count} row(s) are readable while logged OUT. RLS is not protecting the table — re-run the policy section of supabase/schema.sql.`,
    }
  }

  return {
    state: 'ok',
    message: 'The `tickets` table exists and RLS is blocking logged-out reads, exactly as intended.',
  }
}

/**
 * Does the `ticket-screenshots` bucket exist and is it public?
 *
 * We deliberately request a file we know is not there. A public bucket answers
 * "Object not found"; a bucket that does not exist answers "Bucket not found".
 * The difference in that error message is the whole test — and it needs no
 * login, which is why we use a plain fetch instead of the client library.
 */
export async function checkStorage() {
  if (!hasSupabaseConfig) {
    return { state: 'warn', message: 'Skipped — .env is not filled in yet.' }
  }

  const probeUrl = `${SUPABASE_URL}/storage/v1/object/public/${SCREENSHOT_BUCKET}/__setup_check__.png`

  try {
    const response = await fetch(probeUrl)
    const body = await response.text()

    if (/bucket not found/i.test(body)) {
      return {
        state: 'error',
        message: `No bucket named "${SCREENSHOT_BUCKET}". Create it in Supabase -> Storage.`,
      }
    }

    // "Object not found" means the bucket is there and serving public reads.
    if (response.status === 404 || /not_found|object not found/i.test(body)) {
      return {
        state: 'ok',
        message: `The "${SCREENSHOT_BUCKET}" bucket exists and is publicly readable.`,
      }
    }

    return {
      state: 'warn',
      message: `Unexpected response from Storage (HTTP ${response.status}). The bucket may not be set to public.`,
    }
  } catch {
    return { state: 'error', message: 'Could not reach Supabase Storage. Check VITE_SUPABASE_URL.' }
  }
}
