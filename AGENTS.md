# County — Agent 工作指南

## 📌 專案概述
**County** 是一個廣播電視台排控中心的 **Python 後端 + 前端 SPA** 混合架構。
- 前端 SPA 集中於 `templates/index.html`（~3800 行）
- 後端使用 **FastAPI + SQLite + ntplib**（`server.py`）
- 支援節目排程管理、Cue 提示點觸發、時間軸視覺化。

## 🏗️ 檔案結構
```
county/
├── server.py                        # 🚀 Python 後端 (FastAPI + SQLite + ntplib)
├── requirements.txt                 # Python 依賴
├── templates/
│   └── index.html                   # 📄 主系統 SPA（所有 JS/CSS/HTML 集中此檔）
├── static/                          # 靜態資源目錄
├── backups/                         # 自動備份目錄
├── county.db                       # SQLite 資料庫（執行後自動產生）
├── README.md                        # 架構文件（開發前請先閱讀）
├── AGENTS.md                        # 本文件（Agent 工作指引）
├── CHANGELOG.md                     # 版本歷史
└── templates/index.html          # 前端 SPA（由 server.py 提供服務）
```

> 啟動方式：`pip install -r requirements.txt && python server.py`

## 🧩 模組劃分（原始碼行號範圍）
| 範圍 | 模組 | 說明 |
|------|------|------|
| 1–344 | CSS | 完整 CSS 樣式表（變數、元件、響應式） |
| 345–973 | HTML | 頁面結構（Sidebar、Status Bar、6 頁分頁） |
| 976–3375 | JavaScript | 所有邏輯 |
| 976–1000 | 模組標頭與資料流說明 | 使用區塊註解 |
| 1001–1115 | 全域變數與初始化 | `appConfig`、`masterScheduleDB`、`cuePresets`、`NTPManager` |
| 1116–1275 | Config 管理 | `saveConfig()`、`loadConfig()`、JSON 匯出入 |
| 1276–1305 | Timecode 工具 | `dateToTimecode()`、`timecodeToTotalFrames()`、`totalFramesToTimecode()` |
| 1306–1330 | 時碼輸入遮罩 | `setupTimecodeMask()` |
| 1331–1460 | 行事曆 | `renderGUICalendar()`、`moveCalendarMonth()` |
| 1461–1530 | 週期展開 | `getExpandedRundownForDate()` |
| 1531–1570 | 日誌系統 | `writeLog()` |
| 1571–1620 | 週期 UI | 星期選擇、週期類型切換 |
| 1621–1760 | 行事曆渲染 + 首頁 Traffic | `renderWeekGlance()`、`calculateMCRTrafficSummary()` |
| 1761–1780 | 音效系統 | `soundPresets`（9 種音效） |
| 1781–2100 | Preset 節點管理 | `addNodeRow()`、`renderPresetNodes()`、`onPresetSelectionChange()`、`savePresetAction()` |
| 2101–2140 | 時間校正 | `getCalibratedDate()`、`getTodayStr()` |
| 2141–2480 | 排程 CRUD | `submitProgramForm()`、`enterEditMode()`、`exitEditMode()`、`deleteProgram()` |
| 2481–2650 | Rundown 排序與渲染 | `sortRundownTable()`、`renderRundownUI()` |
| 2651–2900 | 引擎系統 | `initGlobalTracking()`、`calculateGlobalTimelineMatrix()` |
| 2901–3250 | 儀表板 | `updateGlobalDashboard()`、`homeCueCountdown`、Cue 即時看板 |
| 3251–3330 | CUE Popup + 音效播放 | `sendCueNotification()`、`playBroadcastBeep()` |
| 3331–3375 | 開發者選項 + Crash Dump | `applyDevEngineInterval()`、`factoryResetStorage()` 等 |

## 🕒 NTP 時間服務架構

### 整體流程
```
瀏覽器前端 NTPManager        Python 後端 NTPManager         香港天文台
   ┌──────────┐  POST /api/ntp/sync  ┌──────────────┐  UDP 123  ┌──────────┐
   │ sync()   │ ──────────────────→ │ ntplib sync │ ────────→ │time.hko  │
   │          │ ←────────────────── │             │ ←──────── │ .hk      │
   └──────────┘  {status,offset_ms}  └──────────────┘           └──────────┘
```

### 前端 NTPManager
```javascript
const NTPManager = {
    status: 'connected' | 'fallback' | 'local' | 'syncing' | 'error',
    offset: 0,              // serverTime - Date.now() (ms)
    lastSyncTime: null,     // ISO string
    errorMsg: '',
    config: {
        ntpServerUrl: 'stdtime.gov.hk',
        ntpAutoSyncInterval: 600,   // seconds
    },
    timerId: null,
    async sync(url) { ... } // 呼叫 API.ntpSync() → 後端 /api/ntp/sync
};
```

### 後端 NTPManager（Python）
```python
# server.py — NTPManager class
import ntplib
client = ntplib.NTPClient()
response = client.request('stdtime.gov.hk', version=3, timeout=5)
offset_ms = response.offset * 1000  # seconds → ms
```

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/ntp/status` | GET | 回傳目前 NTP 狀態與偏移量 |
| `/api/ntp/sync` | POST | 觸發即時 NTP 同步（ntplib → stdtime.gov.hk） |

### 關鍵前端函數
| 函數 | 說明 |
|------|------|
| `NTPManager.sync(url)` | 呼叫後端 `/api/ntp/sync`，前端非阻塞等待結果 |
| `updateNtpStatusUI()` | 更新狀態列 syncBadge + ntpStatus |
| `updateSettingsNtpUI()` | 更新設定頁 NTP 面板 |
| `restartAutoSync()` | 重新初始化自動同步 timer |
| `handleManualNtpSync()` | 設定頁「立即同步」按鈕處理 |

### 資料持久化
- **後端 SQLite**：`ntp_logs` 資料表記錄每次 NTP 同步（時間戳、狀態、偏移量、錯誤訊息）
- **前端 localStorage**：`county_ntp_*` 暫存偏移量與最後同步時間（後端離線備援）
- **Config JSON**：NTP 設定也保存在 `appConfig.ntp*` 字段中，可透過 Config JSON 面板匯出/匯入

## ⚠️ 關鍵注意事項（Gotchas）

1. **後端優先** — 啟動前先 `python server.py`，前端 SPA 由 FastAPI 提供服務。直接用瀏覽器開啟 `templates/index.html` 會缺少 API 支援。
2. **NTP 使用 UDP port 123** — `ntplib` 透過 UDP 連接 `stdtime.gov.hk`。若防火牆阻擋 UDP 123，NTP 會降級至本地時鐘。
3. **timeOffset 全局變數** — `let timeOffset = 0`。`getCalibratedDate()` 使用 `Date.now() + timeOffset` 做時間校正。
4. **SQLite 資料庫 (`county.db`)** — 所有資料持久化在 SQLite。若資料庫損毀，可刪除後重啟伺服器（會重新建立空資料庫）。
5. **重要 localStorage key**：
   - `county_master_db_v8` — 排程資料庫（離線備援）
   - `county_presets_v8` — Cue Preset 庫（離線備援）
   - `county_config_v8` — 應用設定（離線備援）
   - `county_ntp_*` (x4) — NTP 時間服務暫存
6. **時碼格式** — 固定 `HH:MM:SS:FF`（Frame 為單位，預設 PAL 25fps）
7. **引擎 40ms timer** — `timerInterval = setInterval(updateGlobalDashboard, 40)`，只在首頁全量更新，其它頁面輕量 CUE 檢查。
8. **AudioContext 需要用戶手勢** — 首次播放需要用戶點擊解鎖，聲音模組已內建 `actx.resume()` 處理。

## 🔧 開發流程提示
- **修改 config 時**：記得同時更新 `saveConfig()` 和 `loadConfig()` 以及預設值 `defaultConfig()`
- **新增 UI 元素**：在 `templates/index.html` 的 HTML 區塊中依頁面 `page-*` id 添加，不要破壞現有結構
- **JS 函數添加**：依模組行號範圍放入對應區塊，頂部變數區放宣告，底部放實作
- **測試方式**：執行 `python server.py` 後開啟瀏覽器訪問 `http://localhost:8000`
- **後端離線降級**：後端不可用時，前端自動使用 localStorage 資料，仍可瀏覽與編輯排程
- **Agent 切記**：這是一個生產級系統，任何改動後都應該手動驗證所有核心功能！

## 🧪 快速驗證清單（每次修改後）
- [ ] 伺服器啟動無錯誤：`python server.py`
- [ ] 瀏覽器自動開啟 `http://localhost:8000`
- [ ] 頁面載入無 console error
- [ ] 時鐘正常運作（每秒刷新）
- [ ] NTP 自動同步，狀態顯示正確（已同步/本地時鐘）
- [ ] 設定頁 NTP 面板可操作（伺服器 URL、間隔、立即同步）
- [ ] 時間格式正確（HH:MM:SS:FF）
- [ ] 排程 CRUD 正常（新增/編輯/刪除/複製）
- [ ] 資料持久化：重新整理後資料仍在
- [ ] 後端離線時 localStorage 降級正常
- [ ] ENGINE 啟動/停止正常
- [ ] Cue 觸發顯示正確（矩陣高亮、Popup、音效）
- [ ] 備份下載 → JSON 格式正確
- [ ] 備份還原 → 資料完整恢復
- [ ] Clipper IM 分頁載入正常，預設顯示名稱 VPRE
- [ ] Clipper 分頁連線成功（🟢 已連線）
- [ ] Clipper 聊天收發正常
- [ ] Clipper 檔案傳輸（先選對象 → 拖放 → 進度條 → 自動下載）
- [ ] Clipper 檔案接收進度條正常更新

## 📝 版本控制
- Branch: `main`（正式版）
- Branch: `test`（測試版）
- Remote: git@github.com:hug0-l/county.git
