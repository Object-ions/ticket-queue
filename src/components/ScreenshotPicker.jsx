import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { validateImage } from '../lib/tickets'
import { ACCEPTED_IMAGE_TYPES } from '../lib/constants'
// Fabric.js is ~300 kB — most of the app's JavaScript. Loading it lazily means
// signing in and filing a text-only ticket never pays for it; the download
// starts the moment a rep actually picks a screenshot.
const ScreenshotAnnotator = lazy(() => import('./ScreenshotAnnotator'))

/**
 * Picks the optional screenshot, then hands it to the annotation canvas.
 *
 * `exportRef` is passed straight through to the annotator, which fills it with
 * a function the form calls at submit time to get the flattened PNG.
 */
export default function ScreenshotPicker({ file, onChange, exportRef, disabled }) {
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // The parent clears `file` after a successful submit. A file input keeps
    // showing the old filename unless we blank its value ourselves.
    if (!file && inputRef.current) inputRef.current.value = ''
  }, [file])

  function handleFileChange(event) {
    const picked = event.target.files?.[0]
    setError('')

    if (!picked) {
      onChange(null)
      return
    }

    const problem = validateImage(picked)
    if (problem) {
      setError(problem)
      // Clear the input so the same file can be re-picked after a fix, and so
      // the form never holds a file we already rejected.
      event.target.value = ''
      onChange(null)
      return
    }

    onChange(picked)
  }

  return (
    <>
      <label htmlFor="screenshot">Screenshot (optional)</label>
      <input
        id="screenshot"
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {error && <p className="form-error">{error}</p>}

      {/* Keyed on the file so swapping screenshots builds a fresh canvas
          instead of trying to reuse one that already holds old drawings. */}
      {file && (
        <Suspense fallback={<p className="annotator-hint">Loading the drawing tools…</p>}>
          <ScreenshotAnnotator
            key={`${file.name}-${file.lastModified}`}
            file={file}
            exportRef={exportRef}
          />
        </Suspense>
      )}
    </>
  )
}
