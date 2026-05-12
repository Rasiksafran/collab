import { useEffect } from 'react';
import { useWhiteboard } from '../../hooks/useWhiteboard';
import { useRoom } from '../../context/RoomContext';
import { useSocket } from '../../context/SocketContext';
import WhiteboardToolbar from './WhiteboardToolbar';

export default function WhiteboardCanvas({ canDraw = false, bandwidthLevel = 'high' }) {
  const room = useRoom();
  const socket = useSocket();
  const board = useWhiteboard({
    roomId: room.roomId,
    socket,
    canDraw,
    whiteboardScale: room.whiteboardScale,
    bandwidthLevel,
  });

  useEffect(() => {
    const canvas = board.canvasInstance.current;
    if (!canvas) {
      return undefined;
    }

    const handleMouseDown = (opt) => {
      if (board.tool === 'erase') {
        const pointer = canvas.getPointer(opt.e);
        board.eraseAtPoint(pointer);
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    return () => canvas.off('mouse:down', handleMouseDown);
  }, [board]);

  return (
    <section className="flex flex-col gap-4 lg:flex-row">
      <WhiteboardToolbar {...board} canDraw={canDraw} />
      <div ref={board.wrapperRef} className="relative min-h-[70vh] flex-1 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
        <canvas ref={board.canvasRef} className="absolute inset-0 h-full w-full" />
        {!canDraw ? <div className="absolute inset-0 grid place-items-center bg-slate-950/60 text-center text-sm text-slate-300">View only mode. Pen permission is required to draw.</div> : null}
      </div>
    </section>
  );
}
