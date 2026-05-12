export default function WhiteboardToolbar({
  canDraw,
  tool,
  setTool,
  strokeWidth,
  setStrokeWidth,
  strokeColor,
  setStrokeColor,
  displayScale,
  setFontScale,
  clearBoard,
  undo,
  saveAsImage,
}) {
  return (
    <aside className="flex flex-wrap gap-3 rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-glow lg:w-72 lg:flex-col">
      <button disabled={!canDraw} onClick={() => setTool('pen')} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${tool === 'pen' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-200'} disabled:cursor-not-allowed disabled:opacity-50`}>
        Pen
      </button>
      <button disabled={!canDraw} onClick={() => setTool('erase')} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${tool === 'erase' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-200'} disabled:cursor-not-allowed disabled:opacity-50`}>
        Eraser
      </button>
      <button disabled={!canDraw} onClick={undo} className="rounded-2xl bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
        Undo
      </button>
      <button disabled={!canDraw} onClick={clearBoard} className="rounded-2xl bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
        Clear Board
      </button>
      <button onClick={saveAsImage} className="rounded-2xl bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10">
        Save PNG
      </button>
      <label className="text-sm text-slate-300">
        Stroke width
        <input type="range" min="1" max="20" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} className="mt-2 w-full" />
      </label>
      <label className="text-sm text-slate-300">
        Font size
        <input type="range" min="8" max="72" value={displayScale} onChange={(event) => setFontScale(Number(event.target.value))} className="mt-2 w-full" />
      </label>
      <label className="text-sm text-slate-300">
        Color
        <input type="color" value={strokeColor} onChange={(event) => setStrokeColor(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-transparent p-1" />
      </label>
    </aside>
  );
}
