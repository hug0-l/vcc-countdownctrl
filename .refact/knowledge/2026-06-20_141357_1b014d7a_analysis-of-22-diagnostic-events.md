---
id: "d68fa848-f17d-439d-8665-2313d0abf10f"
title: "Browser renderer crash cluster likely triggered by malformed Mermaid diagram code"
kind: domain
created: 2026-06-20
updated: 2026-06-20
review_after: 2026-09-18
status: active
tags: ["renderer-crash", "mermaid", "frontend", "crash-loop", "unicode", "buddy"]
created_at: "2026-06-20T06:13:57.472731+00:00"
content_hash: "f1cbaa105a0e3c00604c5b65cc518b86df81ae612ae70a736f9fdecf6c5ef4d8"
source_tool: "buddy_memory_create"
source_confidence: 0.800
source_message_range: "refact_error_detective:e2620bdcf876ae0a16c9fa0a9c19738382317b03897985adcc4d9912ebc80f4a"
---

Analysis of 22 diagnostic events found 20 possible_renderer_crash events (browser renderer process killed, SIGILL/SIGKILL) preceded by 2 Mermaid render errors (lexical + parse) at 03:15–03:20 UTC. The Mermaid errors involved Chinese/Unicode text and malformed arrow syntax in user diagram code. The crash session mechanism (localStorage-based) detects stale "running" sessions on restart and reports them. The 20 crashes over ~3 hours suggest a reload loop where the user reopens a chat with the broken diagram. 8 of 22 events are high/critical severity. Need to: (1) extract crash breadcrumbs to confirm the hot-path state, (2) inspect the actual Mermaid diagram code, (3) validate Mermaid version for Unicode bugs.