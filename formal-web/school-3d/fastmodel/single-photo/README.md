# FastModel 2.7：單張照片 → 真 3D 網格 → 骨架動畫

這是**新加入的雲端重建工作流程式**，不再依賴 2.6 的固定 1672×941 圖片或手動髮束 guides。它實際呼叫 Meshy Image-to-3D／Rigging／Animations，生成 PBR 網格與蒙皮動畫，保留原圖與每段 task ID，再由本機 Three.js viewer 播放。

**目前驗證範圍**：本機 HTTP 協定／生成鏈路、斷線續接、真正 GLB 結構及 AnimationMixer／TRS／morph 功能。開發環境沒有 Meshy API key 或 NVIDIA GPU；尚未呼叫真生成服務，也沒有真照片重建結果、擬真品質、頭頸與髮束修復、Windows／Android 60 FPS 證據。CI 圖形是明確標示的合成四面體，不是女主角模型。

## 啟動

需要 Python 3.11+；由原始碼執行另需 Node 22+。API key 由已購買／可使用的 Meshy 帳戶取得，只設於服務主機環境變數 `MESHY_API_KEY`，不寫進 HTML、Git 或聊天。生成會上傳所選照片至 Meshy，使用該帳戶的點數。本次未替使用者購買、開通或消耗任何生成點數。

在本目錄執行一次建置：

```bash
python -m pip install -r requirements.txt
npm ci
npm run build
```

下載 CI 的 `SOURCE-AND-LOCAL-VIEWER` 包時已含 `dist/`，不用重新建置 Node。

啟動（將工作目錄換成自己的新專用資料夾）：

```bash
python server.py --root /path/to/AIG-Photo-Jobs
```

Windows 也可用 `python server.py --root E:\AIG_Photo_Jobs`。開啟 `http://127.0.0.1:8765`，選照片，選「完整人物」，按一次「生成 3D 動畫」。未設定服務帳戶時，會顯示未連接並停用生成，不製造替代模型。金鑰變更後重新啟動服務。

預設會：EXIF 轉正並建立最大邊 2048 的上傳副本 → 3D 網格＋PBR → 人物骨架 → 使用骨架服務附帶的真步行動作。動作選單連接官方動作目錄，可另選動作，此時會建立 Animations task。服務主機暫時只監聽本機，並非已部署的公開網站或 APK／EXE。

## 適用範圍

- PNG、JPEG、WebP，來源 <=20 MB，<=4000 萬像素；保留原始檔與 SHA，使用另存的 PNG 上傳，不覆寫原圖。
- 人物模式：單一完整人形最好，四肢清楚；多人、遮擋、局部臉像、動物不保證可綁骨架。生成失敗保留已成功網格，不換假人物。
- 一般物件模式：生成真正網格並做相機環繞展示；**沒有宣稱物件有骨架動作**。
- 單張圖不可見的背面、厚度與細節由模型推估；`inferredUnseenSurfaces=true`。只有真照片逐角度／逐動作驗收後，才能評定造型保真與擬真程度。
- 輸出 `model.glb`、`rigged.glb`、`animated.glb`（依模式／成功階段）、`job.json` 與 SHA 結構報告；可下載不依賴 CDN 的離線 HTML。生成需網路，完成的 GLB／HTML 可離線播放。
- 新 viewer 支援普通模型、PBR／貼圖、蒙皮、translation／rotation／scale／morph 動畫。仍未提供 MP4／音訊時間軸、精確碰撞、頭頸拓樸焊接或原生效能驗收。
- GLB 結構檢查拒絕空幾何／無 XYZ 範圍／假動畫／外部資源；目前不支援 Draco 壓縮來源的結構稽核。結構通過不是擬真通過。

## 斷線與續接

程式先落盤 SUBMITTING，再 POST。受理結果未知就停在 SUBMISSION_UNKNOWN，不自動重送計費。用服務平台找回已受理的 task ID 後，可以接回原工作：

```bash
python pipeline.py --root /path/to/AIG-Photo-Jobs --job JOB_ID --attach-stage model --task-id EXISTING_TASK_ID
```

骨架／動作對應 `rig`／`animation`。一般續跑（沿用既有 task ID，不重新送出）：

```bash
python pipeline.py --root /path/to/AIG-Photo-Jobs --job JOB_ID
```

成功階段與原圖保留，下載錯誤不會重新生成。401／402／429 明確保留錯誤狀態，不自動消耗更多點數。當服務明確拒絕或生成失敗時，建立新任務才會重新送出。

## 驗證與來源

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
npm test
npm run build
```

Official API contracts checked 2026-10-21:
- https://docs.meshy.ai/en/api/image-to-3d
- https://docs.meshy.ai/en/api/rigging
- https://docs.meshy.ai/en/api/animation
- https://threejs.org/docs/examples/en/loaders/GLTFLoader.html

Three.js 0.180.0（MIT）與 esbuild 0.25.12 固定版本並包含 npm lock；僅使用程式庫，不載入第三方人物模型或外部環境圖。光柵 PBR，無光線追蹤。2.6 固定圖流程、舊 renderer、快取／掃描均保留，沒有把新 viewer 的能力冒稱為舊核心已完成。
