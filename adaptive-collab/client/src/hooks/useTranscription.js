import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useRoom } from '../context/RoomContext';

export function useTranscription(enabled = true) {
  const socket = useSocket();
  const room = useRoom();
  const recognitionRef = useRef(null);
  const [liveText, setLiveText] = useState('');
  const [listening, setListening] = useState(false);

  const Recognition = useMemo(() => window.SpeechRecognition || window.webkitSpeechRecognition || null, []);

  useEffect(() => {
    if (!enabled || !Recognition) {
      return undefined;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();

      if (!transcript) {
        return;
      }

      setLiveText(transcript);
      const isFinal = Array.from(event.results).slice(-1)[0]?.isFinal;
      if (socket && room.roomId) {
        socket.emit('transcription-text', {
          roomId: room.roomId,
          username: room.username || 'Guest',
          text: transcript,
          isFinal: Boolean(isFinal),
        });
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [Recognition, enabled, room.roomId, room.username, socket]);

  const restart = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  return { liveText, listening, restart };
}
