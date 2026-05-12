import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SocketProvider } from './context/SocketContext';
import { RoomProvider } from './context/RoomContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SocketProvider>
      <RoomProvider>
        <App />
      </RoomProvider>
    </SocketProvider>
  </React.StrictMode>,
);
