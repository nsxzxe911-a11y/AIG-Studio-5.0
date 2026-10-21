# AIG FastModel 5.2 — 真 GLB 動畫視覺與瀏覽器實測效能（Draft）

## 唯一可信來源
- 從 FastModel 5.1.0 `56a7bf16ab3053b1ac6bf25cdad1d6baa438fe8d` 向前，來源 GitHub Actions run 39522252989 PASS。
- 對已有 5.0／5.1 程式不做降版或覆寫，保留 Draft PR #12 與原有劇情／台詞／音效／音樂／錄影模組。
- 版本：`5.2.0`。這是**程式與檢查功能**的迭代，不是正式 Render 網站新部署。

## 5.2 真正新增的流程
1. 按「載入 5.0 驗證過的同源 GLB 到 3D 工作區」，以 **SHA-256** 再驗證原始 File 相符，使用既有 Three.js／GLTFLoader 真播放器。此為使用者明確決定切換預覽，會重設活躍劇情時間軸，但並不修改或刪除任何 GLB 原檔與錄影程式。
2. 「實拍真 GLB 動畫 16 格」沿用原 `PhotoViewer.captureTimelineReview()`，擷取同一真 GLB 已有的動畫 Clip 中四個時間點、四個攝影機方位的真 WebGL 畫面。輸出 PNG + SHA／姿態／幾何 QA JSON。沒有具備真動畫的 GLB 時 BLOCK，沒有以技術草模代替真人角色。
3. 「實測本機瀏覽器 240 幀」以既有 3D Viewer **真正 WebGL render loop** 中的每幀 timestamp 及 `performance.now()` 計算：觀測 FPS、median／p95／最大幀時間、超 60 FPS 預算幀比例、>1.5× 60FPS 預算卡頓比、draw calls、三角面數、實際渲染畫布大小。選定 GLB 的 SHA 必須符合 5.0 匯入來源；模型切換、瀏覽器隱藏、畫布尺寸變更或與錄影／外部動作混雜會 BLOCK 或失效。
4. 渲染 CPU 耗時只是 `renderer.render()` 的 JavaScript wall time；**不是 GPU 執行時間**。FPS 也是瀏覽器 render loop 實際更新節奏，不等同螢幕感知幀率、原生 EXE／APK 效能或顯卡計時。
5. 5.1 有碰撞或頭頸接縫缺陷即仍保持 BLOCK；5.2 獨立觀察畫面與運行性能，不可用幀率 PASS 去掩蓋網格 FAIL。

## 真正輸出的證據
- 5.2 視覺：`AIG-5.2-REAL-GLB-ANIMATION-16-VIEW-NOT-APPROVED.png` 與 `AIG-5.2-REAL-GLB-16-VIEW-SHA-POSE-ONLY.json`。
- 5.2 FPS：`AIG-5.2-ACTUAL-BROWSER-FRAME-TIMING-SHA-NOT-NATIVE-FPS.json`。
- 新獨立按鈕 ID：`aig52-load`、`aig52-visual`、`aig52-visual-report`、`aig52-fps`、`aig52-fps-report`。
- 所有報告均記明 `sourceSHA256`；來源不合時禁止使用舊結果。

## 不得誤稱已完成的項目
- 仍無與使用者指定的櫻花校園女主角照片完全對應、已人工核准的正式人物全身 GLB；5.2 **不能憑空補完女主角臉型、馬尾、透明髮絲或裙裝**。
- 16 格是真圖，但 **人工視覺認證未完成**；影像不存在時不得宣稱角色美術通過。
- 實測 240 幀之 source unit tests 由合成 timestamp 驗證公式；**只有實際網站上使用者點擊測量才產生真裝置 FPS**。本次提交本身不具備 Android／Windows 瀏覽器或原生 60 FPS 的實機數據。
- `BROWSER_FRAME_TIMING_PASS_ONLY` 是本機瀏覽器統計門檻，不等於 60 FPS 原生 PASS。
- GPU 耗時、外觀還原、髮束穿模的連續時間證明、真實女主角、Android APK、Windows EXE、正式網站 Render Live：都未經這一版驗收。

## Source Gate
- 回歸 5.0/5.1 真 Three.js 骨架、髮束碰撞測試與原本 Story AV、GLB、PBR 流程。
- 5.2 新增 60/30/120 fps、長幀時間、p95、窗口隱藏、SHA 不同、畫布 resize、資料不完整；UI 必須有唯一 Button ID 和真 Callback，既有影音邏輯保持。
- 所有來源 Gate 必須在最新 commit 的 GitHub Actions completed/success 才能聲稱 5.2 source PASS；PR 仍保持 Draft。
