import { Group, Line, Rect, Triangle } from 'fabric'

/**
 * Drawing helpers for the annotation canvas. Kept out of the component so the
 * component is about React state and events, and the geometry lives here.
 */

// Every annotation is drawn in this colour. One bright colour that almost never
// appears in a GoHighLevel screenshot, so the marks always stand out.
export const ANNOTATION_COLOR = '#e11d48'
export const STROKE_WIDTH = 3

/**
 * Work out how big to draw the canvas.
 *
 * The canvas is displayed scaled down to fit the form column, but we remember
 * the scale so the exported PNG can be rendered back at the screenshot's real
 * resolution — otherwise the admin would receive a blurry 560px-wide image.
 */
export function fitToWidth(naturalWidth, naturalHeight, maxWidth) {
  const scale = Math.min(1, maxWidth / naturalWidth)
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
    // Multiplier passed to toDataURL to undo the on-screen shrink on export.
    exportMultiplier: scale === 0 ? 1 : 1 / scale,
  }
}

/** An empty rectangle, drawn by dragging from one corner to the other. */
export function makeRect(x, y) {
  return new Rect({
    left: x,
    top: y,
    width: 0,
    height: 0,
    fill: 'transparent',
    stroke: ANNOTATION_COLOR,
    strokeWidth: STROKE_WIDTH,
    // Without this, scaling the shape would also scale the outline thickness.
    strokeUniform: true,
    selectable: false,
    evented: false,
  })
}

/** Resize a rect while the mouse is still down. Handles dragging up/left too. */
export function resizeRect(rect, x, y, originX, originY) {
  rect.set({
    left: Math.min(originX, x),
    top: Math.min(originY, y),
    width: Math.abs(x - originX),
    height: Math.abs(y - originY),
  })
  rect.setCoords()
}

/**
 * An arrow: a line plus a triangular head, grouped so undo removes both at once.
 *
 * Fabric has no arrow primitive, so we build one. The triangle points straight
 * up by default, hence the +90° when aiming it along the line.
 */
export function makeArrow(x1, y1, x2, y2) {
  const line = new Line([x1, y1, x2, y2], {
    stroke: ANNOTATION_COLOR,
    strokeWidth: STROKE_WIDTH,
    strokeLineCap: 'round',
  })

  const headSize = STROKE_WIDTH * 5
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90

  const head = new Triangle({
    left: x2,
    top: y2,
    width: headSize,
    height: headSize,
    fill: ANNOTATION_COLOR,
    angle,
    // Centre the head on the line's end point so it doesn't sit off to one side.
    originX: 'center',
    originY: 'center',
  })

  return new Group([line, head], { selectable: false, evented: false })
}

/**
 * Turn the flattened canvas into a File ready for upload.
 *
 * `toDataURL` gives a base64 string; Supabase Storage wants binary, so we run
 * it back through fetch() — the browser's shortest correct way to decode a
 * data URL into a Blob.
 */
export async function canvasToPngFile(canvas, multiplier, filename = 'screenshot.png') {
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier })
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], filename, { type: 'image/png' })
}
