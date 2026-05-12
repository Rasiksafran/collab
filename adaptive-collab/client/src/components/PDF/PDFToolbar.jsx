export default function PDFToolbar({ onUpload, onPrev, onNext, onDownload, page, numPages, isAdmin }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-glow">
      {isAdmin ? (
        <label className="rounded-xl border border-indigo-400/40 px-4 py-3 text-sm text-indigo-100 transition hover:bg-indigo-500/10">
          Upload PDF
          <input type="file" accept="application/pdf" onChange={onUpload} className="hidden" />
        </label>
      ) : null}
      <button onClick={onPrev} className="rounded-xl bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">
        Prev
      </button>
      <button onClick={onNext} className="rounded-xl bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">
        Next
      </button>
      <span className="text-sm text-slate-300">
        Page {page} / {numPages || 0}
      </span>
      <button onClick={onDownload} className="rounded-xl bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">
        Download
      </button>
    </div>
  );
}
