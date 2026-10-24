# AIG FastModel / Real3D 極速 V84｜上、下、前、後、左、右六面真立體來源 Gate

2026-10-24。承接 PR #83 真原始 GLOBAL Indexed XYZ 幾何／三節關節／碰撞／GPU 的四階段協調器；此 V84 是**有厚度的長方體／立方體原始封閉面**專用檢查，不是將任何單張照片直接推估成唯一 3D 形體。

## 解答：只有上下兩面，四個側面去哪了？

幾何學上的正方形只有長寬、沒有厚度。若有厚度 (d) 且形成立方體或長方體，實際存在 **6 個原始表面**，並以三角面儲存：
- 上 +Y／下 -Y
- 左 -X／右 +X
- 前 +Z／後 -Z

每個四邊形側面至少要有兩個**真正來源三角面**；側壁與上、下面必須共用真正原始索引邊，不能靠雙面材質、法線繪圖、陰影、兩張影像合成或貼圖把空殼顯示成實體。對寬 × 高 × 深 3D 長方體，封閉面法線朝外、相鄰三角面共享且相反順序的邊，才能從所有方向成立、量測表面積及有限體積。若只有上下兩面，前後左右仍是**未知、沒有原始幾何**，不能用程序性假人或其他補面虛構不存在的來源資料。

## V84 真實程式

`aig-real3d-six-sided-source-solid.mjs` 提供 `auditAIGReal3DSixSourceSolid({positions,indices,sourceSha256})`：
- 只讀本機 OBJ 原始全域頂點索引 `Float32Array XYZ` 和三角面 `Uint32Array`，綁定來源 SHA、上限 20 萬個原三角面（避免巨量 edge map 造成記憶體爆掉）。不新增面、不重建 OBJ。
- 以原始面法線的 dominant axis 分類 ±X/±Y/±Z 六面，必須位於相應包圍盒最外層平面並有正確外向 normal；原三角面覆蓋的面積須符合原始 3D XYZ 尺寸預期。每面輸出原 index face IDs、實際面積與缺面狀態。
- 檢查每條原始 Indexed edge 是否剛好由兩個相反方向三角面使用；統計 open edge、非流形邊、同向 winding、連通元件數與 degeneracy。對封閉方塊，以原三角面計算 signed enclosed volume，與 bounds 乘積對照，避免只有雙面陰影卻不存在完整厚度。
- Gate 為 **嚴格軸對齊 BOX 六平面**，不適合直接把真人或動物的複雜曲面劃分成六塊平面。人體即使側視能見到影像，仍須由授權的原始完整人體曲面網格提供真實前後、左右各側 XYZ，不能由六個方向的法線簇推論解剖完整。

`aig-real3d-six-sided-source-ui.mjs` 於既有獨立 Real3D 高密度 OBJ Lab 新增真正按鈕／狀態／六方向真 GPU 畫廊與下載 JSON：
- 只在同一份原始 OBJ、SHA、Y/Z-up、高度及高密度原始網格匯入成功後允許按。
- 缺少任一側壁、接縫不閉合、面法線反轉或錯誤體積 → **BLOCK**，輸出缺面證據，**不自動補面、不發生假的 GPU 六面通過**。
- 原來源通過且有 2,000 以上原三角面時，從 ±X/±Y/±Z 六方向呼叫既有 `createAIG3DRenderer` 的真實 WebGL Indexed triangles／`captureNativePNG`，產生 **六張 640×640 真 GPU readback PNG SHA**。六張來源完整 ≠ 真人自然人體 PASS。

## Source 與 Chromium Gate

Node test 使用 NONHUMAN 真長方體：
1. 8 原始頂點、12 triangles、六方向、18 unique Indexed edges，閉合、法線朝外、signed volume 正確；原始座標/Index 完全不變。
2. 只有上下面：四面側壁全部 BLOCK、有 original open edges，不能從兩面猜出側面。
3. 僅缺後側：BLOCK、缺少一面與露邊。
4. 側壁 winding 顛倒：BLOCK、外向 normal 与相鄰邊相反關係破壞。
5. 24×24 subdivisions 的測試長方體：原 6,912 triangles，六面每面 1,152 個真原始 source triangles、Open edges = 0，**僅 QA 自製盒子，不是人類模型**。
6. 原 Index 越界、假 SHA、來源超過記憶體 Gate → BLOCK。

Chromium 在 PR #83 完整高密度 Real3D 4階與 GPU／常駐 Worker 既有回歸以外，實際點擊 V84 Lab，用 **6,912 triangle NONHUMAN 本機 OBJ** 產生六方向原生真 GPU 圖；下載 PNG 並驗證 SHA，以及完整六面 JSON 報告。同時將只含上下面的 **2,304-triangle NONHUMAN** 來源驗證為四側缺失，不得以 GPU 渲染成功代替幾何真實性。

這只證明方塊這類封閉平面幾何「六邊具真 3D」技術正確；人體解剖天然外觀、單張照片唯一反推原人體背側、完整動畫／安全碰撞、Windows/Android 長時 FPS、Fanuc 實機 CNC 安全全部仍為 BLOCK。獨立 Draft PR，未合併，未部署正式 Render RGB HOME、雙 CNC、APK 或 EXE。
