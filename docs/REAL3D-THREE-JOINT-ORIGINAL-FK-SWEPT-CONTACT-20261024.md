# Real3D｜三節原始三維來源 FK＋掃掠風險診斷 V1

日期 2026-10-24。基於 Draft PR #72 的真 Base→Middle 原始 OBJ FK；PR #73 建立 Base→Middle→Distal 三節來源 3D 層級連動及跨時間取樣的可能碰撞篩查。這不是自動人體骨架或真人皮膚物理。

## 真正研發成果

每個手指由 **Base / Middle / Distal** 三個已指明來源原始位置、軸、顯式 GLOBAL vertex ID/weight 的 joint 構成。唯一承認 JSON schema：
`AIG_REAL3D_EXPLICIT_THREE_JOINT_WEIGHTS_V1`，含 `sourceSha256`、`sourceVertexCount`、`side`、`finger`、按順序的三個 joints 各有 `pivotSourceXYZ`、`axisWorld`、`vertexWeights`。既有來源 Base 和 Middle 必須與原先解剖標記來源一致；新增 Distal 必須手動指定並落在真正原始 OBJ 表面，與前兩者不同。不從單一影片畫面偽造指骨；沒有授權來源即 BLOCK。

**真正階層計算：** Base 先轉動 Middle 旋轉中心及軸，同時先將 Distal 旋轉中心帶至父關節的新位置；Middle 再帶動 Distal 旋轉中心及軸。對每一個原 GLOBAL vertex 依 Base、Middle、Distal 明確權重順次做真三維旋轉。Distal 權重不得大於 Middle，Middle 不得大於 Base，不能出現沒有上層控制的下游漂浮頂點。每一姿勢的工作副本保留原始來源 XYZ、global face indices，完全不動原 OBJ，GPU chunk 也保留原全域映射。

**跨幀幾何品質：** 角度 ±45°、最大 6° 子幀間隔、最多 24 個區段、3 個原生 GPU 1080×1920 展示影格。每子幀計算實際原始三角面位移、邊長拉伸/壓縮、三角面翻面與塌陷；超過 20% 應變標為風險，**不以平滑/補面/假皮膚掩蓋**。

**接觸證據要區分兩類：** (1) 在取樣幀中，對 parent-only 區與 distal 區做原始三角面 3D AABB + 非共面 triangle-triangle 實測；(2) 對相鄰兩幀，用前後兩個姿勢合併的 original triangle AABB 做**保守的 swept 風險篩查**。只有第一類可以說取樣影格觀察到非共面交叉；第二類重疊只是可能穿插，會假陽性，不能直接宣稱真的相撞。即使兩者都未觀察到，也不能聲稱真連續的無碰撞證明；共面/切觸、其他身體部位、極短時間事件仍未完整處理。上限 120k 配對（16 倍 broadphase 候選）耗盡必須標記 INCOMPLETE，不能顯示安全 PASS。

## 技術測試與發版禁則

Node 測試使用 NONHUMAN 原始 Indexed cube；3 個真旋轉中心與連動、新工作副本 XYZ／12 原始面片無損、只遠端轉不應移動父 pivot、超角度/偽 SHA/Distal 無 parent 權重 BLOCK；獨立使用兩個端點都分離、掃掠中間可能相遇的非人體 triangle 工件，證明風險篩查不會因只看端點而漏掉潛在事件。

Chromium 繼續原 113,400 頂點／226,080 三角面非人體原始 OBJ 流程，載入 Base/Middle/Distal 真來源對應座標及層級權重，確認足量三維中間幀、三張真正 GPU PNG，下載 SHA/JSON 比對及原 OBJ 不變。測試成功只能叫**技術 Gate**，天然人體外觀、皮膚彈性、真關節運動、真 60 FPS、真人照片 1:1 和動畫成片一律 BLOCK。

正式 AIG Render RGB 首頁、AIG-II／AIG Studio 5.0 CNC 功能、APK／EXE 不變。本 PR 只在 Draft working branch，不能合併或自動部署。
