---
created_at: "2026-06-20T03:27:22.177185+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: agents
agent_id: 68e6839e-a445-4281-a078-94d6d6a2d9cd
card_id: R-5
title: "R-5 room-state merge optimization"
kind: spec
namespace: card:R-5
---

# R-5 room-state merge optimization

## R-5: room-state merge optimization

### Server (`signal_server.py`)
- `_ensure_room_data()` now also initializes `deletedPostIds`, `deletedChecklistIds`, `deletedKeyIds` as empty lists for backward compat with rooms loaded from DB
- `notice-delete`, `checklistboard-delete`, `keymgmt-delete` handlers each record the deleted ID in the respective deleted-IDs list (with dedup check)
- `state-get` → `room-state` response includes `deletedNoticeIds`, `deletedChecklistIds`, `deletedKeyIds`
- The deleted ID lists are in-memory only (not persisted to SQLite) — they reset on server restart, which is acceptable because on restart there's no prior deletion history to conflict with

### Frontend (`clipper.html`)
- `case 'room-state':` handler now has 2-phase merge:
  1. **Ghost-prevention filter**: before merging, filter out locally-held items whose IDs are in the server's `deletedNoticeIds`/`deletedChecklistIds`/`deletedKeyIds` arrays
  2. **Normal merge**: same as before (server items take precedence + localOnly items retained)
- Backward compatible: if server doesn't send deleted IDs arrays (old server), the `if (data.deletedNoticeIds)` guard skips the filter

### Verification
- Python syntax check: OK
- HTML bracket balance: All balanced (braces=1217, brackets=161, parens=2850)