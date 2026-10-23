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
- 本機音樂匯入＋原生 audio controls 真預聽，**未混入**輸出影片。
- PNG：真正 Canvas 畫面擷取；3D 模式可嘗試共用 WebGL 原生畫面擷取。
- WebM：在 MediaRecorder 可用時，以 Canvas captureStream 即時輸出**僅畫面軌**，不承諾 MP4、音訊混音、4K、高速離線渲染或所有裝置可用。
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
