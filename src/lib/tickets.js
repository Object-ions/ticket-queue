import { supabase, SCREENSHOT_BUCKET } from './supabase'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from './constants'

/**
 * Everything that talks to the tickets table or the screenshot bucket lives
 * here, so components stay about the UI and the Supabase calls stay testable
 * and in one place.
 */

/**
 * Check a file before we try to upload it. Returns an error string, or '' if
 * the file is fine. Doing this in the browser is about giving a fast, clear
 * message — the real limits are enforced by Supabase Storage on the server.
 */
export function validateImage(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'That file is not an image. Please attach a PNG, JPEG, WebP or GIF.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `That image is ${mb} MB. Please keep screenshots under 10 MB.`
  }
  return ''
}

/**
 * Upload one image and return its public URL.
 *
 * The filename is a random UUID, never the rep's original filename. Original
 * names can contain spaces, accents and slashes that break URLs, and can leak
 * information ("client-complaint-acme-corp.png"). The extension is kept only so
 * the browser knows how to render it.
 */
async function uploadScreenshot(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, file, { contentType: file.type })

  if (error) throw new Error(`Screenshot upload failed: ${error.message}`)

  // The bucket is public, so this URL needs no signing and never expires.
  const { data } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Create a ticket. Uploads the screenshot first (if there is one), then inserts
 * the row carrying the resulting URL.
 *
 * Order matters: the row must never point at a file that failed to upload. The
 * trade-off is that if the INSERT fails after a successful upload we leave an
 * orphaned file in the bucket. That is the cheaper failure — a stray image
 * costs a few KB, a broken image link in the queue costs the admin real time.
 *
 * Returns the new ticket's number (#1, #2, …) for the success message.
 */
export async function createTicket({
  submitterName,
  title,
  description,
  category,
  priority,
  file,
}) {
  const screenshotUrl = file ? await uploadScreenshot(file) : null

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      submitter_name: submitterName.trim(),
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      screenshot_url: screenshotUrl,
      // `status` is deliberately not set — the column defaults to 'new'.
    })
    // Without .select() Supabase returns nothing on insert, and we need the
    // database-generated ticket_number to show the rep.
    .select('ticket_number')
    .single()

  if (error) throw new Error(`Could not save the ticket: ${error.message}`)

  return data.ticket_number
}

/**
 * Every ticket, newest first.
 *
 * No `.eq('status', …)` here — the board filters in memory. With a handful of
 * reps the whole table is small, and filtering locally means clicking between
 * All / New / Resolved is instant instead of a round trip each time.
 */
export async function fetchTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Could not load tickets: ${error.message}`)
  return data
}

/** Move a ticket along: new -> in_progress -> resolved (or back). */
export async function updateTicketStatus(id, status) {
  const { error } = await supabase.from('tickets').update({ status }).eq('id', id)
  if (error) throw new Error(`Could not update the ticket: ${error.message}`)
}
