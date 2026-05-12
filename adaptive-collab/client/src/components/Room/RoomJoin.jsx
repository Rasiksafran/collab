export default function RoomJoin({ form, setForm, onSubmit, loading, error }) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold">Join Room</h2>
      <div className="mt-5 space-y-4">
        <input
          value={form.roomId}
          onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value }))}
          placeholder="Room ID"
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
        />
        <input
          value={form.displayName}
          onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
          placeholder="Display name"
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
        />
        <input
          type="password"
          value={form.roomPassword}
          onChange={(event) => setForm((current) => ({ ...current, roomPassword: event.target.value }))}
          placeholder="Room password (if required)"
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 font-semibold text-indigo-100 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Join Room
      </button>
      <p className="mt-4 text-sm text-slate-400">{error || 'Passwords are hashed server-side with bcrypt.'}</p>
    </form>
  );
}
