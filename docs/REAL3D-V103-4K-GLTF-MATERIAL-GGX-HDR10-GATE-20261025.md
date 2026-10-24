# Real3D V103｜4K 可靠輸出 → 保留 AI 原始材質與貼圖 → GGX SDR → HDR10 真實 Gate

日期：2026-10-25。承接 V102，不動 Render 正式網站／RGB HOME、CNC、Fanuc 或 Android／Windows 已完成版。所有功能先在 Draft 研發分支經過真 Source＋GPU 驗證。

## 最高優先：找出並修復 4K 匯出逾時原因

實際檢查 V102 CI 日誌發現 `STATUS=BLOCK: REAL3D_V96_4K_SOURCE_GEOMETRY_CAMERA_OR_RESOLUTION_INVALID`；並非以為的 4K GPU 太慢。V102 自適應 camera 計算只給 yaw/pitch/orthoSpan/distance/focus，V96 4K Source Auditor 強制要求 `fovDeg`，即使投影為 orthographic。V103 修正相機契約提供合理預設 `fovDeg:55`。V103 Source Gate 增加**同一 V102 portrait→native 3840×2160 frame→V96 實際來源幾何 audit**的 regression，避免假「下載 PASS」。

先前已修正舊函式把少於 2,000 source triangles 視為假模型而無法擷取 4K。V103 不改真正原始網格以迎合 Gate；品質不足由獨立 Detail Gate 檢測，不影響合法小型零件匯出。

## 第二優先：保留 AI GLB 自帶的原始材質與貼圖

延續 V102 已修的 glTF material 常數保全，V103 新增實際讀取 glTF 2.0 GLB 內嵌 `image/png`／`image/jpeg` 貼圖 `bufferView`：驗證圖像來源、索引、pixel bounds、RGBA decode 及 UV；`POSITION`／`NORMAL`／`indices` 原樣不動。讀取 `TEXCOORD_0`、可選 `TANGENT`，無切線時由實際 XYZ+UV 求解；再把真正 BaseColor PNG／法線貼圖映射到已存在的 AIG WebGL texture path。

目前保留 glTF source authored `baseColorFactor`、`metallicFactor`、`roughnessFactor`、`emissiveFactor` 與 `doubleSided`。實際貼圖支援來源為**GLB 內嵌 PNG/JPEG + UV0 + BaseColor/Normal**；圖尺寸上限 2048×2048 由 GPU source budget 控制。4K 是 frame pixels，不代表模型材質貼圖必須同時 4K。維持真正的 PNG/JPEG Source SHA 及原 GLB SHA，不會修改來源 bytes。

嚴格限制：尚未還原 glTF `metallicRoughnessTexture`／occlusion／emissiveTexture／外部 URI／KHR_texture_transform／UV1／glTF skeletal animations 的所有光學參數；不支援且影響結果者明示未驗證或 BLOCK。V101 Working Copy 會修復面方向但不代表 UV/切線方向經過完整重新驗證。這輪不是完整 glTF 全材質 PBR 合規。

## 第三優先：實際 GGX 金屬粗糙度 PBR 光照

共享 `aig-real3d-webgl.mjs` 加入可切換的 `PBR_SDR` 光照模式：GGX normal distribution、Schlick-Smith visibility、Fresnel-Schlick，根據真正來源金屬度／粗糙度及 sRGB basecolor 耦合材質，不再只能使用 Phong-like 高光。舊 `LEGACY`／`FILM_SDR` 保留供 RGB 風格一致性驗收。

本輪 GGX 實作以單一 direct light + 簡化環境補光，**不是**經過實際 HDR environment maps / IBL 及 glTF metallicRoughness map 驗收的全套物理材質。Shader 仍輸出 SDR RGBA8。

## HDR10 絕對不能假宣稱

`aig-real3d-v103-hdr10-evidence.mjs`：將真 HDR10 來源條件清楚分開，包括真正 linear HDR framebuffer、已測量的高動態亮度、10-bit HEVC/PQ ST2084、BT.2020、mastering display metadata、MaxCLL/FALL 與真 10-bit decode + file SHA。這輪 V103 沒有將 WebGL RGBA8 轉成真 HDR10 的完整傳輸流程，沒有宣稱只增加 saturation/gamma 就是 HDR10。外部 caller 自報 10bit 也不算獨立媒體證據：HDR10 release Gate 永遠 BLOCK，等待真正高精度 source+encoder+decoder 實測。

## 真驗收

`aig-real3d-v102-adaptive-frame.test.mjs` 補 V96 4K camera fields 回歸。V99 Node Source Gate 檢查來源模型材質因子不被預設顏色替換。`aig-real3d-v103-pbr-material.real-browser.mjs` 真 Playwright/Chromium 直接生成並上傳具有源 UV／Tangent／PNG BaseColor／Normal 的 12 原面測試 GLB，驗證原本 GLB material factors、實際貼圖影像解碼、PBR_SDR GPU shader 切換及 framebuffer 畫面 SHA 不相同，保存截圖與來源驗證 JSON。V103 Source+GPU 成功不代表女主角臉/頭髮/衣物已達電影品質，也不等於正式 HDR10 已編碼輸出。

**發版原則**：Source/4K/texture PBR GPU Gate 任一 FAIL，維持 Draft，不合併 V102／V103；不碰正式 Render、CNC/NC/Fanuc、APK/EXE。
