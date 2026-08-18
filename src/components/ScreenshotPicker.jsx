import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { validateImage } from '../lib/tickets'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES } from '../lib/constants'

// Fabric.js is ~288 kB — most of the app's JavaScript. Loading it lazily means
// signing in and filing a text-only ticket never pays for it; the download
// starts the moment a rep actually picks a screenshot.
const ScreenshotAnnotator = lazy(() => import('./ScreenshotAnnotator'))

/**
 * Picks up to MAX_IMAGES screenshots and hands each one its own drawing canvas.
 *
 * Only the selected image is visible, but every canvas stays mounted behind it.
 * That is deliberate: unmounting a Fabric canvas destroys its drawings, so
 * switching between screenshots would quietly erase your work.
 *
 * `exportRefs` is a ref holding a Map of File -> { current: exportFunction }.
 * Each image gets its own entry, created once and reused, and the form reads
 * them back in order at submit time.
 */
export default function ScreenshotPicker({ files, onChange, exportRefs, disabled }) {
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  /**
   * The stable ref object for one image.
   *
   * "Stable" is the whole point. The annotator rebuilds its canvas whenever the
   * ref it was given changes identity, so handing it a fresh `{ current: null }`
   * on every render would wipe the rep's drawings each time they typed a
   * character in the title field. Keyed by the File itself, which React keeps
   * as the same object for as long as it is in state.
   */
  function refFor(file) {
    if (!exportRefs.current.has(file)) exportRefs.current.set(file, { current: null })
    return exportRefs.current.get(file)
  }

  useEffect(() => {
    // The parent clears the files after a successful submit. A file input keeps
    // showing the old filename unless we blank its value ourselves.
    if (files.length === 0) {
      if (inputRef.current) inputRef.current.value = ''
      setActiveIndex(0)
    }
  }, [files])

  function handleFileChange(event) {
    const picked = Array.from(event.target.files ?? [])
    setError('')
    event.target.value = ''
    if (picked.length === 0) return

    const room = MAX_IMAGES - files.length
    if (room <= 0) {
      setError(`You can attach up to ${MAX_IMAGES} screenshots.`)
      return
    }

    const accepted = []
    for (const file of picked.slice(0, room)) {
      const problem = validateImage(file)
      // One bad file shouldn't discard the good ones picked alongside it.
      if (problem) setError(problem)
      else accepted.push(file)
    }

    if (picked.length > room) {
      setError(`Only the first ${room} were added — the limit is ${MAX_IMAGES}.`)
    }

    if (accepted.length > 0) {
      onChange([...files, ...accepted])
      setActiveIndex(files.length)
    }
  }

  function removeAt(index) {
    exportRefs.current.delete(files[index])
    onChange(files.filter((_, i) => i !== index))
    setActiveIndex((current) => Math.max(0, current > index ? current - 1 : current))
  }

  return (
    <>
      <label htmlFor="screenshot">
        Screenshots (optional, up to {MAX_IMAGES})
      </label>
      <input
        id="screenshot"
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        onChange={handleFileChange}
        disabled={disabled || files.length >= MAX_IMAGES}
      />

      {error && <p className="form-error">{error}</p>}

      {files.length > 1 && (
        <div className="shot-tabs">
          {files.map((file, index) => (
            <button
              key={`${file.name}-${file.lastModified}-${index}`}
              type="button"
              className={`tool ${index === activeIndex ? 'tool-active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              Image {index + 1}
            </button>
          ))}
        </div>
      )}

      {files.map((file, index) => (
        // Hidden rather than unmounted — see the note above about losing marks.
        <div
          key={`${file.name}-${file.lastModified}-${index}`}
          hidden={index !== activeIndex}
        >
          <Suspense fallback={<p className="annotator-hint">Loading the drawing tools…</p>}>
            <ScreenshotAnnotator file={file} exportRef={refFor(file)} />
          </Suspense>
          <button type="button" className="tool" onClick={() => removeAt(index)}>
            Remove this image
          </button>
        </div>
      ))}
    </>
  )
}
