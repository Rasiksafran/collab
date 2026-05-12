export default function RoomLobby({ onSelectWhiteboard, onSelectPdf, onSelectSplit, layout, setLayout }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
      <button onClick={onSelectPdf} className="group rounded-3xl border border-white/10 bg-white/5 p-8 text-left transition hover:-translate-y-1 hover:border-indigo-400/50 hover:bg-white/10">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">PDF Mode</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Open shared pages</h2>
        <p className="mt-3 text-sm text-slate-300">Upload and sync PDFs with page navigation, download, and split-view whiteboarding.</p>
      </button>
      <button onClick={onSelectWhiteboard} className="group rounded-3xl border border-white/10 bg-white/5 p-8 text-left transition hover:-translate-y-1 hover:border-indigo-400/50 hover:bg-white/10">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Whiteboard Mode</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Draw vector notes</h2>
        <p className="mt-3 text-sm text-slate-300">Use pen, erase, undo, and export while keeping bandwidth costs low.</p>
      </button>
      <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <p className="text-sm text-slate-300">Split view keeps PDF and whiteboard side by side.</p>
        <select
          value={layout}
          onChange={(event) => {
            const nextLayout = event.target.value;
            setLayout(nextLayout);
            if (nextLayout === 'split' && onSelectSplit) {
              onSelectSplit();
            }
            if (nextLayout === 'whiteboard' && onSelectWhiteboard) {
              onSelectWhiteboard();
            }
            if (nextLayout === 'pdf' && onSelectPdf) {
              onSelectPdf();
            }
          }}
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="split">Split view</option>
          <option value="whiteboard">Whiteboard only</option>
          <option value="pdf">PDF only</option>
        </select>
      </div>
    </section>
  );
}
