---
created_at: "2026-06-20T03:23:02.275689+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: agents
agent_id: 620e84d8-347d-468d-b284-f307f0765287
card_id: R-3
title: "R-3: readOnly guards added to all mutating functions"
kind: progress
namespace: card:R-3
---

# R-3: readOnly guards added to all mutating functions

## Completed: R-3 - Add readOnly guard checks to all mutating functions

Added 22 `APP.state.readOnly` checks across all categories:

### 💬 Chat (1)
- `sendChatMessage()` — line 4604

### 📁 File Transfer (3)
- `handleFiles()` — line 4210
- `sendNextFile()` — line 4460
- File cancel inline handler — line 4168

### 📋 Notice Board (4)
- `createNoticePost()` — line 1980
- `editNoticePost()` — line 2010
- `deleteNoticePost()` — line 2035
- `togglePinNoticePost()` — line 2054

### ✅ Checklist (8)
- `addChecklistItem()` — line 3695
- `toggleChecklistItem()` — line 3724
- `deleteChecklistItem()` — line 3740
- `deleteChecklistBoard()` — line 3763
- `resetChecklistBoard()` — line 3777
- `setChecklistReminder()` — line 3838
- `showChecklistForm()` new board creation — line 3661
- `showTemplateForm()` save handler — line 4050
- `useTemplate()` — line 3957

### 📡 Key Management (5)
- `createKeyEntry()` — line 2226
- `editKeyEntry()` — line 2253
- `deleteKeyEntry()` — line 2272
- `toggleKeyActive()` — line 2287
- `setKeyProgram()` — line 2302

Each guard blocks with: `APP.showStatusMsg('🔒 伺服器中斷，唯讀模式不可操作')` then returns.