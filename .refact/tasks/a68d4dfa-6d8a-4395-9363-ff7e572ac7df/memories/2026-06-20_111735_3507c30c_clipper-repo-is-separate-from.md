---
created_at: "2026-06-20T03:17:35.299055+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: planner
title: "Clipper repo is separate from main project"
kind: gotcha
pinned: true
---

# Clipper repo is separate from main project

Clipper repo is at `/Users/hug0.nef/PycharmProjects/vcc-clipper/`. The project's main repo is `vcc-countdownctrl` but Clipper is a separate repo at a different path. All agents are spawned from vcc-countdownctrl's worktree context but must use absolute paths (`/Users/hug0.nef/PycharmProjects/vcc-clipper/clipper.html`) to read and edit Clipper files.

R-1 agent confirmed this works: it used `cat()` and `update_textdoc()` with the full absolute path to modify clipper.html successfully.