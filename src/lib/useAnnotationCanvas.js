import { useEffect, useRef, useState } from 'react'
import { Canvas, FabricImage, PencilBrush } from 'fabric'
import {
  ANNOTATION_COLOR,
  STROKE_WIDTH,
  canvasToPngFile,
  fitToWidth,
  makeArrow,
  makeRect,
  placeBackground,
  resizeRect,
} from './annotator'

// Matches the .card width in index.css. The canvas is drawn at this size and
// exported back at the screenshot's real resolution.
const MAX_CANVAS_WIDTH = 560

/**
 * Owns the Fabric canvas: builds it from the chosen file, wires the mouse
 * handlers, and exposes undo/clear plus the current tool.
 *
 * This lives in a hook rather than the component because Fabric is imperative
 * and long-winded — keeping it here leaves ScreenshotAnnotator as a short,
 * readable piece of JSX.
 *
 * `exportRef` is the handoff to the form: we hang an async function off it that
 * flattens the canvas to a PNG File. Pushing a new PNG into React state on
 * every brush stroke would be far more expensive and buys nothing.
 */
export function useAnnotationCanvas(file, exportRef) {
  const canvasElRef = useRef(null)
  const fabricRef = useRef(null)
  // The mouse handlers are registered once, but need the *current* tool.
  // Reading it from a ref avoids rebinding every handler on each change.
  const toolRef = useRef('pen')

  const [tool, setTool] = useState('pen')
  const [canUndo, setCanUndo] = useState(false)

  useEffect(() => {
    let cancelled = false
    let canvas = null
    const objectUrl = URL.createObjectURL(file)

    async function build() {
      const image = await FabricImage.fromURL(objectUrl)
      // The rep may have swapped the file while the image was decoding.
      if (cancelled) return

      const { width, height, exportMultiplier } = fitToWidth(
        image.width,
        image.height,
        MAX_CANVAS_WIDTH,
      )

      canvas = new Canvas(canvasElRef.current, {
        width,
        height,
        // Nothing here is meant to be dragged after it's drawn, so selection is
        // off — otherwise a stray click picks a shape up and moves it.
        selection: false,
      })
      fabricRef.current = canvas

      placeBackground(canvas, image, width)

      // Fabric v6+ no longer creates a brush for you.
      const brush = new PencilBrush(canvas)
      brush.color = ANNOTATION_COLOR
      brush.width = STROKE_WIDTH
      canvas.freeDrawingBrush = brush
      canvas.isDrawingMode = toolRef.current === 'pen'

      let start = null
      let shape = null

      canvas.on('mouse:down', (event) => {
        if (canvas.isDrawingMode) return
        start = canvas.getScenePoint(event.e)
        if (toolRef.current === 'box') {
          shape = makeRect(start.x, start.y)
          canvas.add(shape)
        }
      })

      canvas.on('mouse:move', (event) => {
        if (!start) return
        const point = canvas.getScenePoint(event.e)

        if (toolRef.current === 'box') {
          resizeRect(shape, point.x, point.y, start.x, start.y)
        } else {
          // An arrow's head angle depends on both ends, so there's nothing to
          // resize in place — the preview is rebuilt on each move instead.
          if (shape) canvas.remove(shape)
          shape = makeArrow(start.x, start.y, point.x, point.y)
          canvas.add(shape)
        }
        canvas.renderAll()
      })

      canvas.on('mouse:up', () => {
        // A click with no drag leaves a zero-size box behind; drop it.
        if (shape && toolRef.current === 'box' && (shape.width < 2 || shape.height < 2)) {
          canvas.remove(shape)
        }
        start = null
        shape = null
        setCanUndo(canvas.getObjects().length > 0)
      })

      // Freehand strokes are added by the brush, not by our handlers.
      canvas.on('path:created', () => setCanUndo(true))

      exportRef.current = () =>
        canvasToPngFile(canvas, exportMultiplier, 'annotated-screenshot.png')
    }

    build()

    return () => {
      cancelled = true
      // dispose() removes Fabric's own DOM wrapper and listeners. Without it,
      // picking a second screenshot stacks a dead canvas under the new one.
      canvas?.dispose()
      fabricRef.current = null
      exportRef.current = null
      URL.revokeObjectURL(objectUrl)
      setCanUndo(false)
    }
  }, [file, exportRef])

  function selectTool(next) {
    setTool(next)
    toolRef.current = next
    const canvas = fabricRef.current
    if (canvas) canvas.isDrawingMode = next === 'pen'
  }

  function undo() {
    const canvas = fabricRef.current
    if (!canvas) return
    const objects = canvas.getObjects()
    if (objects.length === 0) return
    canvas.remove(objects[objects.length - 1])
    canvas.renderAll()
    setCanUndo(canvas.getObjects().length > 0)
  }

  function clearAll() {
    const canvas = fabricRef.current
    if (!canvas) return
    // Removing the objects, not canvas.clear() — clear() would wipe the
    // background screenshot too.
    canvas.remove(...canvas.getObjects())
    canvas.renderAll()
    setCanUndo(false)
  }

  return { canvasElRef, tool, selectTool, canUndo, undo, clearAll }
}
