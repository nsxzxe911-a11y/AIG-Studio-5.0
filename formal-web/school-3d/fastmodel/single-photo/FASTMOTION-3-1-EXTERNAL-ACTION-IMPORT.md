# FastModel 3.1 — 正式人物 GLB + 外部動作 GLB 安全接入

承接 FastModel 3.0 可信提交 `3efae763dce4196ab9620af97fd0a4bfb7400a54`，在 **Draft PR #12** 向前增量施工。

## 實作：不複製人物，只接入真正動作

- **人物和動作分離載入**：原本 `local-glb` 匯入人物，新增 `action-glb` 匯入另一個具骨架與實際 animation tracks 的 GLB（不是只靠檔名猜測的打鬥）。
- 安全條件：目前人物 GLB 和外部動作 GLB **均須有真正 SkinnedMesh + 兩個以上具名骨骼**；所有 bone 名稱唯一、數量一致、每個骨頭的父子階層一致，以及每條骨骼的 inverse bind pose 矩陣在嚴格容差內一致（預設 1e-4）；GLB 不足或不相容一律 `BLOCKED`。
- **不用猜測式 retarget**：只接受直接 `BoneName.position`／`BoneName.quaternion`／`BoneName.scale` track；完全無 animation、非 bone 目標、Morph/object 路徑、錯誤 keyframes、超上限、不同原點／綁定骨架皆拒絕。較複雜的 GLB bone path / motion retargeting 需未來另行實作和驗收。
- 通過檢查後，**只 clone GLB 的真動畫 clip 到目前人物自己的 AnimationMixer**，即釋放外部動作 GLB 的暫存模型及貼圖；從不將動作 GLB 的第二層皮膚／頭顱／衣服加入 scene，因此可避免匯入造成的雙層人物與重疊閃爍。
- 可切換原本與新匯入的動畫片段；切換時 2.9 四方向 PNG 和 3.0 十六格 PNG/JSON 一律失效，防止舊圖片被當成新打鬥動作的證據。
- **雙 SHA 來源追溯**：模型原始 SHA-256 和外部動作 GLB 的 SHA-256 獨立記錄，將選中的來源 animation SHA 放入 16 格驗收 JSON，避免把外部檔案混寫成原人物內建動畫。
- 外部 GLB 本機匯入，不自動上傳付費 3D 重建 API；200 MB 限額與 GLB header / embedded data / 不允許外部 URL 解析繼承 2.8。不得宣稱已在正式 Render 主站上線。
- 限制：此 3.1 **只驗證骨架結構與 bind pose、動畫 track 能合法重播**，不保證人體動作自然、拳腳碰撞安全、發絲不穿模或女主角臉型符合權威圖。正式人物和打鬥片段不存在時不產出假證據。
- 來源/單元測試：相容動作真的移動同名目標骨頭、不加入第二個 mesh；骨頭命名／bind／階層錯誤即擋；根位移、臉部 Morph 路徑、空動作均拒絕；模型 SHA + 動作 SHA 同時出現在 16 格真動畫報告；UI callback 和 esbuild 真封裝有 Gate。

## 實際缺口與安全邊界

- GitHub 分支沒有經核准的女主角 3D GLB；已入庫 Phase4 製作的 33 關節原型為視覺 **FAIL**，不能冒充核准女主角。
- 先完成來源 GLB 的核准，或從 Windows/Android 體系取得有可信 SHA 的正式 GLB；動作 GLB 若 Rig 不相符，必須以專業 retargeting workflow 另建 Working Copy，再重新驗證來源，不得硬套。
- 依照 AIG 雙案 Gate，3.1 PR 繼續 Draft、不合併、不部署 Render 正式網站、不升 APK/EXE；Windows／Android GPU FPS、精確頭頸焊接與動畫髮束穿模都需要日後實機及真人物驗收。
