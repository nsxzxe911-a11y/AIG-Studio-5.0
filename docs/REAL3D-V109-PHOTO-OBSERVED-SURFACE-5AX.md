# 第三專案 Real3D V109｜真正開始把照片來源變成可渲染的 3D 資料（Draft）

承接 PR #110 V108 真五軸幾何精度 PASS。**不把一張普通 RGB 照片直接叫做完整 3D，也不重新加入已淘汰的 SDF / Metaball / Template Morph / Subdivision / 假人體。**

## 實際輸出
- `formal-web/shared-3d/aig-real3d-v109-photo-surface.mjs`：由具原始 Alpha 的 PNG 真前景像素，建立可追溯的 indexed XYZ 前表面、UV、法線和原 PNG bytes 貼圖 GLB 2.0；不造未觀測背面。
- 單張透明 PNG 不含深度：**只有真帶來源色彩的 2.5D 平面三角面**，不會冒稱真體積或 1:1 人物。
- 如果使用者另提供**不同來源 SHA 的獨立深度 PNG**，明確聲明感測器實測與指定深度 mm 上下限，才在可見前面將灰階樣本對應深度；來源真偽尚未獨立校驗。沒有這些條件不從顏色/亮度生成假深度。
- 由同一來源 mask 的每個有效格子生成兩個真正三角面，不能跨越不透明前景缺口或主觀填洞。GLB 內嵌原 PNG，不動原檔。以原始 alpha 圖層 raster 格子回投影作前景 IoU，這**不是**真 3D 照片身份相似度。
- `formal-web/shared-3d/aig-real3d-v109-photo-surface-lab.html`：繁體中文真互動工作頁。上傳照片→建 GLB→V99 真 GLB SHA 解析→V107 真 Chromium WebGL 五軸 A/B 旋轉／自腳到頭 clip→下載工作副本 GLB。原始 PNG / GLB 各有 SHA。
- 具有來源的前表面不是女主角完整解剖、動物毛皮、髮束、衣物體積、未知背面、電影場景或 NC 機台。未知資料 **BLOCK**。

## Gate
1. Node 原始圖片/來源索引/UV/embedded PNG/高密度前表面、透明 alpha 拒絕不透明、真深度輸入要求、材質和 GLB 標準二進位解析。
2. 同輪保留 V108 625 姿態 0.001 mm 數值回歸。
3. Chromium 使用真 PNG 資料的自動測試：真正生成 GLB、匯入 V99、渲染 WebGL，操作 V107 A90/B90/75%，截圖與 SHA 證據，恢復 A/B 0 和100%。**本輪不是高密度真人獨立真多視角精度 PASS。**
4. 應區分 `FRONT_SURFACE_CREATED`（來源可見前表面完成）與 `MULTIVIEW_1_TO_1_PERSON_PASS`（仍 BLOCK）。沒有真背面/深度/材質來源就不自動放行。

## 邊界
- 只有帶**真透明前景**的 PNG 才能自動開始；任意不透明人物照片必須有實際前景分割/人工遮罩，現有平台尚無已安裝且驗證的本地語意分割模型權重，因此不宣稱全自動普通照片 1:1。
- 取得深度仍不等於得到完整閉合真人 3D，這裡輸出的本質是來源前表面。
- 原 AIG-II、AIG Studio CNC / Fanuc、Render LIVE 首頁、APK/EXE 不變。**Draft，CI 通過也不得自動當成正式網站或正式交付。**

下一核心須串接經認證的圖片/連續掃描相機標定與多視角深度融合、分離材質與幾何、原圖身份輪廓誤差。不得用三角形數字充當 1:1 證據。
