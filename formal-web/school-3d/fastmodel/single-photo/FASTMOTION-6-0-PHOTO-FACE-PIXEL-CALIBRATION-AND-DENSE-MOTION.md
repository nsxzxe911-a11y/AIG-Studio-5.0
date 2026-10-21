# AIG FastModel 6.0 — 真照片六點比例 → 真蒙皮臉部 GLB＋密集動作接觸稽核（技術版）

## 唯一可信基準
- 5.9.0 / `09b9a86d741a8801e726c933f73d140610151346`；GitHub Actions `39532480687` completed/success（90／90）。
- 只向前升級 **6.0.0**，保留 5.0～5.9 所有骨架、來源 SHA、字幕／AI 劇情／配音／音效／配樂／影片輸出及既有工作區。
- 目前在 `feature/aig-school-3d-hero-v1-20261020`、Draft PR #12，**未合併、未自動部署正式 Render 網站、APK、EXE**。

## 本階新增真實工作流
1. 在現有 4.0 自研比例模型生成與 5.4 來源校驗、5.9 真 25 姿態避讓完成後，選擇與 5.4 來源記錄 **SHA-256 完全相同**的原圖；使用瀏覽器 `createImageBitmap` 解碼、原始畫素寬高的畫布上顯示。
2. 依序點選 **額頭、左眼、右眼、鼻尖、嘴、下巴**；座標直接由 Canvas 的指標觸碰位置逆算成原始圖像像素，而不是用猜測座標、合成照片、第三方人臉 API 或黑盒雲端。
3. `calibrateAIG60FaceMarks` 完整檢查 6 點存在、左右眼排序、眼距／臉高有效範圍、眼睛水平傾斜、鼻與嘴相對雙眼位置、額頭→眼→鼻→嘴→下巴的縱向順序。若臉部遮擋、側臉太大或標記不可靠，會 BLOCK，**不偷偷套用人工調整後的假量測值**。
4. `fitAIG60MeasuredFaceGLB` 重新生成**與實際 5.9 預覽 SHA 一致的 5.8 底層技術 GLB**，解讀真正 glTF JSON＋binary 的 `AIG57_FACE_FEATURES` 的 `POSITION`、`NORMAL`、`indices`。以來源照片眼距／臉高決定模型 X 向比例，縱向以額頭→眼→鼻→嘴→下巴相對 2D 像素長度插值改變臉部頂點 Y，更新 normals、accessor bounds 與 binary chunk，並存入原照片與原 GLB SHA。
5. 輸出可下載 **實際變更 3D 臉部三角形／蒙皮的 GLB**；保留 5.6 原連通人體網格、原制服／裙褶／馬尾幾何、17 骨、9 SkinnedMesh、5 Clip。用真 GLTFLoader 回讀，再送 5.0 嚴格骨架／真變形 Gate。不能使用外部附帶 URL 的 glTF 素材。
6. `auditAIG60DenseAnimation` 保留 5.8 的真姿態三角面 SAT 及 fail-closed budget，改成兩個五樣本取樣視窗：0、12.5%、25%、37.5%、50%，以及 50%、62.5%、75%、87.5%、100%。每個 Clip **9 個不同時刻、10 次網格評估**；五個 Clip 合計 **45 不同時點、50 次評估**。紀錄裙裝／人體、馬尾／人體接觸；有接觸直接標成 `DENSE_SAMPLED_CONTACT_RISK_BLOCKED`，但零接觸僅能稱離散取樣 PASS。
7. 頁面新 Button IDs：`aig60-photo`／`aig60-photo-load`、`aig60-reset`、`aig60-marks` Canvas、`aig60-build`、`aig60-capture`、`aig60-report`、`aig60-status`。真正接回共享 3D 播放工作區、下載 GLB、SHA 綁定 JSON，另可使用已存在的 `captureTimelineReview()` 實際擷取當前模型四姿態 × 四方向 WebGL PNG。
8. 任意原圖、5.4、5.9 GLB 或校準標記改變，6.0 舊報告即失效，避免舊 SHA 截圖／碰撞資料拿去核准新模型。過程不清除原照片或之前的 AI 劇情、聲音／影片檔案。

## 不能偽裝成已完成的部分
- **這次是真 2D 臉部像素量測**，但只有六個使用者點選的部位；不會推導原圖遮擋的臉深度、精確顴骨／鼻樑立體構造、身份相似度、未拍到的後腦或完整 3D 人臉，不是全自動任意照片精確反求人物。
- 原照片來源 SHA 也不等於美術造型「精確一致」，現在沒有帶簽核的真人身份相似度 Authority。未經人工外觀對照和角色驗收，`releaseAllowed:false`。
- 密集離散取樣仍不是**真正的連續時間碰撞**，沒驗裙子自交、髮束自交、柔性物理、追蹤誤差與實機畫面閃爍；所有這些仍需後續正式 Gate。
- 不是 Android／Windows 原生 60 FPS 的實測證據，也不是確定生成真 1080p 有聲人物劇情影片或已更新正式 AIG 網站的證據。

## 來源與回歸驗收
- 測試需用具確定座標的合成照片標記資料、真 glTF 5.9 底層 skinned GLB（不是假 JSON GLB），量到的眼距／縱向比例應使真臉部三角面位置改變。
- GLTFLoader 比較臉之外的全身、制服、裙裝、髮束 Vertex 和 Skin index/Weight 應**完全一致**；17 骨和 5 段動畫不退化。
- 5.0 真骨架 Gate、5.8 兩組 5 個姿態的真動畫三角面 Gate 必須各自過測；即使接觸數為零不得自動判定整段 safe 或正式人物 approval。
- 缺原照、錯 SHA、錯座標、原 GLB 不吻合、頂點失效、UI 假按鈕都必須 FAIL；Source Gate 只有最終完全相同 SHA 的 Actions completed/success 才是新續接點。
