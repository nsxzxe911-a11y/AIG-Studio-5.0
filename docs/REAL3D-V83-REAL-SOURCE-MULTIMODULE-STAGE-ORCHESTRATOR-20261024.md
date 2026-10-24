# AIG FastModel / Real3D 極速 V83：原始來源 3D 四階段協調器

日期：2026-10-24。承接已通過 Source＋Chromium 的 Draft PR #82（四個真 Web Worker 常駐三批真 3D 來源姿勢），以及 PR #80 的 WebGL 原始 Indexed buffer 重用。隔離 Draft PR，不改正式 Render RGB HOME、CNC 雙專案、Android APK、Windows EXE。

## 本次真的做了什麼

新 `aig-real3d-staged-orchestrator.mjs` 正式串起四個**真來源**階段：

1. `ORIGINAL_INDEXED_GEOMETRY`：本機來源 SHA、Float32Array GLOBAL XYZ、Uint32Array 原始 triangles、依原始 index 升序排列的受影響三角面，及先前實際 1080×1920 GPU PNG SHA/原始 source triangle count 都要符合原有 Gate。GPU 的原始場景 node IDs、面片拓樸與 provenance 預先嚴格對照。
2. `SOURCE_FK_POSE`：對同一份已驗證的 Base→Middle→Distal 三節明示 vertex weight 產生的三個**真原始座標姿勢**重新計算 source triangle 變形應變。對受影響 source original faces 計算 stretch/compression、inverted/collapsed triangles，逐姿勢對照先前 FK 的每幀診斷，任何不一致立即 BLOCK。負載由來源面片量和可讀取的硬體邏輯併行數決定：小於 256 source faces -> 真單線程；適當大的面片 -> 2／4 個真常駐 Worker；強制診斷可指定 1／2／4，沒有新增物理 CPU 核心，仍由同一常駐池服務三個 pose。避免因小於 256 面片而建立大量 Worker overhead。
3. `SAMPLED_CONTACT_AND_SWEPT_RISK`：直接使用上一階已實際計算的每個來源影格真 triangle crossing 與間隔 swept AABB 風險、budget incomplete 資訊。明確報告 sampled contact / unsampled swept risk，**不因取樣未碰撞而宣稱連續防撞成功**。保留 `independentSafetyGate:'BLOCK'`，不能直接讓 CNC 上機。
4. `GENUINE_GPU_FRAMES`：用同一個真 WebGL renderer 首幀建立原始 Indexed source VBO/EBO；後續兩幀真正 `gl.bufferSubData` 局部頂點/法線更新後呼叫 `renderer.render`。每幀核對原始 face count / tracked buffer 數、首次建立後不得新增完整 bufferData/Index EBO，來源姿勢與原始 OBJ 引用完全不動。原來的三張 1080×1920 真 GPU PNG SHA 直接引用其**已完成證據**；本步重新提交 indexed GPU Draw 但**不重新捕捉新的 1080×1920 圖片**，報告明寫 `nativePNGsWereNotRecapturedInThisStage:true`，不可虛構新 capture。

每次執行完成或出錯都在 finally 結束常駐 Worker，釋放 GPU Mesh／destroy renderer；成功需驗證 tracked GPU buffer balance=0。若來源截斷、仿造不同 SHA、GPU 重新配置、FK 應變不同、未完成幀 contact evidence，全部 fail closed。

## 操作與真正驗收

原 Real3D 工作區新增「極速 V83｜幾何→關節→碰撞→真 GPU 協調驗證」真按鈕，只在本機 OBJ、47 解剖標記、Base/Middle/Distal 原始權重、三張 1080×1920 真 GPU SHA 已通過後才開放。完成寫入可下載 JSON 的 `multimoduleV83Orchestration`；Worker 數（1/2/4）、真 3D GPU draw、來源碰撞不確定性與原始來源完整性清楚分開。

Source Node：非人體 3,136 source triangles original indexed cylinder，核對四階段依序成功、4 slot／48 虛擬任務多批處理、完整單線程數值對照、GPU 兩次增量 index buffer reuse；小面片 source serial fallback、GPU full re-upload / 中斷／來源 SHA/碰撞資訊/應變偽造必須 BLOCK，且 Worker/GPU 清理歸零。

Chromium：保留舊有 113,400 original vertices/226,080 original triangles NONHUMAN intake、四視角高密度 3D GPU、三張 1080×1920 原生 PNG SHA、V82 12,288 triangles × 3批常駐 Workers、V80 216rAF GPU 資源池 Gate；額外實際點擊 V83 真按鈕以既有高密度來源 OBJ 真三節 FK 姿勢完成四階段與三個真正 indexed WebGL GPU Draw，下載來源 JSON 證據。

## 絕對不宣稱

這是一個來源約束及資源負載協調器，**不是** 3D 形體生成器、AI 自動 Rig、天然人類皮膚、完整動物解剖或 CNC 6AX 實機安全控制器。尚無授權真人掃描基底，不能用 SDF／Metaball／Template Morph／Subdivision 假人替代。沒有 Android/Windows 真 GPU 熱感測或持續 60／120 FPS 真機證據，不宣稱任何倍速/熱安全 PASS。所有非人體 QA 成功僅限可驗證的技術 Gate。
