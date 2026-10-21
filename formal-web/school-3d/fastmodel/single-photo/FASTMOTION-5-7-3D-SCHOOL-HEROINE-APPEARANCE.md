# FastModel 5.7｜自研立體校園人物、制服、裙褶與馬尾跟隨動畫（未經美術核准）

## 版本與已驗證斷點
- 基準：FastModel 5.6.0 commit `0c8e10ce654ef3835abad6c017f05cbb95e5e776`，Actions run `39528923753` completed/success，90／90。
- 本輪僅升到 `5.7.0`，保留 5.5／5.6 獨立生成器、5.4 來源 SHA、5.0～5.3 稽核以及原本的 AI 劇情、配音、音樂、音效和影片工作流程。
- 原 Render 網站、APK、EXE 並未由 Source Gate 自動發布。Draft PR #12 仍維持 Draft、未合併。

## 真正的 3D GLB 造型
- `aig-native-appearance-5-7.mjs` 以 **5.4 通過來源核對的原圖輪廓比例**，呼叫未回退的 `generateAIG56NativeHumanoid`。不會用 2D 貼圖來偽裝 3D 網格，也不需第三方推論／雲端付費生成人物。
- 本階以 glTF 2.0 / binary GLB 修改器保留 5.6 原本真正的 **單連通閉合索引人體 Mesh**、17 節 Skeleton、SKIN/JOINTS_0/WEIGHTS_0 和 4 段動畫，追加七組 **真獨立 indexed 三角網格和蒙皮**：
  1. `AIG57_FACE_FEATURES`：眼白、虹膜、瞳孔、眉毛、鼻子、嘴唇、耳朵；是有實際深度的立體橢球網格。
  2. `AIG57_SCHOOL_UNIFORM_JACKET`：深灰外套，前方敞開且依胸腰骨權重變形。
  3. `AIG57_WHITE_SHIRT`：獨立白色襯衫前片，真 3D 曲面。
  4. `AIG57_PLEATED_SKIRT`：裙襬下緣較寬的環向皺褶立體網格，腰部接 hips/spine 骨。
  5. `AIG57_PLAID_BOW`：紅灰蝴蝶結、結心及程序式條紋幾何，不是假稱精確布料貼圖。
  6. `AIG57_BACKPACK`：背包本體及肩帶，附著胸腰骨。
  7. `GirlPonytail_AIG57_STRANDS`：四束獨立圓管立體髮束，利用既有 ponytailRoot/Tip 的真蒙皮權重與原骨架一起變形。
- 總計 **9 個 SkinnedMesh、17 節原骨架、5 段真 Quaternion Keyframe Clip**。新增 `AIG57_HEAD_TURN_PONYTAIL_FOLLOW_THROUGH`：轉頭後馬尾根／尾不同延遲相位，屬程式關鍵影格，**不是物理髮絲模擬**。
- 網格實際包含 position、normal、COLOR_0、JOINTS_0、WEIGHTS_0、index。所有新增部件具有非零 3D 深度、合法三角面、有效蒙皮權重；原 5.6 人體 position、joint、weight、face index 必須位元等價。對每個部件的三角面積與頂點預算設硬 Gate，非完整來源直接 BLOCK。

## 真 RGB 工作頁
- 新 Button IDs：`aig57-build`、`aig57-report`、`aig57-status`，具備真正的 callback／狀態及風險回報。前置必須先完成 4.0 自研比例與 5.4 同來源 GLB SHA 核對。
- 操作後由現有 GLTFLoader / `parseRiggedGLB` 回讀完整 GLB，再執行 `auditAIG50FullBody`。成功下載 `AIG-5.7-NATIVE-SCHOOL-UNIFORM-SKINNED-TECHNICAL.glb` 並提供同來源 GLB SHA 的 JSON。
- 既有 5.1 真動畫馬尾接觸／接縫、5.2 16 格真畫面／FPS 仍可獨立執行；**5.1 接觸風險或 5.3 人物來源 Gate 不會因 5.7 外觀幾何合格而自動解除**。
- 已有劇情、聲音、音樂與錄影程式保留；載入新模型會依既有播放器流程重設當前劇情時間軸，不會刪掉來源檔案。

## 未完成與不得宣稱的項目
- 外觀僅參考「櫻花校園、長棕髮、深灰制服、白襯衫、紅灰蝴蝶結和百褶裙、背包」風格，**未證明與使用者指定照片五官／身形／衣物紋理相同**，沒有真實臉部關鍵點校準或人臉貼圖。
- 百褶裙與人體的裙襬碰撞、布料物理、裙皺動態、馬尾整段動作不穿模、臉部微表情與口型配音同步均尚未驗證。
- 原圖背面、未觀察到的深度、精確腿手比例仍是自研規則估計；不是照片的完整三維測量。
- 技術外觀、拓樸結構、動畫源碼 PASS **不等於真正式女主角、Android/Windows 60 FPS、正式 Render 網站 LIVE、APK/EXE 出貨**。
- 正式 `releaseAllowed:false`、`visualApprovalCompleted:false`、`individualLikenessVerified:false`；即使測試檔生成了人形也絕不可代替真正人物的外觀 Authority。

## 測試方式
- 透過 **真正 GLTFLoader** 讀入 5.7 GLB，驗證九個 SkinnedMesh、7 組造型、各別有效權重、非平面 3D 深度。
- 保留並比較 5.6 全身 vertex positions、joint indices、skin weights、triangle indices 完全一致。
- 真的用 AnimationMixer 推動第五段轉頭／馬尾跟隨動畫，檢查毛束頂點實際移動，而不是只數 Clip 名。
- 用 5.0 的真骨架、5.1 真頭頸／髮束離散碰撞取樣檢查自研技術模型；結果單獨回報，不虛報穿模已全部修復。
- 負例：來源 SHA 不可用、假的 release、比例非有限值、沒有來源輪廓 -> BLOCK。
- UI 真按鈕、下載名稱、5.5/5.6 生成器、AI 劇情與影音功能的來源靜態 Gate；最後 SHA 的 Actions 完整 completed/success 才能作為可信續接點。
