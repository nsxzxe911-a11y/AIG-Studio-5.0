# Real3D V102｜圖片框架驅動 GPU，AI 後端重製與渲染分流

日期 2026-10-25。承接 V101 實際來源拓樸修整，修正「為了繪圖，反過來逼 AI 3D 重製器重造模型」的瓶頸。

## 核心決策

1. **圖片說了算**：AI 生成/定版來源圖片提供真實原始寬高比、畫面框架、可觀察透明區主體 ROI。GPU 使用 3D Scene 真來源邊界與相機正/側/背/斜角度，自動計算正交相機 `focus`/ `orthoSpan`，讓真正的原始網格落在原畫框架內，不變形、不拉伸、不要求修改原模型的 3D 面。
2. **沒有假分割**：透明 PNG 的前景 alpha ROI 有實際像素證據；若是不透明 JPG/PNG，不冒充目前已有可信的真人語意前景分割，退回以完整圖片做 frame fit，不偷偷製造五官、背面或深度。
3. **不要求 AI 重繪以符合渲染器**：`aig-real3d-v102-adaptive-frame.mjs` 只讀 Indexed XYZ Scene 的 world-transform bounding 8 corners per visible node。經過比例、顏色/骨架來源 QA 的真模型本體保留；改的是 GPU 相機、畫框與輸出像素。
4. **預覽不能拖累重製**：`aig-real3d-v102-remodel-worker.mjs` 真 Web Worker 在獨立 CPU JS thread 執行 V101 結構修整；原始/上一次有效的 GPU 可保持顯示直到修整後來源成功。依 source/job ID & SHA 接收輸出，不會把過期模型誤當最新版。仍會共享 CPU 記憶體頻寬，不等於全機零負擔；尚無進行 AI neural model 的同執行緒/VRAM 實測。
5. **電影原生 4K 比例保留**：`planAIGReal3DNativeOutputWithinArtwork()` 將任何 9:16／3:2／1:1 原始 AI 圖片以 contain 方式映射到真正 3840×2160 畫面。重新計算 GPU 相機讓真 XYZ 模型落在對應圖片區域，原始圖片比例不拉伸，畫面其餘部分留原本工作區背景（本階不輸出原始圖片像素貼圖疊加）。輸出結束後自動恢復原圖片比例的互動預覽相機。

6. **預覽單槽排隊**：AI 累積多個版本時只保留最新 snapshot；更新間隔 AI 運算中至少 240ms，靜止可 16ms。優先 performance ≤450k 像素的 GPU 預覽，再視負載恢復 balanced。預覽不做 4K GPU readPixels；真原生 3840×2160 僅使用者按下載鍵時完整渲染。
7. **來源仍受 Gate 保護**：不修改來源圖片 SHA、不改面數、不改原始頂點、不重建背面、零件結構、原臉。Worker 修復是 V101 可重現的幾何演算法，**不是**已受訓神經網路。V100 真 TripoSR 模型權重 GPU Gate 未完成，不會從 V102 預覽 PASS 推導高擬真人物已完成。
8. **軸機功能不受影響**：AIG-II / AIG Studio 5.0 / FastModel 既有同一真 3D Core，共用 Render 預算概念；V102 不修改 CNC、NC、Fanuc、安全軸精度或正式 RGB HOME。

## 目前程式

- `formal-web/shared-3d/aig-real3d-v102-adaptive-frame.mjs`
  - `planAIGReal3DAdaptiveArtworkFrame()`：以圖片的 ROI、尺寸比例及真正 scene 3D 角點推演 Camera，而非 remeshing。
  - `findAIGReal3DVisibleAlphaROI()`：以 alpha 實際觀察前景；無透明度回退整幅畫框。
  - `createAIGReal3DAdaptivePreviewGate()`：僅最新 source snapshot、AI busy/idle GPU 刷新節奏、不觸發 4K。
- `formal-web/shared-3d/aig-real3d-v102-remodel-worker.mjs`：獨立 Worker 執行 V101 真 source 工作副本修整，附 source SHA/job 確認。
- `formal-web/shared-3d/aig-real3d-v99-native-source-lab.html`／.mjs：沿用真 GLB、V101 修整、切換來源與真 4K 下載工作頁，增加 AI 圖片尺寸/原圖 preview、透明主體 ROI、自適應相機、低負載 GPU 與 Worker 修整控制，全部真 callback。

## 可驗證測試

- `tests/aig-real3d-v102-adaptive-frame.test.mjs`：原圖 3:2、9:16、16:9、1:1 的真來源場景 ROI Frame Fit、實際透明圖判斷、三維原始頂點完全未改、影格合併與負載限流以及錯誤圖框 BLOCK。
- `tests/aig-real3d-v102-adaptive-frame.real-browser.mjs`：真 Chromium HTML Canvas 載入 384×640 透明來源 PNG 與真正 GLB 二進位，主體限於原圖片 alpha 框架、GPU 相機不改 XYZ，V101 後端獨立 Worker 完成，原模型與修整模型真的輸出 3840×2160 PNG、SHA 不同。合成三件四面體只用來測量這套資料鏈，不是女主角真人身份、髮絲、布料品質。

## Gate 與發布狀態

新的 V102 Source 和 Chromium Worker GPU Gate 都成功，才能稱 V102 技術原型通過，且不代表 CPU+GPU 互不影響、AI 訓練/神經生成模型已完成、自然人臉/全身一比一、2:12:08 電影完成。它真正修正的是「圖片構圖依渲染器修改」和「Worker UI 主執行緒被重製占住」的錯誤方向。

V102 先 Draft 獨立分支，不合併；正式網站 `https://aig-dual-formal-runtime.onrender.com/index.html#dual-projects`、已核准 Mobile／Desktop RGB Authority、CNC/Fanuc、Android APK/Windows EXE 一律保持原版本。
