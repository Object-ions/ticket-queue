import { useEffect, useRef, useState } from 'react'
import { validateImage } from '../lib/tickets'
import { ACCEPTED_IMAGE_TYPES } from '../lib/constants'

/**
 * File input + thumbnail preview for the optional screenshot.
 *
 * Kept separate from the form because Phase 4 replaces this preview with a
 * Fabric.js drawing canvas — isolating it now means that change touches one
 * small file instead of the whole form.
 */
export default function ScreenshotPicker({ file, onChange, disabled }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  // createObjectURL hands out a URL backed by browser memory. It must be
  // revoked when the file changes or the component unmounts, or every picked
  // image stays in memory for the life of the page.
  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      // The parent clears `file` after a successful submit. A file input keeps
      // showing the old filename unless we blank its value ourselves.
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
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
      // Clear the input so the same bad file can be re-picked after a fix,
      // and so the form never holds a file we already rejected.
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

      {previewUrl && (
        <img className="screenshot-preview" src={previewUrl} alt="Screenshot preview" />
      )}
    </>
  )
}
