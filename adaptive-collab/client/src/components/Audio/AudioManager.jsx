import { useEffect } from 'react';

export default function AudioManager({ audio, muted, setMuted, bandwidthLevel }) {
  useEffect(() => {
    if (bandwidthLevel === 'low') {
      setMuted(true);
    }
  }, [bandwidthLevel, setMuted]);

  useEffect(() => {
    if (audio.stream) {
      audio.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, [audio.stream, muted]);

  useEffect(() => {
    if (!audio.stream) {
      return undefined;
    }

    const handleForceMute = () => setMuted(true);
    window.addEventListener('adaptive-collab-force-mute', handleForceMute);
    return () => window.removeEventListener('adaptive-collab-force-mute', handleForceMute);
  }, [audio.stream, setMuted]);

  return null;
}
