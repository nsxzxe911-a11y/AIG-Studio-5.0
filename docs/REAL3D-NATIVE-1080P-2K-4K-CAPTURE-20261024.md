# Real3D 原生解析度輸出 V1｜1080p／2K／Android 1440×3088／4K（2026-10-24）

## 先確認並修復的來源根因

原 Real3D 咖啡色七視角輸出固定為 1080×1920（2,073,600 px），既有 WebGL 來源 `captureNativePNG` 強制攔截超過 3,200,000 px 的圖片。真正 2K 直式 1440×2560 是 3,686,400 px，Android 1440×3088 是 4,446,720 px，4K UHD 直式 2160×3840 是 8,294,400 px。**以前不能真輸出上述高解析度。** 把 1080p PNG 在 CSS 拉大不會產生額外細節，必須 GPU 真正生成對應尺寸的 framebuffer 並 readPixels。

## 本輪變更

- `aig-real3d-native-resolution.mjs`：定義 `AUTO / 1080P / 2K / PHONE_1440_3088 / 4K` 原生像素；直式、橫式共用；計算像素總數、估計 GPU＋讀回／轉 PNG 峰值記憶體、要求真正硬體貼圖與 renderbuffer 限制、低 RAM 4K 報 BLOCK。Auto **不直接選 4K**；僅具備條件的裝置可自動到 2K。
- 共享 `aig-real3d-webgl.mjs` 的**精確、使用者按鈕觸發的單張原生輸出**提高到最多 900 萬像素，足以支援真正 2160×3840 UHD，不影響既有低記憶體預覽約 320 萬像素安全限制。黑色外輪廓以原生畫布寬度調整像素粗細，而非以模糊放大取得線條。
- 在 `aig-real3d-human-brown-render-lab.html` 新增真操作 UI：解析度、直式／橫式、正面／側面／背面／45°，以及「產生真正原生解析度 GPU PNG」與下載。既有 7 張幾何／咖啡色驗證圖仍固定 1080×1920，確保前後比較不被改壞。
- 真匯出時重新讀取來源原始 OBJ／GLB 檔案並核對 SHA，重新建立一致的原始 3D indexed triangle Scene，用共享 GPU 設定同一正交角度渲染。輸出原生 PNG IHDR 寬高與實際原生 readPixels 必須精確符合選擇尺寸，紀錄檔案 SHA 與 `resampledFromSmallerImage:false`。**不調整任何模型三角面，也不補出來源不存在的 3D 人體細節。**
- 當 GPU 貼圖能力、低記憶體或實際驅動無法完成 4K readback 時，UI 顯示明確 BLOCK，並隱藏下載按鈕；絕不能回傳 1080p PNG 偽稱 4K。原 Render LIVE 尚未部署，前版 APK／EXE 也沒有更新。

## 技術及驗收限制

1. 原 QA 的透明參考圖仍為固定 1080×1920；高解析度輸出主要用於**觀察與下載**，不能拿 4K 的截圖直接與 1080p 透明照片用同一像素表做 IoU。
2. 解析度與網格幾何密度是兩回事。4K 可減少輪廓像素化、改善保留細線能力，**不會自動補五官、頭髮、手指、分離雙腿或 1:1 人體來源**。
3. 4K 單圖需要約 8.3M 像素，單靠畫面讀回和遮罩等臨時 buffer 就需要約 198 MiB 以上，還不包含驅動/瀏覽器與 OBJ 原模型，尤其手機應優先用 Auto／1080p。
4. 真 Chromium Browser GPU Gate 要下載至少一張 1440×2560 的真原生 PNG 和 SHA，並嘗試 2160×3840；如果實測硬體擋住 4K，必須保留原始失敗證據，不假報 4K GPU 已 PASS。
5. 本輪所有測試幾何是明示非人體合成模型，外觀人體 Gate 繼續 BLOCK。PR 仍為 Draft，不合併、不改 AIG 原 RGB HOME、CNC 3AX～6AX/NC，也不生成 APK／EXE。
