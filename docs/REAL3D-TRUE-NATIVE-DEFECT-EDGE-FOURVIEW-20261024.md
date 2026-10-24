# Real3D｜PR #58 原始網格異常邊四視角定位 V1

## 功能概要

依照使用者批准的 Real3D 順序，保持黑色輪廓、咖啡色主體、柔和體積陰影與低高光；**缺陷診斷圖與人型材質完全分開**。承接 PR #57 的原生 OBJ 五個標記區域局部網格品質檢查，這一階讓真正的缺陷邊在 GPU 模型圖上可直接找到。

新增：

1. `aig-real3d-local-surface-topology.mjs` 保留原始 indexed edge 的兩端頂點索引、3D world XYZ、相鄰面數與錯誤類型（`OPEN_BOUNDARY`、`NON_MANIFOLD`、`WINDING_CONFLICT`）；每局部區域最多保留 96 條作繪圖樣本，且 **超出數量絕不靜默忽略，回報 evidenceTruncated=true**。
2. `aig-real3d-source-defect-projection.mjs` 不靠膚色、陰影或模型猜測，固定使用與原有 21 點標記相同的四視角正交相機、測量高度、畫面尺寸、世界矩陣換算；將來源 3D 真邊段投到 1080×1920 影像，跨區域重複來源邊去重，保留不可見/壓縮為零長度的畫面證據。
3. `aig-real3d-source-defect-overlay.mjs` **先取得原本真正 GPU PNG**，再用全新 Canvas 2D 疊上深咖啡、土黃等診斷細線／標記；人型本體依然是咖啡色，不啟用 RGB 人型、發光邊或重製網格。疊圖與來源 SHA、輸出 PNG SHA 分別記錄。
4. `aig-real3d-human-brown-render-lab.html/.mjs` 增加四張異常邊疊圖與下載真按鈕、各視角的異常邊個數、是否被截斷。異常原始 OBJ 可以**唯讀診斷**，必須顯示 **BLOCK**，不得顯示綠色 ready 或通過 release Gate。
5. Node 技術測試以明確標示 **NONHUMAN** 的封閉合成 OBJ、挖掉頭頸附近一個真三角面與翻轉一個面片方向分別驗證；Browser 測試先匯入完好合成 OBJ，再匯入故意缺面的 OBJ，以相同原始標記檢查四方向 **真 GPU 1080×1920 + Canvas 2D 缺陷線**、四張 PNG/SHA、修復前報告與 BLOCK 狀態。

## 須特別說明

- 邊緣疊圖是 GPU 模型真實渲染畫面**上方的 Canvas 2D 診斷層**，不是 WebGL shader 畫在 3D 空間中的永久線框。
- 兩個投影點都不在畫面內時，疊圖可能看不到該條異常邊；即使零局部異常，也**只代表所選五區沒有檢測到本類型故障，不代表人型自然**。
- 當範圍內三角面數不足、沒有可信 OBJ/GLB 來源、21 個標記不能貼合原網格時，仍維持既有各 Gate BLOCK。GLB 標記對應尚未接通，不偽稱已通過。
- 不啟用 SDF、Metaball、Template Morph/Subdivision 的淘汰假人體，更不能把本輪合成橢圓工具測試叫做正常人體或寫出影片。
- 不改 AIG-II、AIG Studio 5.0 原 RGB HOME、3/4/5/6AX、NC、正式 Render LIVE、APK／EXE；PR 保持 Draft。
