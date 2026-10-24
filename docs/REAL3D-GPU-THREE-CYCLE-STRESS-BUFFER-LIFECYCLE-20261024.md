# Real3D 極速研發 V79｜真 WebGL 多輪原始來源動作、GPU Buffer 生命週期 Gate

2026-10-24。接續已通過 Source + Chromium 真 GPU 雙 Gate 的 Draft PR #78（真 indexed OBJ 三節 FK、bufferSubData、rAF Auto/30/60/90/120、記憶體壓力控制）。本階集中處理**長時使用時的緩衝累積風險**，不做程序性假人體、沒有真人原始授權掃描不可宣稱 1:1、自然 Rig、皮膚動畫成功。

## 真程式增量

在既有 WebGL Renderer 對真正 `gl.createBuffer`/`gl.bufferData`、`gl.bufferSubData`、`gl.deleteBuffer` 維護**自有 GPU Buffer 數量帳本**。每次 original Indexed source mesh 首次 render，建立 position/normal/index 3 個 GPU buffer；後續 source pose 用 bufferSubData 只更新 XYZ/法線，原 EBO 不重建。主動 `releaseMesh` 要將原 3 個 owned buffers 淨數歸零，`destroy` 再檢查 renderer 已關閉且 0 未釋放 owned buffers。計數僅涵蓋此 renderer 自行追蹤的 buffer objects，**不是 GPU 驅動實際顯存占用或所有 Textures/Renderbuffers**，不能以計數假稱「沒有任何 GPU 記憶體洩漏」。

新增 `aig-real3d-gpu-stress-cycles.mjs`：可以設定 **2–5 輪**、每輪 12–180 次真 requestAnimationFrame callback，**每輪新建真 WebGL renderer 及合法來源 original Indexed XYZ pose scenes**。依上一版原生 rAF 自適應 governor 做真 source GPU draw／bufferSubData；每一輪結束擷取 created/active/deleted buffers、subData 總次數、real source frames 等，釋放並銷毀 renderer，資源不回到零 → FAIL。不可在每幀重新建立三份 GPU context 以假裝四核心。

正式 Lab 加入「實際來源 GPU 3 輪壓力／緩衝清理」真按鈕；只有完成原始 OBJ、SHA、三節關節來源姿勢的既有驗證才開啟，按下對**同一批真原始頂點姿勢**做獨立 3 輪 × 36 次 rAF 的 GPU 真運算，在證據 JSON 加入 `extendedRealGPUResourceStress`。按鈕不需額外來源 fake 模型，前版原 RGB UI / CNC 邏輯不改。

## 保守效能／熱壓力界線

在有的瀏覽器只能取 `performance.memory.usedJSHeapSize` 的前提下，記錄每輪起迄 heap snapshot 與差值；JS Heap 可能受 GC/JIT/其他頁面干擾、不能將短時端點差值判成確定洩漏。瀏覽器或原生 SDK 未提供可信溫度／顯存 telemetry 就以 `deviceTemperatureCelsius:null`, `realGPUVRAMUsageBytes:null` 表示未知，不得虛構 88°C 已被修正、CPU 佔比或散熱認證。3 輪 × 36 rAF 是**短時整合壓力回歸**，不是幾小時／整夜壽命測試，也無法驗證 Android／Windows 裝置持續 60/90/120 FPS。

## 真 Gate

Node：非人體 original Indexed XYZ fixture 2002+ faces 驅動 mock draw/delta/owned buffer release 3 輪，各輪 accounted buffer balance 歸零，未釋放、無來源或錯誤配置均 BLOCK。

Chromium：沿用原 113,400 source vertices／226,080 原 global triangles 的真 GPU 四視角、原三節 FK 三張 1080×1920 真 WebGL PNG/SHA、36 rAF GPU source playback 與 1/2/4 workers 回歸；再額外以 3,136 original triangles 真 NONHUMAN source 做 3 輪 × 36 rAF **實際** WebGL source pose delta／bufferSubData／GL buffer release accounting，每一輪 created - deleted = 0 且 destroy succeeded，保存每輪具體計數 JSON artifact；未達全部 PASS 不可稱完成。

僅 Draft PR，不合併、不部署、不改 Render AIG RGB HOME、CNC 雙案、Android APK 或 Windows EXE。
