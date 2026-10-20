# AIG FastModel 3.9 — 自動化 3D 重建服務（單圖與四圖）

## 本輪已接入的真實程式鏈路

**單次由使用者按下生成，之後才自動進行：**

照片／多角度原圖驗證 → 建立可恢復工作紀錄（SHA）→ Meshy image-to-3d 或 multi-image-to-3d → PBR 與模型 GLB → Meshy rigging → 基本走路／所選真實動作 → 真 GLB SHA 驗證與 3D 預覽 → 來源報告。

- **服務契約：** `reconstruction_service.py` 提供 `GET /api/reconstruction/services` 探索實際 provider、單圖／多圖端點、連線狀態、額度風險與未實作的備援服務。沒有安裝的本機 3D AI 並不假裝可用。
- **建立任務：** `POST /api/reconstruction/jobs`，原樣保護 `original JPEG/PNG/WebP`；`serviceId` 和 `autoStages:true` 必須與明確點擊一起送出。只容許 loopback host、同源與 `X-AIG-Request:1`；任何缺項、違法角度數量與來源異常都在計費呼叫之前阻擋。
- **續接：** `GET /api/reconstruction/jobs/{id}` 從本機工作紀錄讀出 `PRECHECK`／`RECONSTRUCTING`／`RIGGING`／`EXPORTING`／`COMPLETE`／`FAILED`／`SUBMISSION_UNKNOWN`，可更新真正的 download Path、SHA 與任務進度；`SUBMISSION_UNKNOWN` 不自動重 POST，防重複計費。
- **自動化：** 現有背景工人 `PhotoPipeline.step` 已連接 model→rig→animation，重新開啟網頁可以由已存 job ID 恢復查詢。PBR texturing 是 Meshy model task 內的一環，沒有獨立可觀測狀態，因此 UI 不偽造獨立 TEXTURING PASS。
- **多圖：** Meshy 官方 `POST /multi-image-to-3d` 允許一張主圖（正面）及最多三張其他角度；3.9 實際送 `image_urls`、保留所有來源原圖及轉換後 PNG 的各別 SHA；一併用原本的 Rig/Animation/GLB 流程。**不支援 8 張同時送到 Meshy**，不可自行捏造 8→1 融合模型。
- **打包來源：** 本次用戶指定的八視角已整理為 `AIG-FastModel-3.9-Heroine-8View-Reconstruction-DRAFT.zip`（工作區提供下載），SHA-256 `05f1cb891b51890375745627dde89d593e99ae0645e1d6fe451e522d9e4db031`。前／左／背／右建議選 00、02、04、06 四張；由於圖片分別生成，**它們沒有可驗證的共同 3D 相機座標**，不能保證一致，須人工確認。
- **正式狀態：** 來源程式與單元測試能 PASS，也不代表已經真實生成女主角的 GLB。尚未實際以用戶 Meshy 金鑰送出可能付費的 API、沒有真實外觀比對、頭頸／髮束／裙擺物理通過、實機 60fps 或完成女主角 1080p 有聲影片。

## 安全與正式驗收原則

1. 真 Meshy 模型下載後，必須以 `audit_glb` 檢查實際 mesh/rig/animation 結構及每個 GLB SHA；失敗不准冒充成品。
2. 完整女主角仍須真人視覺比對：臉型與原照、頭頸連續、背部與髮束、不穿模服裝、八角度比例、走路與打鬥真骨架動畫、1080p 音畫同步及 Android/Windows FPS。
3. 模型網格通過下載，只能稱來源完成；`releaseAllowed:false` 保持，直到實機驗收通過。
4. PR #12 保持 Draft，不合併 main、不更新 Render 正式 AIG 網站或 APK／EXE，也不把 2D ZIP 宣稱為 GitHub 圖片實體檔案。GitHub 只有 SHA／索引／程式；原圖二進位包在本次聊天工作區可下載。

**參考：** https://docs.meshy.ai/en/api/multi-image-to-3d
