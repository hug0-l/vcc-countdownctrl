---
created_at: "2026-06-20T05:53:19.791397+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: agents
agent_id: 001aa4f8-eb8c-4aa1-ad98-48cd9ea54a60
card_id: P2P-1
tags: [webrtc, p2p, clipper-sdk]
kind: spec
namespace: card:P2P-1
pinned: true
---

## WebRTC P2P Added to clipper-sdk.js

### Changes Made
1. **Constructor**: Added `this.stunServer` option (default: `stun:stun.l.google.com:19302`)
2. **sendChat()**: Tries P2P DataChannel first, always sends `chat-backup` to server, only WS relays if no P2P
3. **_sendNextFile()**: Checks for open DataChannel; if available, sends raw ArrayBuffer chunks via DC (no base64), otherwise falls back to WS relay with base64
4. **_handleMessage** additions:
   - `offer` → calls `_startWebRTCPeer(_, false, data.data)`
   - `answer` → calls `peerState.pc.setRemoteDescription()`
   - `ice-candidate` → calls `peerState.pc.addIceCandidate()`
   - `peer_left` → closes pc/dc before cleanup
5. **Peer lifecycle**:
   - `room_peers`/`peer-list` → preserves existing P2P state when rebuilding `_peers` Map; automatically calls `_connectToPeer()` for each peer
   - `peer_joined` → enhanced entry with pc/dc/connected/relay fields; auto-calls `_connectToPeer()`
6. **New methods**:
   - `_connectToPeer(targetPeerId)` — lower peerId creates offer, higher waits
   - `_startWebRTCPeer(targetPeerId, isInitiator, remoteOffer)` — creates RTCPeerConnection, sets up event handlers (ICE, DC), creates offer/answer as appropriate
   - `_setupDataChannel(dc, peerId)` — handles DC lifecycle and incoming messages (chat, file-meta, file-done, raw chunks)

### Key Design Decisions
- `_peers` Map now stores enhanced objects: `{pc, dc, connected, relay, ...wsPeerInfo}`
- `room_peers`/`peer-list` handlers merge WS info into existing P2P state instead of replacing
- DataChannel name: `'clipper'` (matches spec)
- All `console.warn` prefixed with `[SDK:P2P]` for easy debugging
- `transport` event emitted with `'p2p'` or `'relay'` mode
- Full backward compatibility: all existing WS relay paths untouched