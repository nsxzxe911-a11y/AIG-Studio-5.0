# FastModel Cinema RGB 工作區｜替換工程殼外觀（獨立預覽）

原版本接續：FastModel Cinema 1.1 `8f5728b3273e4a0eb45185642c0604b98b647cba`，不改原 AIG CNC 核心。**本輪是 UI 重新製作，不是 DX12/Vulkan 原生渲染完工。**

## 核准 RGB 視覺方案

黑底 `#020407`、Panel `#07111B`，AIG 彩色 Logo 文字符號／RGB Glass 漸層外框；大型 16:9 建模 Canvas、頂部狀態與四組真正可操作的功能分頁：**建模／動畫／畫質／資源**。沒有假的導航按鈕，26 個既有功能/狀態 DOM ID 完整保留。工作區預設進入「建模」，不以任何工程除錯文字作首頁。資源監測及出錯資訊放在「資源」與 HUD，不擠壓模型視窗。

## 實測證據

- 現有 23 項 JS 原生回歸 ＋新增 4 項 RGB UI 契約測試 → **27 PASS**。
- Playwright 實際 Chromium HTML/控制頁互動（390×844、360×740、1440×900）：**四頁切換 OK，完全無水平捲動**，沒有頁面 JS 例外，並輸出桌面／手機兩張真介面截圖。
- 單檔離線 HTML 含原 Phase17 GLB，**自有 C++ / GPU 緩衝區更新 / 記憶體壓力調整程式保留**。正式單檔在無 WebGL2 宿主瀏覽器實際啟動、頁籤切換 PASS，正確提示 GPU 不可用（零 JS 例外）。
- 無 WebGL2 GPU 的環境只能測試 UI 與程式載入，**不能聲稱人物已顯示、1080p/60 FPS 達標**。

## Gate 保護

本檔為獨立 RGB 預覽；未修改 AIG 正式 Render 首頁、APK、EXE 或 CNC Core；PR #12 持續保持 Draft，不合併、不部署。真正的 Windows DX12 / Android Vulkan 和 S23/Windows 1080p60 尚未驗證。不得利用假 3D 圖替代實際模型。