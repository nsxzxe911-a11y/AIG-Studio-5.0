# AIG FastModel Cinema Engine｜星際之旅 Desktop Authority V1 × 真工作區研發

## 圖資定版（使用者核准 2026-10-24）
- Image ID: `IMG.FM.CINEMA.STAR_JOURNEY.DESKTOP.AUTHORITY.V1`
- 核准圖：`/AIG-II/FastModel/Approved-Authority/Desktop/AIG-FastModel-StarJourney-RGBGlass-Desktop-Authority-V1.png` (ChatGPT Library)
- 原圖檔名：`星際之旅科幻電影製作介面.png`
- 1672 × 941；2,722,861 bytes；SHA-256：`77611d97db45772f14a403331d4d044b773f132bc2a78c99222262a4e4a046e6`
- 正式視覺圖已入 Library，但**尚未複製二進位檔到 Render/GitHub 正式網站**。這張圖烙在像素中的按鈕、進度和 GPU 數值都不是可操作或真實 Runtime。
- Page ID / Region ID / Button ID 等正式控制規格：`authority/starjourney-desktop-v1.json`。

## 獨立施工工作區（不是既有首頁的替代品）
入口：`formal-web/fastmodel/cinema-engine/index.html`（PR 施工分支；部署前不能當成 LIVE 網址）

工作區已新增真元件與 callback：
- 匯入 **本機 JPG、PNG、WebP、AVIF 圖片**，可建立多個五秒動畫片段並在時間軸選擇。
- 匯入本機 MP4／WebM／Ogg 影片，讀取瀏覽器所能解碼的 metadata 與畫面，建立可定位的片段。
- **2D**：真正 Canvas 畫面平移／縮放、字幕即時合成。
- **2.5D**：清楚註明**單層視差練習**；並未重建被遮擋面，不得誤認為全 3D 或多圖層真分離。
- **3D**：共用原 Real3D 的 GLB WebGL 來源匯入，顯示真 XYZ 網格基礎姿勢與旋轉檢視；不捏假人、不推測來源照片背面，也不冒充骨架動畫。
- **電影模式**：現有多片段來源順序播放、進度 seek 與字幕；完整多軌合成、對白音軌、特效、真立體渲染尚未全部接線。
- 本機配樂、音效、對白錄音可分別匯入、解碼成真 PCM，以 Web Audio 三組獨立增益控制，進入 WebM Opus 音訊軌。配樂在時間軸循環，音效與對白由片頭觸發一次；原生 source-video audio、AI 語音合成尚未接通。
- PNG：真正 Canvas 畫面擷取；3D 模式可嘗試共用 WebGL 原生畫面擷取。
- WebM：在 MediaRecorder 與 Web Audio 可用時，以 Canvas captureStream 配上 PCM 混音進 MediaRecorder，輸出真 VP8/VP9 + Opus 的視聽串流。僅有本機來源音軌，不承諾 MP4、AI 角色配音、3D 角色骨架渲染、4K、高速離線渲染或所有裝置可用。
- AI 角色生成為 disabled（後端未接），不准假 callback 或假的完成進度。

## 桌面與手機 UX
- 桌面左導覽／固定主預覽／屬性 Inspector／多片段時間軸；RGB 玻璃半透明邊框使用真正語意 buttons。
- 手機「畫面／控制／時間軸」三分頁；獨立 CSS，修復擠在預覽旁的超窄素材欄。片段由時間軸選擇。
- 安全、錯誤及禁用狀態不得清空頁面；任何不支援的影片格式或 GPU 錯誤須回報原因。

## 驗收
- 原始圖片視覺 Authority：**已核准、已保存**。
- 工作頁程式：**Draft R&D**，僅以 GitHub Actions 真瀏覽器測試結果作為功能證據。
- Source Gate 和 Browser Gate：見 `.github/workflows/fastmodel-starjourney-ui-runtime-gate.yml`。
- 使用者正式 Mobile Authority 圖：**尚待製作與獨立核准**。
- AI 角色產生、真人一比一重建、動作庫、配音、音效混音、音樂原創、MP4/H.264 與真 4K：**尚未通過正式 Gate**。
- Render 正式網站、AIG HOME 與 CNC 3AX/4AX/5AX/6AX／NC：**本分支不修改與不部署**。


## 2026-10-24 Mobile 定版＋電影聲音合成施工

- 使用者正式核准手機 390×844「畫面」頁。
- Mobile Authority：`/AIG-II/FastModel/Approved-Authority/Mobile/AIG-FastModel-StarJourney-RGBGlass-Mobile-Authority-V1.png` (Library)，SHA-256 `771e25505942b9ae9424ac8a8329f40bd706063c6f1eded81b53e05daff69d35`。
- `authority/starjourney-mobile-v1.json` 各平台獨立 Image ID、SHA、Mobile Tab ID 與不可偽裝 GPU/影音狀態規則。
- 繪圖 2D/2.5D／音訊／字幕／時間軸繼續共享同一 command contract，桌面與手機 CSS 各自遵從核准視覺。
- 新增 `audio-mixer.mjs`：解碼本機音樂、音效、使用者上傳的對白錄音，輸出 Web Audio stream 到 WebM Opus。每種聲音有獨立音量，錄影過程真 mux。
- **成功實測版本**：GitHub Actions run `40020951943` 的 WebM (500KB) 已由 ffprobe 確認 VP9 video + Opus audio；FFmpeg volumedetect audio 有效（約 5.14 秒、mean -15.2dB，並非只有靜音 track）。此 run 僅用 220Hz 與 660Hz 合成測試聲音，**不是使用者指定的正式電影配樂**。
- 後續另新增「真人錄製對白」第三軌，其測試狀態要以最新 GitHub run 為準，不能從上述兩軌證據推論三軌已 PASS。
- **尚 BLOCK**：AI 音樂生成、文字配音 TTS、任意照片真 3D 身體、影片原生音訊抽取、精確分鏡對白對位、成品影片配音與音效完整業務驗收。

## 2026-10-24｜劇情分鏡轉真 2D 動畫（V2 研發）

使用者要求進入下一階（原手機與桌面 RGB Glass Authority 不變），新增「劇情→分鏡」真可執行管線：

- `storyboard-engine.mjs`：繁中劇情／對白逐行拆成順序分鏡，針對星門、太空港、星艦、行星、星雲關鍵詞安排場景、鏡頭、特效、字幕、角色欄位、起訖秒數；限制文字與幕數。**明確標示為本機規則分析，並非大型語言模型 AI 內容生成。**
- `cinematic-scene-renderer.mjs`：直接在 Canvas 繪製星空、星雲、行星、星門、太空港與飛船形狀；真 2D 運鏡、光暈與每幕淡入淡出，無外部素材依賴。這是**程式原創 2D 科幻插畫動畫**，不是實拍、照片 1:1 或真人 3D。
- RGB 工作頁控制：載入範例、建立分鏡、分鏡 JSON 匯出。新場景真正加進 timeline，可點選、拖進度、播放、PNG 截圖並經 Canvas/MediaRecorder 輸出 WebM；如已有匯入圖片／影片，保留其原始素材，分鏡放在其前面。
- Mobile 仍用已核准的「畫面／控制／時間軸」分頁，劇情編輯放控制頁，不將桌面全介面硬縮到手機。Desktop 原分區不回退。
- `storyboard-engine.test.mjs`：本機場景/時間/字串上限/非 AI 宣稱的 Node Gate。
- `starjourney-storyboard.real-browser.mjs`：真 Chrome 生成幕次、輸出原生 Canvas 不同場景 PNG 與真正 WebM、下載 JSON、手機 3 分頁操作並留快照證據。若 CI 沒通過，整輪不能宣稱 PASS。
- 既有配樂、音效、上傳真人對白錄音真 PCM → Opus 的功能保留。新場景能沿用原影音匯出通道，但**AI 自動產生真人配音、AI 原創背景音樂、照片→真實 3D 人體、角色動作與口型同步仍 BLOCK**。
- PR 為 Draft，原 Render LIVE 首頁/CNC 核心/3AX～6AX/NC 均不改，不聲稱已產正式 APK/EXE。
