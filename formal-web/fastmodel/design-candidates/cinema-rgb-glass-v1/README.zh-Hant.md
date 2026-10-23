# AIG FastModel Cinema Engine｜RGB Glass 創作工作區 V1 候選排版

**分類：CANDIDATE／尚未核准，不是正式 Authority，也不是已上線畫面。**

## 圖資入庫

- 原圖：`/AIG-II/FastModel/Authority-Candidates/AIG-FastModel-Cinema-RGB-Glass-Desktop-V1-CANDIDATE.png`（ChatGPT Library，原生 1672×941 PNG，2,330,831 bytes）
- 原圖 SHA-256：`a027fdeb1d59910cf15a24daf2b31e6255ffc62bb30eaa519372e290514a5524`
- 參考風格：正式深黑底 `#020407`、深藍 Panel `#07111B`，RGB 半透明玻璃框與柔和發光。
- GitHub 只入庫源圖的**檔名、權威分類、SHA、分區和 Button ID 規格**；PNG 完整原檔保存在 Library。尚未寫入公開 Runtime 靜態素材檔目錄。
- 圖片為 AI 生成的**設計概念**；上面的 GPU%、儲存量、進度條、媒體名稱與時間軸文字均非真實 Runtime 證據。正式文字須經無字底板重建或由 DOM/Runtime 輸出，禁止直接用烙字背景當按鈕。

## AI 建議的桌面排版（優於直接照整張圖貼）

1. **左側窄導航 76px**：HOME／素材／AI生成／2D／2.5D／3D／電影／特效／音效／對話／音樂／輸出。較少頻用功能收進「更多」或工具群組，避免頁籤過長。
2. **中央主工作區約 70% 寬**：先放圖片、影片或請 AI 生成內容；主預覽畫面固定，播放時不跳頁、不隨字幕或程式捲動。
3. **素材條可隱藏**：縮圖或來源片段在預覽旁以可收合抽屜顯示，展開素材時仍保障大預覽畫面。
4. **操作列只有四個首要動作**：放入圖片／放入影片／AI 生成角色／開始製作動畫。所有按鈕須先設 Button ID → Command ID → 真 callback → 狀態 → 錯誤回報，絕不把圖片上發光區當成可按功能。
5. **模式切換**：2D（平移/轉場/繪畫動畫）、2.5D（圖層分離/視差/景深）、3D（需真正 3D 幾何與骨架）、電影（分鏡/鏡頭/剪輯/混音的跨模式時間軸）。切換前不清除原素材，保留 Working Copy。
6. **右側 25% Inspector 可收合**：特效、音效、對話、配樂、運鏡、輸出設定放在同一屬性面板的**分頁或折疊面板**，避免六塊面板同時互相擠壓。
7. **底部固定多軌時間軸，高 200px 起可拖拉至 30% 畫面高度**：分鏡／場景／角色／動作／對話／字幕／音效／音樂／特效各獨立 Layer，可縮放、拖動、鎖定、Undo/Redo。
8. **真實輸出/狀態**：1080p 優先，2K/4K 按實際 GPU/編碼器能否支援顯示 Available 或 BLOCK，不虛構已生成 MP4／音樂／配音。

## 手機獨立排版（不縮小桌面版）

- 預覽畫面優先佔工作區約 60% 以上；**畫面／控制／時間軸**三頁分離。
- 工具面板點擊後以抽屜或全屏副頁打開；特效/對話/音樂不和預覽同時擠在一列。
- 放入素材／AI生成／開始製作，永遠固定在可碰觸的主操作區，危險鍵（刪除/覆蓋/發布）分離。
- 操作區最小 hit target 44px；觸控優先，保留 Android 安全區。
- Mobile 與 Desktop 分別建立 **Region Manifest / Button ID / 圖片 SHA / 最後核准 Authority**，同一 Command Contract 不同布局。未核准前不可用設計圖取代正式啟動頁。

## 雙 ID 逆向工程施工順序

**Image ID → Authority Region ID → Button ID → Shared Command → Runtime Callback → 狀態／訊息 → WebGL/影片/音訊實際輸出 → 真機截圖 → Gate。**

主要 Region 及 Button ID 詳見本目錄 `candidate-manifest.json`。背景視覺只用作 Skin，真控制一律由獨立語意元件提供。按鈕至少涵蓋 Normal、Hover、Pressed、Selected、Disabled、Alarm 6 種狀態，錯誤狀態不中斷主視窗。

## 「一張圖 → 動畫／電影」的真實工作流程

- 導入圖／影片／AI 資產 → 查檔案、版權、方向、長寬比，保存原檔。
- AI 推薦模式（保留人工選擇）：2D 或 2.5D 可以先交付；3D 不能以一張平面圖或已淘汰的程序假人冒充 1:1 人體。
- 分鏡與角色／場景建立 → 影片與相機軌 → 動作、字幕與對話時間同步。
- 音效和背景音樂軌 → 人聲／配樂／環境音混音 → 合成與預覽。
- 真渲染、編碼和下載：必須輸出真正可播放 MP4/WebM，並通過視覺、音訊、時間軸同步和 Android/Windows 效能 Gate 才能宣稱完成。

## 驗收狀態

| Gate | 狀態 |
| --- | --- |
| RGB 視覺設計原圖 SHA 入庫 | Library PASS |
| Desktop 動線與 Page/Subpage/Button ID | 規格已入庫，未核准 |
| 真 RGB 半透明元件及 callback | 未施工／BLOCK |
| Mobile 獨立分版 | 建議規格，未施工／BLOCK |
| 完整 2D/2.5D/3D/電影含音效配音配樂輸出 | 待逐模組驗收／不可宣稱已全部可用 |
| 真實人體照片 1:1、自然五官、五指 | Real3D 視覺 FAIL／BLOCK |
| Render 正式 AIG 首頁、3AX～6AX CNC 與 NC | 保留原樣／本候選不覆蓋 |

**下一個可交付階段**：取得畫面 Authority 最後核准後，依上述分區產生 Desktop／Mobile 各自的真 Runtime 元件與按鈕 callback，不用整張不可點擊的圖片冒充 UI，也不任意替換目前正式 RGB 首頁。
