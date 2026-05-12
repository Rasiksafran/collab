import { useEffect, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';

const mapLevel = (rtt) => {
  if (rtt < 150) {
    return 'high';
  }

  if (rtt <= 400) {
    return 'medium';
  }

  return 'low';
};

export function useBandwidth() {
  const socket = useSocket();
  const room = useRoom();
  const [bandwidthLevel, setBandwidthLevel] = useState('high');

  useEffect(() => {
    let timer = null;
    let active = true;

    const measure = async () => {
      const started = performance.now();
      try {
        await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'}/api/ping?ts=${Date.now()}`, {
          cache: 'no-store',
        });
        const elapsed = performance.now() - started;
        const level = mapLevel(elapsed);
        if (!active) {
          return;
        }

        setBandwidthLevel(level);
        if (socket && room.roomId) {
          socket.emit('bandwidth-report', {
            roomId: room.roomId,
            socketId: socket.id,
            level,
          });
        }
      } catch {
        if (!active) {
          return;
        }
        setBandwidthLevel('low');
        if (socket && room.roomId) {
          socket.emit('bandwidth-report', {
            roomId: room.roomId,
            socketId: socket.id,
            level: 'low',
          });
        }
      } finally {
        if (active) {
          timer = window.setTimeout(measure, 5000);
        }
      }
    };

    measure();

    return () => {
      active = false;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [room.roomId, socket]);

  return { bandwidthLevel };
}
