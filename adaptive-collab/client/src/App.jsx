import { useRoom } from './context/RoomContext';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

export default function App() {
  const { roomId } = useRoom();

  return roomId ? <RoomPage /> : <HomePage />;
}
