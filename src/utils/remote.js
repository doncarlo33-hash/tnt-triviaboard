import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

const hostConnections = [];

// ---------------------------------------------------------------------------
// Relay helpers – talk to the triviaRelay Vite plugin over plain HTTP
// ---------------------------------------------------------------------------

const RELAY_POLL_MS = 400; // how often the player polls for new state

function relayBaseUrl() {
  // The relay lives on the same origin that served the page.
  return window.location.origin;
}

async function relayPushState(roomId, state) {
  try {
    await fetch(`${relayBaseUrl()}/api/relay/${roomId}/state`, {
      method: 'PUT',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch { /* best-effort */ }
}

async function relayPollState(roomId) {
  try {
    const res = await fetch(`${relayBaseUrl()}/api/relay/${roomId}/state`, { cache: 'no-store' });
    if (res.status === 204 || !res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function relaySendMessage(roomId, msg) {
  try {
    await fetch(`${relayBaseUrl()}/api/relay/${roomId}/messages`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
  } catch { /* best-effort */ }
}

async function relayPollMessages(roomId) {
  try {
    const res = await fetch(`${relayBaseUrl()}/api/relay/${roomId}/messages`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Quick probe – if the relay endpoint exists the Vite plugin is active.
async function relayAvailable() {
  try {
    const res = await fetch(`${relayBaseUrl()}/api/relay/_ping/state`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });
    // 204 = no state yet, but the route exists
    return res.status === 200 || res.status === 204;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// useRemoteHost  –  admin / host side
// ---------------------------------------------------------------------------

export function useRemoteHost(state, onMessage) {
  const [roomId, setRoomId] = useState(null);
  const [connections, setConnections] = useState([]);
  const peerRef = useRef(null);
  const relayActiveRef = useRef(false);
  const roomIdRef = useRef(null);

  // --- PeerJS (kept for production / when relay is unavailable) ---
  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    const fullId = `tnt-${id}`;

    // Probe relay and start PeerJS in parallel
    relayAvailable().then((ok) => {
      relayActiveRef.current = ok;
      if (ok) console.log('[relay] Relay available – using server relay for player sync');
    });

    const peer = new Peer(fullId);
    peerRef.current = peer;

    peer.on('open', (peerId) => {
      roomIdRef.current = peerId;
      setRoomId(peerId);
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        if (!hostConnections.includes(conn)) hostConnections.push(conn);
        setConnections([...hostConnections]);
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
        const idx = hostConnections.indexOf(conn);
        if (idx > -1) hostConnections.splice(idx, 1);
        setConnections([...hostConnections]);
      });
    });

    // Attach global audio broadcaster for audioEngine
    window.__broadcastAudioEvent = (msg) => {
      hostConnections.forEach(conn => {
        if (conn.open) conn.send(msg);
      });
    };

    return () => {
      hostConnections.length = 0;
      delete window.__broadcastAudioEvent;
      peer.destroy();
    };
  }, []); // Only run once on mount

  // --- Broadcast state to PeerJS clients (unchanged) ---
  useEffect(() => {
    if (hostConnections.length > 0) {
      const timeoutId = window.setTimeout(() => {
        const stateStr = JSON.stringify(state);
        hostConnections.forEach(conn => {
          if (conn.open) conn.send(stateStr);
        });
      }, 50);
      return () => window.clearTimeout(timeoutId);
    }
  }, [state]);

  // --- Push state to relay (debounced) ---
  useEffect(() => {
    if (!roomIdRef.current) return;
    if (!relayActiveRef.current) return;

    const timeoutId = window.setTimeout(() => {
      relayPushState(roomIdRef.current, state);
    }, 80);
    return () => window.clearTimeout(timeoutId);
  }, [state, roomId]); // roomId dep ensures we wait until PeerJS assigns the id

  // --- Poll relay for player messages ---
  useEffect(() => {
    if (!roomIdRef.current) return;

    const intervalId = window.setInterval(async () => {
      if (!relayActiveRef.current) return;
      const msgs = await relayPollMessages(roomIdRef.current);
      msgs.forEach((msg) => {
        if (onMessage) onMessage(msg);
      });
    }, RELAY_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [roomId, onMessage]);

  return { roomId, connectionCount: connections.length };
}

// ---------------------------------------------------------------------------
// useRemoteClient  –  player / audience side
// ---------------------------------------------------------------------------

export function useRemoteClient(targetRoomId) {
  const [remoteState, setRemoteState] = useState(null);
  const [status, setStatus] = useState('connecting');
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const relayActiveRef = useRef(false);
  const peerConnectedRef = useRef(false);

  useEffect(() => {
    if (!targetRoomId) {
      setStatus('disconnected');
      return;
    }

    let destroyed = false;

    // --- Try relay first ---
    relayAvailable().then((ok) => {
      if (destroyed) return;
      relayActiveRef.current = ok;

      if (ok) {
        console.log('[relay] Relay available – using server relay');
        setStatus('connected');

        // Start polling for state
        const poll = async () => {
          if (destroyed || peerConnectedRef.current) return; // stop if PeerJS took over
          const state = await relayPollState(targetRoomId);
          if (state && !destroyed && !peerConnectedRef.current) {
            if (state.type === 'AUDIO_PLAY') {
              window.dispatchEvent(new CustomEvent('remote-audio-play', { detail: state }));
            } else if (state.type === 'STATE_UPDATE') {
              setRemoteState(state.state);
            } else {
              setRemoteState(state);
            }
          }
        };

        poll(); // first poll immediately
        const intervalId = window.setInterval(poll, RELAY_POLL_MS);

        // Store cleanup for the relay interval
        relayActiveRef._intervalId = intervalId;
      }
    });

    // --- Also try PeerJS (will take over if it connects) ---
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(targetRoomId);
      connRef.current = conn;

      conn.on('open', () => {
        if (destroyed) return;
        peerConnectedRef.current = true;
        setStatus('connected');
        console.log('[peerjs] WebRTC connection established – using PeerJS');

        // Stop relay polling since PeerJS is faster
        if (relayActiveRef._intervalId) {
          window.clearInterval(relayActiveRef._intervalId);
          relayActiveRef._intervalId = null;
        }
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
        if (destroyed) return;
        peerConnectedRef.current = false;
        // If relay is active, keep going; otherwise mark disconnected
        if (!relayActiveRef.current) {
          setStatus('disconnected');
        }
      });
    });

    peer.on('error', (err) => {
      console.warn("[peerjs] PeerJS Error", err);
      // Only set error if relay isn't available either
      if (!relayActiveRef.current && !destroyed) {
        setStatus('error');
      }
    });

    return () => {
      destroyed = true;
      if (relayActiveRef._intervalId) {
        window.clearInterval(relayActiveRef._intervalId);
        relayActiveRef._intervalId = null;
      }
      peer.destroy();
    };
  }, [targetRoomId]);

  return { remoteState, status, connRef };
}

// ---------------------------------------------------------------------------
// usePlayerConnection  –  wraps useRemoteClient + send via relay or PeerJS
// ---------------------------------------------------------------------------

export function usePlayerConnection(targetRoomId) {
  const { remoteState, status, connRef } = useRemoteClient(targetRoomId);

  const sendMessage = useCallback((msg) => {
    // Try PeerJS first (lower latency)
    if (connRef.current && connRef.current.open) {
      connRef.current.send(JSON.stringify(msg));
      return;
    }
    // Fall back to relay
    if (targetRoomId) {
      relaySendMessage(targetRoomId, msg);
    }
  }, [targetRoomId, connRef]);

  return { remoteState, status, sendMessage };
}
