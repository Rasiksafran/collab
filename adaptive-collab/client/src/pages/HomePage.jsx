import { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import RoomCreate from '../components/Room/RoomCreate';
import RoomJoin from '../components/Room/RoomJoin';

export default function HomePage() {
  const room = useRoom();
  const [theme, setTheme] = useState('dark');
  const [createForm, setCreateForm] = useState({ displayName: '', roomPassword: '' });
  const [joinForm, setJoinForm] = useState({ roomId: '', displayName: '', roomPassword: '' });
  const [authForm, setAuthForm] = useState({ email: '', password: '', displayName: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [activeRoomAction, setActiveRoomAction] = useState(null);
  const [error, setError] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const roomId = await room.createAndJoinRoom(createForm);
      setCreatedRoomId(roomId);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setLoading(false);
    }
  };

  const onJoin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await room.joinExistingRoom(joinForm);
    } catch (joinError) {
      setError(joinError.message);
    } finally {
      setLoading(false);
    }
  };

  const onAuth = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await room.authenticate({ email: authForm.email, password: authForm.password, displayName: authForm.displayName, register: isRegister });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={theme === 'dark' ? 'min-h-screen text-slate-100' : 'min-h-screen bg-slate-50 text-slate-900'}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl md:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-indigo-300/80">Adaptive Collab</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">Vector collaboration for low bandwidth learning.</h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
                Create a room, share a PDF, and draw together with vector-only strokes, adaptive audio, and live transcription.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              className="w-fit rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-indigo-400/60 hover:text-white"
            >
              {theme === 'dark' ? 'Light theme' : 'Dark theme'}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {!room.currentUser ? (
              <div className="col-span-2">
                <form onSubmit={onAuth} className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <h2 className="text-2xl font-semibold">{isRegister ? 'Register' : 'Login'}</h2>
                  <div className="mt-5 space-y-4">
                    {isRegister && (
                      <input
                        value={authForm.displayName}
                        onChange={(e) => setAuthForm((c) => ({ ...c, displayName: e.target.value }))}
                        placeholder="Display name"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
                      />
                    )}
                    <input
                      value={authForm.email}
                      onChange={(e) => setAuthForm((c) => ({ ...c, email: e.target.value }))}
                      placeholder="Email"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
                    />
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm((c) => ({ ...c, password: e.target.value }))}
                      placeholder="Password"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-5">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 font-semibold text-indigo-100 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRegister ? 'Register' : 'Login'}
                    </button>
                    <button type="button" onClick={() => setIsRegister((s) => !s)} className="text-sm text-slate-300 underline">
                      {isRegister ? 'Have an account? Login' : "Don't have an account? Register"}
                    </button>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">{error || 'Your credentials stay in this demo session only.'}</p>
                </form>
              </div>
            ) : (
              <>
                <div className="col-span-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveRoomAction('create')}
                    className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                  >
                    Create Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRoomAction('join')}
                    className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                  >
                    Join Room
                  </button>
                </div>
                {activeRoomAction === 'create' ? (
                  <div className="col-span-2">
                    <RoomCreate form={createForm} setForm={setCreateForm} onSubmit={onCreate} loading={loading} roomId={createdRoomId} />
                  </div>
                ) : null}
                {activeRoomAction === 'join' ? (
                  <div className="col-span-2">
                    <RoomJoin form={joinForm} setForm={setJoinForm} onSubmit={onJoin} loading={loading} error={error} />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
