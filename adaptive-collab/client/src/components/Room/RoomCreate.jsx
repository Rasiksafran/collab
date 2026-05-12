export default function RoomCreate({ form, setForm, onSubmit, loading, roomId }) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold">Create Room</h2>
      <div className="mt-5 space-y-4">
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
          placeholder="Room password (optional)"
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Create Room
      </button>
      {roomId ? <p className="mt-4 text-sm text-emerald-300">Room ID: {roomId}</p> : null}
    </form>
  );
}
