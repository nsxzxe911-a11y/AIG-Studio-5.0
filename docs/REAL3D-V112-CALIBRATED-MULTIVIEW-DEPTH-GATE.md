# Real3D V112｜兩份有來源之實測深度 → 世界座標配準 → 真 GLB → 五軸 GPU

**第三專案 FastModel／Real3D**；承接 V111 PR #113，不修改 AIG-II、AIG Studio CNC、Fanuc、Render 正式首頁、APK/EXE。這次往「3D 幾何來源」前進，而不是增加三角形湊漂亮數字。

## 已實作
- `aig-real3d-v112-calibrated-multiview.mjs`：兩張**不同** SHA PNG 圖片、兩份**不同** SHA 的逐像素毫米深度圖（Float32Array），以及各自真相機內參 fx/fy/cx/cy、相機至世界坐標 column-major 剛體矩陣。
- 原始深度值每像素轉為相機 XYZ，再以標定姿態轉為共用世界 XYZ（mm → glTF m）；只在四角都有真深度且物理邊長不超過上限時建立來源三角面。失測 0、遮蔽與深度跳變不跨面、不 AI 補全。
- 至少三組非共線共同觀測點必須在兩個相機深度圖中都有效；計算毫米 RMS + 最大殘差，超過可配置門檻 BLOCK（預設 RMS ≤1mm / 最大 ≤2mm）。**這是兩來源內部一致性門檻，不是宣稱真實掃描機達到 0.001mm。**
- 真 GLB 2.0 多 mesh、多材質、多原圖 PNG 嵌入；兩個來源 Patch 共用世界座標，UV 和已測量面保留；不做假閉合、假背面、假類人體填充或任意銲接。
- 專用繁體中文工作頁 `aig-real3d-v112-calibrated-multiview-lab.html`：兩組獨立 PNG、深度 JSON 上傳與相機標定/對應點 JSON，點擊真執行 → 真 GLB/V99 解析 → V107 A/B 五軸 WebGL 操控/逐層 → GLB 下載。
- 真圖照片 SHA、真深度 JSON SHA、GLB SHA 分立，保留錯誤來源 BLOCK。

## 真驗證
1. Node 使用可重現的**合成深度測試夾具**（平面 1000mm、兩相機基線 20mm、2px 對應偏移）驗證兩來源真 glTF、共享世界 XYZ、3 非共線校準點 RMS 為 0、原貼圖 bytes 並無重寫、不同來源 SHA。
2. 變更相機平移至 50mm 必須 BLOCK；複製同一來源 SHA / 假深度聲明 / 共線標記 / 相同相機姿態皆 BLOCK。
3. 含 0 或深度不連續的邊必須不生成跨越三角面。
4. Chromium 測試工作頁實際上傳兩 PNG、兩 JSON，執行 Indexed GLB 生成及 V99 ingest + V107 真 GPU A90 B120 高度 75% 比對截圖；故意錯誤相機矩陣必須 BLOCK。保留 V111 regression。
5. **本輪真實掃描儀照片尚未提供，測試輸入為可重現合成校準夾具。** 此結果只驗證深度融合管線，不代表真人、動物、衣服或未知背面高擬真 1:1 PASS。來源深度真實性仍需獨立校驗。

## 下一個品質缺口
需要真實多視角掃描圖與深度/相機外參來源，推進視角之間的接縫、局部點雲/曲面幾何配準、複雜遮擋、照片測量誤差與原圖自然外型 Gate。仍禁止 SDF、Metaball、Template Morph、Subdivision 假人。

**Draft、僅 GitHub 開發分支，不宣稱已經上架 Render / APK / EXE。**
