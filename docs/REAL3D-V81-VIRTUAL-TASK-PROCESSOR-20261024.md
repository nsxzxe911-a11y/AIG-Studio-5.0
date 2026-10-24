# AIG Real3D｜極速研發 V81 — 虛擬處理器（Virtual Task Processor）

日期：2026-10-24。承接已通過雙技術 Gate 的 Draft PR #80；正式 AIG Render RGB HOME、AIG-II／AIG Studio 5.0 CNC、Android APK、Windows EXE 不改。

## 虛擬處理器的正確含義

**虛擬處理器不是額外的實體 CPU，也不會無中生有製造運算資源。** 這裡的 Virtual Processing Unit（VPU）是「把真 3D 原始三角面處理工作拆成 4、8 或 16 個虛擬任務」，最多交給 1、2、4 個**實際**瀏覽器 Dedicated Web Worker 負責計算的工作分派器。每個 Worker 做完就向同一個 queue 領下一塊來源網格工作；沒有強迫建立 16 個實際執行緒，也不創造 16 份 GPU 模型。這種細分可改善負載不均的排程，但有封包/Worker overhead，不能保證快於單執行緒、雙核、四核或實現效能翻倍。

新程式 `formal-web/shared-3d/aig-real3d-virtual-processor.mjs`：

- 使用前階 `packAIGQuadSourceTriangles` 的原始 GLOBAL Indexed XYZ+前後 pose source triangle packets，保留 original Index IDs / original order；每 source triangle 編碼 18 Float32（原始/變形各三頂點）。Source SHA 與原始模型先由既有 Real3D intake / 三節關節 Gate 驗證。
- 以 4/8/16 虛擬 lanes（原 triangle offset 完整覆蓋、不交疊）將 compact packets 分給最多 1/2/4 **真 Dedicated Web Worker**，每 Worker 同一時間只有一個 outstanding source task；工作完成才領下一個 virtual lane。未完成、錯誤、中止、timeout 均 throw BLOCK，所有 Worker 在 finally 中 terminate。
- 設定暫存封包上限不超過 64MiB；任何來源索引錯亂、越界、非 Float32 XYZ 或變形來源長度錯誤，沿用之前的 Source Gate fail closed。小範圍（低於預設 256 原始 faces）、Worker 不可用或核心數不足時，誠實走單線程，報告 `actualRealWebWorkers=0`。
- **相同來源**同時執行完整單線程診斷，與所有虛擬分區結果 merge 後逐欄嚴格比較：原變動 triangles、stretch/compression、flipped/collapsed、inspection face 數不一致 => BLOCK。重複計算 baseline 是安全 QA，不代表每個大型生產影格都能拿到 2× 加速。
- 不更動原 OBJ、原始 index、CAD/CAM/CNC 頁面、GPU WebGL Buffer 或真 Real3D GPU PNG。獨立原始三節關節工作區新增 VPU 真按鈕（4/8/16 虛擬任務；1/2/4 Worker 限額），只在原始 OBJ/SHA/來源權重及 GPU 三影格驗證成功後開啟；輸出來源 SHA、真正用到的 Worker 數、結果 SHA 連接/數值、任務執行次數、實際 wall-clock。**小型手指受影響區域可退回 serial，這是正確最佳化，不是失敗。**

## 驗收與未完成

Source Node 測試使用 1,024 片原始 Indexed NONHUMAN 三角面，以純計算 Worker QA mock 測驗 16 個 virtual tasks 配 4 task runners、8–16 virtual tasks 配 2 runners 的動態排程和完整 serial parity；注入缺原始來源、來源 indices 錯位、memory 超限、異常 abort 必須拒絕；mock 不得標成真的 Worker。

Chromium 真 browser 測試使用 **12,288 NONHUMAN 原始三角面**執行真 4 個 Web Worker／16 lanes 和真 2 個 Worker／8 lanes，結果完全等於 serial，提供 source QA JSON 實際 worker task counts 與量測耗時；小 region 顯示 serial fallback。不影響前版 113,400 vertices／226,080 triangles、四視角及三節原生 1080×1920 WebGL 真 GPU、216 rAF 單資源池等所有回歸 Gate。

實際物理 CPU 核心數、系統加速比例、GPU 渲染增量效能、裝置 VRAM、溫度、Android／Windows 60/120 FPS，還有原始授權真人掃描的自然解剖／Rig/皮膚動畫，**全部不得從 VPU 技術 PASS 推論為成功**。沒有實體掃描來源即保持正式人體 BLOCK，禁止 SDF/Metaball/Template Morph/Subdivision 假人替代。
