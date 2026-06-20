---
created_at: "2026-06-20T06:20:26.577035+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: agents
agent_id: 8c7c932f-f713-4691-b7f3-2aeeca0b0306
card_id: S-3
title: "S-3 Handler Analysis"
kind: finding
namespace: card:S-3
---

# S-3 Handler Analysis

## Analysis of relay-data / relay-chunk handlers

### Current state (signal_server.py):

1. **relay-data (line 1188-1201)**: Line 1195 sets `"from": my_peer_id` — already secure at top level.
   - Issue: `payload = data.get("data", {})` is passed through unchanged. If client sends `from` inside the inner data payload, it reaches the receiver untouched.
   - Fix: add `payload.pop("from", None)` before building `out`.

2. **relay-chunk (line 1203-1219)**: Line 1208 sets `"from": my_peer_id` — already secure. Only reads specific fields (`fileId`, `chunk`, `index`, `total`) so no additional forgery vector.

3. **chat-backup (line 759-779)**: Line 767 `data.get("from", "")` — this stores the client's displayName for chat history. Not a peerId forgery vector. Keep as-is.
