# AIG FastModel / Third Project — Real3D GPU Acceleration 1.6 Checkpoint

日期：2026-10-23 Asia/Taipei

## 範圍
第三專案 FastModel 優先，延續原 Real3D 1.0–1.5 的真三角面、XYZ、來源完整性、NC-first 數值材料移除、頭頸 XYZ、FastModel 7.x 人物／掃描／動畫模組。這次是**共享 3D WebGL 渲染資源管理核心的增量升級**，不是未經驗證的重建人物、完整模型來源、原生 GPU 60 FPS 或正式 APK/EXE 交付。

## 真正落盤的程式
- `formal-web/shared-3d/aig-real3d-gpu-budget-1-6.mjs`: 有界 32 MiB 預設 Mesh GPU Buffer Residency Policy（允許明確配置 1–128 MiB），以實際 Position/Normal/Index TypedArray 位元組計數。只淘汰上一影格未使用的 GPU 網格；同一影格活躍幾何若超限，報 `AIG16_GPU_ACTIVE_SCENE_RESIDENCY_BUDGET_BLOCKED` 而非偷偷省略工件。釋放與失敗交易不重算、不更改來源 XYZ。
- `formal-web/shared-3d/aig-real3d-webgl.mjs`: 原先每次 G0/G1 path 更新都 `gl.createBuffer()`、`gl.bufferData()`、`gl.deleteBuffer()`；改為兩個可重用的 GPU 動態 Buffer + `bufferSubData()`，容量按需求倍增、有界 8 MiB 預設每條路徑。新增網格 Residency LRU、Destroy/Release 精準釋放、`getGpuResources()` 可稽核 GPU buffer 次數／容量。保留原材質和 indexed XYZ 三角網格，沒有把 3D 轉成假圖片，也沒有偽造 GPU timing / FPS。
- `formal-web/shared-3d/aig-real3d-replay-lab.mjs`: 相機拖曳 `c.y` 錯誤改為真 `c.yaw`；避免 NaN 視角導致錯誤畫面。
- `formal-web/school-3d/fastmodel/single-photo/build.mjs`: 原 1.0–1.5 離線模組完整保留，加入新 `aig-real3d-gpu-budget-1-6.mjs`；不依賴 CDN。
- `formal-web/school-3d/fastmodel/single-photo/tests/aig-real3d-gpu-v1-6.test.mjs`: 有界 cache、同一 mesh 不重傳、frame 活躍保護、無效來源拒絕、交易失敗不記帳。
- `formal-web/school-3d/fastmodel/single-photo/tests/aig-real3d-gpu-v1-6.real-browser.mjs`: 真 Chromium WebGL phone / desktop；每次 5000 真 indexed triangles ×14 scene updates； G0/G1 同時渲染；驗證每影格不建新線段 GPU Buffer、居民 GPU 資源有界、資源有效釋放。這是合成渲染壓力測試**不是核准真人 GLB**。
- `.github/workflows/aig-shared-real3d-v1-3.yml`: 在原完整數值 NC browser Gate 中加入 1.6 Node／真 Chromium GPU 調度與離線 exact copy Gate，保留 1.3 真 G1 材料移除與來源證據。

## 已實際驗證
- Draft PR #27: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/27 ，僅隔離 CI，不合併、不部署。
- Real3D + NC original Gate #39828363834：`completed/success`，真 Chromium phone / desktop；兩種畫面皆輸出 `AIG_REAL3D_1_6_REAL_GPU_RESIDENCY_BROWSER_PASS`，GPU G0/G1 path buffer create **2**（不是每 frame 兩個新 buffer），14 次網格更新當中 cache eviction **11**；記錄 GPU resident bytes 與釋放狀態；artifact #12447284090。NC 1.3 G0/G1 原回歸同時 PASS。
- 第二輪 #39828547497：`completed/success`。原 1.3 NC evidence 未被破壞。
- 完整 FastModel 7.x regression #39828547488 仍需核對所有八個工作完成；**不能把前兩項 PASS 當全套動畫模組 PASS**。

## 不得冒稱
- Real GPU device completion timing、手機／Windows 原生 60／120 FPS、所有硬體顯示卡穩定性**沒有測試證據**。Buffer 管理降低 allocation churn 不等於已證明 FPS 提升幅度。
- 女主角擬真頭頸／髮束、真碰撞、骨架品質、照片一張直接 3D 並自動完整動作、4–6AX 真機運動學、全 Fanuc、0.001 mm 材料移除及任意自然環境光線真值 **都未因此取得新的驗證**。
- 這次更新只在修復來源分支 `repair/core-first-fastmodel-20261021` 完成；原 Render 網站來源在 `web/aig-dual-formal-runtime-20261016` 分支。**尚未將 FastModel 1.6 GPU 核心發佈到 Render 生產或原生 APK/EXE。** 不應因多一個 Git commit/數字而視為交付。

## 下一斷點
1. 確認 FastModel full regression #39828547488 全八工作 completed/success，如 RED 先修保留可靠證據。
2. 在真實 GLB／動畫入口建立資源診斷與不同顯卡壓力測試；量測手機／桌面 frame-time 分位數、GPU 計時（若 extension 支援）與 FPS，不能以模擬器／合成圖替代。
3. 以保護原核准手機／Windows RGB 工作區為前提，與正式網頁 branch 協調，完成真 browser/Render Gate 後才能獨立上線；不得將 shared geometry/axis 改動默默回寫 CNC 真機。
