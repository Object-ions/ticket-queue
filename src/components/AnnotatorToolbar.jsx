const TOOLS = [
  { value: 'pen', label: '✏️ Draw' },
  { value: 'arrow', label: '↗ Arrow' },
  { value: 'box', label: '▭ Box' },
]

/**
 * The tool strip above the annotation canvas.
 *
 * Presentational only — it holds no state, it just reports which button was
 * pressed. That keeps all the canvas logic in one place next door.
 */
export default function AnnotatorToolbar({ tool, onToolChange, onUndo, onClear, canUndo }) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {TOOLS.map((option) => (
          <button
            key={option.value}
            type="button"
            // type="button" matters: inside a <form>, a bare <button> submits it.
            className={`tool ${tool === option.value ? 'tool-active' : ''}`}
            onClick={() => onToolChange(option.value)}
            aria-pressed={tool === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button type="button" className="tool" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="tool" onClick={onClear} disabled={!canUndo}>
          Clear
        </button>
      </div>
    </div>
  )
}
