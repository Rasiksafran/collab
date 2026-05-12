import { createContext, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

let singletonSocket = null;

function createSocket() {
  if (!singletonSocket) {
    singletonSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      withCredentials: true,
    });
  }

  return singletonSocket;
}

export function SocketProvider({ children }) {
  const socket = useMemo(() => createSocket(), []);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
