# AIG School Hero Phase 14 — 原創素描上色、88 髮絲節點、臉部幾何修整

日期：2026-10-20。承接 Phase13 commit `0d52fb9c`，僅供獨立工作台使用。

## 真正可執行的功能

1. `hair-face-workbench.v1.html` + `hair-face-workbench.v1.js` + `beauty-engine.v1.js`：獨立離線 HTML/Canvas 工作台，**沒有外部網路請求與第三方角色軟體**。使用者從本機選取核准 `櫻花校園的青春時光.png`，必須通過 SHA-256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910` 才可載入。
2. 自家實作 88 條髮束線 × 每條 9 個彈性節點；固定髮根、受約束的局部節點、彈簧阻尼、風力滑桿、控制播放/暫停。**2.5D 畫面層級的髮束引導線**，不是完整 3D 髮絲網格、毛囊或碰撞。
3. 新增原圖像素顏色漸層／弱素描墨線／縮減色階，原圖檔案不會被寫入修改；髮色貼圖依原圖像素過濾明顯藍色天空，避免髮型包到天空（仍有近似遮罩的漏色風險）。
4. 人臉模型**小範圍局部幾何修整**（<= 5px）、保留眼睛等可見 keypoints 供人為對照；不需舊巨大骨架。沒有訓練、呼叫或接入任何真正神經網路：**「臉部 AI 推論」尚未完成**，不得寫成完成。
5. Phase13 原有 6 個網格、7 節細骨架、轉頭／雙肩、拖曳控制點、匯出 JSON 都保留。可在 JSON 中看到 Phase14 參數，仍 `releaseAllowed=false`。

## 實際驗證

- Chromium 本地 `page.set_content`，載入本機核准 PNG SHA PASS，控制風力、臉部網格、素描開關與播放，0 JS exceptions。獨立 `file://` 導覽在此工具的安全環境被阻擋；工作台未假稱 URL 測試通過。
- 19 幀從**實際瀏覽器 Canvas**擷取，轉碼成 960×540、12 fps 動態影片（約 1.58 秒），18 幀與第一幀非完全相同。末端位移 19.2px；截圖和量測在 `out/`。
- Node 17 technical checks、Python 16 technical checks。原圖 SHA 與 JSON 來源一致。
- 這些測試驗證功能與非造假狀態，**不是外觀核准**。

## 未完成及禁止誤報

- 原圖是多場景構圖，人物輪廓仍為人工近似，不能當完整 true 3D sculpt / hair sim。
- 正／側／背單一人物完整 3D、頭髮面片體積、毛髮物理碰撞、AI 臉部辨識模型、自然面部 blendshapes、S23/4K WebGL 真驗收：**NOT DONE**。
- GitHub CI 只能測不依賴原圖二進位的幾何與 anti-fake 部分；核准照片 + 瀏覽器測試是本地證據，不得報為 GitHub 網站 UI PASS。
- 此階段不合併 Draft PR #12、不部署正式 Render 首頁、不更改任何 AIG CNC、Android、Windows 主程式。

下一階：從多幅核准視角進行臉部關鍵點半自動定位、髮色區域分割（需要視覺驗證）、真正多層 hair cards 3D 和獨立臉部 geometry；不可再用 2D 波動冒充 3D。