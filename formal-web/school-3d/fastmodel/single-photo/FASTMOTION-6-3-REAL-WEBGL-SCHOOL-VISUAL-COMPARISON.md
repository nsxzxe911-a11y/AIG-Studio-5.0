# FastModel 6.3｜校園女主角 2D Authority × 真 GLB WebGL 正面外觀差異（技術 QA）

## 版本與可信來源
- 6.2.0，commit `623fd8c63fccd72b7bd436202f5cf58f3cb97c6b`，GitHub Actions `39538677530` completed/success，90／90。
- 本階沿原分支升到 `6.3.0`，保留 6.2 的校園圖來源 SHA、6.1 原圖六點輔助校正、6.0 臉部網格調整、5.9 動態裙裝避讓與全套原劇情／配音／音效／音樂／錄影功能；不得降低 Gate 或回退。
- GitHub Draft PR #12 仍未合併；**尚未將 6.3 新功能部署至原 Render 網站，也未新造 APK／EXE**。

## 6.3 真正落地的比較路徑
1. 6.2 使用者選擇 ChatGPT Library `/AIG FastModel/女主角正式圖資/2026-10-21` 的其中一張已核對 2D 原圖，經**真檔案 SHA-256、文件長度、圖片格式與像素尺寸**核對通過後，才可開啟 6.3。最新版 2D 展示圖為預設視覺參考；不是 3D GLB 的像素或模型權威。
2. 新增 `aig-visual-compare-6-3.mjs` 與頁面 Button IDs `aig63-prepare`、`aig63-reference-canvas`、`aig63-capture`、`aig63-compare-canvas`、`aig63-image`、`aig63-report`、`aig63-status`。全部有原 RGB 真 callback。使用者拖曳框選 2D 展示圖的**單一、完整人物範圍**。原始圖像 RGBA 快照先保存，Canvas 顯示出的框線不可污染比對輸入的像素。
3. 驗證當前工作區真模型具有 SkinnedMesh 與動畫，依 glTF 實際網格各自檢查 **FACE、JACKET、SHIRT、PLEATED_SKIRT、BOW、BACKPACK、PONYTAIL_STRANDS** 七個具真三角面、真 skinWeight 與 Skeleton 的 Mesh，並確認整體至少 9 個 SkinnedMesh／5 個 Clip。缺任何必需物件 → BLOCK；無其他服裝限制。
4. 使用**實際 PhotoViewer/WebGL 3D** `captureHeroineReview({fraction:0})`，取最新 GLB 的真正骨架初始姿態／四方位 2×2 PNG；確認第一張為 `positive-z` 正面，原始裁切為 960×720 contact 的第一格 480×360，排除上方標籤再框選 GLB 正面像素。不能使用先前另個 SHA 的動畫圖片假冒。
5. 兩份真正的原圖 RGBA 像素 + 當前 GLB WebGL PNG RGB 輸入 `compareAIG63ActualImages`；以各 ROI 同尺度 40×40 實際取樣，計算 RGB 平均絕對差、亮度差、edge density、深色／淺色中性／深藍／棕色比例等特徵。所有結果固定標註 **受圖片裁切、背景、光照、姿態影響，非相貌相似度、非已自動對準的身份比對**。
6. 產出兩欄對照 PNG（左實際校園 2D 參考人物區；右真 3D WebGL 正面初始姿態），以及 SHA 綁定 JSON（包含參考圖 SHA、GLB SHA、原 GPU PNG SHA、ROI、各項差異和 glTF 真網格數量）。參考圖變更、GLB SHA 變更、審查中來源改變都必須 BLOCK，重做照片及 GLB 兩方核對。
7. Source Gate 以實際 GLTFLoader.parseAsync 解析 5.7 和 5.8 自研真 Skinned GLB，核對七個校園服裝部件、5 段動畫及 9 個 Mesh；另外以帶 RGB 像素的合成圖片驗證差異對真影像值敏感、假 SHA／錯 ROI／透明截圖一律被阻擋。此源碼回歸不構成已在真機完成視覺比較的證據。

## 使用者最新服裝決策（不可更改）
- 校園制服只屬本次女主角 2D 參考，**先前所有泳裝及其他動畫服裝不禁用、不刪除、全域衣服清單不改動**。
- 程式碼不因 6.3 對照校園模型就刪除其他已經存在的劇情／動畫／服裝。比對失敗只阻擋本次 6.3 報告，其他頁與動畫仍能運作。

## Release Block
- 6.3 有**真 GLB 正面渲染與圖資的實際像素差證據機制**，但還沒有對指定使用者女主角照片人工核准的身分／五官／髮束／制服相似度，也沒有證實缺失的物理布料、裙子／頭髮全部動作無穿模。
- 一張正面首姿態不能證明所有角度／所有動畫自然，技術量測不能等同完整外觀美術核准；輸出 `releaseAllowed:false`。
- 真 60 FPS 必須後續對 Android／Windows 裝置實測，Source Gate PASS 不能當成上線證據。
- 只有**6.3 最新完全相同 SHA** 的 GitHub Actions completed/success 能列為可信 source 斷點。
