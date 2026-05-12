import { useEffect, useMemo, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { useBandwidth } from '../hooks/useBandwidth';
import { useAudio } from '../hooks/useAudio';
import { useTranscription } from '../hooks/useTranscription';
import BandwidthIndicator from '../components/Bandwidth/BandwidthIndicator';
import MemberList from '../components/Members/MemberList';
import TranscriptionBar from '../components/Transcription/TranscriptionBar';
import AudioManager from '../components/Audio/AudioManager';
import RoomLobby from '../components/Room/RoomLobby';
import WhiteboardCanvas from '../components/Whiteboard/WhiteboardCanvas';
import SplitView from '../components/SplitView/SplitView';
import PDFViewer from '../components/PDF/PDFViewer';

export default function RoomPage() {
  const room = useRoom();
  const socket = useSocket();
  const { bandwidthLevel } = useBandwidth();
  const [membersOpen, setMembersOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState('lobby');
  const [layout, setLayout] = useState('split');

  const audio = useAudio({
    socket,
    roomId: room.roomId,
    members: room.members,
    muted,
    bandwidthLevel,
  });
  const transcription = useTranscription(true);

  useEffect(() => {
    if (bandwidthLevel === 'low') {
      setMuted(true);
    }
  }, [bandwidthLevel]);

  useEffect(() => {
    if (room.selectedMode !== 'lobby') {
      setMode(room.selectedMode);
    }
  }, [room.selectedMode]);

  const canDraw = useMemo(() => {
    if (room.currentUser?.isAdmin) {
      return true;
    }

    return Boolean(room.currentUser?.hasPen);
  }, [room.currentUser]);

  const handleLeave = () => room.leaveRoom();
  const toggleMic = () => setMuted((current) => !current);
  const openMode = (nextMode) => {
    room.setSelectedMode(nextMode);
    setMode(nextMode);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Room</span>
            <span className="font-semibold text-indigo-200">{room.roomId || 'Waiting...'}</span>
          </div>
          <BandwidthIndicator level={bandwidthLevel} />
          <button onClick={() => setMembersOpen((current) => !current)} className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:border-indigo-400/60">
            Members
          </button>
          <button onClick={toggleMic} className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:border-indigo-400/60">
            {muted ? 'Unmute Mic' : 'Mute Mic'}
          </button>
          <button onClick={handleLeave} className="rounded-full border border-rose-400/40 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/10">
            Leave
          </button>
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-300">
            <button onClick={() => navigator.clipboard?.writeText(room.roomId || '')} className="rounded-full border border-white/10 px-3 py-2 transition hover:border-indigo-400/60">
              Copy Room ID
            </button>
          </div>
        </div>
      </header>

      {membersOpen ? <MemberList onClose={() => setMembersOpen(false)} /> : null}

      <main className="flex-1 p-4 md:p-6">
        {mode === 'lobby' ? (
          <RoomLobby
            onSelectWhiteboard={() => openMode('whiteboard')}
            onSelectPdf={() => openMode('pdf')}
            onSelectSplit={() => openMode('split')}
            layout={layout}
            setLayout={setLayout}
          />
        ) : null}

        {mode === 'whiteboard' ? <WhiteboardCanvas canDraw={canDraw} bandwidthLevel={bandwidthLevel} /> : null}
        {mode === 'pdf' ? <PDFViewer /> : null}
        {mode === 'split' ? <SplitView canDraw={canDraw} /> : null}
      </main>

      <TranscriptionBar items={room.transcriptions} liveText={transcription.liveText} />
      <AudioManager muted={muted} setMuted={setMuted} bandwidthLevel={bandwidthLevel} audio={audio} />
    </div>
  );
}
