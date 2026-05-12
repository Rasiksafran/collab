export default function TranscriptionBar({ items = [], liveText = '' }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-h-36 max-w-7xl flex-col gap-2 overflow-y-auto px-4 py-3 text-sm text-slate-200 md:px-6">
        {items.slice(-10).map((item) => (
          <p key={`${item.time}-${item.username}-${item.text}`} className="rounded-lg bg-white/5 px-3 py-2">
            <span className="font-semibold text-indigo-200">[{item.username}]</span> {item.text}
          </p>
        ))}
        {liveText ? <p className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-indigo-100">Live: {liveText}</p> : null}
      </div>
    </footer>
  );
}
