# Real3D V96｜原生 4K 高品質幾何繪圖、GPU 預算與鏡頭清晰度

2026-10-24，承接 V95 肩部照片 → 真 XYZ 候選全身 → 六關節動畫。隔離 Draft，不動正式 Render RGB HOME、CNC、Fanuc、Android APK 或 Windows EXE。

## 不能靠放大低階圖片充當 4K

1. 原生 UHD 4K：3840 × 2160，真 Native RGBA 共 8,294,400 像素。單張 RGBA8 至少 33,177,600 Bytes；保守 5 份中間影像緩衝估算 165,888,000 Bytes。此處未包含深度緩衝、實際 GPU driver、材質、MSAA 額外使用記憶體。
2. GPU frame buffer 真實 MAX_TEXTURE_SIZE 和 MAX_RENDERBUFFER_SIZE 必須都至少 3840；Source 渲染器 exact-frame limit 是 9,000,000 pixels，不足就 BLOCK，不偷退回 1080p。
3. 程式 formal-web/shared-3d/aig-real3d-v96-native-4k-pipeline.mjs 實作 GPU dimensions / memory budget、來源原始 3D 實際投影面像素大小、Native readPixels 4K PNG + SHA-256、原始 mesh 不變的品質 Gate。
4. 原生 4K 表示每像素是實際 GPU output，不能假裝原始幾何變得細緻、PBR 光學材質物理正確、HDR10 或 4K60fps 動畫達標。

## 高畫質先看 3D 本體

原始 Indexed XYZ 三角面頂點經原始 3D 世界矩陣及相機正交／透視投影到 3840 × 2160。每條原始邊的投影長度大於預設 20 pixel 時屬近景模型細節警告；大於門檻的 source edges 比例超過 8% 時標記 SOURCE DETAIL BLOCK。這是真實立體幾何的取樣品質預估，不是曲面、人體 1:1、陰影、材質及真實場景的全面認證。不補造任何原始三角面，不擅自使用 SDF／Metaball 或平滑假人體。

## 繁中研究頁

沿用 V95 本機一張肩部照片建模與六關節 WebGL 真動畫研究頁，新增 FULL_HD、UHD_2K、UHD_4K 原生輸出選擇。【檢查原始 3D 清晰度】提供正側背斜可見 source 邊、GPU 上限、記憶體估算與幾何面密度報告。【輸出真 GPU 4K PNG】讀真 WebGL GPU Frame Buffer，驗證圖片 SHA 及 3840 × 2160 native IHDR，允許低細節模型輸出證據但須顯示幾何不足與正式電影 BLOCK。原始輸入照片 SHA 與原女主角身份 Gate 保持不變。沒有得到認證的 ML 影像分析不可冒充 AI 真人逆向工程。

## Source / 真 Chromium GPU 4K 自動測試

- 原始像素 3840 × 2160、記憶體、GPU 尺寸上限不得偷偷降低解析度。
- 原始 3D 低面數幾何必須 BLOCK，較高密度 source 有可檢驗的 source edge 投影改善。所有原始頂點／三角形不變。
- 真 Chromium 原生 GPU 輸出 3840 × 2160 PNG，真 GPU readPixels、IHDR 寬高與 SHA；用非人體合成來源圖檢查資料鏈路，絕不把通過視為真女主角外型品質通過。
- 正式 4K 電影畫質、連續 24/60 FPS、物理 PBR/HDR10、動態頭髮、皮膚、服裝、完整長片 2:12:08、音樂配音、APK/EXE 及正式 UI 仍 BLOCK。

驗收原則：只能宣稱實際通過的 Source + GPU 4K 技術 Gate。V96 候選保留 PR Draft，不替換正式網站。
