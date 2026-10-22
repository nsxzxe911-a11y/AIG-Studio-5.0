# AIG Real3D 1.3｜受限 NC 單節真材料移除

日期：2026-10-22。承接已驗證 1.0 真 WebGL、1.1 體素材料移除、1.2 受限 NC-first。
使用者要求：「下一個」。保持三專案共用幾何，原 CNC Runtime 與既有 AIG Authority UI 不被替換。

## 正式新增

- `aig-real3d-step-replay-1-3.mjs`: 1.2 G21/G90/G54/G0/G1 受限 NC 重新解析（不能相信傳入的 segments）、每次一條來源 G0/G1 刀路線段，真實修改三維占據格，逐步重建正確的外露 XYZ 三角網格與 mm³ 體積。
- `advanceAIG13SingleBlockReplay`: 工件副本先複製，真體素計算與網格檢查全成功才替換上一份有效 Working Copy，任一解析／記憶體／網格錯誤都 BLOCK，不會毀損舊工件。
- `seekAIG13SingleBlockReplay`: 從可信 NC 原文重新執行到指定段落，沒有倒轉靜態圖片。上一步與重設均回復數值體積。
- `aig-real3d-replay-lab.html` 與 `aig-real3d-replay-lab.mjs`: 真 WebGL 幾何視窗、限縮 NC 編輯、逐節/上節/整段分幀執行/進度控制、來源行號、每節與累計 mm³、刀尖 XYZ 顯示、手機控制與 GPU 緩衝區釋放。
- NC 文字一修改立刻清除舊模擬工作狀態，無法繼續使用過時的安全證據。
- `tests/aig-real3d-replay-v1-3.test.mjs` 與 `tests/aig-real3d-replay-v1-3.real-browser.mjs`：真數值、單節 G0 不切削、G1 有材料移除、每階段 XYZ 網格、上一節重新算、來源竄改 BLOCK、與既有 1.2 完整模擬逐體素相同、手機電腦 WebGL 真畫面變動與原始來源編輯失效。
- `.github/workflows/aig-shared-real3d-v1-3.yml`：獨立 CI + PNG/JSON 實測證據；只有所有 Gate success 才可宣稱正式通過。

## 本輪即時本地數值證據

使用相同測試 NC，三段連續模擬移除：**6.000、48.000、0.000 mm³**，總量 **54.000 mm³**。既有 v1.2 bulk simulator 對完全相同來源與體素設定回報 **54.000 mm³**，本地執行結果相符；單節倒回原點為 0.000 mm³。

### 禁止誤導與版本保護

- 目前僅支援完整明示 G0/G1 段落，初始 G0 XYZ 僅定位；絕不可自動跳過 G43、G34、G2/G3、G81/G83、M6、O4/O5、A/B/C、刀長補正或使用 G91 轉換。
- 使用數值體素中心近似計算，預設 **0.5 mm**，**不是 0.001 mm 連續表面精度**；切削力、夾具/刀柄干涉、機台實體／A/B/C 運動學均未通過。
- 沒有設備通訊、Fanuc 真機輸出、正式 APK/EXE GPU、夜神真 Authority 或原始女主角畫面認證。
- 本次只改共享 Real3D 模組與獨立頁、離線打包／新測試，不替換 Android/Windows CNC 真加工核心。
- GitHub CI 顯示若 queued/in_progress，先明確標記待驗收；不要將本地數值測試說成正式 WebGL 手機／電腦通過。
