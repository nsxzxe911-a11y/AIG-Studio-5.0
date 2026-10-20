# AIG FastModel Cinema｜RGB 1080p / 2K QHD / 4K UHD 擴展

延續 GitHub PR #12（草稿），基準 commit `8f5728b3`，保留已完成的黑色 RGB 首頁與 Phase17 真 GLB。原網站、APK、EXE、CAD/CAM/CNC 均不更動。

## 實作與驗證

- `web/index.html`: 正式 RGB 畫質分頁增加 720p、1080p、2K QHD 2560×1440、4K UHD 3840×2160 四個真選項，含狀態訊息及完整繁體中文說明。
- `web/resolution-policy.mjs`: 獨立可測 GPU viewport/renderbuffer 尺寸限制、保守幀緩衝預算與失敗理由。4K 以 12 bytes/pixel 初步估算約 94.9 MiB 幀緩衝預算，**不是實際 GPU/VRAM 使用量**。
- `web/renderer.mjs`: 正式 canvas drawing buffer 改變尺寸、保留原有旋轉／編輯／動畫與三角網格；不支援的尺寸拒絕而不清空工作網格。GLB 重載沿用選擇，經資源管理器自動降階不覆蓋手動選的 2K/4K 目標。
- `web/main.mjs`: 下拉選擇直接執行 callback；HUD 與面板會顯示選擇及實際尺寸，硬體不支援則顯示原因；不假報 FPS。
- `tools/build_standalone.py`: 含原創解析度政策、RGB 介面與 Phase17 GLB 的單檔離線 HTML。
- JavaScript 35 tests PASS，C++ 2 CTests PASS。Chromium 實際手機版面 390×844 與 Windows版面 1440×900 都能選 2K/4K、無水平溢出、0 JS exceptions。

## 限制與 Gate

 hosted Chromium 沒有 WebGL2，故完整 2K/4K **GPU 畫面、FPS、顯示記憶體及長時間熱測試仍未驗收**；手機選擇選項成功不等於 GPU 可以畫滿 4K。DX12/Vulkan 原生後端仍未完成。PR 保留 Draft，不能合併或發布。外觀候選仍被禁止上正式網站。

## 下一階

先讓 S23 Android GPU 真實執行，測試 1080p/2K 降階、4K 的 GPU 限制和渲染幀時間；Windows 驗證 DX12 後端與多畫質情況，保留自動卸載可重建快取但不動未儲存資料。