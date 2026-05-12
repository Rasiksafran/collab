import { useRoom } from '../../context/RoomContext';
import { useSocket } from '../../context/SocketContext';

function bandwidthIcon(level) {
  if (level === 'low') return '🔴';
  if (level === 'medium') return '🟡';
  return '🟢';
}

export default function MemberList({ onClose }) {
  const room = useRoom();
  const socket = useSocket();

  const isAdmin = room.currentUser?.isAdmin || socket?.id === room.adminSocketId;

  const grantPen = (targetSocketId) => socket.emit('grant-pen', { roomId: room.roomId, targetSocketId });
  const revokePen = (targetSocketId) => socket.emit('revoke-pen', { roomId: room.roomId, targetSocketId });
  const removeUser = (targetSocketId) => socket.emit('remove-user', { roomId: room.roomId, targetSocketId });

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-white/10 bg-slate-950/95 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
        <button onClick={onClose} className="rounded-full border border-white/10 px-3 py-1 text-sm">Close</button>
      </div>
      <div className="mt-5 space-y-3 overflow-y-auto pr-1">
        {room.members.map((member) => (
          <div key={member.socketId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">
                  {member.isAdmin ? '👑 ' : ''}
                  {member.username}
                </p>
                <p className="text-sm text-slate-400">{bandwidthIcon(member.bandwidthLevel)} {member.bandwidthLevel || 'high'}</p>
              </div>
              {isAdmin && member.socketId !== socket.id ? (
                <div className="flex flex-col gap-2">
                  <button onClick={() => (member.hasPen ? revokePen(member.socketId) : grantPen(member.socketId))} className="rounded-xl border border-indigo-400/40 px-3 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/10">
                    {member.hasPen ? 'Revoke Pen' : 'Give Pen'}
                  </button>
                  <button onClick={() => removeUser(member.socketId)} className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-500/10">
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
