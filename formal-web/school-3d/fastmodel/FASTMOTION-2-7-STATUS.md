# FastModel 2.7 — 單圖真 3D 後端與完整動畫預覽入口

更新：2026-10-21，Asia/Taipei。續接 `d3435ecbc90fd33e47725f589a5757d47de05611`（2.6 exact SHA，Push #39459469096／PR #39459480001 成功）。Repo `nsxzxe911-a11y/AIG-Studio-5.0`，branch `feature/aig-school-3d-hero-v1-20261020`，PR #12 Draft。

## 已實作並經程式測試

- `single-photo/` 新獨立流程：任意尺寸的受支援 PNG/JPEG/WebP → EXIF／上傳副本 → 官方 Meshy image-to-3D PBR 網格 → rig → 附帶步行或選定動作 → 下載真 GLB。無舊的固定圖 hash、固定 1672×941 或手動髮束輸入要求。
- 選圖、真生成 callback、階段狀態、動作選擇、下載及離線播放頁。金鑰只留在服務端；無服務金鑰時清楚阻擋，不產生替代模型。
- Three.js／GLTFLoader／AnimationMixer 的獨立 PBR viewer，支援普通模型、TRS／morph／蒙皮與選定 clip；實際測試骨架位移、旋轉、縮放、morph 變化。與原 2.6 renderer／掃描／快取分離，不冒稱舊姿態稽核已支援所有通道。
- 來源及上傳副本各自 SHA、任務 journal 原子寫入、成功模型不因後段失敗消失、下載重試不重新生成。
- POST 送出前 SUBMITTING；受理未知即停在 SUBMISSION_UNKNOWN，不重送計費。瀏覽器在 upload 前保存 source SHA／選項對應的 request ID，reload 可找回原任務；預設步行下載會用既有 rig ID 更新網址。
- 物件模式只標示真 3D 物件＋相機環繞；不把相機運動充當人物／動物骨架動畫。

## 可核驗結果與限制

- 新增 Python 19 項協定／HTTP／續接測試，既有 2.6 Python 8 項保留；新 Node 4 項，加原 137 項回歸。最後結果以新 exact SHA Actions 為準。
- 官方 API 協定用本機 HTTP fixture 驗證，GLB 使用明確標記的合成四面體。CI 提供 source／本機 viewer 包及 SYNTHETIC HTML／GLB／report；不是女主角，不是真服務生成結果。
- 開發環境沒有 `MESHY_API_KEY`、`TRIPO_API_KEY` 或 NVIDIA GPU。本輪**沒有呼叫付費生成服務、沒有購買或消耗點數、沒有真照片推論結果**。程式連接已實作，服務帳戶與真推論仍未接通／驗收。
- Playwright Chromium 安裝下載回來的內容不是有效 ZIP，瀏覽器無法啟動。本機畫面／點選／實機 GPU 證據仍未完成。Node 真 GLTFLoader／AnimationMixer、打包與 HTTP callback 測試不能替代畫面驗收。
- 完整單一人形才適合此後端骨架路徑，動物／多人／遮擋／局部臉像不保證成功。任何單圖不可見的背面與厚度均屬推估。照片保真、擬真品質、頭頸焊接、髮束碰撞、MP4／音訊輸出、Windows／Android 原生 1080p60 均未驗收。

## 續接與解除阻塞

先在服務主機設定可用的 Meshy 帳戶金鑰，依 `single-photo/README.md` 啟動服務。使用真照片送出一次，核對 provider task IDs、輸出 SHA、模型／材質、完整人物骨架與逐動作影片；再作 Windows／Android 圖像與效能驗收。不得把 synthetic CI PASS 描述為照片推論 PASS。

未部署正式 Render、未合併 PR、未發布 APK／EXE。AIG-II 本輪未修改，沒有同 exact-SHA 雙案 Gate，不宣稱雙案完成。
