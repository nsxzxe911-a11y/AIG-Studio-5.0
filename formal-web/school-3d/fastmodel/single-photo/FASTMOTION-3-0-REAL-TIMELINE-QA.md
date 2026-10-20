# FastModel 3.0 — 真 GLB 動作全段 16 格驗收（來源工作副本）

沿用 FastModel 2.9 可信斷點 `2c60b15c3f7d45846fa19ae058a4a9b7ae41abeb`，僅在 AIG Studio 5.0 Draft PR #12 開發；不合併、未部署正式 AIG Render 網站、不更新 APK／EXE。

## 真正完成的程式

- 在單圖 3D / GLB 工作區加入「一次檢查 4 個動作時間 × 4 方向」按鈕、16 格圖片、下載 PNG／JSON，使用者本機載入 GLB 可直接使用，不依賴付費 Meshy 生成。
- **嚴格真動畫來源**：`this.animation.clips[this.animation.index]` 必須存在，否則 `TIMELINE_REAL_ACTION_MISSING`，絕不將相機環繞或靜止人物視為骨架動作，更不會自動聲稱有「打鬥劇情」。
- 針對同一已載入模型和同一動畫片段，依 **0%、25%、50%、75%** 實際 mixer 動畫時間，逐一呼叫 2.9 的 `captureHeroineReview`，由 Three.js GPU 當時的原始 PBR 模型、材質和骨架建立每個 2×2 四角度 PNG；最後組合為 **4 行 × 4 列，總共 16 格**（1680×1200）。
- 每個取樣姿態亦執行 2.8 真實幾何風險檢查（最大 2400 triangles/pose），包含重複皮膚面、退化面、骨架權重及帶明確 role 標記的髮束／脖子包圍盒風險；JSON 逐段對照 suspicious face/weight counts 和 `incomplete`。
- 記錄原始 GLB 的 SHA-256，逐段 timeSeconds、四個**世界座標** +Z/+X/-Z/-X 視角與 clip name，且固定 `visualHumanReviewPassed:false`、`approvedFightChoreographyPresent:false`、`collisionExactVerified:false`、`nativeGpu60FPSVerified:false`。不能用檔名包含 fight 判斷是否真實格鬥。
- 每次執行暫停原本動畫、暫停其他皮膚抽樣監控，逐項呼叫真實渲染擷取，最後在 finally 恢復原動畫 mixer time、暫停狀態和監控器；個別四角度方法也在 finally 還原原相機/控制/viewport。
- 進行中禁止另外載入 GLB。失敗時清除舊 PNG／JSON 的 Object URL，避免報告和模型錯配。重新匯入任一模型也會清除上次的證據。
- 沒有光追；1080p 影片與 Windows/Android 實機效能仍須另行驗證。16 格圖是靜態取樣，不等於連續 60FPS／打鬥影片。
- 新增 `timeline-review.mjs`、`tests/timeline-review.test.mjs`、完整 esbuild 後的 HTML/JS 回歸 Gate，測試假資料的偽動畫、來源 SHA、16 格拼圖、UI 真回呼及先前功能保留。

## 不可冒充的完成狀態

截至此階段，GitHub 倉庫仍**沒有經核准的正式女主角 GLB**。唯一已檢索 GLB 是六軸 CNC 機台模型。模型檔和正式女主角視覺／動畫核准狀態 BLOCKED；不生成女主角假截圖。打鬥動作只有真實 GLB 含相應 clip 和已觀察到相應動作，才有人工驗收意義。

皮膚交錯、透明髮絲排序、真頭頸焊接尚非已驗證 3D 幾何／GPU 像素通過。此處每個時間只取四個方向，未必能找到中間影格的瞬時穿模；掃描報告要和實機連續動畫逐幀複核。

GitHub source-only Gate PASS 不代表已在 Render 正式網站、Windows EXE、Android APK 部署或達 60 FPS。
