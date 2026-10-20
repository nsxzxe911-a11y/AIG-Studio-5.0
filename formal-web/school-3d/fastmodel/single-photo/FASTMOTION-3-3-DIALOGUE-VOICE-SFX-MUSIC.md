# AIG FastModel 3.3｜AI 有梗對話＋聲音特效＋原創配樂

承接 FastModel 3.2 可信來源提交 `961da8a222545693b5a6003169bb62e9e920b396`，專案仍在 **Draft PR #12**，不合併、不部署正式 Render、不更新 APK/EXE。

## 當前可執行的劇情功能

1. 先用 FastModel 3.2 的繁體中文劇情編輯器拆出真 GLB 動作段落。人物需是載入的真正 GLB；只有每段對應唯一真正 `AnimationClip`，才能啟動 3D 動畫預覽，不能用靜圖晃動取代骨架。
2. **本機創作台詞：** `story-dialogue.mjs` 提供「有梗吐槽／熱血主角／戲劇張力」三組人工撰寫的繁體中文單人台詞及確定性變化。每個動作段落一行，可以逐句修改，顯示在原本 3D 工作區字幕層；無需網路。此模式 `generatedByCloudLLM=false`，不冒稱是真正的 AI 語言模型。
3. **真正 LLM 台詞（選用，可能計費）：** Loopback Python server 的 `POST /api/story/dialogue` 只有在伺服器設定 `OPENAI_API_KEY` 且使用者明確按「AI 改寫」才發出一次 `https://api.openai.com/v1/responses` POST。預設伺服器端模型 `gpt-4.1-mini`，API 金鑰不在 HTML/JS、URL 或下載 JSON。只傳 **劇情文字、動作 ID 與台詞風格**；不傳照片、GLB、臉部圖、手機資料或音效。使用 `store:false`、嚴格 JSON Schema、回應與 beat 數量／順序／字數驗證。沒有自動重送，降低重複計費風險。
4. **字幕及配音：** 使用瀏覽器 `speechSynthesis` 與 `SpeechSynthesisUtterance`（預設 `zh-TW`）朗讀目前台詞。語音能否使用、口音、聲線是否自然由 Windows／Android／瀏覽器及其語音引擎決定；部分系統語音可能經由供應商的線上服務，不能保證 TTS 完全離線。TTS 不會輸出已渲染的人聲音檔。
5. **音效及配樂：** `story-audio.mjs` 直接以 WebAudio `OscillatorNode` + `GainNode` 合成步行、轉身、閃避、格擋、出拳、踢擊等原創短音效，配樂分「輕快搞笑／緊張動作／電影感」三種內建合成旋律。沒有下載或重用受版權保護的歌曲，不使用 CDN 或第三方音效庫。使用者控制語音／SFX／BGM 開關與音量，按播放／試聽才嘗試啟動聲音。
6. **同步：** `AnimationController` 的真實 `StoryPlayback` 每段 `onStep` 同步觸發文字字幕、瀏覽器朗讀與對應的 SFX。畫面幀回呼更新配樂；暫停／停止時也暫停／停止音訊，且將仍播放的 Oscillator 與 TTS 清理。不讓聲音模組例外關閉 3D WebGL renderer。
7. **輸出證據：** `AIG-3-3-Story-Dialogue-Audio-Cue-Sheet.json` 記錄故事、台詞來源（`OFFLINE_HANDWRITTEN_TEMPLATE`、`USER_EDITED_DIALOGUE` 或 `CLOUD_LLM_PROVIDER_OUTPUT`）、動作 clip SHA 與各段、配樂風格和設定。輸出為**時間軸規格和提示單**，不是音軌混音檔／MP3／MP4；也不自稱電影已交付。

## 接受／阻擋狀態

- 沒有正式女主角 GLB 與動作庫：允許寫台詞、改台詞與試聽，但真 3D 動作播放 **BLOCKED**。
- GLB 含動作，但缺出拳／踢腿或第二角色：逐段顯示缺失，不能生成虛構打鬥畫面；有梗台詞不補足缺少的骨架。
- 沒有 `OPENAI_API_KEY`：AI 改寫按鈕停用，本機創作台詞、字幕、聲音效果與背景配樂仍可用。沒有真的雲端呼叫不能宣稱雲端 AI 已生成。
- 手機／瀏覽器沒有 `SpeechSynthesis`、無可用 `AudioContext` 或拒絕自動播放：字幕保留、3D 動作繼續，不可偽稱有聲音。
- 沒有原生音訊／WebGL 實機證據：絕不宣稱 Windows/Android 60FPS、精準口型同步、多人對嘴、多角色聲音分配、真女主角皮膚／髮絲碰撞 PASS 或完成 MP4。
- 目前保留原始 GLB、PBR 膚色、頭頸、骨架，不額外渲染第二套皮膚，不添加光追。

## 已新增程式與來源測試

- `story-dialogue.mjs`：本機台詞、創作風格、逐句修改與 `annotateDialoguePlan`。
- `story-audio.mjs`：WebAudio + Web Speech 語音、音效、配樂與音訊生命週期。
- `dialogue_ai.py`：真實 OpenAI Responses 介面、嚴格 schema、輸出驗證與安全拒絕。
- `server.py`：安全來源校驗、僅本機、使用者動作標記的 opt-in API；不同於 Meshy 3D 生成端點。
- `app.mjs`、`viewer.mjs`、`index.html`：真正 UI／音軌／字幕／下載回呼。
- `tests/story-dialogue-audio.test.mjs`、`tests/test_dialogue_ai.py`：測試真 `THREE.AnimationMixer` 來源一致、編輯台詞、WebAudio 模擬裝置語音、缺音訊退化、雲端模型 schema 與零網路假 client、跨來源請求和金鑰隱私，並由完整 CI 逐步驗證。

**上線條件：** CI exact SHA 全 PASS，正式來源女主角 GLB/動畫驗收、需要的 API 連線及明確部署指示，各自分開。正式 AIG 網站未因 Draft PR 自動更新。
