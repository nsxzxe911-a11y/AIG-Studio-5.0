# AIG FastModel 5.8｜百褶裙／髮束實體修整與真動畫三角面接觸 Gate

## 可信續接點與版本
- 來源 5.7.0 SHA `d96e2c26bda13d35a8282ceb1b0a956f88a850c6`，Source GitHub Actions `39530355611` complete/success 90／90。
- 本階 **5.8.0**，只向前升級，保留 5.5、5.6、5.7 生成器、5.4 來源 SHA、5.0～5.3 QA、原有劇情、配音、音效、音樂與錄影。Draft PR #12 未合併；正式 Render 網站／APK／EXE 均沒有因提交而自動更新。

## 實際施工
1. 新 `aig-appearance-fit-5-8.mjs` 先真正產出已有 5.7 的 SkinnedMesh GLB，再解讀 glTF JSON／binary 的 POSITION、NORMAL、WEIGHTS／JOINTS 與索引布局；不是只更改 UI 名稱、外觀圖片或畫布比例。
2. **百褶裙避讓**：最上層腰圍高度 1.115 不變，裙擺愈往下環向擴大，最大半徑倍率預設 1.16。保持原腰線來源與蒙皮，改變頂點 Position 後重新計算三角面頂點法向及 POSITION bounds，避免只拉模型卻沿用舊法向。
3. **馬尾造型**：髮束根部維持原位置，越接近末端越向後增加距離（預設最大 0.046 模型座標單位），降低頭頸／背部被髮束貼住的機會。原有兩段 ponytail joints 與轉頭跟隨 Clip 不變；這不等同物理髮絲動態修復。
4. **臉部**：原本 5.7 程序式雙眼、鼻、嘴、眉毛幾何和造型原樣保留。因為來源照片沒有可核對的臉部 landmark／深度資料，本階 **不偽造「五官已比對成功」的結果**。真正來源外觀仍需要後續附來源座標／驗收。
5. 保留原本單一連通人體 Indexed Mesh、17 節 Skeleton、9 組 SkinnedMesh、5 段 quaternion clip。即使避讓造成新的三角面自交或不合法法向，應 BLOCK 並保留原 5.7。
6. 新 `auditAIG58RealPoseContacts` 透過真的 Three.js `AnimationMixer`、`getVertexPosition` 取得身體、裙裝、分束髮絲三個獨立網格，在 5 段動作 × 5 個時間點（預設 25 姿態）逐三角面做網格 broadphase + 真 SAT 細測，紀錄 source SHA、Clip、動作時間、實際 triangle contacts 數／候選數與前八筆相交面例子。超過網格／索引或 Pair 預算時 BLOCK，不得把「沒檢查完」當作 0 碰撞。
7. UI 新 `aig58-build`、`aig58-report`、`aig58-status` 都由真 callback 執行，前置必須有自研 4.0／5.4 硬碟來源 SHA 验證。可下載 `AIG-5.8-POSE-FITTED-SCHOOL-UNIFORM-TECHNICAL.glb`，真回讀 GLTFLoader，執行 5.0 骨架 QA、5.8 接觸 Gate，之後可載入既有 3D 播放器、重做 5.1／5.2 取樣；JSON 報告與當前 source SHA 綁定。
8. **真差異比對**：除了修整後的 25 個動作姿態，工作區會重新生成未修改過的 5.7 GLB，兩份皆由真 GLTFLoader 解析，在相同前 2 Clip × 5 姿態進行實際三角面 SAT，分開計算裙裝接觸 Δ、馬尾接觸 Δ。增加的接觸數會列為 `possibleFittingRegression`；只有來源相同且動作名稱一致的採樣可比較。此比較不是跨全部五段 Clip 的安全保證。
9. 技術生成成功後，即使 5.8 偵測接觸風險，也會在報告與 UI 顯示 `CONTACT_RISK_BLOCKED`，**不會自動標示 collision-free 或正式角色可發布**。技術 GLB 可供後續調修與差異對照。

## 結論限制
- 這階有真正的裙裝與髮束幾何調整 + 真離散姿態 SAT 接觸量測，不是完整的布料動力學、持續時間碰撞、髮絲自交／服裝自交與穿模修復。
- 布料／頭髮互相遮擋的視覺品質，光靠 triangle intersections 無法確認；也不能從技術正反面推算出真照片女主角臉部。**相貌/制服/照片 Authority 人工審核未完成**。
- 動畫 60 FPS、Android／Windows 原生 GPU/熱負載與長時間實測、正式 1080p 有聲影片、Render 網站正式部署和正式女主角上線都還沒有通過驗收。
- `sourceImageSHA256` 與 `generatedGLBSHA256` 分開，不能把只使用原圖輪廓比例的產物當成來源照片真臉部重建。
- `releaseAllowed:false`、`originalFacialIdentityReconstructed:false`、`zeroCollisionGuaranteed:false`。

## Source Gate
- 真 GLTFLoader 比較 5.7／5.8：全身 5.6 的頂點、權重、索引位元保持一致；5 段 Clip 名稱保持相同。
- 裙裝下擺確實位移、最上層腰線原位、馬尾後移；重新計算 normal、Position bounds 並檢查真三角面與每一個 Vertex Weight Sum。
- 5.0 真骨架通過，5.8 使用真 AnimationMixer 逐姿態計算裙裝／髮束 triangle intersection，記錄不能自行宣稱「沒碰撞」。
- 負例：來源 SHA 非法、裙擺倍率超界、髮束距離超界、樣本過量、沒有真來源 -> BLOCK。
- 最新 commit 的 GitHub Actions completed/success 才能當成可信 Source 續接點，並非正式網站部署證據。
