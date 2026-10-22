# FastModel 7.12 — 場景地圖／圖資層

日期：2026-10-22。使用者於 CAD 縮尺與場景百分比例開發途中指示：「暫停，再用建築物、樹、馬路等等換算百分比例就可以了」及「建立地圖 圖資？」

## 新施工順序

1. **先暫停相機姿態 7.12 擴充與 CAD 純繪圖格線縮尺後續**，保留現有真核心與既有檔案，優先建立場景地圖資料、真來源管理、比對百分比。
2. 正式地圖圖資：`aig-scene-map-7-12.mjs`。支援 `building`、`house`、`tree`、`road`、`sports_facility`、`water`、`vehicle`、`landmark`、`other`。
3. 本機可編輯 RGB UI：`scene-map-studio.html` + `scene-map-studio.mjs`。使用者可點選點物件、兩角框選面物件或多點連接道路；每筆包含名稱、類別、幾何與來源。
4. 可匯入 **使用者合法取得／提供的 GeoJSON**：Point／LineString／簡單 Polygon 外環。來源 label/rights 記錄於 map，沒有來源就拒絕當成真圖資；檔案只在本機處理，無付費雲端或偷傳原始照片。
5. 經緯度資料保留 WGS84 來源錨點，使用半徑 5km 內的**局部切平面近似**顯示距離（m），不能宣稱地籍測量級、0.001mm 或精密 CAD/CNC 座標。
6. 本機手繪沒有實物比例時，只用 `LOCAL_RELATIVE` 圖面單位；不會捏造 GPS、道路寬度、樹高、樓層或人的身高。
7. `compareAIG712SceneFeaturePercent` 可以比較同場景物件的投影 X 寬度、Y 高度、線長與面積；標記是否已知真實尺度，**不能用影片上單純的畫面像素比例推出真實 3D 深度**。
8. `exportAIG712SceneMap` 讓圖資 JSON 具有原始來源／授權與可重建圖層。與 FastModel 7.9/7.10/7.11 影格記憶和自動對應結構分離，待來源識別／座標註冊 Gate 通過後才做真融合。
9. CAD 繪圖比例 1:2、1:4、1:10 核心保留，**縮圖只改視覺，不可變更真物理 CAD 尺寸**。不得將百分比例對比當作機台 NC 毫米加工精度。

## 新測試證據

- `tests/aig-scene-map-7-12.test.mjs`：建築／道路／樹木圖層、GeoJSON 局部投影、來源管理、百分比、匯入／匯出、錯誤幾何與不明尺度 fail-closed。
- `tests/aig-scene-map-7-12.real-browser.mjs`：Android 360×780 與 Windows 1440×900 Chromium 原生本機檔案選取、來源 GeoJSON、建築／樹／道路圖層、比例對比與 JSON 匯出。
- `.github/workflows/fastmodel-scene-map-7-12.yml`：獨立場景圖資 Gate，配合正式 FastModel 全套回歸。本輪 CI 必須實際出現 success，才可宣稱 Gate PASS。

## 明確未完成

- 不含任何未取得授權的道路地圖、建築建物資料或自動拍照地理定位。
- 沒有真實 WGS84 當地資料的工作頁啟動時為**空白場景**；不可把假地圖標成實地圖資。
- 尚未完成從任意影片自動辨識建築樹木馬路的語義分割、真三維地形重建／遮擋、影格到 GPS 自動註冊，以及人物骨架 AI 跑跳蹲起。
- AutoRig＋AI Motion 待執行清單獨立保存於 `PENDING-AUTORIG-AI-MOTION.md`。優先處理真圖資的來源契約與逐頁 Runtime。
- 原正式 Render 網站即使 GitHub 分支來源已同步，**尚須核實 Render 真 LIVE SHA 和對應網站 HTTP 資源**，否則不可聲稱地圖已正式上線。
