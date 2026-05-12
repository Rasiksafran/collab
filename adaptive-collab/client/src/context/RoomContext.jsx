import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from './SocketContext';

const RoomContext = createContext(null);
const STORAGE_KEY = 'adaptive-collab-room';

const initialState = {
  roomId: null,
  username: '',
  password: '',
  pdfUrl: null,
  filename: null,
  adminSocketId: null,
  members: [],
  bandwidths: {},
  whiteboardScale: 16,
  currentUser: null,
  transcriptions: [],
  selectedMode: 'lobby',
  hasServerRoom: false,
};

export function RoomProvider({ children }) {
  const socket = useSocket();
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const restore = () => {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        if (parsed.roomId && parsed.displayName) {
          socket.emit('join-room', {
            roomId: parsed.roomId,
            username: parsed.displayName,
            password: parsed.roomPassword || '',
          });
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    };

    const handleRoomState = (payload) => {
      setState((current) => ({
        ...current,
        roomId: payload.roomId || current.roomId,
        pdfUrl: payload.pdfUrl,
        filename: payload.filename,
        adminSocketId: payload.adminSocketId,
        members: payload.members || current.members,
        bandwidths: payload.bandwidths || current.bandwidths,
        whiteboardScale: payload.whiteboardScale || current.whiteboardScale,
        currentUser: payload.currentUser || current.currentUser,
        selectedMode: payload.pdfUrl ? 'split' : current.selectedMode,
        hasServerRoom: true,
      }));
    };

    const handleUserJoined = (payload) => {
      setState((current) => ({
        ...current,
        members: current.members.some((member) => member.socketId === payload.socketId)
          ? current.members
          : [...current.members, payload],
      }));
    };

    const handleUserLeft = ({ socketId }) => {
      setState((current) => ({
        ...current,
        members: current.members.filter((member) => member.socketId !== socketId),
      }));
    };

    const handleUserRemoved = ({ socketId }) => {
      setState((current) => ({
        ...current,
        members: current.members.filter((member) => member.socketId !== socketId),
      }));
    };

    const handleBandwidthUpdate = ({ bandwidths, members }) => {
      setState((current) => ({
        ...current,
        bandwidths,
        members: members || current.members,
      }));
    };

    const handleReceivePdf = ({ pdfUrl, filename }) => {
      setState((current) => ({ ...current, pdfUrl, filename, selectedMode: 'split' }));
    };

    const handleReceiveTranscription = ({ username, text }) => {
      setState((current) => ({
        ...current,
        transcriptions: [...current.transcriptions, { username, text, time: Date.now() }].slice(-100),
      }));
    };

    const handleWhiteboardScale = ({ scale }) => {
      setState((current) => ({ ...current, whiteboardScale: scale }));
    };

    socket.on('room-state', handleRoomState);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('user-removed', handleUserRemoved);
    socket.on('bandwidth-update', handleBandwidthUpdate);
    socket.on('receive-pdf', handleReceivePdf);
    socket.on('receive-transcription', handleReceiveTranscription);
    socket.on('receive-whiteboard-scale', handleWhiteboardScale);
    socket.on('connect', restore);
    socket.on('reconnect', restore);
    socket.on('mute-mic', () => setState((current) => ({ ...current, mutedByServer: true })));
    socket.on('pen-granted', () => setState((current) => ({ ...current, hasServerRoom: true })));
    socket.on('pen-revoked', () => setState((current) => ({ ...current, hasServerRoom: true })));
    socket.on('room-error', (payload) => {
      setState((current) => ({ ...current, roomError: payload.message }));
    });

    return () => {
      socket.off('room-state', handleRoomState);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('user-removed', handleUserRemoved);
      socket.off('bandwidth-update', handleBandwidthUpdate);
      socket.off('receive-pdf', handleReceivePdf);
      socket.off('receive-transcription', handleReceiveTranscription);
      socket.off('receive-whiteboard-scale', handleWhiteboardScale);
      socket.off('connect', restore);
      socket.off('reconnect', restore);
    };
  }, [socket]);

  const api = useMemo(() => {
    const persist = (payload) => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    };

    return {
      ...state,
      setSelectedMode: (selectedMode) => setState((current) => ({ ...current, selectedMode })),
      authenticate: async ({ email, password, displayName, register = false }) => {
        if (register) {
          await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName }),
          }).catch(() => {});
        }

        const loginRes = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
          throw new Error(loginData.error || 'Authentication failed');
        }

        const user = { email: loginData.email, displayName: loginData.displayName };
        setState((current) => ({ ...current, currentUser: user }));
        return user;
      },
      createAndJoinRoom: async ({ displayName, roomPassword }) => {
        if (!state.currentUser) {
          throw new Error('Please login first');
        }

        const finalDisplayName = displayName || state.currentUser.displayName || state.currentUser.email;
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'}/api/room/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: roomPassword || '', username: finalDisplayName }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to create room');
        }

        const payload = { roomId: data.roomId, displayName: finalDisplayName, roomPassword };
        persist(payload);
        setState((current) => ({ ...current, roomId: data.roomId, username: payload.displayName, password: roomPassword, selectedMode: 'lobby' }));
        socket.emit('join-room', { roomId: data.roomId, username: payload.displayName, password: roomPassword });
        return data.roomId;
      },
      joinExistingRoom: async ({ roomId, displayName, roomPassword }) => {
        if (!state.currentUser) {
          throw new Error('Please login first');
        }

        const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'}/api/room/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, password: roomPassword || '' }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to join room');
        }

        const payload = { roomId, displayName: displayName || state.currentUser.displayName || state.currentUser.email, roomPassword };
        persist(payload);
        setState((current) => ({
          ...current,
          roomId,
          username: payload.displayName,
          password: roomPassword,
          selectedMode: data.pdfUrl ? 'split' : 'lobby',
          pdfUrl: data.pdfUrl || current.pdfUrl,
          filename: data.filename || current.filename,
          adminSocketId: data.adminSocketId || current.adminSocketId,
        }));
        socket.emit('join-room', { roomId, username: payload.displayName, password: roomPassword });
        return data;
      },
      leaveRoom: () => {
        socket.emit('leave-room');
        sessionStorage.removeItem(STORAGE_KEY);
        setState(initialState);
      },
      markMode: (mode) => setState((current) => ({ ...current, selectedMode: mode })),
      pushTranscription: (entry) => setState((current) => ({ ...current, transcriptions: [...current.transcriptions, entry].slice(-100) })),
      emitWhiteboardScale: (scale) => {
        if (state.roomId) {
          socket.emit('whiteboard-scale', { roomId: state.roomId, scale });
        }
      },
    };
  }, [socket, state]);

  return <RoomContext.Provider value={api}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  return useContext(RoomContext);
}
