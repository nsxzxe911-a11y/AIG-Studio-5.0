# AIG FastModel 1.3 — 無線網格替代顯示，斷線續接

## 已落盤來源與實際測試

- 黑底 `#020407` RGB 幻彩正式工作區風格；沒有工程殼首頁。大型工作視窗保持不變。
- `web/surface-guides.mjs` 新增 3 種**沒有額外線框幾何**的檢視：純表面 `clean`（預設）、局部修改柔光 `edit-tint`、柔和材質對比 `soft-contrast`。
- `edit-tint` 只標示原本 `patchLocal()` 能修改的首 256 個可編輯頂點，沒有假裝它是通用筆刷。
- 保留進階線框 `off/boundary/edit/full`；預設 OFF，須手動展開。CPU 建構線框只在切換時，連續掉幀時隱藏；不刪人物 mesh、骨架或未儲存工作副本。
- 不是「刪除所有模型線」：線框的實際拓樸資料和可編輯頂點都還在，純顯示層改動。
- 單檔離線 HTML 內含原有使用者 Phase17 技術 GLB 和所有模組，無網路可使用；不是 native APK 或 EXE。
- 本地 Node.js 63 項 PASS，C++ 2 組 CTest PASS；Chrome 390×844、1440×900 布局沒有水平溢出或 JS 例外。

## 禁止假驗收

- 測試瀏覽器無 WebGL2 context，**尚未量到 GPU 線框/柔光 FPS、4K FPS、S23 溫度和 Windows DX12/Vulkan**。
- Phase17 女主角仍是 2.5D 視覺候選，頭頸和背面外觀尚未核准，亦未恢復電影級影片 Release。
- 保持 GitHub PR #12 Draft、正式 AIG Render 網站與 CNC/APK/EXE 均不修改。
- 下一個真實硬體 Gate：1080p60、2K/4K 自適應切換、發熱與 VRAM，並在實際 GLB 頭頸/髮型修正後再開始正式影片。