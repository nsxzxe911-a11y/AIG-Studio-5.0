# 第三專案 FastModel｜7.13 真尺寸 1:1 立體重建引擎施工斷點

日期：2026-10-23 Asia/Taipei。延續 1.8 GPU 立體渲染、7.9 連續掃描、7.10 雙視角校準、7.11 視差特徵對應、7.12 CAD 尺度，不回退其他兩套 CNC 專案。

## 已落盤真正的引擎功能
- `aig-metric-stereo-7-13.mjs`：兩張**經極線校正且物理相機基線與焦距已量測**之照片，先做像素自動視差匹配（局部紋理檢查、最佳／次佳唯一性、左右雙向一致性、運算量限額），再以 `Z(mm) = focal(px) × measuredBaseline(mm) / disparity(px)`、相機內參換算三維 XYZ 毫米座標，不猜單張照片缺少的深度。
- 依可靠的立體視差點構建**真實三角面拓撲與原照片 UV**；超過深度連續性容許的三角形不拼接。拒絕無紋理、低信心、來源相同、不可校正的照片，不用假背面封補。3D 原點採左相機光心，而不是擅自認定 CAD 工件原點。
- `metric-stereo-studio.html/mjs`：**可操作的 FastModel 新工作頁**；兩張照片本機載入／精確 source SHA-256，數值相機焦距／水平基線與物理標定明確核可，瀏覽器本機算 3D、以真 Three.js WebGL 可旋轉模型展示、原圖貼圖，GLTFExporter 真二進位 GLB；匯出時座標由毫米換成標準 glTF 公尺（1 mm=0.001 m），不改變實物尺度。另輸出來源 SHA/尺寸證據 JSON。
- `index.html` 明確新增「7.13 真尺寸 1:1 立體重建」導覽；`build.mjs` 使新工作頁內建在 FastModel **完整離線包**，無外部 CDN、第三方建模 API 或人物資產。
- 舊動畫／頭頸／皮膚／RGB 使用者資料全部保留；新路徑獨立且不輸出真機 Fanuc 指令。

## 已完成驗證的技術證據
- [AIG Real3D 7.13 編譯／真瀏覽器 #39836546825](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39836546825) **completed/success**；物理刻度數學、雙向視差、紋理與來源保護單元測試 PASS。
- 真 Chromium 手機：`AIG713_REAL_METRIC_STEREO_TO_GLB_PASS phone 1900 3626 117000`（1900 個具有深度的真 XYZ 頂點、3626 三角面，匯出 117,000 bytes 的合法 GLTF2 binary）。
- 真 Chromium 桌面：`AIG713_REAL_METRIC_STEREO_TO_GLB_PASS desktop 1900 3626 117000`。
- 技術圖片是具有真實已知 8px stereo disparity 的合成彩色紋理影像；以 measured baseline=60mm、fx=120px，真深度結果約為 **900mm**（120×60÷8）。這只證明演算法物理單位與 GLB 工作鏈路，不是正式人物的實際量測品質證據。
- 原 FastModel 1.7 真 GLB Quaternion 動畫、1.6 GPU residency 、1.3 真 G0/G1 數值切削同 Gate SUCCESS。Real3D 1.8 靜態 GPU Instancing 以既有獨立 Gate #39834442580 SUCCESS 為證據；本 7.13 只新增來源路徑，不聲稱所有 1.8 diff 全面實機驗收。

## 真正 1:1 的條件與不能冒稱的完成度
- 本階可以**條件性**把物理尺度從來源校準帶進 XYZ 幾何（metric 1 mm to 1 mm），但不等於任一張照片就能自動知道物件真實深度、背面、髮束、衣服內側。
- 任意單張 RGB 照片完整可測量真人 1:1、完整身體拓樸／貼皮／髮束真材質、無量測來源就準確 0.001mm、製程 Fanuc/Gate、原生 S23/Windows 60FPS，仍是 **BLOCK／未驗證**。
- FastModel 7.13 source / offline build 位於 `repair/core-first-fastmodel-20261021`，**未自動上線**到 `web/aig-dual-formal-runtime-20261016` 的 Render 正式網站；不可假稱網頁已更新。此專案第三方源碼差異大，安全隔離部署。

## 下一個真研發階段
1. **7.14 連續多視角密集表面融合**：把已驗證的 7.9 keyframes / 7.10 calibration / 7.11 correspondences / 7.12 CAD scale 接成多視角 XYZ observation 累積，避免每張照片重新重建全模。最小局部 chunk patch、重複觀測置信度與動態物件排除。
2. 使用有真相機標定與物理距離的真人/物件照片測試，持續研發遮擋背面掃描與可見表面貼圖。沒有量測的不可宣稱 1:1。
3. Android/Windows 實際 GPU 承載與 FPS、FastModel 正式新網頁安全 module-delta 整合，再完成逐頁 UI/真控制 / 真下載驗收，不覆蓋當前可用的 AIG CNC 網站或兩套平台。
