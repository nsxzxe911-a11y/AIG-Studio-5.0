# Real3D V106｜原圖透明輪廓自動擷取 → CAD 兩點校準 → V105 真 3D

日期 2026-10-25。承接 V105 已實測的 CNC XY CAD／3D source silhouette IoU。主要針對「手動 CAD 頂視點列麻煩、模型與圖片外型差很多」的障礙。本輪直接從來源影像**真的有像素證據**的 Alpha 通道抽出輪廓，沒有假裝已裝好可對任何正面照做精密髮絲分割的 AI 神經模型。

## 真正實作

1. **來源照片 SHA 保全**：現有 V99 完成照片與 GLB SHA 來源 Gate 後，V106 工作頁會重新讀取原始 `<input type=file>` 圖片 bytes，用 browser SHA256 再與 V99 宣告值比較。中途換照片，BLOCK。
2. **自動抽取真正的透明前景**：`aig-real3d-v106-photo-cad-contour.mjs` 直接讀 8-bit RGBA、Alpha 門檻與像素鄰接。拒絕完全不透明照片、邊界已裁切的角色、同時多個不相連部件、內洞而未建模成多迴圈、過多不可靠節點。採 4 向連通＋邊界 edge chain、刪共線冗餘點，不生成額外模型面；真圖片 Alpha 多邊形用原始 pixel units 留存。
3. **真正毫米比例一定要人類量測**：`calibrateAIGReal3DAlphaToCAD()` 需要原圖兩個有效 pixel 錨點與真正 CAD CNC XY mm 的兩個實測對應錨點。可導出 uniform mm/pixel、XY 旋轉及平移（不做非均勻變形），保持照片原始比例與影像 SHA；其餘深度、高度、背面仍 UNKNOWN。
4. **原圖角色正面不等於 CNC 俯視**：`confirmedTopView` 與 `calibratedMeasurement` 兩個獨立明示來源欄位只有兩者皆確認時，V104 輪廓才標 `OBSERVED`，供 V105 已有 IoU 比對；否則必須標 `AI_ESTIMATED`，**不能**用照片前景擬裝真 CNC 俯視材料尺寸。注意這兩個選項只是使用者聲明，並不等同第三方攝影機姿態校準；產品 identity/photo 1:1 PASS 仍 BLOCK。
5. **安全串接 V105**：UI 將原始 Alpha 圖輪廓映射至 V104 `#v104-cad-outline`，同步來源標籤；**預設永遠取消** `#v105-authorize`，不自動修改模型。使用者另行授權時，只允許沿 V105 原先限制在 0.5mm 的 CNC XY 刚體位移工作副本，原始 GLB 及材質、法線、UV 都不改。仍不對 2D 單圖補出不存在的形體。
6. **用一次照片重用既有真 3D 核心**：不再要求六面同步重建；V104／V105 的真來源 Mesh／六面按需／差異 raster；V102 GPU 只在必要時顯示工作副本及 4K 輸出。原 RGB AIG II ／AIG Studio 正式網站首頁、Fanuc/CNC/NC、Android/Windows APK/EXE 未變。

## 驗收

- **Node Source Gate**：已知 Alpha rectangle 掃描的 pixel 頂點／面積完全精準；兩錨點 mm 轉換能實際餵入 V105 真 Indexed XYZ 立體 CAD IoU；不透明無 Alpha、裁切邊框、斷裂多島、孔洞／錯誤 SHA、短基線等均嚴格 BLOCK；無量測或不確認 TOP 不可能授權模型修改。
- **Chromium 真 GPU Gate**：真正上傳由 browser 畫出的 PNG 原始 bytes 及 12 triangles GLB；計算 SHA、Alpha 像素／輪廓、需 2 點真 XY mm；AI_ESTIMATED 先 BLOCK、實測但無授權先維持讀取、最後只有另行明示授權才產生 V105 工作副本並在真 WebGL 繪製；證據包含 PNG 畫框與 JSON source receipts。
- **嚴格品質缺口**：沒有訓練與真正執行的 neural foreground model，**不透明女主角/動物/飛船照片依然不能自動取得輪廓**，亦沒有 multi-view 真照片 3D 部分、深度估計、解剖器官、自然頭髮與布料質感的本輪驗收。這輪是實際 Alpha + 有量測的 CAD 格線配準引擎，不是任意照片已 1:1 生成真人或飛船的宣稱。

正式交付規則：V106 保留 Draft，Source + 真 GPU PASS 前不 merge、不部署 Render，不改既有作品與 CNC、安全 Gate。
