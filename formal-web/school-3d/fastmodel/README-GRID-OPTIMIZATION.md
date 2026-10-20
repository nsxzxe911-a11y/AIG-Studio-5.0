# AIG FastModel 1.3 — 線框按需繪製／局部網格／CPU 動畫快取

施工沿用 AIG-II / AIG Studio 5.0、FastModel 1.2 的同一份獨立預覽 PR #12；**不可把本包當正式 APK/EXE 或核准女主角影片。**

## 真正修正的性能問題
- 已查核舊的 `renderer.mjs` **沒有 GL.LINES 或 GPU wireframe pass**；原本工作視窗背景的 40px 方格是 CSS 裝飾。模型卡頓可能來自 63,867 面、551 glTF primitives 被合成 9 batches 的 GPU 繪圖、兩個 Skin 的骨架矩陣與透明髮片，而不能直接證明是三角網格線造成。
- 新 UI 一律預設關閉背景方格與 3D 線框；仍保留 AIG 黑底 RGB 幻彩邊框。畫質頁可選：關閉／邊界線／局部編輯（原 256 頂點區域）／限量完整線框；再選省電／平衡／精細密度。線段數量設硬上限，切換才計算一次拓樸邊線，不逐幀 CPU 重新建立。
- `mesh-lines.mjs` 自研純 JS 邊線提取：剔除重複的共邊，拓樸開放邊獨立選取，局部只掃與編輯頂點相關的三角面，超大資料限量取樣。邊界線是**拓樸開放邊**，不能假冒真實視覺輪廓。
- 真實 `gl.LINES` pass 復用原 GLB 的蒙皮 VAO、骨架浮點紋理；只增加按需產生的 index buffer 與至多 1～9 次額外 draw call，未將線框烙入貼圖。不顯示時完全不執行線框 draw call。連續掉幀（p95 >27ms 兩輪）時暫時隱藏，低於 19ms 四輪才恢復，不抹除模式選擇。
- 重用 `this.drawEntries` 排序、`this.inverseBindCache`，避免每一幀重新排序 draw entries 和反覆從 GLB 解析 inverseBindMatrices；骨架原本的運算與原圖不改。
- 線框緩衝區可刪除且會歸還 GPU 估算記憶體，原 GLB、主要人物 mesh、局部編輯頂點仍維持；光追仍永久 OFF，預設 1080p、2K/4K 可選。

## 實測（只有 CPU 拓樸生成，不是 GPU 實機 FPS）
使用 Phase17 `assets/phase17-visual-NOT-APPROVED.glb`：111 glTF meshes，原 551 primitives，合批9，63,867 triangles。
平衡模式：邊界 2,200 段需 5.255ms；局部848段需 0.301ms；限量完整線框4,000段需1.051ms（本輪容器 CPU 單次量測，非裝置常態保證）。線段建置僅在選擇或重載 GLB 時運行。

## 測試證據
- 53 項 Node.js 全回歸 PASS（原有41＋新12）。
- 單檔離線 HTML 14MB 包含使用者所有權的 Phase17 GLB 與網格線選項，沒有第三方建模程式依賴。
- Chromium 390×844（手機版面）、1440×900（桌面版面）均無橫向溢出，網格線模式／密度／背景輔助線的 DOM 互動均 PASS，0 JavaScript page exceptions。
- 測試容器無 WebGL2，因此 GPU `gl.LINES` 實際運行、60FPS、1080p／2K／4K GPU 速度，以及 S23/Windows DX12/Vulkan **均尚未驗證**。
- 所有來源圖與 GLB 僅是技術候選，外觀 Authority Gate 尚未核准，不部署正式 Render 網站。

## 用法
Android 和 Windows 可下載 `AIG-FastModel-RGB-GridOptimized-Android-Windows.html` 直接嘗試開啟；在黑色 RGB 工作台的「畫質」頁選網格線模式。瀏覽器需可用 WebGL2（某些離線檔 URL 可能受到政策限制）。

下一個正式關卡：S23 與 Windows GPU 使用者裝置測試四種網格模式的平均／p95 FPS 與記憶體；有掉幀再調整線框密度／GPU buffer 與髮片批次，不以 Source Gate PASS 假冒實機通過。