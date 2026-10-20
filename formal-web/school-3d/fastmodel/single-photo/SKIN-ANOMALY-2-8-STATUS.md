# FastModel 2.8 — 皮膚／幽靈重疊／穿模風險測試

**範圍**：GitHub Draft PR #12 的 2.7 真 GLB 預覽模組。**不是**已部署的 Render 正式網站功能。

## 已實作

- 網頁新增「本機選取 GLB」入口（檔案 200 MiB 以內）：直接在瀏覽器播放，不需要 Meshy 金鑰、不消耗生成點數，也不將所選檔案上傳。
- 新增真實 `skin-check` 按鈕，對 **目前載入的 GLB 模型與當前骨架姿態**讀取 Three.js 頂點，有限度檢查：
  1. 複製且重疊的三角面（疑似雙層皮膚、兩張臉、Z-fighting）；
  2. 面積塌縮的三角面（可能有破面／閃面）；
  3. 真 SkinnedMesh 的 bone index／weight 合法性（可能造成拉扯與跳動）；
  4. 透明材質寫入深度的排序風險；
  5. 僅在 GLB 明確有 `aigAnatomyPart=hair` 和 `neck` 時，標出兩者包圍盒重疊風險；**包圍盒不是三角面碰撞**。
- 預覽渲染迴圈在模型動畫播放過程中，**被動**觀察至多 12 個真實動畫姿態（最小 100ms 間隔，單姿態 900 triangles／3000 processed indices）。不更動動畫內容、膚色、貼圖、骨架、來源檔。報告列出有疑點的 sampled frame index。
- 檢查完成提供 JSON 報告下載，標記 `originalGLBModified=false`、`exactMeshPenetrationTested=false`、`realGPUZFightPixelsVerified=false`、`realHeroineApproved=false`。模型切換時作廢舊報告 blob URL。
- 本機 GLB 導入增補 GLB magic/length/header／JSON 限額與外部 URL 資源攔截，防止模型載入時自動抓遠端貼圖／外部網路。
- 自動回歸 fixture 包含正常單層模型、兩個完全重合模型、移動後不再重合、故意無效的骨架權重、退化三角面、具明確頭髮／脖子標記的重疊與分開場景、動畫多影格疑點標示、UI callback 和報告下載。

## 無法從來源測試證明的部分

- 本倉庫無正式核准女主角 GLB；因此無法判定使用者實際女主角的皮膚是否有重疊、髮束是否穿模或動作是否有殘影。
- 幾何重合可能是有意設計的雙面眼睫毛、衣料、眼球、內襯等，必須結合鏡頭、材質與動畫實圖人工檢查。
- 本檢測**不是精確三角面相交、所有網格區域、透明 alpha 視覺排序或逐像素 GPU Z-fighting 證明**；每幀採樣不覆蓋中間所有動畫時刻。大型 GLB 會標示 incomplete。
- Render 正式網站當前仍是 **2.5D 照片浮雕 + 手動 GLB 播放**，未合併 2.8 本機皮膚檢查 UI；PR 是 Draft，沒有自動聲稱已上線。網站目前也未預載任何核准女主角。
- 來源測試 PASS 不能代替 Windows/Android 實機、多角度/髮束實圖及 60FPS 測試。

## 實際驗收條件

上傳正式女主角 GLB → 載入與選擇原始動畫 → 按「檢查雙層皮膚」 → 前後左右旋轉並觀看動作 → 下載 JSON + 保存畫面作逐影格複核。只有實際模型的動畫視覺與報告都可核對，才能判定通過。
