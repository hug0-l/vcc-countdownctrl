# County — 更新日誌

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
