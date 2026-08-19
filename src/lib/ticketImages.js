import { SCREENSHOT_BUCKET } from './supabase'

/**
 * Every image on a ticket, oldest column first.
 *
 * Tickets filed before multiple screenshots existed have their one image in
 * `screenshot_url`; everything since uses the `screenshot_urls` array. Reading
 * both here means no component has to know that history — and it means the
 * three tickets already in the queue keep working.
 */
export function ticketImages(ticket) {
  if (ticket.screenshot_urls?.length > 0) return ticket.screenshot_urls
  return ticket.screenshot_url ? [ticket.screenshot_url] : []
}

/**
 * Turn a public screenshot URL back into its path inside the bucket.
 *
 * Storage deletes take the object's path ('abc-123.png'), but the ticket row
 * only stores the full public URL. Everything after the bucket name is the
 * path.
 *
 * Returns null for anything that isn't a URL in our bucket, so a hand-edited
 * or foreign URL is skipped rather than producing a nonsense delete.
 */
export function storagePathFromUrl(url) {
  const marker = `/${SCREENSHOT_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return url.slice(index + marker.length)
}
