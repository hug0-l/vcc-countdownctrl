# County — 更新日誌

## v1.1 (2026-06-26) — UI/UX 重大更新
- **🧩 Item-based Cue 系統** — Preset 支援節目段落 (items)，每個 Item 有自己的 Cue 節點、獨立 Matrix 顯示與 Timeline 子軌道
- **🌐 多國語言 i18n** — 完整 i18n 引擎，繁體中文 + 英文即時切換，設定頁 Language 下拉
- **🔒 Session Lock** — ENGINE LIVE 時自動鎖定刪除/全清，新增/編輯保留（顯示🔒提示），雙重確認保護
- **⏱ 一鍵時間偏移** — ON AIR card 直接 `[-30s][+30s][+1m][+5m]`，連動後續節目平移，5 秒可 Undo
- **🚨 Cue Alarm Bar** — 持久性頂部紅色橫幅，需操作員 ACK 確認方可關閉
- **🎨 4px 顏色狀態列** — 螢幕頂部 bar（🟢正常 🟡Cue將至 🔴Cue觸發 ⚪引擎關）
- **📊 Cue 進度條** — 條狀動畫取代純數字倒數，<30s 轉紅閃爍
- **🔊 一鍵 Clipper 通知** — ON AIR card `[🔊 通知]` 按鈕，4 種快速模板 + 自訂，離線 fallback 剪貼簿
- **📋 Preset Item Checklist** — ENGINE LIVE 時可勾選跳過段落，不產生 Cue 觸發
- **📦 模組瘦身** — 5 個模組檔案(county-engine/data/ui-live/ui-rundown/ui-preset) 從總計 2400+ 行 → 110 行，消除全部重複實作
- **🗂 排程匯出/匯入** — 支援「當日」與「全部」兩種範圍，匯入當日可合併至現有資料
- **⏰ 跨頁面倒數** — 所有分頁皆持續更新 ON AIR 狀態與下一節目倒數
- **🚮 維護功能** — 設定頁加入「清除當日排程」(雙重確認) 與「清除全部排程」(CLEAR ALL 驗證)
- **🔧 排程管理改善** — 全清改為僅清除當日 + 週期跳過，exceptionDates 貫穿前後端

## v1.0 (2026-06-25)
- **⏭️ 週期節目單日跳過** — 刪除週期性節目時可選擇「只跳過這一天」或「刪除全部」，支援特殊事件臨時調整
- **📅 行事曆視覺標示** — 有跳過日期的節目在行事曆上以紅色底線 + ⏭️ 圖示標記
- **🏷️ 跳過天數 Badge** — 排程表格中顯示 ⏭️跳過N天 標籤，懸浮提示顯示具體日期
- **🧩 資料庫擴充** — `schedules` 表新增 `exception_dates` 欄位 (JSON 陣列字串)
- **🔌 後端 API 更新** — exceptionDates 貫穿所有 CRUD 端點、備份/還原、自動同步
- **🔧 伺服器埠號可設定** — 支援 `COUNTY_PORT` 環境變數，部署更靈活（`COUNTY_PORT=8001 python server.py`）

## v0.9 (2026-06-20)
- **📦 PyInstaller 打包** — 22MB macOS 執行檔；GitHub Actions 自動編譯 Windows `.exe` + macOS 執行檔
- **🤖 CI/CD 自動化** — 推送 `v*` tag 觸發 GitHub Actions 建置流程，Windows + macOS 雙平台編譯，自動建立 Release
- **💬 Clipper IM v2 聊天室 UI** — Google Chat 風格的氣泡對話（self/other/deleted）、引用回覆、載入更多按鈕、頭像 + 已送達 ✓ 勾勾
- **🎨 Clipper 聊天室響應式佈局** — 手機/小視窗自適應排版
- **📄 GitHub Actions Workflow** — `.github/workflows/build.yml` 完整 CI/CD pipeline

## v0.8 (2026-06-20)
- **🏗️ 模組化重構** — 從單體 SPA (4734行) 拆分為 15 個獨立 JS 模組 + 獨立 CSS
- **🔌 後端資料驗證 API** — 新增 `/api/schedule/validate`、`/api/preset/validate` + 時段重疊檢測
- **☁️ API-first 資料架構** — 後端 SQLite 為主，localStorage 唯讀快取
- **🚨 自診斷系統** — 啟動探針（5秒逾時紅底畫面）、全局錯誤邊界（Toast + 上傳）、設定頁健康儀表板 + 一鍵診斷
- **🔒 Preset 保護開關** — 可開關的內建 Preset 刪除保護，設在 Preset 管理器頁
- **⏱ Cue 順序排序** — Preset 節點一鍵按時間軸排列，開始/結束區段自動分隔
- **🎨 UX 全面改善：**
  - 備份列只顯示在首頁/排程頁
  - NTP 啟動 loading 動畫
  - ENGINE 按鈕 loading 狀態
  - 頁面切換淡入動畫 (0.15s)
  - 搜尋清除按鈕 (✕)
  - Clipper 連線進度回饋
  - 行事曆「今天」按鈕
  - 全局觀測日期移到 status bar
  - 矩陣顏色圖例
  - 手機側欄自動收起
  - Console 自動滾動鎖定
  - 拖曳排序限於 ⋮⋮ 把手（不干擾文字選取）
  - 快速修改支援即將進行節目
  - Preset 節點按 Cue 觸發先後排序（附視覺分隔線）

## v0.7 (2026-06-20)
- **💬 Clipper IM 即時通訊分頁** — 側邊欄加入「💬 Clipper IM」分頁，WebSocket 即時聊天
- **📦 ClipperSDK 整合** — 改用 `clipper-sdk.js` 對接完整 Clipper 協議，不再自製 WS 協議
- **📁 檔案傳輸 UI** — 先選對象再拖放，上傳/下載雙向進度條，自動下載接收檔案
- **🌐 WebRTC P2P 支援** — SDK 層支援 P2P DataChannel 直連，降級 WS Relay
- **🔒 離線唯讀保護** — 斷線自動鎖定所有協作功能，重連自動解除
- **🔗 Clipper API 文件化** — protocol.md (1936行)完整記錄 Clipper WS 協議
- **🌐 REST API 橋接** — Clipper 伺服器支援 REST CRUD 端點
- **🔒 用戶隱私改善** — 所有 UI 隱藏 peerId，只顯示 displayName
- **預設名 VPRE** — Clipper 顯示名稱預設為 VPRE
- **跨頁 CUE 通知** — Clipper 聊天訊息跨分頁未讀計數 + Toast 通知
- **響應式 Clipper UI** — Clipper 分頁在手機/小視窗自適應排版

## v0.6 (2026-06-20)
- **重大架構升級** — 從純前端 SPA 升級為 Python 後端架構 (FastAPI + SQLite + ntplib)
- **真實 NTP 校時** — 伺服器端 ntplib 連接香港天文台 stdtime.gov.hk，精度 ±5ms
- **資料持久化** — SQLite 資料庫取代 localStorage，跨 session 不遺失
- **多機共享** — 區域網內多個操作員可同時操作同一個排程資料庫
- **自動備份** — 每次啟動自動產生日期備份檔
- **開罐即用** — `pip install -r requirements.txt && python server.py` 一條指令啟動
- **設定頁 NTP 面板** — 可設定 NTP 伺服器、同步間隔、立即同步
- **離線降級** — 後端離線時自動降級至 localStorage + 本地時鐘

## v0.5 (2026-06-18)
- 程式碼重構：加入完整原始碼文件標頭與模組說明
- 新增「操作說明」頁面 — 為廣播操作員編寫的完整指南
- 動態節目表新增「結束時碼」欄位
- 新增 📋 複製節⽬功能
- 按鈕加入文字標籤（編輯、複製、刪除）
- ON AIR 警示改為紅色閃爍
- 矩陣分組顯示：節目名稱 + 時段 [HH:MM:SS:FF – HH:MM:SS:FF]
- 矩陣範圍縮小為前後各 3 項 + 自動置中對準「即將進行」
- 矩陣高度改為自適應視窗
- 跨頁面 CUE 引擎：全頁面運作，非首頁仍觸發 Popup 與聲音
- 引擎可隨時停止（Toggle 模式）
- 頁面內 CUE Popup 提示（取代瀏覽器通知）
- 提示音完整尊重 Preset 設定（含重複次數與波形）
- 新增統一 Config 管理系統，設定值持久化
- 保留原則設定（CUE 保留秒數）
- 時區設定
- Timeline 改為 Duration 色塊 + Cue 刻度
- 節目 Tag 與 Color Label 系統
- 矩陣欄位拆分（節目名稱 / Tags / Cue Event）
- 表單預設值改為「現在」
- 行事曆改為週日起始 + 顯示節目數量
- Preset 偏移改為 MM:SS 格式
- 拖曳排序 + 表頭排序
- 支援外部 JSON 匯出/匯入備份

## v0.4 (2026-06-17)
- 新增 Preset 節點表格化 UI（偏移方式/秒數/名稱/提示音）
- 提示音 Preset 系統（9 種含長短響、重複次數）
- Timeline GUI 時間軸
- 節目 Color Code 8 色循環
- 矩陣三級視覺標示（🔴 最接近 / 🟡 次接近 / ⚪ 其餘）
- NTP 時間校準改為本地時鐘 + 連線檢查

## v0.3 — 初始公開版本
- 基本排程 CRUD（新增/編輯/刪除）
- 行事曆與本週縱覽
- Preset 語法管理器（CSV 格式）
- ENGINE 即時監控（矩陣 + Timeline）
- 音訊振盪器測試
- 系統設定與探針
