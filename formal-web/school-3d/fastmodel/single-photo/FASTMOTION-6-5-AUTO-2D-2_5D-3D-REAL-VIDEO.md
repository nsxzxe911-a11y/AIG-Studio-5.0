# AIG FastModel 6.5｜單張圖片／劇情 AUTO → 2D、2.5D、3D 動畫與真影片（Source Draft）

## 來源與升級
- 前一可信續接點：6.4.0／`1bde2c52270c67a5feb82a583bfa1cc6a94dccd5`；Actions run `39541521088`，90／90 PASS。
- 本階升到 **6.5.0**，全新 2D／2.5D 路徑**不必先建立 GLB、補拍側背面或標六點**；使用者可以只上傳圖片、只輸入劇情製作動態文字卡，或同時提供兩者。
- 保留 6.4 單張臉照／上半身補全真 GLB 與 5.0～6.3 來源、骨架、外觀、臉部、穿模驗證、舊 3D MovieWorkspace、故事、對話、配音、音效、原創音樂及所有泳裝／其他動畫服裝。不擅自合併 Draft PR、不聲稱已部署 Render、APK／EXE。

## 實際功能分流
1. `aig-auto-animation-6-5.mjs` 以 **故事實際辨識的 actionID、照片 SHA、現有 GLB SHA、實際 clips** 選擇可執行的路徑：
   - `2D`：真圖片 Canvas 的平移、縮放、輕微旋轉與字幕文字；純劇情也能生成**動態分鏡文字卡**。
   - `2.5D`：原始圖片 Canvas 背景推近與視差，只有原像素具 alpha 或可信的背景對比才分出實際前景畫素層；來源圖無可辨前景時**降級為單張圖片運鏡**並公開標註無量測深度，不能說成真正 3D 分層。
   - `3D`：只有已載入有來源 SHA 的真骨架 GLB 和**全部故事動作可配對到真 clips** 才可轉入既有 StoryPlayback 和 MovieWorkspace；不把 flat canvas 冒充 3D 骨架。
   - `AUTO`：真正有可播放的 GLB clip 全覆蓋優先 3D；否則依圖片、移動／鏡頭劇情選擇 2.5D 或 2D。
2. 不把無骨架圖片的簡單抖動說成完整人物走路、跑步、出拳、踢腿、格擋或跌倒。`punch／kick／block／fall` 等沒有相容 3D 真 clip 時明確 BLOCK；第二演員缺失同樣 BLOCK。
3. **本機圖片 → 真畫面**：`prepareAIG65Layers()` 讀取使用者原圖 RGBA，先檢查真 alpha，再用邊框中位 RGB 對比建立非精確前景 matte；不回傳無來源的合成深度。背景/前景利用兩個 Canvas 像素層以不同位移、縮放渲染，保留圖像主體與字幕。網格/圖層分離品質沒有照片語意或身分保證。
4. **真影片錄製**：`AIG65CanvasRecorder` 使用瀏覽器的 `captureStream(30)` + `MediaRecorder` 編碼 Canvas 實際繪製的 **1920×1080** 幀；依 `MediaRecorder.isTypeSupported` 回報真正 MP4 或 WebM 編碼格式；只有收到非空 blob、至少 2 幀真畫面才產生真檔案下載。目標 30 FPS，**不是實測穩定 30 FPS**，也不是原生 GPU 60 FPS。
5. **原創聲音**：保留現有 `StoryAudio` 的 `step()` 音效、`tick()` 配樂並在使用者主動按錄製時啟動 `AudioContext`；支援時用 `createRecordingBus()` 把本機 WebAudio 混入影片；瀏覽器系統 SpeechSynthesis 可作非錄製預覽，但**不能被標示為已進影片音軌**。若裝置缺音訊能力可輸出無聲影片，JSON 記錄實際音軌數。
6. **真狀態、來源隔離與輸出**：新 UI IDs `aig65-image`、`aig65-story`、`aig65-mode`、`aig65-duration`、`aig65-build`、`aig65-canvas`、`aig65-play`、`aig65-stop`、`aig65-record`、`aig65-report`、`aig65-video`、`aig65-downloads`、`aig65-status`。修改輸入後需重建，不可沿用舊時間軸；錄製進行中鎖定來源，手動停止標示部分影片而非完整劇情，編碼 FAIL 不產生假下載連結。原 3D 工作區、正式 RGB、其他服裝動畫功能保持完整。

## 驗收與限制
- 新增合成像素單元測試：僅照片／僅劇情、AUTO 選擇、真 RGBA alpha、背景差分、時間軸變化、真 Canvas `drawImage` 與動態文字卡、真 MediaRecorder blob、WebM/MP4 格式、防偽 SHA、防止將格擋／踢擊的照片抖動偽裝成真動作。
- 保留 Android/Windows 尚未實際跑此新版的限制。測試通過表示程式可以執行上述動作，**不等於真機 1080p FPS、影音同步、照片任意姿勢分層、人臉/全身身份相似度、實際打鬥動作已達正式品質**。
- 所有結果 `formalReleaseAllowed:false`；單獨每個模組 Gate 或 GitHub Source Gate SUCCESS 都不得代替正式 Render 發布及真機驗收。
- 只有最新版 HEAD SHA 的 GitHub Actions 完整成功，才可列為唯一可信 6.5 續接點。
