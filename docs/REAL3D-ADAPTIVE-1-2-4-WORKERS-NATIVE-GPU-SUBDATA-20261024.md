# Real3D 極速研發｜1/2/4 Worker 自適應測試＋原始來源 GPU 頂點增量更新 V1

日期 2026-10-24。接續已通過 Source + Browser 的 Draft PR #75（四路 Web Worker、WGS84 球面座標及 6DoF），新變更僅在 Draft PR #76；不合併、不部署、不動正式 AIG RGB、AIG-II CNC、Studio 5.0 CNC、APK、EXE。

## 真正的新演算法：1 / 2 / 4 路 CPU 依工作負載調度

原 PR #75 支援單線程與四個真 Dedicated Web Worker；本版原同一 worker pool 直接新增 **2 個真 Dedicated Web Worker**，仍使用來源原始 GLOBAL Indexed XYZ + SHA 綁定權重的 compact 18×Float32 original/posed triangle packets，每個原三角面只由一個 worker 完整計算，最後合併面數、原始邊長拉伸／壓縮、翻面、塌陷。來源 OBJ 不變，不用假人體 / SDF / Metaball / Subdivision。任何 2/4 Worker 結果不等於單線程完整同工件結果 → BLOCK。

新增 `benchmarkAIGReal3DWorkerModes`：同一份 geometry，真執行單線程 / 2 Worker / 4 Worker，每種模式至少 **2 次、可調 3～5 次**。交錯測試順序，記錄每次 wall-clock、包含 compact input packing 及實際 worker 新建/終止的總耗時，列出各組 median、2 vs serial、4 vs serial、2→4 的可觀測比例；至少比 serial 中位數快 10% 才推薦 parallel，否則用 serial。結果是當台設備當次工作負載之診斷，不預測其他設備，CPU 的 OS 顯示硬體並行數也不等於可證實的物理核心數。**不得將擴 4 路說成速度已翻倍**。

## 真正的新 GPU 路徑：WebGL bufferSubData（不重新建立全部 Index/VBO）

現有渲染器 `createAIG3DRenderer` 加入 `updateMeshVertices(mesh,{positions,normals,changedVertexIndices})`。具體做法：
- 第一影格照舊將真正原始 GLOBAL XYZ 映射到 GPU 局部 chunk，僅首次建立 position / normal / unchanged index GPU buffers。
- 後續來源姿勢保留**同一個 GPU node/mesh/triangle index 拓樸**，預先比對 local XYZ／normal，找出有差異的原始來源局部頂點（升序/不重覆），合併連續的頂點範圍。
- 用真實 `gl.bufferSubData` 分區更新原 Position 與 Normal VBO；**Index Element Array Buffer 不修改、不重建**。未變更頂點與 chunk 不用重新上傳。索引、來源 provenance、node id、面數不相同，一律在開始 GPU 更動前 BLOCK。
- 真正三節 FK 工作區的三個 1080×1920 GPU 姿勢：首次建 VBO，以後沿用第一個完整 GPU scene 的 WebGL buffers、逐姿勢更新 changed XYZ/normal；原始 source OBJ 和權威網格保留。每一幀都輸出 delta 更新頂點數、bufferSubData calls、原 index buffer reused 的 JSON 證據。

**這個改動只優化 GPU 上傳路徑。** 目前 CPU 仍會為每個展示姿勢產生臨時 full source normal、構建新的完整驗證用 scene 以獲得正確 normals，未承諾 CPU-side full OBJ triangulation 處理完全省略。GPU Draw 仍要繪製整個來源模型；沒有聲稱 Draw Calls/FPS 已改善 2x。

## 必須通過的 Gate

- Source Node：原本非人體三節 FK/來源 SHA/Source strain 及 WGS84 保持 PASS；新增 1/2/4 真數值分區 fallback；手工 source mesh 的 index buffer 和 provenance 必須在 delta 後保留，changed local verts 更新，重用場景、拓樸不符時 BLOCK。
- Chromium：實際建立 2 Worker、4 Worker；數值與 serial source triangles 完全一致；在 4,096 NONHUMAN triangle 工作負載上進行至少 2 輪公平總時間 Benchmark，記錄每模式原始 samples/medians、選擇結果。**實際加速數據可能小於 1 倍**，必須照實交付。
- 真 WebGL：對同一 NONHUMAN 3D 原網格形變，比較增量 GPU `bufferSubData` 和完全新 scene/context 更新後的 PNG SHA，要求完全相同且與初始姿勢不同；保留原有 113,400 vertices/226,080 source triangles 的 1080×1920 來源回歸與三節 FK 三張真 GPU，第二、三幀證據的 gpuUploadMethod 要顯示 `GPU_BUFFER_SUBDATA_REUSE`。
- 不宣稱：完整連續人體自碰撞已可用、自然人皮膚、真人 1:1、真實機台 3～6 AX 碰撞與 0.001mm 切削安全、手機／Windows 60/120 FPS 和效能翻倍的全系統 Gate PASS；這些都仍 BLOCK。

隔離 Draft PR；Render LIVE 首頁、RGB Authority UI、NC/CAM / CNC 真實 Runtime、安全操作、APK/EXE 皆不修改。
