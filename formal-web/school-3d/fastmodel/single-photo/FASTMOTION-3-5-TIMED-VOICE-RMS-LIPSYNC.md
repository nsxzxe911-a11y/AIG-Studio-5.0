# AIG FastModel 3.5 — 逐句配音、真音訊波形口型（Draft-only）

## 完成範圍（功能原始碼，非實機影片驗收）

- 保留 3.4 的 1920×1080 30fps target real-GLB MediaRecorder、同源 GLB SHA、已核准 codec 檢查、WebAudio SFX/music 與單段音檔模式；只在 Draft PR #12 修改，不覆蓋 production Render／AIG-II／APK／EXE。
- 新增「逐句配音」多檔選取。檔名必須以前導 1-based 動作序號命名：`01-走路.wav`, `02-閃避.wav`, `03-出拳.wav`（也接受 MP3、OGG、WebM 等現有音訊解碼格式）；對應每個已解析並配對 **真實 GLB AnimationClip** 的 timeline step，不能缺檔、重複或混入錯序。全部檔案加起來 <=20 MiB。
- 單檔長度必須 <=其動作 clip 秒數＋0.05 秒；若超出，`MOVIE_VOICE_CUE_LONGER_THAN_REAL_ACTION_N` BLOCK，不偷偷改原始人物動作、不壓縮聲音、不覆蓋前次成功影片。
- 對應動作開始 `StoryPlayback.onStep` 時，WebAudio 播放已 decode 的第 N 段人聲。換到下一動作先 stop 前個來源再播下一句；錄影混音軌含該音訊。整段配音檔與逐句模式互斥，亦不會把 `speechSynthesis` 朗讀說成可錄音人聲。
- 存在 `jawOpen`、`mouthOpen` 或 `viseme_aa` 的**現有 GLB morph target** 才能把實際來源聲音的 analyser/time-domain RMS 音量反映為口型開合；錄製結束、錯誤、取消後都恢復口型變形原值。沒有通道就禁止虛構 mouth meshes。
- Evidence JSON 包括人聲片段數、動作時間碼、可用 mouth morph 的實際檢查和 `phonemeLipSyncVerified:false`；**RMS 只是音量跟隨，不是聲母韻母、注音音素或口齒形狀的精準 TTS/viseme 對嘴**。

## 女主角參考來源

使用者於 2026-10-21 指定：櫻花校園背景、長棕髮、深色制服外套、白襯衫、格紋蝴蝶結／百褶裙、背包的女生照片（會話附件本機原始內容為 JPEG，畫素 1152×1536，SHA-256 `fbf47f32a844a80e1bb39cb23084527baaf1350427c20d2b49d21fdc453444d6`）。

此處**只有視覺規格與內容 SHA 記錄，未把二進位圖片或人物 GLB 寫入倉庫**。單張角色圖 ≠已完成真 3D 人體及人物動畫；不可直接聲稱女主角 1080p 影片已產出。

## 風險與待驗收 Gate

1. Node 單元測試（新：逐句音檔次序、缺檔/互斥、RMS 真 WebAudio 分析與 mouth influence cleanup），完整 npm build、舊版 3.4 回歸及 GitHub exact-head Actions Gate 尚需實際驗證後才可標 PASS。
2. 相機／嘴型僅支持 GLB 真 morph，沒有 mouth morph 仍要走完整 3D 動作，但絕不宣稱嘴型可用。
3. 如果台詞長於真動作 clip，必須新增加長動作或調整台詞；這一階不自動變造快慢與聲波。
4. 真實女主角 GLB、頭頸／髮絲物理穿模、打鬥多角色、音素口型精度、Windows/Android 1080p 錄影播放與 60FPS GPU 效能仍未驗證，未上 production Render。
5. 本階段不提供即時雲端 TTS 生成音訊檔，使用者匯入真實 WAV／MP3 聲音；雲端 AI 劇情文本功能維持原有設定。

## 手動驗證

1. 在 3.5 Draft 本地預覽匯入已含真實動作片段的符合角色 GLB，確認來源 SHA。
2. 輸入「女主角走進教室，閃避，出拳」，每段必須對到唯一真 clip；依順序匯入 `01.wav`, `02.wav`, `03.wav`，每段必須短於對應 clip。
3. 按 1080p 錄製，確認音軌真有聲、字幕與動作切換一致、GLB 如果含 mouth morph 時有音量對應開合。沒有 mouth morph 時只能顯示不可用，不得補假角色。
4. 強制停止或使 Codec fail，應隔離失敗錄影、恢復原 morph 值及 viewport，保留上一份成功匯出。
5. 在 Windows/Android 實機量測丟幀、影片尺寸、畫音延遲、播放器相容性；先通過才可稱實機完成。
