---
id: "1754699b-0bba-4e99-9087-fcbfb71a9b87"
title: "Frontend renderer OOM kill: 24 crashes from JS heap exhaustion"
kind: insight
created: 2026-06-20
updated: 2026-06-20
review_after: 2026-09-18
status: active
tags: ["renderer-crash", "oom", "memory-leak", "frontend", "stability", "buddy"]
created_at: "2026-06-20T06:30:04.585119+00:00"
content_hash: "c947c0e74d0007d0a1640cc5efa6ee2123815506e0a94f7aa28237b43160d029"
source_tool: "buddy_memory_create"
source_confidence: 0.900
source_message_range: "refact_error_detective:063706fcf11e7cd32b8b2bb199841868835ef32bb3a2480c57ca3d39fc8fdd96"
---

All 24 `possible_renderer_crash` events (8 high/critical) share a single root cause: the browser renderer is killed by the OS (SIGKILL) when JS heap approaches ~4 GB limit.

Heap trajectory across sessions:
- Session starts fresh → heap grows steadily during agent reasoning
- Crashes consistently at 3100-3400 MiB (74-81% of 4192 MiB limit)
- After each crash → auto-restart → heap resets → repeat cycle (~8 crashes/hour)

All crashes occurred during active streaming sessions in the task workspace. The agent's long-running tasks (file reads, content generation, Mermaid rendering, reasoning chains) accumulate heap memory without sufficient garbage collection or cleanup.

The single SSE idle timeout (05:10:11) is a consequence: when the renderer dies, the SSE connection to backend drops, triggering a timeout on the next heartbeat check. Not a cause.