import { useAnnotationCanvas } from '../lib/useAnnotationCanvas'
import AnnotatorToolbar from './AnnotatorToolbar'

/**
 * The chosen screenshot with a Fabric.js drawing layer on top.
 *
 * All the imperative canvas work lives in useAnnotationCanvas; this component
 * only lays out the toolbar, the canvas, and the hint text.
 */
export default function ScreenshotAnnotator({ file, exportRef }) {
  const { canvasElRef, tool, selectTool, canUndo, undo, clearAll } =
    useAnnotationCanvas(file, exportRef)

  return (
    <div className="annotator">
      <AnnotatorToolbar
        tool={tool}
        onToolChange={selectTool}
        onUndo={undo}
        onClear={clearAll}
        canUndo={canUndo}
      />
      <div className="annotator-canvas">
        <canvas ref={canvasElRef} />
      </div>
      <p className="annotator-hint">
        Mark what's wrong — your drawing is baked into the image when you submit.
      </p>
    </div>
  )
}
