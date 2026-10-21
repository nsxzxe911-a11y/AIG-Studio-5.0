# AIG FastModel 6.6｜前景分層與本機臉部局部畫素變形（Draft / Source）

續接自 **6.5.0** / `29044733f0f0daa84fffd62d76b3b0edfde8d5bc`，在既有 PR #12 分支向前開發，不合併主線、不部署正式 Render 或 APK/EXE。

## 實作
- `aig-portrait-6-6.mjs`：限制最多一百萬像素的原圖降採樣；僅移除從外邊界連通且與邊角中位數相近的背景，避免把人物中間同色衣物錯誤去背。邊框背景混雜或前景比例異常，拒絕可信分層，沿用 6.5 基礎模式。
- 使用真實來源像素建立前景 Canvas 及背景 Canvas。被遮住的背景只是**邊界色填補的近似空洞**，不是生成或找回真正景物，更不是量測景深。
- 人物頭部位置採分割輪廓上緣的**幾何估計**，沒有生物五官辨識；可疑非人像輪廓不啟動臉部局部效果。無需要求四面圖片／手動六點；工作區設有可關閉的 6.6 選項。
- 偏移／壓縮**來源眼部及嘴部像素區塊**，提供本機 2D 眨眼、口型近似動態與四個技術控制節點（HEAD_ANCHOR, LEFT_EYE_PATCH, RIGHT_EYE_PATCH, MOUTH_PATCH）；**不是**臉部動作捕捉、嘴唇真 viseme、音軌對嘴、真人 head-neck skinned rig、無穿模證明。
- 與原 6.5 `drawAIG65CanvasFrame` 同步，每幀 960×540 預覽、1920×1080 MediaRecorder **使用相同局部動畫取樣**，仍保留 2D／2.5D／3D AUTO、GLB 來源和影音、所有服裝路徑。

## Gate
- 必須同時通過 `node --test tests/aig-portrait-6-6.test.mjs` 與保留的 6.5 所有回歸、`npm run build` 和最新 SHA GitHub Actions 才能稱 SOURCE PASS。
- 正式女主角身份相似度、任何單圖真實人臉定位、實際口型配音同步、臉部像素無破圖、實際 Android/Windows 1080p30 / 60FPS 和正式網站畫面均未驗收。
- `releaseAllowed:false`。PR 保留 **Draft**，沒有宣稱上線。
