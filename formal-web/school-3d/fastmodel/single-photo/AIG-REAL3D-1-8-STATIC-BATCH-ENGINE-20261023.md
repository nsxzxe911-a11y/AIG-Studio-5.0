# 第三專案 AIG FastModel — Real3D 1.8 靜態物件 GPU 合批與節能迭代

日期：2026-10-23 Asia/Taipei。這是一輪**真正的 3D 引擎程式更新**，並非單純 CI 重跑或升版本名。

## 真正程式碼
- `aig-static-instancing-1-8.mjs`：以 Three.js `InstancedMesh` 將同一個合法 GLB 的重複 **相同 Geometry + Material 物件**合批為 GPU Instance。Scene-to-model 的矩陣運算保留各物件位置、旋轉與比例；拒絕負行列式、材質不透明度/自訂 Shader、SkinnedMesh、Morph、動畫目標與其祖先、動態/碰撞/CNC Authority 物件。GLB 有動畫時，靜態場景必須在來源中明確 `userData.aigStaticInstanceSafe=true`。合批建立失敗完整復原、不銷毀原頂點／材質；關閉直接恢復全部原本的網格顯示；可分批且上限 2048 instances/batch 與 source memory guard。
- `viewer.mjs`：`setStaticInstancingEnabled(bool)`、`getStaticInstancingReport()` 正式接到 FastModel 真 GLB 播放場景。換 GLB 會還原前一個場景的 optimizer，不跨文件串色。**失敗 GLB 匯入的回退保護**：新文件必須先成功解析成可用 GLTF2、再釋放／還原舊檢視器資料；來源錯誤不清掉舊畫面。
- 同一主渲染循環：瀏覽器整個分頁隱藏，且不在錄影／逐影格／動作驗收／錄製影格證據時，減少不必要的 GPU render 提交，動畫/故事狀態仍依原有邏輯維持。
- `app.mjs` + `index.html`：主 FastModel 3D 工作區新增 1.8 靜態 GPU 合批開關及 JSON 檢視，可看原始靜態節點數、GPU Instance 群組數、理論繪圖呼叫節省和是否有真正可批的幾何；未出現符合條件的來源時回報無組別，不做假優化。
- 不動原 CNC 3AX 網站、真機輸出禁則、CAD/CAM/NC 解析，與原 FastModel 女主角骨架／動畫來源。

## 實測的技術結果
- [GitHub 真 Real3D Gate #39834442580](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39834442580) `completed/success`，具 `node --test tests/aig-static-instancing-1-8.test.mjs` 和真 Chromium GLTF2 phone/desktop.
- 真 GLB 技術場景由 1 個獨立 Quaternion 動畫立方體加 **8 個共享頂點/材質的靜態零件**組成。播放器透過 `GLTFExporter` 寫出 GLB、`GLTFLoader` 回讀後實際按下 1.8 合批：8 個來源靜態網格變成 1 個 `THREE.InstancedMesh`，理論減少 **7 次 WebGL draw calls**；Playwright 也強制比較實際 `renderer.info.render.calls` 至少下降 6 次並於關閉後恢復原呼叫數。角色 Quaternion 動畫獨立播放、原頂點不變。
- 同一輪 Real3D 1.7 真 GPU 計時與 1.6 Buffer + 1.3 G0/G1 數值切削回歸保留 PASS。
- 後續 `viewer.mjs` 另加 **失敗 GLB 匯入不解除舊加速器**安全修正 `e085c5061e32e20e6e5eb4da429d40d7afa056df`，須以新 source Gate 追證；不可用上一個 PASS 自動認證此新增 diff。

## 未通過／不冒稱
- 靜態合批對重複 GLB 構件有效；如果是獨一無二的單一人像網格、蒙皮頭髮或動畫角色，**本優化不會增加速度**，必須繼續研究動態 SkinnedMesh、動畫求值與 GPU skinning pipeline。
- 實際用戶人物照片→完整真 3D 自動生成、頭頸實圖擬真、各種 GLB 裝置的 FPS 改善、Android／Windows native 60／120 FPS、VRAM/實際耗時百分比均沒有本輪證據。
- 本修復分支 `repair/core-first-fastmodel-20261021` **尚未併入或覆寫正式 Render 網站**。網站來源有較大差異，需逐模組精確整合後驗收，不能用整個 `app.mjs` 替換。
- 不把 FastModel 的靜態技術場景當成核准的人物／動物／機械 Authority。以上技術為 additive，允許隨時關閉。

## 下一輪技術研發（優先順序）
1. 真人／動物使用的動態蒙皮幾何：每影格局部骨架 dirty-region 更新與可見性保護，不能移除動畫骨頭或讓頭髮/頸部斷裂。
2. 新場景／掃描連續增量寫入 mesh buffers：局部更新，不每影格重建整個幾何，加入 memory/chunk pool。
3. 真 GLB + 真動畫在 Android/Windows GPU 比較 drawCalls、GPU query 時間、FPS p95、熱節流，再決定畫質自適應策略。
