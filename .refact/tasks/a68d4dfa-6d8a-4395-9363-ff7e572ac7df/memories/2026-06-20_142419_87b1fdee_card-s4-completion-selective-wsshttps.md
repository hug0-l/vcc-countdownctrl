---
created_at: "2026-06-20T06:24:19.701389+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: agents
agent_id: f649275c-f221-4d7f-bb85-2c3d21f9d4e2
card_id: S-4
title: "Card S-4 completion: Selective WSS/HTTPS encryption support"
kind: handoff
namespace: card:S-4
---

# Card S-4 completion: Selective WSS/HTTPS encryption support

## Card S-4: P1-3 選擇性 WSS/HTTPS 加密支援 ✅

### Changes made to `signal_server.py`:
1. **TLS env vars**: Added `CLIPPER_TLS`, `CLIPPER_TLS_CERT`, `CLIPPER_TLS_KEY` detection at the start of `main()`
2. **SSL context creation**: If `CLIPPER_TLS=1`:
   - Checks for cert.pem / key.pem existence
   - If missing: logs helpful openssl command and returns gracefully (no crash)
   - If present: creates `ssl.SSLContext` and loads cert chain
3. **Startup log**: Shows `wss://`/`https://` when TLS enabled, `ws://`/`http://` when plain
4. **HTTP server**: `asyncio.start_server(..., ssl=ssl_context)` — passes None when plain
5. **WS server**: `websockets.serve(..., ssl=ssl_context)` — passes None when plain

### Acceptance Criteria Verified:
- ✅ Default `python3 signal_server.py` → `listening on ws://localhost:8765  |  http://localhost:8766`
- ✅ `CLIPPER_TLS=1 python3 signal_server.py` (with certs) → `listening on wss://localhost:8765  |  https://localhost:8766`
- ✅ `CLIPPER_TLS=1 python3 signal_server.py` (no certs) → logs helpful message, no crash