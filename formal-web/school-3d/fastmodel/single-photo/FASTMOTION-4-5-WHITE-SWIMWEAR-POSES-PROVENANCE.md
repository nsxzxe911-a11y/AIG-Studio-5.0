# FastModel 4.5 — 女主角白色泳裝／馬尾四姿勢圖資（DRAFT）

**圖資真實入庫**：ChatGPT Library `/AIG/Asset Packs/FastModel-4.5-Heroine-WhiteSwimwear-4Poses-DRAFT/`，已實體上傳四張原始 1122×1402 PNG、`ASSET-MANIFEST.json`、四圖檢查畫廊、README 與 ZIP。資料夾與檔案不是 GitHub 二進位資產，不在正式 Render 網站。原圖不得刪除或覆寫。

完整 ZIP SHA-256 `13a444fd97ab3d0708fd4cc263c0ee6ac1363933a143c9b4fe3fa9e0d9c19af8`

| Image ID | 原檔 | SHA-256 | 角色姿勢 | 有效視角 |
|---|---|---|---|---|
| HEROINE-WS-POSE-01 | 陽光泳池畔的夏日微笑.png | `3f33a146e0a02fd23737b9fc7e5885b64b9d732e6da09a0585b7fd0d20e1ea43` | 泳池前方站姿 | 正／近正 |
| HEROINE-WS-POSE-02 | 陽光海濱泳池寫真.png | `b2c0f8585e55c5f700a8f0d626396baf020f65db36a45d61f0b76bad4cfb03d2` | 馬尾手勢 | 正／近正 |
| HEROINE-WS-POSE-03 | 陽光海景別墅中的夏日倩影.png | `644dea146a55a5249a04feb8fd456bbd7902d8077637a7275d0ae6a96be53e4e` | 室內自然站姿 | 正／近正 |
| HEROINE-WS-POSE-04 | 海邊泳池度假_portrait.png | `b141aea9347046dc395579e24a84be8d97a750d574f0b0fe1f2461b9d8d2fae5` | 泳池走路／轉身 | 正／近正 |

- 圖像屬同一設計意圖的 AI 生成成年人角色候選，**人臉、解剖比例、服裝細節與四圖身份的一致性未正式通過**。
- **不是 4 個 camera yaw**，不可將正面不同站姿誤稱為左側／背面／右側。沒有真實背面、側面紋理或相機標定，必須標記 `UNKNOWN`。
- 此 asset set 的 status 為 `REGISTERED_REFERENCE_DRAFT_NOT_3D_AUTHORITY`；不是正式女主角 3D GLB 權威資料，也不能生成 360° 的準確未知面。
- 原圖角色源參考 `陽光下的花漾居家少女.png` SHA `32fe2851447da1a03ca4913a856a1cd327ee191bb6b966e4121a0cc2b74b1b12`，僅作人物外觀設計來源鏈。
- 本輪 GitHub 僅保存程式與來源 SHA Manifest；四張 PNG 實體在 Library。沒有自動部署至正式 AIG 網站。

## 4.5 自研程序功能

- `aig-calibration-4-5.mjs` 驗證完整原圖位元組 SHA + 1122×1402 像素，只有完全相符才允許比對四份來源。任意改碼、重繪的替代圖必須建立不同來源 ID。
- `index.html` 及 `app.mjs`：選擇最多四張圖，實際依序在原圖上點選**頭頂／下巴／雙肩／雙髖／雙腳踝**（共 8 點）。標點必須在像素內且相對上下順序合理。允許撤回，確認後保存每張的 normalized 2D landmark 與比例報告。
- `reviewPoseSet()` 可以比較四張 2D 肩寬／身高等測量差異並標註姿勢或透視風險，但 **不會把這些不同站姿當成 3D 深度三角量測**。
- 匯出 JSON 保存 image ID、來源 SHA、landmarks 與 Gate；`cameraCalibrationVerified:false`、`estimatedUnknownSurfaceDepth:false`、`realHeroineGLBApproved:false`、`releaseAllowed:false`。
- 自研、離線、零生成點數，不呼叫 Meshy、Stable Fast 3D 或雲端模型。UI 來源真實可操作，但仍是照片標點工具、不是全自動人物辨識／骨架蒙皮。
- 保留 4.0 技術 GLB／八角度草模，4.1 SDF，4.2 GPU governor，4.3 四肢局部快取，4.4 頭頸髮量技術 QA。

## 後續 4.6
先改善來源人工標點密度及多姿勢參考圖的 scale-normalization；有真正左側／背面／右側圖時才能進行多相機 3D 校正。獨立的人體 mesh patch / 真頭頸表面／髮束髮根拓樸需要真 3D Geometry Gate，CI 來源通過不能等同產品已能輸出擬真女主角動畫。
