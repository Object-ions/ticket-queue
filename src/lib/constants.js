/**
 * Shared option lists.
 *
 * The database stores the short `value` (e.g. 'sms_delivery') and the UI shows
 * the `label` ("SMS delivery"). Keeping both in one place means the submit form
 * (Phase 3) and the queue board (Phase 5) can never drift apart, and a typo in
 * a value can't quietly create a category nobody filters on.
 */

export const CATEGORIES = [
  { value: 'sms_delivery', label: 'SMS delivery' },
  { value: 'ai_agent', label: 'AI agent' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'data', label: 'Data' },
  { value: 'other', label: 'Other' },
]

export const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
]

// Screenshots only. Phase 4 flattens the annotated canvas to a PNG, so the
// bucket should never hold anything but images.
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

// Supabase's free tier allows far more than this; the cap is here so a rep who
// drags in a 40 MB photo gets an instant, clear error instead of a slow upload.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB
