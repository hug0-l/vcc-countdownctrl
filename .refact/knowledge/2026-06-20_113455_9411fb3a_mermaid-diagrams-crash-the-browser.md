---
id: "6cff014b-43bc-4a05-b53f-991b2b2a55eb"
title: "Mermaid renderer crashes on unquoted CJK/Unicode labels"
kind: domain
created: 2026-06-20
updated: 2026-06-20
review_after: 2026-09-18
status: active
tags: ["mermaid", "renderer-crash", "cjk", "unicode", "frontend", "lexical-error", "buddy"]
created_at: "2026-06-20T03:34:55.990015+00:00"
content_hash: "91b06bf1b357cd816a22407198e97d8982b0c85e878d72afcdfc8073bc01b8a4"
source_tool: "buddy_memory_create"
source_confidence: 0.850
source_message_range: "eda07f032938b8190a79c365df54338c46defdb364e8713c152b2374bbc72e4e"
---

Mermaid diagrams crash the browser renderer (SIGILL/SIGKILL) when diagram labels contain unquoted CJK/Chinese characters. The PEG lexer fails with a LexicalError on unrecognized byte sequences (e.g., `每個 schedule 加上 updated_at`), then the native layout engine terminates fatally. Fix: wrap all user-supplied label text in double quotes before passing to mermaid, or upgrade to mermaid v9+ which has better Unicode handling and graceful error recovery.