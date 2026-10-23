# Real3D Stage 1｜單一核心 19,200 個邏輯工作槽 + 真比例稽核（2026-10-23）

**使用者指令：執行**。此決策僅允許男成人貼身泳褲／女成人貼身連身泳衣的基礎人體 Stage 1；不加入髮型、制服、同學、女主角臉部或部署。現有 Draft PR #44 的來源／GLB／CNC 模組保持不變。

## 真實施工改動（有原始碼，不僅是規格）
- `aig-stage1-unified-19200-ratio-core.mjs` 已落盤；**直接重用既有的** `aig-unified-120-core-3-6.mjs::planAIG36UnifiedCore({requestedLogicalSlots:19200})`。單一 WebGLRenderer、單一 JS 合作式隊列；沒有建立 19,200 個 WebGL contexts、CPU/GPU 實體核心或 Workers。19,200 為預留任務工作槽**總數**，不是所有槽都同時執行、不是速度提高的證據。分配：Viewport 4,000、人體比例 5,000、骨架 4,000、快照 3,000、Gate/報告 3,200（總和 19,200）；實際消耗不得大於對應真頂點數、關節數、快照數。
- 用真正男／女 `aig-stage1-dual-adult-anatomy.mjs` 的 XYZ 頂點計算頭身比、頭寬／肩寬、**真正骨盆表面寬**（不可混用髖關節中心距離）、大腿／小腿比、膝部左右腿分離、手臂長度與人高。
- `auditSkeletonAlignment` 檢查全部 21 骨架節點，左右關節鏡像、上下關節順序、父子階層、手臂／腿段長度誤差；實際資料不足就 Fail closed。
- `auditViewportAspect` 比對真 `canvas.getBoundingClientRect()`、實際 WebGL bitmap、相機 aspect，各相差不得 >0.015；禁止使用整個父 Panel 的長寬比替代。
- `fitHumanToView` 使用真整身所有零件 XYZ AABB、視角方向和 FOV，二分求解前／側／後／45° 的共同人體入鏡尺度：高度目標約 82%，可接受 70～82%（窄螢幕時寬度限制優先）；四視角皆真 3D camera，不允許只有攝影機狀態文字改變。
- `runStage1UnifiedRenderLogicCore` 同步組合比例、骨架、畫布、入鏡與 4 個真 WebGL SHA 快照的 Gate。圖片缺少、重複、沒有真畫布三角面來源、未通過比例均 BLOCK；**即使數值 PASS，Stage1 目視外觀依然 BLOCK**，不能自動批准真人比例或後續女主角擬真外觀。
- `aig-stage1-dual-adult-runtime.mjs` 真接入比例核心，改用自動入鏡，相機／真 CSS+GPU bitmap 量測、每個男女模型專屬真四視角 PNG SHA。每次重裝模型會要求重新拍四張，舊快照可保留作反例，但不能拿舊 SHA 自動填目前 Gate。
- `scene-runtime-studio.html` 可見主要比率（頭身／肩頭／骨盆肩／大腿小腿）、畫布/骨架證據、快照數、19,200 邏輯槽與外觀 BLOCK。
- `tests/aig-stage1-unified-19200-ratio-core.test.mjs` 驗證固定槽位加總、實際既有一核規格、原始 3D 頂點不修改、頭身/四肢比例、21 關節、真 Canvas vs GPU ratio、4 real screenshots 的 FAIL-closed。
- `tests/aig-stage1-dual-adult.real-browser.mjs` 改成實際手機＋桌面讀取 `realAnatomyRatioGate`，要求數值與畫布比例通過，16 張圖及 PNG sha 獨立，每次男／女四視角捕捉後才允許自動 numerical evidence gate PASS（人類外觀仍 BLOCK）。
- `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml` Stage1 專屬 job 已加入上述 Node tests + bundle 檢查 + Chromium phone/desktop 16 真 WebGL 快照，不需依賴舊版 Source 3.16 全功能 job 判定 Stage1。

## Gate 與風險
- **Stage 1 人物外觀 Gate 目前仍 FAIL/BLOCK。** 前一輪測試可以證明人體存在、四角圖片是真的 WebGL，但尚不能證明自然人體、皮膚／關節蒙皮、完全無穿模、或真實 60FPS。
- 槽位配額是合作式工作**邏輯分區**，不是 19,200 個獨立 render engines，也不可拿這個數量宣稱提高穩定性或 GPU FPS。
- 未實測通過的 CI 不得聲稱 PASS。原 Render 主站／APK／EXE 尚未部署；PR #44 仍 Draft，不合併。

**下一關：** 閱讀真男女四視角快照＋JSON 比例 Gate；發現比例異常就針對身形幾何/關節重建，而不是遮蓋模型、調光、升版。
