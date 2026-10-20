# FastModel 2.9 — 正式女主角真模型、四方向、動作姿態驗收台

承接 FastModel 2.8 `ab44d5986ab1d666078cc1db764bb3b275121d84` 的雙層皮膚、退化面與動畫抽樣，僅在 **Draft PR #12** 開發，不合併或部署 AIG 正式網站。

## 2.9 實作

- **直接本機載入真正的 GLB**（200 MiB 以下），無需 Meshy 雲端金鑰或生成點數，不替換成合成技術模型。
- 檢查動作片段 0%、25%、50%、75%：使用載入 GLB 的現有動畫 AnimationMixer 正式骨架姿態，在特定時間取樣實際已變形網格；沒有動畫時明確視為靜止模型，絕不生成假的走路／打鬥。
- 四方向實拍（以 GLB 世界座標 +Z、+X、−Z、−X，**不是**自動辨認人體前後）：由同一模型同一骨架姿態，旋轉相機、渲染原本的 PBR 材質，將當時畫面製成 2×2 PNG 拼圖；每張以真實姿態 bounds 定位，避免手腳動作超出視野。
- 擷取後**必須還原相機、OrbitControls、動畫 mixer 時間、暫停狀態及 viewport 尺寸**；任一失敗仍試圖安全還原，不得刪除／修改原始模型。
- 針對同一動作時間執行 2.8 的真幾何風險掃描，輸出模型 SHA-256、clip name、動作時間、四個實際視角、雙層重疊面數與是否取樣截斷的 JSON。
- UI「擷取真實人物四方向檢查圖」與真動畫 0／25／50／75% 姿態選單有實際 callback，完成後可下載 PNG 與 JSON；模型重新載入會撤銷舊下載 Object URL，防止跨模型沿用證據。
- 來源測試：Four-axis camera geometry, real clip fractional time, model unchanged, SHA-256 required, all-four views tracked, no automatic quality approval, current renderer capture/camera/animation restore contract and actual viewer single-file JS bundle.
- Raster/PBR、原彩、無光追；使用單次手動渲染截圖，不代表會即時 60 FPS。

## 正式 Gate BLOCK

- Repo 目前未有經核准的人物 GLB：全倉庫 GLB 查詢僅有 CNC 六軸機台 GLB；不得拿機台、合成四面體或 2.5D 浮雕冒稱女主角。
- 四角度 GLB 世界座標可能不等於人體正面或背面；需人工轉動確認臉、耳朵、髮絲、脖子與肩線連續。
- 2.8 的三角面完全重合不等於全部三角面交穿檢測，近似包圍盒不能判定髮束沒有穿脖子。
- 沒有實機 WebGL 擷取截圖與正式模型人工對照時，`visualHumanReviewPassed=false`；頭頸焊接、髮絲透明排序、戰鬥動畫碰撞與 Windows/Android native FPS60 仍未通過。
- GitHub synthetic/source CI success 只代表程式合約測試，不代表網站已上線或使用者看到了正式女主角。
- PR Draft 不合併，不對正式 Render 網站部署，不改 APK/EXE，除非進一步有明確部署／驗收指示。

## 真正可用的驗收順序

以獲核准的女主角 GLB 與原始動畫：本機載入 → 核對 SHA 與模型來源 → 選原始動畫片段和 0／25／50／75% 時間 → 擷取 4 個世界座標視角，人工辨識人體真正前／後／左右 → 對照皮膚抽樣 JSON 與影片中出現問題的影格 → 修復 Working Copy 後重新匯入、重新驗證同一動作。只有原檔、修正版、實圖、動畫與實機數據全部具證據，才能稱為正式通過。
