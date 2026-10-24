# Real3D V113｜兩視角曲面重疊的毫米殘差、接縫和原圖色彩差異 Gate

**第三專案 FastModel／Real3D**，接續 V112 PR #114。這是兩視角「已量測來源曲面」的一致性檢查，並未把兩張照片推論成完整人體，也不是第二專案 CNC 真五軸控制。

## 已真實施工
- 新核心 `formal-web/shared-3d/aig-real3d-v113-overlap-seam.mjs` 直接讀取 V112 共用世界坐標所使用的兩份來源深度 Float32Array、各自實際 PNG 解碼 RGB、不同來源 SHA 和相機內外參。
- A→B 與 B→A 各沿原始像素網格抽樣。將來源像素以實測深度反投影為 world XYZ，再投影至對方相機，比較**另一來源同一可觀測位置**的深度 mm；追蹤可配對像素數、覆蓋率、投影半像素殘差、RMS / P95 / 最大深度差與超差點。無深度、投影超出畫幅、在相機背後、投影未對準像素不偽造配對。
- 有足夠雙向真配對（預設各 ≥24、各自比例 ≥10%）且每一對深度差≤2mm、整體 RMS/P95≤2mm 才有 `PASS_OBSERVED_SEAM_CONSISTENCY`。三個 landmark 過關不代表整片表面連續，故另設非 landmark 深度跳變 9mm 的阻擋測試。
- 真圖片直接從來源 PNG 解碼 RGBA，比較相同投影位置的 RGB RMS。若光照、曝光、不同材質導致平均色差高於門檻，獨立 `WARN_RAW_COLOR_DIFFERENCE_EXPOSURE_OR_MATERIAL`；幾何通過也不會替來源圖片自動改顏色、不宣稱 PBR 來源色真實一致。
- V112 繁中工作頁補 V113 真數值 Gate、色彩門檻與重疊區紅色異常像素圖。仍保留 V112 原始兩片 GLB，V107 五軸 A/B 真 WebGL／原圖材質、來源 SHA 不變。

## 驗收與限制
1. Node：兩個真深度平面視角的雙向重投影差=0；突起 9mm 需 BLOCK；色差應 WARN 但不能捏造照片材質修復；無重疊須 BLOCK，來源 SHA 獨立；缺失深度不當成表面。
2. 真 Chromium：V112 雙圖片＋雙深度來源的 GLB 建模 → V113 完整重疊與色差報告 → V107 五軸 GPU A90/B120/75% → 模型 SHA 不變；故意在非 landmark 插入 9mm 異常深度必須 BLOCK，原 V112 landmark 仍可保持 0mm。回歸 V111。
3. 測試資料仍是**合成標定深度夾具**；PASS 僅意味此幾何對位演算法能偵測標定好壞與局部衝突，不代表真實深度相機達到 2mm 或 CNC 0.001mm。
4. **沒有銲接 mesh、填洞、補未知人體背面、改色、假毛髮、假外衣厚度、假自然真人 1:1**；已觀測兩片真 GLB 表面仍是分離來源。若後續需要融合，必須有獨立不確定度、法線與真多視角來源 Gate。

研究分支保持 **Draft**，不合併、不部署 Render 正式入口，不動 AIG-II／AIG Studio CNC／Fanuc／現有 APK/EXE。
