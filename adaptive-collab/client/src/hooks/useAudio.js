import { useEffect, useMemo, useRef, useState } from 'react';

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

export function useAudio({ socket, roomId, members = [], muted = false, bandwidthLevel = 'high' }) {
  const [stream, setStream] = useState(null);
  const [localMuted, setLocalMuted] = useState(muted);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const peerConnections = useRef(new Map());

  const targetBitrate = useMemo(() => (bandwidthLevel === 'low' ? 16000 : 64000), [bandwidthLevel]);

  useEffect(() => {
    let active = true;

    const startMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
      } catch {
        setStream(null);
      }
    };

    startMedia();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!stream) {
      return undefined;
    }

    const shouldMute = muted || bandwidthLevel === 'low';
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !shouldMute;
    });
    setLocalMuted(shouldMute);

    return undefined;
  }, [bandwidthLevel, muted, stream]);

  useEffect(() => {
    if (!socket || !roomId || !stream) {
      return undefined;
    }

    const createPeerConnection = (targetSocketId, initiator) => {
      if (peerConnections.current.has(targetSocketId)) {
        return peerConnections.current.get(targetSocketId);
      }

      const peerConnection = new RTCPeerConnection({ iceServers });
      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      remoteAudio.playsInline = true;

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('rtc-candidate', {
            roomId,
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
        setRemoteStreams((current) => {
          const filtered = current.filter((entry) => entry.socketId !== targetSocketId);
          return [...filtered, { socketId: targetSocketId, stream: event.streams[0] }];
        });
      };

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.onnegotiationneeded = async () => {
        if (!initiator) {
          return;
        }

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('rtc-offer', {
          roomId,
          targetSocketId,
          offer,
        });
      };

      const sender = peerConnection.getSenders().find((entry) => entry.track?.kind === 'audio');
      if (sender?.setParameters) {
        const parameters = sender.getParameters();
        parameters.encodings = parameters.encodings || [{}];
        parameters.encodings[0].maxBitrate = bandwidthLevel === 'low' ? 16000 : 64000;
        sender.setParameters(parameters).catch(() => {});
      }

      peerConnections.current.set(targetSocketId, peerConnection);
      return peerConnection;
    };

    members
      .filter((member) => member.socketId !== socket.id)
      .forEach((member) => {
        createPeerConnection(member.socketId, true);
      });

    const handleOffer = async ({ fromSocketId, offer }) => {
      try {
        const peerConnection = createPeerConnection(fromSocketId, false);
        if (peerConnection.signalingState === 'stable' || peerConnection.signalingState === 'have-remote-offer') {
          if (peerConnection.signalingState === 'stable') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          }
        } else {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        }
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('rtc-answer', {
          roomId,
          targetSocketId: fromSocketId,
          answer,
        });
      } catch (error) {
        // Ignore offer handling errors due to state issues
      }
    };

    const handleAnswer = async ({ fromSocketId, answer }) => {
      const peerConnection = peerConnections.current.get(fromSocketId);
      if (peerConnection) {
        try {
          if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          }
        } catch (error) {
          // Ignore if connection state doesn't allow setting remote description
        }
      }
    };

    const handleCandidate = async ({ fromSocketId, candidate }) => {
      const peerConnection = peerConnections.current.get(fromSocketId);
      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          // Ignore if candidate can't be added (e.g., connection closed)
        }
      }
    };

    socket.on('rtc-offer', handleOffer);
    socket.on('rtc-answer', handleAnswer);
    socket.on('rtc-candidate', handleCandidate);
    socket.on('mute-mic', () => {
      setLocalMuted(true);
    });

    return () => {
      socket.off('rtc-offer', handleOffer);
      socket.off('rtc-answer', handleAnswer);
      socket.off('rtc-candidate', handleCandidate);
      socket.off('mute-mic');
      peerConnections.current.forEach((peerConnection) => peerConnection.close());
      peerConnections.current.clear();
    };
  }, [members, roomId, socket, stream]);

  useEffect(() => {
    if (!stream) {
      return undefined;
    }

    stream.getAudioTracks().forEach((track) => {
      track.contentHint = 'speech';
      if (bandwidthLevel === 'low') {
        track.enabled = false;
      }
    });

    return undefined;
  }, [bandwidthLevel, stream, targetBitrate]);

  const toggleMute = () => {
    setLocalMuted((current) => !current);
  };

  return {
    stream,
    muted: localMuted,
    setMuted: setLocalMuted,
    toggleMute,
    remoteStreams,
    targetBitrate,
  };
}
