# Real3D V111｜複雜背景原圖像素標記、來源輪廓 Gate、真 GLB + 真五軸 GPU

第三專案 FastModel Real3D（不是 Fanuc CNC 5AX 或任何 CNC 機台），接續 V110 的透明／簡單背景識別。V111 的目的：對樹木、建築、街景等複雜 RGB 背景，不再要求先使用第三方自動去背軟體；可直接使用原始照片在網頁內提供主體與背景各至少兩個標記，做**本地來源像素的顏色差異 + 連通主體分類**，然後保留原色與獨立 SHA 的透明 PNG 工作副本 → V109 原始 GLB 真表面 → V107 A/B 五軸 WebGL GPU。沒有訓練權重，不假稱任意照片深度或人體語義理解。

## 模組與真操作
- `formal-web/shared-3d/aig-real3d-v111-seeded-segmentation.mjs`：支援多個來源顏色主體／背景標記，計算各 RGB 像素距離，僅保留可信候選且與主體標記連通的 pixels。前景不能越界、相異主體區不能默默合併、主體/背景標記互相衝突需 BLOCK。
- `aig-real3d-v109-photo-surface-lab.html` + 對應 `ui.mjs`：可在 canvas 原圖真點選紅色主體與藍色背景點（附真 callback）、清除、檢驗透明工作副本、正式以現有 V109 原圖紋理 GLB 生成與 V107 真 GPU XYZ/A/B 轉動顯示。
- V111 說明明確：**由使用者 seed 引導的互動式傳統顏色/連通演算法，不是已安裝的 AI 人體分割模型**。髮絲半透明、相似服裝與複雜背景色無法驗證時須 BLOCK 或改用 V110 經人工確認的獨立 Mask PNG。沒有使用 SDF、Metaball、Template Morph、Subdivision 假人。
- 原圖 SHA、生成的 Alpha PNG 工作副本 SHA、GLB SHA 分離；原圖 RGB 顏色不能變。保留原 GLB 來源索引、UV、相機/五軸渲染結果與舊版功能。

## 真實 Gate
1. Node：棋盤樣式複雜背景與雙色前景，前/背景 seed 互不混淆，真 connected pixels、真原色保留，無分割、錯誤標點、邊界缺失、背景跨越全部 BLOCK。
2. 真 Chromium GPU：用測試實際合成的不透明彩色複雜背景圖，在工作頁真滑鼠點 2 FG + 2 BG → PNG Alpha SHA → GLB → V99 來源解碼 → WebGL 渲染 V107 A90 B120 height65%，復原歸零並驗來源不變，截圖與原始證據。
3. Node＋Chromium 同輪回歸 V110 簡單純色背景與 V109 原透明 PNG，不允許倒退。
4. 圖片主體遮罩、RGB 保留或 2.5D 渲染 PASS **不等於**經獨立量測的深度、自然人體立體、材質真實、動物毛髮、未知背面或 1:1 女主角重建 PASS。完整 3D 信任 Gate 仍 BLOCK。

## 保護與發布
本次為研究開發 **Draft PR**，不合併、不部署正式 AIG Render 網站、不影響 AIG-II/AIG Studio CNC、Fanuc、既有 APK/EXE。必須逐輪檢查 Actions 通過才能稱當輪技術測試 PASS。只有獨立多視角/深度真來源才能放行自然 3D。
