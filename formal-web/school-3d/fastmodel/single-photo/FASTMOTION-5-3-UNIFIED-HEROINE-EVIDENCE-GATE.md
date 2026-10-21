# AIG FastModel 5.3 — 正式女主角來源 × 真 GLB × 動畫 × FPS 十一項統一 Gate（Draft）

## 可信續接鏈
- 5.2.0 `4d49f102fc260d1cfb37f29d1aea7ed7f7a2f656`，GitHub Actions run `39523088748` completed/success（完整來源 Gate）。
- 本階向前版本 `5.3.0`，仍在 AIG-Studio-5.0 的 `feature/aig-school-3d-hero-v1-20261020`、Draft PR #12；不得直接視為正式網站、APK 或 EXE 已更新。
- 3.7 來源人物：`HEROINE_SAKURA_CAMPUS_20261021`，已記錄原始照片 SHA，但 **GitHub 內仍無實際核准的正式女主角全身 GLB**。

## 工作區與真按鈕
- 原 RGB 5.0/5.1/5.2 功能保留，新增 `aig53-review` 真 callback 與 `aig53-download` JSON 證據下載。
- 5.3 只讀取目前已持有的 3.7、5.0、5.1、5.2 回報，沒有拿任意外部輸入的 JSON 偽裝授權，沒有呼叫昂貴的第三方 3D 服務。
- 每次照片、GLB 來源鏈、5.0/5.1 網格審查、5.2 截圖／FPS 變更，舊的 5.3 報告失效，須重新在 UI 按彙整。
- 同一份 GLB SHA-256、目前播放器的來源 SHA，以及相同 Clip 名稱，用作異源結果隔離。SHA 可以驗證位元內容一致，**不能驗證人物外觀語義是否相符，也不是來源證書的數位簽章**。

## 十一項 Gate
1. `AUTHORITY_PHOTO_SHA`：指定女主角原照位元 SHA + JPEG 尺寸校驗。
2. `GLB_SOURCE_PROVENANCE`：由 3.7 來源日誌衍生的真照片 → GLB SHA、生成任務檔案鏈；無真日誌即 BLOCK，單純匯入 GLB 不算。
3. `FULLBODY_SKIN_5_0`：15 節點全身骨架、真蒙皮、頭頸胸共享 indexed mesh、動畫變形。
4. `POSED_SEAMS_HAIR_5_1`：實際動畫取樣，肩頸接縫與馬尾／身體真三角面 SAT；只能證明有限樣本。
5. `VISUAL_16_VIEWS_5_2`：真 WebGL 16 格 PNG、四時間點四方向、同一來源 SHA／Clip。
6. `BROWSER_240_FRAMES_5_2`：瀏覽器實測 240 幀、p95 幀時間、卡頓、檢查頁面可見與來源。
7. `VIEWER_SAME_SOURCE_SHA`：目前真播放器 GLB 與來源吻合。
8. `VISUAL_IDENTITY_HUMAN_REVIEW`：真人臉型、服裝、長髮、背景及背面不確定性的人工核對，**沒有驗收系統**；BLOCK。
9. `ANDROID_NATIVE_DEVICE_60FPS`：正式 APK／原生 Android 60 FPS、溫度／持續運作，**無可信證據**；BLOCK。
10. `WINDOWS_NATIVE_DEVICE_60FPS`：正式 EXE／原生 Windows 60 FPS、持續運作，**無可信證據**；BLOCK。
11. `PRODUCTION_VIDEO_AUDIO_REVIEW`：由同一正式人物 GLB 驅動的真 1080p 有聲成片及實際人工驗收，**沒有證據**；BLOCK。

## 結論隔離
- 如果前七項全 PASS，輸出僅為 `TECHNICAL_BUNDLE_READY_FOR_HUMAN_REVIEW_ONLY`，**不是可發布人物、也不是全部十一項 PASS**。
- 缺任何前七項則 `outcome:'BLOCKED'`；後四項在 5.3 **一律 BLOCKED**，因為沒有真實來源與簽核／原生效能系統。
- `releaseAllowed:false`、`formalHeroineApproved:false` 固定保留。
- 加入使用者輸入的「已核准」字串、手動勾選或在 mock/test JSON 填 PASS，不能開啟正式發布。
- 來源 Gate PASS 只能證明程式與合成測試；Render 站點正式部署、上傳正版 GLB、APK／EXE、實際 Android/Windows GPU/60 FPS 測試尚未因此完成。
- 仍保留音樂、音效、AI 台詞、聲音與錄影工作流；是否真正生成原生 3D 女主角仍 BLOCK。

## 測試
- 正例使用人造且**明確標示為合成**的來源報告，確認前七項同 SHA／Clip 的形式驗證可通過且 release 仍不可用。
- 反例涵蓋照片錯誤、來源日誌異源、頭頸骨架異常、馬尾碰撞、16 格數不足、FPS 異源／低幀率／不可見、切換 Clip、切換 GLB。
- 只在最新版 SHA 的 GitHub Actions 完整 completed/success 時，才把最新提交列成「可信來源斷點」。
