# AIG FastModel 4.9｜逐姿態三角面接觸風險／轉頭低頭甩馬尾劇情與原有錄影工作區

4.8 真骨架技術 GLB 往前升級為 4.9，延續 4.5～4.8 SHA 與所有先前版本功能，PR #12 保持 Draft。正式 AIG 網站／APK／EXE 均不因來源提交自動變更。

## 完成內容

1. `aig-dynamic-collision-4-9.mjs` 從原始 4.8 二個 SkinnedMesh 的 Three.js GLTFLoader 回讀、透過 AnimationMixer 設置每個 clip 的五個指定時間點。使用 `getVertexPosition` 與 `matrixWorld` 得到**真正經過蒙皮的世界座標三角面**，對頭頸殼與馬尾殼做逐面 AABB broad phase 與含平面共面的 triangle SAT narrow phase。
2. 逐組回傳 `testedFacePairs`、`broadPhaseCandidates`、`confirmedSurfaceContactPairs`、最多八個實際面索引，以及 3 clips × 5 poses 共 15 幀。超出每幀候選上限、總測試預算或幾何 NaN／退化時直接 BLOCK，**不允許未涵蓋取樣卻傳回沒有碰撞的結論**。
3. 新 UI Button ID：`aig49-audit`、`aig49-evidence`、`aig49-load`、`aig49-status`。通過 4.8 來源與幾何測試後才能執行；任一 4.5 校正、4.6 馬尾參數或 4.7／4.8 來源變更，即清除過時 4.9 報告。測試報告不會修改、覆蓋原始 GLB。
4. 正式 GLB 渲染區可直接載入 4.8 二個部位技術 GLB 與三個真動畫 Clip，再沿用既存 3.2 StoryPlayback、3.3 台詞音效音樂與 3.4 MediaRecorder 錄影流程。劇情辨識另支援「轉頭」「低頭／點頭」「甩馬尾」，只映射到實際具名 clip，沒有憑空生成打鬥。
5. 範例文字：`女主角轉頭，接著低頭，最後甩馬尾。`。只有這三個動作的實際 GLB 已載入時，劇情才會顯示 READY；輸入「揮拳／踢腿／兩人打鬥」仍依既有 fail-closed 缺動作處理，不能拿頭頸的浮動模型冒充完整人物動畫。

## 說明 Gate 邊界

這是對**技術網格於 15 個取樣時刻**的精確 triangle-to-triangle surface contact 風險檢測，接觸／穿透 pair 數應顯示；不是物理毛髮碰撞，不做模型魔術式自動穿模修復。即使所有取樣面沒有接觸，也**不能**證明兩幀間沒有穿越、馬尾本身無自交、帶透明 alpha 的頭髮光柵不出錯、原照片女主角的真實外型一致。

- 4.9 GLB 視覺仍是 4.7 的工程技術頭頸＋馬尾，不是全身女主角 3D，也沒有臉部紋理；不得宣稱女主角完成。
- 3.4 Web 播放器的真音訊／影片功能仍由使用者觸發；必須有 GLB 已載入、實際劇情 clip 與瀏覽器 MediaRecorder 能力，才有可下載影片。沒有測試真實瀏覽器影片就不能說已輸出正式有聲電影。
- PC/Android 原生 1080p60、記憶體、溫度、完整人物、髮束物理與人工正式視覺 Authority 皆待獨立驗收。
- 不呼叫任何第三方付費 3D API、不修改正式 Render 站、不自動合併 Draft PR。

## 確認方式

`npm test --prefix formal-web/school-3d/fastmodel/single-photo`、`npm run build --prefix ...`，以及 GitHub 4.9 專用測試；從 4.8 暴露的三個 GLB clips、真正蒙皮頂點，每幀面相交計數，另外測試 coplanar、穿透、幾何分離、預算超界與舊音影片路徑。**獨立 exact SHA GitHub Action 結果以 workflow 完成的 commit 與 job 為準**。
