# AIG FastModel 3.6 — 可錄影的逐句 AI WAV（Draft-only）

## 功能（真碼、需按下使用；非真女主角影片）
- 以 3.5.0 為基準只前進、不回退。所有變更保留在原 Draft PR #12 的 feature branch。
- Python localhost 伺服器在使用者**明確按下**產生全部逐句 WAV 後，才逐句 POST 至 OpenAI Audio Speech API（`gpt-4o-mini-tts`，`response_format: wav`）。後端獨立持有 `OPENAI_API_KEY`，不把 API Key 暴露給網頁，無自動重試。若成功回傳 RIFF WAVE，前端驗證容器長度、各 chunk，使用真實檔案而非瀏覽器 speechSynthesis 假錄製。
- 必須已有已載入來源 SHA 的真 GLB，以及每個 action 都有唯一真 clip，且每段均有台詞。獨立流程需先由使用者輸入劇情並解析。生成後檔名為 `01-AIG-AI-Voice.wav` 等，直接接進原 `MovieWorkspace` 的逐句匯入路徑供原 1080p 實際 GLB 錄製；不會把 WAV 冒充成有角色聲音的 MP4。
- 每個生成音檔 <= 4 MiB，所有片段 <= 20 MiB；收到後先 WebAudio 真解碼測長，**超過真動作 clip 時立刻停止後面 API 呼叫**，顯示實際秒數缺口，並拒絕冒用成功結果。完整成功時才原子替換既有可用語音。
- 文字／AI 改寫／換角色／劇情／聲線更改皆撤銷聲音關聯；網路中斷後不自動重送 API，避免不確定是否被計費而重複扣費。手動 voice file 和自動 WAV 不可混用或默默覆蓋。
- 僅託管於本機 `127.0.0.1`；HTTP 檢查 Host、Origin、`X-AIG-Request: 1`、JSON、長度、索引、voice allowlist。服務無金鑰時按鈕不可用；讀取 HTML 時不送計費請求。
- 來源程式與 mock HTTP / 音訊測試（沒有消耗付費 API 額度）跟隨 GitHub Source Gate 驗證。不能以此宣稱真繁體中文聲線品質、音素級 lip sync 或實機 MP4 30FPS 已驗證。

## 指定女主角參考圖
- 2026-10-21 使用者指定櫻花校園制服女主角（會話附件，檔名 `1000012158.png`，**實際檔案格式 JPEG**，1152 × 1536，SHA-256 `fbf47f32a844a80e1bb39cb23084527baaf1350427c20d2b49d21fdc453444d6`）。
- 這張圖是女主角的**視覺基準**，目前該二進位照片沒有在 PR 中直接推送，也沒有已核准的依照片重建真 GLB。前臂與頭髮遮擋等需重新建立真實 3D 網格和權重；不得使用合成測試用骨架宣稱女主角已完成。
- 第一支真正動畫影片的驗收條件：與圖片一致人物 GLB、真材質／頭頸／髮絲；走路／閃避／出拳每段真動作；聲音有效且與動作時碼對齊；實際錄出 1920×1080 並可播放。Android/Windows 熱與 FPS 須真機量測。

## 下一缺口
- 仍缺真女主角 GLB、真打鬥動作素材與獨立品質驗收。
- 本階段只能完成「有來源音檔的逐句 AI 聲音生成程式接口」；正式 AIG Render 網站／APK／EXE 一律未更新。
- Cloud OpenAI TTS 為需設定帳戶且可能付費的選用功能，沒有 `OPENAI_API_KEY` 的裝置可離線使用已存在的手動配音、模擬與編輯能力。
