---
id: "6eee6c70-7bde-4880-bd58-92423f97bd5d"
title: "Mermaid syntax errors can trigger native renderer crashes (SIGILL/SIGKILL)"
kind: insight
created: 2026-06-20
updated: 2026-06-20
review_after: 2026-09-18
status: active
tags: ["mermaid", "renderer-crash", "frontend", "syntax-error", "error-pattern", "buddy"]
created_at: "2026-06-20T03:19:27.089377+00:00"
content_hash: "ee82cb7ad5a65dbefa23236a9909687c42c95e0a1587a9ab9d39a10b8c41859d"
source_tool: "buddy_memory_create"
source_confidence: 0.800
source_message_range: "a6058a1eb8ce6e16c82fda0273e13835e1f366881f169bf904f9a4932a705cc9"
---

Mermaid parse/lexical errors (from malformed diagram syntax like unescaped Chinese text or invalid token sequences) can cascade into full browser renderer crashes (possible_renderer_crash events with SIGILL/SIGKILL). The error path: invalid diagram input → Mermaid parser rejects → renderer terminates → app restarts. Fix is to sanitize/escape dynamic content interpolated into diagram source strings before passing to Mermaid.