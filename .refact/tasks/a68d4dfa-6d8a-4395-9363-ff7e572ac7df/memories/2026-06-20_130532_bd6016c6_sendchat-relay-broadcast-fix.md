---
created_at: "2026-06-20T05:05:32.454415+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: agents
agent_id: ca220606-bd09-4fca-b28c-bf19560db7e2
card_id: B-1
title: "sendChat relay broadcast fix"
kind: finding
namespace: card:B-1
pinned: true
---

# sendChat relay broadcast fix

## Fix: clipper-sdk.js sendChat relay broadcast

### Problem
`sendChat()` sent `relay-data` without a `to` field — the Clipper signaling server requires `to` (target peerId) for relay, otherwise returns "relay target not found".

### Fix Applied
1. **Added `this._peers = new Map()`** in constructor — tracks all connected peers by peerId
2. **Rewrote `sendChat()`** to:
   - Iterate over all entries in `this._peers`, sending `relay-data` with `to: peerId` to each peer individually
   - Also send `chat-backup` message for server persistence
3. **Updated `room_peers` handler** — populates `this._peers` from server peer list
4. **Updated `peer-list` handler** — syncs `this._peers` on full peer list update, deletes departed peers
5. **Updated `peer_joined` handler** — adds peer to `this._peers` and `this._state.peers`
6. **Updated `peer_left` handler** — removes peer from `this._peers` and `this._state.peers`

### Files Changed
- `static/clipper-sdk.js` (in countdownctrl worktree)
- `/Users/hug0.nef/PycharmProjects/vcc-clipper/clipper-sdk.js` (source of truth)
- `/Users/hug0.nef/PycharmProjects/vcc-countdownctrl/static/clipper-sdk.js` (synced copy)

All three copies verified identical via diff.