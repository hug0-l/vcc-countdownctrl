---
created_at: "2026-06-20T03:27:44.727160+00:00"
task_id: a68d4dfa-6d8a-4395-9363-ff7e572ac7df
role: planner
title: "Clipper offline protection — full summary"
kind: postmortem
pinned: true
---

# Clipper offline protection — full summary

## Clipper 離線衝突防護 — 完成總結

### 修改的檔案
- `/Users/hug0.nef/PycharmProjects/vcc-clipper/clipper.html` — 前後端 SPA（5 張 card 全部修改此檔）
- `/Users/hug0.nef/PycharmProjects/vcc-clipper/signal_server.py` — R-5 新增 deleted IDs 追蹤

### 實作的 5 張卡片

| Card | Title | 修改行數 | 說明 |
|------|-------|---------|------|
| R-1 | `readOnly` 狀態與全域開關 | +70/-2 | `APP.state.readOnly` + `setReadOnly(bool)` |
| R-2 | WS 連線綁定 | ~+15 | 4 處自動觸發點（onerror/onclose/joined/disconnect） |
| R-3 | 22 個函式攔截 | ~+44 | 所有資料修改函式加入唯讀檢查 |
| R-4 | UI 視覺效果 | ~+50 | 橫幅滑入動畫、按鈕灰色、檔案區遮罩 |
| R-5 | 幽靈復活防護 | ~+30 | server deleted IDs + 前端合併過濾 |

### 衝突風險矩陣（修正後）

| 風險 | 修正前 | 修正後 |
|------|--------|--------|
| 離線編輯衝突 | 🔴 可能 | ✅ 斷線即唯讀 |
| 幽靈復活 | ⚠️ 存在 | ✅ 伺服器記錄已刪 ID |
| 同時在線編輯 | 🟢 即時廣播 | ✅ 不變（已即時） |
| 聊天順序不一致 | 🟢 輕微 | ✅ 不變（輕微） |

### 驗證
- 全部 JS braces/brackets/parens balanced ✅
- 全部 Python syntax check 通過 ✅
- `signal_server.py` 啟動正常 ✅
