# Real3D V108｜第三專案五軸幾何精度 Gate（Draft）

**本版是在第三專案 FastModel／Real3D 的真來源 GLB 上驗證虛擬 A/B 姿態，不是第二專案 CNC 真機控制。** 
承接 PR #109 的 V107 Chromium 同 GLB、同相機、同著色器測試，保留正式 Render RGB 首頁，無合併、無部署、無 APK/EXE 假交付。

## 為何 55,866 像素不等於錯誤？
不同的角度或 25%/100% 高度會改變圖片像素。只有在**同一來源、同視角、同高度、歸零或相同姿態**時，才用「0 像素差異」要求一致；非零不同像素必須和預期轉角/裁切一起解釋。先前 12 三角面方塊只是測試夾具，不證明人體、動物、皮膚、毛髮、布料或不可見背面重建。

## V108 已新增的精度稽核程式
- `formal-web/shared-3d/aig-real3d-v108-five-axis-precision.mjs`
- `formal-web/shared-3d/tests/aig-real3d-v108-five-axis-precision.test.mjs`
- `.github/workflows/aig-real3d-v108-five-axis-precision-gate.yml`

每 15° 一格：A=−180°...180° 共 25，B=0°...360° 共 25，**625 組**數學姿態。從真 source Indexed XYZ 和其 scene node World Matrix 擷取代表性真頂點，使用獨立公式 B 子軸先轉、A 父軸後轉驗算 V107 的實際模型矩陣，並檢查旋轉後→矩陣反算回原座標、旋轉半徑與 pivot 不變。MM 原始座標及 METERS 來源都以 **毫米**計算最大誤差，界線固定 0.001 mm。旋轉矩陣 det 應接近 +1。

來源高度在 0/25/50/75/100% 時以**旋轉前來源 Real3D Y**計算；100% 時 GPU shader 應關閉不必要的裁切。稽核前後 JSON 來源物件必須保持完全不變，三角面不可偷換，B=360° 按真正模型矩陣回到 B=0°。數學稽核不修改來源 GLB，也不寫 CNC/Fanuc。

CI 先執行 V108 625 格與 V107 source test，成功後再重跑**原有 V107 Chromium 真 WebGL 三組畫面與像素相等基準**。此 GPU 回歸測試仍使用 12 三角面來源夾具，**不是 V108 已在 625 組跑真 GPU 截圖、不是 4K 硬體、不是人體多視角實測**。若 Node 或 Chromium 失敗則本研究 Gate BLOCK。

## Gate 劃分

| Gate | 判定原則 |
|---|---|
| V108 虛擬五軸數學一致性 | 625 姿態、回零/獨立公式/半徑/pivot/原始 source clip 數值誤差 ≤0.001 mm，程式回傳 PASS 或 BLOCK |
| Chromium GPU 相容 | 保持 PR #109 真 GPU「傳統 3D = A0/B0/100%」相同像素；角度/高度改變要有真圖像差異 |
| 真高密度來源品質 | 大於 12 個三角面也不能自動宣稱是真實人體；無獨立來源／掃描驗證時維持 BLOCK |
| 照片/輪廓 IoU 與多面誤差 | 尚未把**同一真實物件**的照片／深度／六面量測與模型做實測；維持 BLOCK。過往 69.54% CAD TOP 平面對位不可當真人相似度 |
| 真 CNC 安全、SIM 切削、手機/電腦 60 FPS、正式部署 | 均不由此虛擬渲染測試認證，維持各自 Gate |

### 下一個真品質瓶頸
需引入**經授權、具有真幾何與可追溯資料的較複雜 GLB**，連同實際照片/掃描的前後左右頂底獨立觀測，測量遮擋、silhouette IoU、局部表面偏差、人體/動物材質和分層連續性；不能用任意增加三角形、程序性假人或隨機生成背面騙過品質 Gate。

**此 PR 保持 Draft。** 技術測試成功不代表已完成原圖 1:1 真實 3D 重製，不部署正式 Render、不改 AIG-II/AIG Studio CNC/Fanuc、不提供未產生的 APK/EXE。
