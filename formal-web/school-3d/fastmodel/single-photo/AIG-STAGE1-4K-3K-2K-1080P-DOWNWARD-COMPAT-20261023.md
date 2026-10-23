# AIG Real3D Stage 1｜4K／3K／2K／1080P 向下相容（2026-10-23）

使用者正式新增「4K 3K 2K 1080P 向下相容」。此施工為 **Draft PR #44 原開發分支**，沒有部署官網或發佈 APK／EXE，也沒有解除既有 Stage1 人體外觀 FAIL/BLOCK。

## 明確的 16:9 原生輸出等級（市場用語 3K/2K 非唯一標準，故本案自訂精確尺寸）
| 等級 | 橫向原生像素 | 直向原生像素 | 真正像素數 |
|---|---|---|---:|
| 4K UHD | 3840×2160 | 2160×3840 | 8,294,400 |
| 3K（本案） | 3200×1800 | 1800×3200 | 5,760,000 |
| 2K（本案／QHD） | 2560×1440 | 1440×2560 | 3,686,400 |
| 1080P | 1920×1080 | 1080×1920 | 2,073,600 |

**自動模式：** 同一個 WebGL renderer 按上述順序評估真正 GPU `MAX_TEXTURE_SIZE`、`MAX_RENDERBUFFER_SIZE` 與裝置記憶體提示，選最高支援的級別。若高級別在真 GPU readback/PNG 階段失敗且 WebGL context 尚未損毀，允許逐級重試更低級別；但回傳必須明確寫出 `selectedResolution`、`actuallyDowngraded` 與高級別失敗原因。不足以完成 1080P 則 BLOCK，保留既有快照。

**手動模式：** 選 4K／3K／2K／1080P 後僅嘗試該級；不允許暗中改低解析度、用 2K PNG 假冒 4K、或將低解析度截圖放大到 4K。每張檔案需由 GPU 直接 rasterize 出正確目標大小，並核對 PNG bytes IHDR width/height 及 SHA-256。

**四視角自動模式：** 先讓第一張找出最高可靠輸出級別，其餘正面／側面／背面／45° 固定同一級；不能將不同尺寸的照片混入同一次驗收。任何後續視角失敗就整組未通過，不影響原始 GLB 和舊快照保存。

## 已修改的實際程式
- `aig-stage1-resolution-ladder.mjs`：四級原生像素設定、GPU 限額／記憶體門檻、自動降級、手動嚴格契約、PNG 實際大小檢查。
- `aig-stage1-true4k-capture.mjs`：新增 `renderAIGStage1ResolutionPNG`，真實單一 WebGLRenderTarget 逐級嘗試、真 GPU 讀回，依輸出方向套用 `fitHumanToView` 自動構圖，輸出符合原生解析度的 PNG blob 和 SHA；原 `renderAIGStage1True4KPNG` 仍可用且嚴格指定 4K，無降級。
- `aig-stage1-dual-adult-runtime.mjs`：自動／手動級別選單，四視角同級別、顯示真實所選畫質與降級說明、來源模型切換時不沿用舊圖證據。0.001 mm 與單核心 19,200 邏輯工作槽不變。
- `scene-runtime-studio.html`：已新增原生等級下拉選單。
- `tests/aig-stage1-resolution-ladder.test.mjs`：四級解析度與雙向旋轉、GPU 能力、低記憶體向下相容、嚴格手動失敗及防假 PNG 尺寸的測試。
- `tests/aig-stage1-dual-adult.real-browser.mjs`：新增真 Windows 模擬桌面 WebGL Chromium 4K／3K／2K／1080P 各一張原生實渲染 PNG、讀回並驗證 PNG IHDR 和 SHA（加上原男／女四視角手機／桌面快照）。測試在 CI 預約，未跑完前不得寫成 PASS。
- `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`：強制執行上述純來源測試及四份實 GPU PNG 檔案證據。

## 驗收狀態
本案仍是 Source Draft，**必須等待此最新 commit 的 dedicated Stage1 CI job 已完成 success 且開啟原始 PNG 後才能確認**。即使全四級 PNG 成功，人體結構與女主角外觀仍為 **FAIL/BLOCK**，不能因為像素增加而說模型已自然或實機原生 60 FPS。正式 Render 站、APK、EXE 未更新。
