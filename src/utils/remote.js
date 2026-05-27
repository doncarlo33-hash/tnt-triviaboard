import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

export const hostConnectionManager = {
  getConnections: () => []
};

export function useRemoteHost(state, onMessage) {
  const [roomId, setRoomId] = useState(null);
  const [connections, setConnections] = useState([]);
  const peerRef = useRef(null);
  const connectionsRef = useRef([]);

  useEffect(() => {
    // Generate a short, somewhat readable ID
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    const peer = new Peer(`tnt-${id}`);
    peerRef.current = peer;
    
    hostConnectionManager.getConnections = () => connectionsRef.current;

    peer.on('open', (id) => {
      setRoomId(id);
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        connectionsRef.current.push(conn);
        setConnections([...connectionsRef.current]);
        
        // Send initial state immediately upon connection
        conn.send(JSON.stringify(state));
      });

      conn.on('data', (data) => {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (onMessage) onMessage(parsed);
        } catch (e) {
          console.error("Failed to parse incoming message to host", e);
        }
      });

      conn.on('close', () => {
        connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
        setConnections([...connectionsRef.current]);
      });
    });

    return () => {
      hostConnectionManager.getConnections = () => [];
      peer.destroy();
    };
  }, []); // Only run once on mount

  // Broadcast state changes with debounce to prevent flooding
  useEffect(() => {
    if (connectionsRef.current.length > 0) {
      const timeoutId = window.setTimeout(() => {
        const stateStr = JSON.stringify(state);
        connectionsRef.current.forEach(conn => {
          if (conn.open) {
            conn.send(stateStr);
          }
        });
      }, 50); // 50ms debounce
      return () => window.clearTimeout(timeoutId);
    }
  }, [state]);

  return { roomId, connectionCount: connections.length };
}

export function useRemoteClient(targetRoomId) {
  const [remoteState, setRemoteState] = useState(null);
  const [status, setStatus] = useState('connecting');
  const peerRef = useRef(null);
  const connRef = useRef(null);

  useEffect(() => {
    if (!targetRoomId) {
      setStatus('disconnected');
      return;
    }

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(targetRoomId);
      connRef.current = conn;

      conn.on('open', () => {
        setStatus('connected');
      });

      conn.on('data', (data) => {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (parsed && parsed.type === 'AUDIO_PLAY') {
            window.dispatchEvent(new CustomEvent('remote-audio-play', { detail: parsed }));
          } else if (parsed && parsed.type === 'STATE_UPDATE') {
            setRemoteState(parsed.state);
          } else {
            setRemoteState(parsed);
          }
        } catch (e) {
          console.error("Failed to parse remote state", e);
        }
      });

      conn.on('close', () => {
        setStatus('disconnected');
      });
    });

    peer.on('error', (err) => {
      console.error("PeerJS Error", err);
      setStatus('error');
    });

    return () => {
      peer.destroy();
    };
  }, [targetRoomId]);

  return { remoteState, status };
}

export function usePlayerConnection(targetRoomId) {
  const [remoteState, setRemoteState] = useState(null);
  const [status, setStatus] = useState('connecting');
  const peerRef = useRef(null);
  const connRef = useRef(null);

  useEffect(() => {
    if (!targetRoomId) {
      setStatus('disconnected');
      return;
    }

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(targetRoomId);
      connRef.current = conn;

      conn.on('open', () => {
        setStatus('connected');
      });

      conn.on('data', (data) => {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (parsed && parsed.type === 'AUDIO_PLAY') {
            window.dispatchEvent(new CustomEvent('remote-audio-play', { detail: parsed }));
          } else if (parsed && parsed.type === 'STATE_UPDATE') {
            setRemoteState(parsed.state);
          } else {
            setRemoteState(parsed);
          }
        } catch (e) {
          console.error("Failed to parse remote state", e);
        }
      });

      conn.on('close', () => {
        setStatus('disconnected');
      });
    });

    peer.on('error', (err) => {
      console.error("PeerJS Error", err);
      setStatus('error');
    });

    return () => {
      peer.destroy();
    };
  }, [targetRoomId]);

  const sendMessage = (msg) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send(JSON.stringify(msg));
    }
  };

  return { remoteState, status, sendMessage };
}
