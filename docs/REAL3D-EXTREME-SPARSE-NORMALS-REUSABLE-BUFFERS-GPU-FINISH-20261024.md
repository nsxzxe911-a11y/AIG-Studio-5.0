# Real3D 極速模式｜來源三維局部法線、雙緩衝、GPU 實測 V1

日期 2026-10-24。承接已通過 Source+Browser 的 Draft PR #76，在獨立 Draft 分支研發；正式 AIG RGB、雙 CNC、FastModel 正式釋出、APK/EXE 保持不動。

## 1. 真原始 Indexed OBJ 局部法線

上一階雖已透過真正 `WebGL bufferSubData` 保留頂點／索引 GPU buffer，但每張姿勢都還在 CPU 對**全部來源三角面**重算法線。新增 `aig-real3d-sparse-source-normals.mjs`：
- 依原始全球頂點 ID 和三角面 index 建立一次性的 vertex→incident original face ID 表。原始每個三角面方向與順序完整保留，計算來源面積加權面法線、baseline normal。
- 每幀根據實際有權重的原始頂點 id，只找鄰接的 source triangles；新法線變化也會作用於被移動頂點周圍**未移動的錨點**，不漏掉接縫兩端。
- 對真正影響的所有頂點，按原始 face index 順序重建 area-weighted normal；未影響的來源頂點直接使用先前 baseline normals。沒有平滑幾何／新增面／法線偽造；會有外觀上的正常 shading 更新，但不是自然真人皮膚品質驗收。
- 同模組附**獨立完整來源逐三角面參考計算**，Source 和 Chromium 必須驗證新舊 per-vertex normals 在數值誤差內一致；原始 OBJ source buffers、global triangle indices、全域 SHA 不可更動。
- 原三節關節 GPU 工作區將全域稀疏法線透過明確 `normalOverride` 交由原既有 `buildAIGReal3DWeightedFingerGPUPreview` 建立正確局部 chunk。仍需產生 CPU 新 scene／local GPU chunk positions 作 parity 預覽，但**不用每幀完整掃描來源 226,080 個原始三角面去算法線**。

## 2. 真低記憶體 FK 時序緩衝

在上一階已經丟棄非展示子幀完整 XYZ 陣列的基礎上，本階更进一步避免**反覆配置和釋放**整塊全模型 Float32Array：
- 非展示子幀輪替使用兩份與原始來源同長度的 Float32Array scratch buffers（交錯避免碰撞掃掠檢查中的「上幀」被覆蓋）；每次先從完整 original source positions 覆寫初始化，之後僅按真三節關節權重更新。
- 三張 GPU 證據展示姿勢各自保留獨立 immutable Float32Array，不得在後續 scratch pose 重用時被改寫。
- 可保留全部影格作單元對照（`retainAllSourcePoses:true`）：所有逐幀 XYZ、normal-independent deformation strain、noncoplanar intersections、swept AABB 風險必須與雙緩衝模式完全一致。
- 輸出 `scratchPoseFloat32BuffersAllocated=2`、`offscreenScratchBuffersActuallyReused` 與 `noSourcePositionsModifiedByBufferPool`；不把 buffer 數量直接當作記憶體實測節省百分比。

## 3. 真 GPU 完成耗時與記憶體壓力證據

WebGL renderer 新增診斷用 `measureCompletedFrame(scene)`：`renderer.render()` 實際繪製原始 GPU indexed triangle 後，執行 `gl.finish()` 等待 GPU 指令完成，記錄每張實際同步影格 wall-clock ms、原始繪製面數。**gl.finish 會刻意阻塞 pipeline，不能拿數字宣稱持續動畫 FPS。**

Chromium 在獨立的 3,136 原始三角面非人體幾何工件上，量測 12 幀已完成 GPU 的真同步耗時，與 CPU local normal parity 一併寫入 JSON；Chrome 可提供 `performance.memory.usedJSHeapSize` 才輸出 heap bytes，否則 null，不杜撰量測。三節關節真高密度 1080×1920 GPU PNG 各記錄正規 CPU normals+scene 組裝耗時及 `captureNativePNG` 實際 GPU readback+PNG encoding 總耗時（不能假稱單獨 GPU rasterization latency）。

## 4. 強制 Gate

Node：真原始面片多幀變形的局部 normals 與逐來源面完整重新計算一致；不相關 source faces、anchor normal 不修改；非整數/重複/超範圍 global source vertex index 必須 BLOCK；三節 FK 雙 scratch memory 資源真重用、原三角面／坐標不變、原全部幀對照一致。

Chromium：原本 NONHUMAN 高密度四視角、3 張 1080×1920 三節關節 GPU PNG SHA/GPU subData 與真 Worker 1/2/4 全部不退化；新增 local/global normal 精度對照、真 12 幀 `gl.finish` 測量及來源 slice memory evidence。這些均是**技術測試件**而非人體天然外觀。

不宣稱：單張真人照 1:1、真自然人體骨架/皮膚、自動軟體修復、地球實際地形、CNC 6AX 實機安全、Android/Windows 60/120FPS 或整系統 2x 都已 PASS。未合併 Draft，不部署正式 Render / APK / EXE。
