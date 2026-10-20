# AIG FastModel 4.1 — 原生 SDF 隱式體積加速預覽（零點數）

4.1 把「每次調整都需重造 4.0 密集三角面」換成「先以解析式體積即時預覽，最終匯出才三角化」的 **AIG 自研、零外部 AI 推論** 路線。保留 4.0 原始圖片 SHA、比例報告與真正技術 GLB。只在原 Draft PR #12 開發，未上線正式 Render / APK / EXE。

## 功能與區分
- `aig-sdf-4-1.mjs` 的 `createImplicitScene()` 根據 4.0 已驗證原圖 SHA + 11 筆十等分二維輪廓比例建立 **有界幾何參數**，不捏造已量測的肩、腰、髮與腿長。
- `sdSphere`、`sdCapsule`、`sdEllipsoidApprox`、`smoothMin` 建立頭、頸、軀幹、骨盆、雙臂、雙腿、裙擺、髮量的 **十個解析式距離場形體**。頭頸採平滑融合並用實際負距離／連續性單元測試避免「斷頭」。
- `AigImplicitRenderer` 使用 WebGL2 + 自研 GLSL ES 3.0 full-screen SDF 射線步進，角度 0–315° 可旋轉。WebGL shader 與一張全屏面片只建立一次，每次角度變更僅更新相機 uniform，不重新整理 GLB 頂點／index。無 RTX / DXR 光線追蹤 API。
- 品質選項：極速（低解析度／少步數）、均衡、品質。這是 SDF 解析負荷調節，**不是 GPU 實測 FPS 保證**。工作區只報 WebGL draw 提交 JS 耗時與步數，未取得 GPU timing query／present timing 時不可當「60 FPS 已通過」。
- 該形體為**明確標示推估的幾何 mannequin**；四肢只是假設分段位置，沒有自動識別的人體 3D landmarks、正確髮束曲面、完整裙擺拓樸、臉部擬真、skin weights 或 clip。現有 4.0 GLB 仍需獨立輸出，可下載並在 AIG 3D 工作區載入；4.1 SDF 編輯 preview **不能直接冒充可通用的 GLB**。
- `releaseAig41()` 按鈕清除 GPU Program/Buffer，修改來源會釋放舊 SDF；不會清掉舊照片、4.0 已成功 GLB 或其他 Runtime 狀態。
- 若 WebGL2 不支援或 shader 編譯失敗，只保留經驗證的 4.0 技術 GLB 路線，不偷偷開啟第三方雲端重建。

## 免費與安全
- 預設伺服器 `allow_paid_3d=False`，不可使用 Meshy、Stable Fast 3D 或其他第三方 AI 模型。雲端 TTS／雲端台詞已加入相同的 **零點數封鎖**（即使有舊 key），回應 `ZERO_CREDITS_CLOUD_VOICE_BLOCKED` / `ZERO_CREDITS_CLOUD_DIALOGUE_BLOCKED`；`/api/config` 在預設零點數模式不廣告其可用。
- 4.1 的 JavaScript SDF 程式不做 network request，不會下載任何模型權重。Three.js、Pillow 等通用程式庫仍保留其原始授權；「自研」指 AIG 3D 生成算法，而非聲稱外部基礎函式庫全部由 AIG 發明。

## 4.1 證據 Gate
- **SOURCE**： `tests/aig-sdf-4-1.test.mjs`：符合來源 SHA 與比例約束、head-neck signed-distance 連續、SDF field 真函式，WebGL2 假環境連畫八次只建立一個頂點 buffer／只上傳一次、不重建網格，釋放 GPU 資源與來源連線檢查。
- **ZERO_CREDITS**：`tests/test_aig_native4_jobs.py` 增加雲端 voice/dialogue 防護測試，模擬帶有既有金鑰的服務也不得 generate。
- **BUILD**：npm test + npm build + Python 現有測試完整通過才可標原始碼 Gate PASS。
- **DEVICE**：Windows / Android WebGL2 真機 GPU 時間、實際穩定 60 FPS、功耗與發熱、GLB 視覺精度需實測，目前不宣稱 PASS。
- **RELEASE**：`formalHeroineApproved:false`、`realWomanMeshApproved:false`、`articulationReady:false`，不可作為擬真女主角正式影片。

## 後續實際研發
4.2 改用可追蹤的部位 landmark 與左右骨節選取，把 SDF 參數綁到動畫時間軸；先允許手動校正，之後再研發完全自動語義分類與可覆核信心區。4.3 製作正式 SDF→多材質 Mesh retopology／glTF skin，並做頭頸髮束 pose 衝突 Gate；4.4 用 GPU timer + 影像證據在 Windows/Android 實測 60 FPS／1080p 有聲影片。所有階段禁止暗中轉接付費服務。

## 4.1 施工檔案
- `aig-sdf-4-1.mjs`
- `app.mjs` + `index.html`
- `tests/aig-sdf-4-1.test.mjs`
- `server.py`（零點數雲端護欄）
- `tests/test_aig_native4_jobs.py`
