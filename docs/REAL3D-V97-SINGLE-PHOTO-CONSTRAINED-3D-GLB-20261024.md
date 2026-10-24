# Real3D V97｜照片輪廓約束真 3D 幾何與 GLB 動畫（2026-10-24）

本階正式研發**已實作於隔離 Draft PR #97**（base: V96）。原正式 Render RGB HOME、Fanuc／CNC、Android APK、Windows EXE 均沒有更換、沒有部署。

## 技術問題與已完成改進

V95 固定人體先驗：即使 V96 可輸出 3840×2160 真 4K Frame Buffer，3,784 面人物候選的頭部仍是固定橢球，鏡頭轉動會暴露不符來源照片的輪廓。

本次改進是真正回到幾何：讀本機肩部以上照片已取得的 SHA、RGBA 來源像素與臉部候選方框。新增 V97 観測色彩連通列掃描，提取不同行的左右可見輪廓，對 V95 原始 Indexed XYZ 頭部各截面施加有限、可量測的 X 座標修正。在建六關節動畫前重算法線。保持原始索引與原始面數，不改下半身、手腳或 Z 深度；同時提供來源誤差改進前後對照。

**這是有真照片資訊約束的推估幾何，不是已經載入神經網路模型，也不是已驗證的人臉身份認證或真側背面掃描。** 膚色色域可能誤判背景、頭髮或衣服；演算法的 LOW_SOURCE_CONFIDENCE 不能升格成人像辨識 PASS。

## 建模／動畫／下載

1. V97 輪廓資料：formal-web/shared-3d/aig-real3d-v97-portrait-silhouette.mjs
2. V97 自動流程：formal-web/shared-3d/aig-real3d-v97-auto-constrained-model.mjs
3. 頭部在 V95 推估候選上套入 source SHA 綁定的輪廓幾何修正，再以 V92 六關節繼續進行真正 GPU Indexed XYZ 動畫。原始 BODY indices 不變。
4. V97 真 glTF 2.0 GLB 匯出：formal-web/shared-3d/aig-real3d-v97-export-animated-glb.mjs。包含實際 POSITION/NORMAL/index buffers 與四個動畫取樣姿勢，烘焙為三個 glTF morph targets，並附 glTF animation weights timeline。
5. GLB morph 動畫**不是可重新編輯的 glTF JOINTS_0/WEIGHTS_0 原生骨架**；V92 的六關節是在 AIG Runtime 中運動，再烘焙進 glTF morph。不可冒稱完整人物骨架匯出。
6. 操作頁沿用 V95/V96 繁中研究頁，新增「V97 照片輪廓約束重建」和「輸出可動畫 GLB」。可照常使用正、側、背、斜四視角與真原生 4K GPU 輸出。未執行 V97、或來源 SHA 不符必須 BLOCK。

## 2026-10-24 GitHub CI 真驗證

GitHub Actions run 40105618882：**Source PASS + Chromium GPU PASS**，Artifact ID 12564880336。
使用的是明確標記為**非真人、非正式女主角的合成色彩測試影像**，目的僅驗證真輪廓對 Indexed XYZ 幾何、動畫與二進位 GLB。

- Source image SHA: eb7e925ada1dacf63a67c3c3864fa937d13a825baba0d46b9f1c9fc3b2875e64
- 顏色輪廓修正頭部原始 XYZ 頂點：338 個
- 輪廓歸一化誤差：0.25081120119744066 → 0.078358927053865
- 原有 3,784 真 Indexed XYZ triangle、六個 Runtime 動態關節、原始資料與 source face indices 完全不變
- 真 Native GPU readback 的兩個動畫姿勢 SHA 不同
- GPU 完整緩衝重新上傳：0 次；GPU incremental subdata uploads：2 次
- 真二進位 GLB：139,740 bytes；SHA256=52ad36124a0bcc5a6bbaaea3c10634bf53eb8cec545b69467ad11a923549e3a6
- GLB 內容含三個 morph targets 和 glTF animation weights channel；二進位由 GitHub Artifact 交付，可另行用 GLB viewer 驗證視覺品質。

## 依然 BLOCK 的重大品質項

V97 不代表已能把定版《星際之旅》女主角本人臉部 1:1 生成真人自然動畫。真皮膚、眼、髮絲、嘴部表情、五官相似度、照片之外的背面和人體比例，都仍是近似；4K 電影近景材質、動態布料、完整電影連續性、GLB 跨裝置播放相容性、4K60 全片和實際 2:12:08 長片仍未通過。真正生產下一步需可靠的本機臉部/頭髮 landmark model 或經授權高密度掃描、跨視角 2D 反投影與可視化接近度 Gate。禁止以三角面暴增、SDF、Metaball、Template Morph、Subdivision 假人體替代身份真實來源。
