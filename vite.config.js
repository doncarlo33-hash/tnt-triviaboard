import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { VitePWA } from 'vite-plugin-pwa';

/**
 * Lightweight in-memory relay so phones on the same LAN can exchange data
 * with the host via the Vite dev-server when PeerJS/WebRTC fails.
 *
 * Endpoints:
 *   PUT  /api/relay/:roomId/state        – host pushes serialised game state
 *   GET  /api/relay/:roomId/state        – player polls current state
 *   POST /api/relay/:roomId/messages     – player posts a message
 *   GET  /api/relay/:roomId/messages     – host polls & drains messages
 */
function triviaRelay() {
  const rooms = new Map(); // roomId → { state: string|null, messages: [] }

  function getRoom(id) {
    if (!rooms.has(id)) rooms.set(id, { state: null, messages: [] });
    return rooms.get(id);
  }

  return {
    name: 'trivia-relay',
    configureServer(server) {
      // ---------- state ----------
      server.middlewares.use((req, res, next) => {
        const stateMatch = req.url?.match(/^\/api\/relay\/([^/]+)\/state$/);
        if (!stateMatch) return next();

        const room = getRoom(stateMatch[1]);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            room.state = body;
            res.statusCode = 204;
            res.end();
          });
          return;
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          if (room.state) {
            res.end(room.state);
          } else {
            res.statusCode = 204;
            res.end();
          }
          return;
        }

        res.statusCode = 405;
        res.end();
      });

      // ---------- messages ----------
      server.middlewares.use((req, res, next) => {
        const msgMatch = req.url?.match(/^\/api\/relay\/([^/]+)\/messages$/);
        if (!msgMatch) return next();

        const room = getRoom(msgMatch[1]);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try { room.messages.push(JSON.parse(body)); } catch {}
            res.statusCode = 204;
            res.end();
          });
          return;
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          const msgs = room.messages.splice(0); // drain
          res.end(JSON.stringify(msgs));
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 5175,
    strictPort: true
  },
  plugins: [
    triviaRelay(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // Enable PWA in development
        suppressWarnings: true, // Suppress glob warnings in dev
      },
      workbox: {
        // Never let the service worker intercept /api/ routes (relay endpoints)
        navigateFallbackDenylist: [/^\/api\//],
        // Don't precache /api/ routes
        globIgnores: ['**/api/**'],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'TNT Trivia Scoreboard',
        short_name: 'TNT Trivia',
        description: 'A real-time trivia game scoreboard with admin controls and an audience display.',
        theme_color: '#05070b',
        background_color: '#05070b',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'browser'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});
