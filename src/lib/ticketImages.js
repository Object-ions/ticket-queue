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
