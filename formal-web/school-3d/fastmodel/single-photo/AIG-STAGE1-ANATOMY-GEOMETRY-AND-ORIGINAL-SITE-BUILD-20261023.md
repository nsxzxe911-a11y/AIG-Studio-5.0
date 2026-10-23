# AIG Real3D 人體比例逆向修復＋原 AIG 網站接軌（2026-10-23）

## 使用者指令
「不是可以上 AIG 網站 翻譯? 繼續人體外觀比例」。
原指定網站：`https://aig-dual-formal-runtime.onrender.com/index.html#dual-projects`，**不建立其他獨立網站、不撤換原 CNC 網站介面**。
Render 正式網站尚未部署本 Draft PR #44；Stage1 人體外觀目前仍 **FAIL/BLOCK**。

## 網站真正編譯路徑
現有 `formal-web/server.mjs` 是檔案伺服器，不會直接把 `.mjs` 原始碼在線翻成可執行新 UI。新增 `formal-web/package.json` 的 `npm run build:real3d` 指令，透過 FastModel 既有 `esbuild` 輸出 `single-photo/dist/scene-runtime-studio.{html,js}`。新增原站內 `formal-web/real3d-stage1-review.html` 驗收入口，會在同網域確認部署的 HTML/JS 真的存在，舊網頁無相關元件就顯示 BLOCK。原首頁僅增加標明 **「Real3D 人體比例試驗（待驗）」**的非正式驗收連結，不代替雙案 Runtime。
既有 GitHub Stage1 source Gate 加入真 `formal-web/server.mjs` HTTP 路徑稽核和編譯包 artifact 上傳。不等於正式 Render LIVE；在 Render 工作區與網站服務確認、必要 Gate 驗收前，不觸發主站部署。

## 真實人體三維修正
主要修改 `aig-stage1-dual-adult-anatomy.mjs`：
1. 男／女兩種成人技術體型的頭寬、肩/上臂中心、骨盆與大腿根部截面改為較合理的比例（保留男生泳褲、女生連身泳衣）。
2. 真實 indexed loft mesh 的相鄰曲面截面採 Hermite ring-subdivision（3 steps）過渡，不用 2D 圖板偽裝、沒加入頭髮／制服。
3. 頭部截面由下巴、下顎到顱頂，完整 3D 縱橫比例改良；肩部增加根部到上臂的環帶過渡。
4. 大腿源網格中心/半徑錯誤可能相交，已修改並建立獨立左右上大腿實頂點間隙的測量；不是以「左右部件 ID 存在」假裝雙腿正常。
5. 雙腳最低環帶真實移至世界 `Y=0.000 mm`；原足部在地面上方約 25 mm 是錯誤，Stage1 純技術場景地板降低到 `-0.001 m`，避免遮住腳底。
6. 新增 `auditAIGStage1BodySurface`：從 source XYZ 實際量測前左右上大腿間隙、頭部高寬比、左/右肩／軀幹接合、雙腳最低點(mm)；任何過窄、過寬、橫向壓扁或足部浮空 → BLOCK。與原 `runStage1UnifiedRenderLogicCore` 數值 Gate、21 節點及 0.001mm 契約同步。
7. Stage1 網頁即時資料顯示上大腿間距／頭高寬比／肩接合／腳底 Y（mm）；E2E phone+desktop 真 WebGL 截圖驗證亦新增這些約束。

## 必須誠實區分
Source commits 已完成、Stage1 真人結構比例**仍待真 WebGL 四視角照片和目視驗證**；即使 source numeric PASS，也**不等於**連續蒙皮、無穿模、真實人臉／女主角外觀已完成。現有 CAD/CAM/NC、主站 UI、原照片及 Vault 不因本次修正變更。手機與 Windows 共用 4K→3K→2K→1080P 自動降級和 mm 尺度，但原生 GPU FPS 尚未實機證明。

GitHub Actions 在本輪最後檢查仍為 queued，不能宣布整體 Gate PASS；正式站沒有收到本 Draft PR 的成果，仍保留既有正式網站服務。
