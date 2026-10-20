# FastModel 3.4｜真 GLB 動畫與混音：1080p 瀏覽器影片錄製（Draft）

以 FastModel 3.3 最後可信來源提交 `950a120b3df840b16c22423a3965ff5a6d6def82` 向前追加於 AIG Studio 5.0 Draft PR #12。**沒有部署正式 Render 網站、沒有合併 PR、沒有更新 Windows EXE / Android APK。**

## 實際程式行為

- **真實來源 Gate**：必須先本機載入可辨識 SHA-256 的 GLB，且 3.2 全部劇情動作均由真人物已有 GLB `AnimationClip`（或 3.1 兼容 Rig 的實際外部動畫）唯一配對。不得錄製假動作，不得把本機 2.5D 靜止照片冒充 GLB 3D。
- **真實 1080p 影像**：用 Three.js `WebGLRenderer` 暫時設定原彩 1920×1080、透視 16:9，分離的 `canvas` 每幀從實際 3D 渲染表面 `drawImage`，把當前繁體中文台詞畫入影片像素（不是只在 DOM 上出字幕）。再由 `canvas.captureStream(30)` 與 `MediaRecorder` 真正寫入影片 `Blob`，可預覽與下載。
- **容器與編碼誠實**：先試可用的 `video/mp4;codecs=...`，再按序嘗試 `video/webm;codecs=vp9,opus`、vp8、WebM；只依實際 `MediaRecorder.isTypeSupported` 選擇，並正確使用 `.mp4` 或 `.webm` 副檔名。瀏覽器不支援時拒絕錄製而非產假檔。
- **真聲音混音**：3.3 的 WebAudio 原創動作效果與背景節奏透過同一 `AudioContext.createMediaStreamDestination` 同時送到喇叭與錄影器。使用者可額外上傳**整段劇情配音**音檔（WAV/MP3/OGG 等，檔案小於 20 MB、解碼聲音長度不超過 180 秒）；使用 `decodeAudioData` 解碼，從劇情播放起點 `AudioBufferSourceNode` 送入同一混音軌。這是*使用者音檔*，不是生成出來的人聲，也不保證精準逐句口型同步。
- **瀏覽器系統朗讀不可混充**：`speechSynthesis` 沒有標準可被 `MediaStreamDestination` 取得的可錄人聲流。錄影時明確停用瀏覽器 TTS，保留已畫進畫面的字幕；沒有外部配音檔時，只含原創音效／配樂或無音訊的影像，不說已有人聲錄影。
- **輸出控制**：功能區 `movie-record`、`movie-stop`、`movie-voice-file`、`movie-preview`、`movie-downloads`。錄影中禁止更改人物 GLB、劇情、動作、台詞及雲端 AI 改寫；所有流程完成後會恢復原本 Renderer pixel ratio / canvas size / camera aspect，並停止聲音、釋放錄影 track、完成或失敗時釋放物件 URLs。
- **來源證據**：另下載 `AIG-FastModel-3-4-Real-Movie-Evidence.json`，標記影片實際容器、Codec、解析度、畫入幀數、檔案內音訊 track 數、使用者是否匯入人聲、真 GLB SHA、劇情是否錄完。明確 `browserSpeechCaptured=false`、`native60fpsVerified=false`、`heroineAnatomyVerified=false`；使用者提前停止必須標為*部分片段*。

## 實際限制與後續驗收

1. 目前 GitHub 分支仍**沒有經使用者核准的女主角 GLB 或正式打鬥動作**。無法提供「真正女主角打架的影片」；這裡交付的是可錄製的 Runtime 與使用實際資料的封裝程式，不是現成影像。
2. 目標 **1080p 30 FPS**，不是經 Windows 或 Galaxy S23 Ultra 實機測量的持續幀率。動畫播放依瀏覽器幀時序，`MediaRecorder` 可能丟幀、降碼率、AV 延遲，最終檔案須實機查看是否流暢、配音是否同步。
3. 音樂與 SFX 是原創 WebAudio 波形，品質尚需聲學調整；雲端 LLM 只產生文字，不自動生成歌曲、人聲或拳擊動作；匯入整段配音尚未支援按對白字數自動切句、配音與嘴形綁定。
4. 不是 Web Speech TTS 音軌；不是跨瀏覽器 MP4 保證；不是原生 Windows／Android 製作工具；不是剪輯軟體的多軌 timeline／完整音訊 mastering。
5. 仍須以 **正式女主角 GLB＋已驗證真動作＋Windows/Android 真機 1080p30** 實際錄成檔、開啟播放、核對 3.0 16 格頭頸皮膚與髮絲、音畫時間與容器有效性。Source Gate PASS 不等於以上實機 Gate PASS。

## 驗收來源

`movie-recorder.mjs`、`movie-ui.mjs`、`story-audio.mjs`、`viewer.mjs`、`app.mjs`、`index.html`；`tests/movie-recorder.test.mjs` 在受控 Browser API mocks 驗證真的 `MediaRecorder.start/stop`、有位元組的 Blob、真 WebGL `drawImage` 及字幕、聲音 track、缺 GLB 拒絕、Codec 分支與錄影失敗不能假成功；完整 GitHub CI `school-3d-source-gate.yml` 含 3.4 獨立 Gate 與之前 2.8–3.3 回歸。
