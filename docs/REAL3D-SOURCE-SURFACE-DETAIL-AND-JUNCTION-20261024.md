# Real3D 原始人體來源的真曲面幾何精度與頭頸／手足接合檢查 V1

2026-10-24；續接 PR #63 真 2K/4K WebGL PNG 已驗證，不把高影像像素當作原始 3D 幾何細節。

## 這次不是再做假人體

來源限定為使用者本機 OBJ 原始 Indexed XYZ 三角面、提供完整 21 點原始 3D 標記且通過既有來源網格貼合 Gate。每個區域以既有來源標記的真頂點 ID 與物理半徑取得局部三角面，分析：

- 頭頸、左手、右手、左腳、右腳五個區域各自的**原始頂點與實際三角面數量**；每個三角面的最大邊長中位數和 P95（mm），面積 P95（mm²），原始 index 邊長 P95（mm）。
- 真相鄰三角面法線夾角 P95（度），而非渲染器材質 smooth normal 或照片明暗。判斷過大的折角、局部低密度等需複核現象；門檻只是進一步人工審查提示，**不是普遍醫學／人體比例合格門檻**。
- 局部原始拓樸的開放邊、非流形、面片方向與跨標記的斷開元件警示；檢查距離相差小於 0.5 mm 卻具有不同來源 vertex index 的相鄰開放邊界，標成**疑似未焊接接縫**，不擅自焊接或推斷一定是裂縫。最多保留 12 對樣本並保留未截斷原始統計數。
- 原始 model XYZ／所有索引與 SHA 都不變，僅量測。七張既有 1080p 人形 QA 圖和新 2K／4K 真 GPU 獨立解析度輸出都保持原有行為。
- 「結構光掃描」、「攝影測量」等來源方式**只是使用者自行聲明**。沒有可核對原始拍攝／校準與可合法使用的人體三維掃描檔，`sourceOriginIndependentAuthenticationPASS:false`。特別是單張照片 2.5D 浮雕不能被標為可信的完整人形後側 3D。
- 量測結果有 `naturalHumanAppearancePASS:false`、`releasePASS:false`；頭頸自然接合、五根手指、腳趾、頭髮／皮膚細節，**需要實際可信且具原始高密度表面的來源才可以開始做外觀驗收**。網格細分本身只能增加三角形，不能生出照片看不到的表面細節，因此本輪不使用無來源的 SDF、Metaball、Subdivision 假人。

## 資料與介面

程式 `aig-real3d-source-geometry-detail.mjs` 受限原生 mesh cap（110,000 個 vertex、180,000 三角面），5 區輸出 mm 與角度的 JSON report，工作區 UI 獨立顯示五列局部來源真曲面精度。與前幾版的 `localSurfaceTopology`、`source3DSections`、`nativeGpuExports` 並行，不修改 CNC 共用 3D 核心與 Render 正式首頁。

驗證：Node 使用合成**非人體**的實際 Indexed OBJ 網格（有真面片、實際 SHA、21 個合成標記），分辨完好、頭頸挖掉面、面片反轉與資料缺失；Chromium 真 WebGL 工作區顯示五區 mm／度、照片 1:1 外觀仍 BLOCK。這些技術測試的 PASS 不等於已獲得可信真人三維模型。

Draft PR；不得宣稱正式 Render 上線、Android APK／Windows EXE 已更新。