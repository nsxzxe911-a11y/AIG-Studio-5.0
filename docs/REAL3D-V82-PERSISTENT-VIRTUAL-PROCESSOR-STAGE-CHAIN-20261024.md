# AIG Real3D｜極速 V82 常駐虛擬處理器與來源階段 Gate

2026-10-24。承接 Draft PR #81（4/8/16 真 Indexed source tasks × 最多 4 真 Web Worker）與 PR #80（同一 GPU 資源池三段原始 Indexed 圖形），只在尚未合併之 Draft 施工，正式 Render RGB HOME、AIG-II/Studio 5.0 CNC、Android APK、Windows EXE 不動。

## 真研發改動

新的 `aig-real3d-persistent-vpu.mjs` 不再為每一次原始三角面工作建立並銷毀所有 Worker。它提供 `createAIGReal3DPersistentVPU({physicalWorkers:1|2|4,virtualLanes:4|8|16,maxBatches,maxPacketBytes,timeoutMs})`：建立至多四個真 Dedicated Web Worker，重複使用同一組 Worker 執行數個不同來源 3D 姿勢的原始 GLOBAL Indexed XYZ 前後變形計算，結束才統一 terminate。每批工作仍拆成 4/8/16 個 virtual lanes；每名 Worker 按順序完成一個 task 才領下一個。虛擬任務**不是**實體 CPU 核心、也不複製 GPU 或新增模型頂點。

- 原始 global triangle offsets 嚴格遞增、頂點索引有效、Float32 XYZ 原陣列不可覆寫、來源 SHA 64 位雜湊格式驗證。每批 compact packet 最多 64MiB，Worker 實際數不得超過 4，最多 24 個 batch。
- 每批完整 serial 原始三角面 Oracle 與任務併合結果必須嚴格一致：變動三角面、邊長拉伸/壓縮、翻面、塌陷。發生來源缺漏、錯誤結果、timeout、abort、資源超額即 FAIL，立刻清理 Worker；資源不得留待使用者手動停止。
- 原本 Stage Authority 的追蹤順序正式化為：`ORIGINAL_INDEXED_GEOMETRY → SOURCE_FK_POSE → SAMPLED_CONTACT_AND_SWEPT_RISK → GENUINE_GPU_FRAMES`。每階來源必須使用同一 source SHA / source face count 與既有原本的報告；這**只是同源階段證據檢查**，不能自動推論實際全時間無碰撞、自然人體骨架、地球六維空間。
- 隔離的 Real3D 三節關節真工作區新增「極速 V82｜常駐 Worker 三批真網格計算」按鈕，必須先通過本機 OBJ/SHA、47 點標記、Base/Middle/Distal 自訂 vertex weight、真 GPU 三張影格後才能按；由工作副本中的三個不同姿勢做三批來源計算；記錄 real worker create count、每批虛擬 task count、實際耗時、結果、最後 worker 歸零。若僅有一個真 Worker 也如實回報 1，不能假報 2。

## 技術驗收

Node 非人體原始三角面 QA：一組 persistent pool 的四個注入測試 runner 處理三批不同真 triangle original/pose input，共 48 個虛擬任務；每批嚴格與 full serial 一致、四 Runner 直到 close 才死，且注入 mock 不能回報為真 browser Worker。故意讓其中一個 Worker 回錯資料、中止、虛構 SHA、來源封包超限、batch 超額，必須 BLOCK 並清理。

Chromium 端真 Dedicated Worker：12,288 原始 indexed NONHUMAN triangles × 三批不同 XYZ，**只啟動 4 個真 Web Worker** 做 48 virtual tasks，與 V81 每批重新建 4 workers（共 12 Worker 啟動）做同一來源三批計算的真數值對照；記錄這台 CI 當輪實際 CPU wall-clock，不能直接推論 Android/Windows 效能翻倍。Browser Gate 同時保留 113,400 原頂點／226,080 原三角面四視角真 GPU、3 張 1080×1920 完整 GPU 圖 SHA、V80 216 個真 rAF 的工作區回歸。

未獲授權真原始人體掃描基底前，人類自然外觀、照片 1:1、動態皮膚、真 60／120 FPS、裝置溫度與整系統實際倍速**一律 BLOCK**。不使用 SDF、Metaball、Template Morph、Subdivision 補假人體；不部署、不合併。
