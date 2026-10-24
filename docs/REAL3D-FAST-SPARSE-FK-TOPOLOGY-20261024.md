# Real3D｜極速模式 V1：來源稀疏索引、逐影格變形與低記憶體影格緩衝

2026-10-24。沿用尚未合併的 Draft PR #73（Base→Middle→Distal 三節來源真 FK），僅做確實可驗的運算加速，不捏造人體、不可用 SDF/Metaball/Template Morph/Subdivision、不可減面換效率。

## 真正改動的演算法

前版每個 FK 時間子幀均巡覽 OBJ 所有 original source vertices 與 original source faces，即使只有幾個手指來源 vertex 有明確權重。這在 350,000 vertices / 700,000 triangles 邊界內會對零權重區浪費大量 CPU 時間。

新版在來源 SHA、source GLOBAL Indexed XYZ、三個 pivot/axis/顯式來源 vertex ID weights 與祖先繼承驗證完成後，**一次**建立：
- `activeSourceIds`：Base/Middle/Distal 任一手工來源 weight>0 的 global vertex index（升序，不自動推測骨架）。
- `affectedTriangleOffsets`：真原始 GLOBAL faces 任一頂點屬於 activeSourceIds 的來源三角面 offset（無分塊接縫假裂縫）。
- 僅針對上列 vertices 執行加權父子真三維 Rodrigues rotation；針對上列 touching triangles 計算變形面數、最長邊拉伸／壓縮、翻面、塌陷。**不忽略任一真正可能被變形的原始面片**；未受影響面片仍全部保留在輸出網格。
- 真接觸、兩幀間 swept AABB 的計算與上一版相同；這不是完整連續全身防撞，也不承諾 60 FPS。

## 極速記憶體策略

每幀仍由原 source Float32Array 複製新真 XYZ，保留全部原始 source faces、GPU 繪圖品質與原始 SHA。前版將每個子幀完整 original-world xyz 留在回傳物件（上限 25 幀）；新版預設只保留 **3 個用於真 GPU 原生 PNG 的完整 XYZ 姿勢**（或 3–9 個明確展示幀），其餘子幀在應變/取樣穿插/掃掠風險計算後丟棄完整 XYZ，只留下角度、診斷與 pivot。掃掠前後影格以至多前一幀 + 目前幀的臨時緩衝計算；來源仍絕不覆寫。

內部 QA 可選 `retainAllSourcePoses:true` 比較全部 FK 子幀來源 XYZ；正式 Web 工作區預設 false 省記憶體。這只是 CPU 子幀記憶體；**GPU 原始幾何仍依舊重建 chunk 到真 WebGL**，尚未完成 GPU 更新增量化，不得虛報全面加速或實機 FPS。

## Gate 與可核對數據

輸出 `sparseSourceTopology`：
- inputSourceVertexCount / activeWeightedGlobalVertexCount / skippedUnweightedGlobalVerticesPerFrame
- inputOriginalSourceTriangles / indexedAffectedOriginalTriangles / skippedUnaffectedOriginalTrianglesPerFrame
- numberOfFullXYZFramesRetained / discardedIntermediateFullXYZFrames / retained real GPU 3D frames
- sourceOriginalIndicesUnmodified, GPU chunks still rebuilt, noBenchmarkedFPSAssertion。

**非人體 NONHUMAN QA**：在可動工業封閉 Cube 網格旁加上大面積完全無權重原始格面，Source Node 同時運行「全原始三角面逐幀參考掃描」與「稀疏索引加速」：每一幀的變形面數、最大拉伸/壓縮、翻面、塌陷結果必須數值一致；未被加權的整個原始格面 XYZ 逐座標不變；全幀保留與只保留展示幀的每一幀診斷也必須相同。SHA 偽造、錯來源頂點數、不合理子權重維持 BLOCK。

Chromium 回歸在真 113,400 original vertices / 226,080 triangles 的 NONHUMAN 高密度來源上驗證：只有真權重 index 的原始頂點/相鄰面片進入稀疏 FK、原本全部 226,080 面片照原生 GPU 三幀輸出、真 PNG SHA/JSON 比對、非展示時間幀完整 XYZ 被安全釋放。

**不得宣稱**：實機 60/90/120 FPS、GPU 增量緩衝、真人天然皮膚、照片一比一、完整人體骨架或連續防撞已完成。這些 Gate 一律維持 BLOCK，等待有授權原生人體掃描基底及性能實測。

## 正式版本守則

僅在隔離 Draft PR 自上次可信 HEAD 增量開發；正式 Render AIG RGB HOME、CNC AIG-II / AIG Studio 5.0、FastModel 官方頁面與 Android/Windows APK/EXE 均不部署、不覆蓋、不回退。雙 Gate 都通過才稱本輪技術 PASS。
