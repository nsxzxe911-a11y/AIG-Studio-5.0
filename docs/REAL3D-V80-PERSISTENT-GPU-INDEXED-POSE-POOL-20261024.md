# AIG Real3D 極速研發 V80｜單一 GPU 資源池、多段原始姿勢連續重用

日期：2026-10-24。承接已通過 Source+Chromium 技術雙 Gate 的 Draft PR #79（多輪真 WebGL buffer 生命週期）、繼承 PR #78 Auto/30/60/90/120 rAF 與 PR #76 bufferSubData 真來源高密度網格。本階僅在獨立 Draft 分支；正式 Render AIG RGB/CNC/APK/EXE 不變。

## 真正研發增量

前一階 V79 每一段 36 次 GPU rAF 建立不同 WebGL Renderer，用來驗證每段結束時能釋放全部 owned GPU buffers。本階驗證另一個實際用途：**跨多段動畫時不需要反覆建立 GPU Context、Position/Normal/Index VBO/EBO**，應重用同一套早已驗證的原始 GLOBAL Indexed XYZ 來源場景。

新增 `aig-real3d-persistent-gpu-pose-pool.mjs`：

- 對至少兩個來自既有真原始 source FK 的 3D 姿勢，**一次建立**單一 WebGL renderer 和 **單一可變 live scene**，僅複製工作副本，不修改任何輸入 source reference pose 或原始 OBJ。第一幀確實 `renderer.render(liveScene)` 配置一次 Positions、Normals、Index GPU buffer。
- 後續 3–6 段、每段 24–180 次真正 `requestAnimationFrame`，都在同一 renderer 中依既有 Auto/30/60/90/120 governor 選取目標 source pose，使用 `applyAIGReal3DSourceMeshDelta` -> 真 `gl.bufferSubData` 更新局部來源 XYZ/normal，**絕不重新傳原始 indices**。
- **每一個真的 WebGL render** 都核對原始三角面數，且每次檢查 renderer 的 GPU owned buffer count、total created、full bufferData uploads 和 full uploaded bytes 自首次暖機後完全不變。只要中途偷偷新建 VBO/EBO 或整塊 re-upload，立即 BLOCK。
- 各段獨立記錄 rAF 回呼數、實際真原始 indexed 3D GPU frame 數、因隱藏分頁或高 JS heap 暫停次數、相鄰 rAF 時間中位數、CPU render-submit wall-clock 時間、bufferSubData 更新數及累計受影響 source 頂點。
- 每段至少 2 次真來源 GPU 繪製才可採納；持續隱藏分頁或高 heap 導致沒有畫面，明確標 BLOCK。途中異常也用 `finally` 釋放 live source 的 GPU Mesh + 完整 destroy renderer，最後 GL buffer 追蹤 balance 必須歸零；資源若未清掉 FAIL。
- 真 Lab 工作區新增「極速 V80｜單一 GPU 資源池 3×72 幀」按鈕；僅當同來源原始 OBJ/SHA、三節 FK、真 GPU 三張影格已有可信驗證後啟用，結果附在可下載 JSON 的 `persistentGPUResourcePool`。

## 真正 GPU 驗收工件與限制

- Node 非人體 original Indexed XYZ 2004 triangles 工件，在 3段×72 rAF 的模擬 renderer（不是 GPU）證明資源計數/原場景 immutable/錯誤支線/hidden & heap 等 fail-closed。
- Chromium 使用既有高密度 113,400 頂點／226,080 原始三角面、原三節 1080×1920 PNG SHA 回歸，以及新增 **3136 片 original indexed NONHUMAN 真 GPU** 單資源池 3段×72 真 rAF，核對首次 3 buffers 建立後再無 full buffer upload；最後 release/destroy 3 created/3 deleted，並下載包含逐段 timing 的 JSON。
- 這是 bounded engineering regression，約數秒 GPU 動作回呼，**不能宣稱已完成數小時、整夜、Android/Windows 60/90/120 持續實機測試**。GPU driver VRAM 實際占用與 CPU/GPU 溫度若無感測 API 均保持 null；原 Renderer 的 tracked buffer 數歸零**不代表**整個瀏覽器或 GPU VRAM 完全無洩漏。
- 仍未取得真實授權人體掃描基底。自然骨架、真皮膚、1:1 真人照片動畫、真動態碰撞驗證/全身 60FPS 保持 BLOCK；不使用 SDF、Metaball、Template Morph 或 Subdivision 假人體。

Source 與 Browser 任一失敗都不能將 V80 標為技術 PASS。隔離 Draft PR，無合併、無部署、不換 RGB HOME。
