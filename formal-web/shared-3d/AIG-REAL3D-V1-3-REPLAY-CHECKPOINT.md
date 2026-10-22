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

## 2026-10-22 22:54 Asia/Taipei — 斷線續接實測與最新 CI 鎖定

- 使用者指令：「接回最後 更新點」。實際 GitHub 修復分支最新可信程式來源 `4fc722a2266879f9b93da3cc1345c357cd1e289b`，不是原先卡住的 `be60b262`。
- 前一輪手機 WebGL 的 `uniformMatrix4fv` 函式誤傳參數已在此來源修正為 `identity()`。針對 4K/GPU 卡頓已有畫布像素上限、三角形預算、畫面抗鋸齒分級；仍需要真正 Android/Windows 裝置的硬體穩定與 FPS 測試。
- **Real3D 1.0 / 真 XYZ + WebGL**：GitHub run [39798552406](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39798552406) completed/success，11/11 Node，真正 Chromium 手機／電腦 WebGL XYZ 畫面：3AX 252、FastModel 216、5AX 264 三角形。
- **MSAA/SSAA 分級**：同一 run 真 Chromium 手機／電腦 PASS；預算標記 `performance 1×`、`balanced 1.25×`、`smooth 1.75×`、`ultra 2.25×`，都受個別 framebuffer 像素限額約束，不冒稱光追或真鏡射。
- **Real3D 1.1 真占據格材料移除**：GitHub run [39798552429](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39798552429) workflow success，Node 16/16，手機／桌面各有 `AIG_SHARED_REAL3D_V1_1_VOXEL_G1_G0_TRUE_3D_BROWSER_PASS`；個別 job API 曾短暫仍顯示 in_progress，依 workflow 真實結論與完整 log 判斷。
- **Real3D 1.2 受限 NC-first**：GitHub run [39798552344](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39798552344) completed/success，手機＋桌面受限 G0/G1、真 3D 料移除 54 mm³ 及 5152 網格量測 PASS。
- **Real3D 1.3 NC 單節與倒回**：GitHub run [39798552487](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39798552487) completed/success，手機＋桌面測試回報 54 mm³，22/22 與 6/6 數值測試 PASS。
- **現有 FastModel 原程式完整回歸**：run [39798561828](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39798561828) 當下 queued，絕不將其稱作完成。
- 最新 Render 正式網站仍部署較舊提交 `89b4fe4080c24b970adf7a577c492ffa2755cb71`；目前六個共享引擎核心檔的 GitHub 網站分支 blob 與修復分支完全相同，但**不代表新版已在 Render 生效**。先完成正式站部署／HTTP 頁面 Gate 再認證線上交付。
- **明確未通過**：完全 Fanuc G2/G3、G34、G81/G83、O4/O5、4/5/6 軸 A/B/C 運動學、真碰撞、0.001 mm 切削幾何、已核准 Authority 機台模型、真機 NC 輸出及 Android APK/Windows EXE GPU/FPS。這些不可從受限 0.5 mm 占據格測試推定成功。
- **下一斷點**：先取得完整 FastModel 舊核心回歸結論、檢查 Render 最新部署與網站頁面；其後以嚴格分開的 Gate 把真 NC 軸態、刀具幾何和視覺轉接到 3AX→6AX，不能以程序化 DEMO 改寫正式 Runtime。

## 2026-10-22 23:xx Asia/Taipei — GPU context loss / restore confirmed

- 最後可信實際程式（含 GPU 恢復）：`531881ae2984a645ddb1b35047099384d6e39650`; 最新 **嚴格 Gate 測試**修改來源 `da6b8baa692d7e0d8ebf4c1258540952dbf633a9`。
- 修正 `aig-real3d-replay-lab.mjs`：當 WebGL context lost，取消尚在執行的單節/倒回排程，**原 NC 工作副本與已完成的體素材料狀態保持原位**；context restored 時重新建立 shader、uniform、VBO、GPU cache 與 renderer，重繪同一工件，不用靜態圖片偽裝結果。
- 強化 `tests/aig-real3d-replay-v1-3.real-browser.mjs`：在 **手機 Chromium 360×780 與電腦 1440×900** 兩種環境中，強制要求 `WEBGL_lose_context` 存在、實際呼叫 loseContext / restoreContext，確認重新渲染、原始 NC 文字不變、source blockIndex 不變、removed mm³ 不變、不發真機命令；不允許 extension 缺失時悄悄跳過測試。
- GitHub Actions [39803197133](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803197133) **completed/success**；真 WebGL phone/desktop browser prints `AIG_REAL3D_V1_3_SINGLE_BLOCK_REPLAY_BROWSER_PASS phone 54` / `desktop 54`；數值 **6/6 + 22/22 PASS**。前一版 [39802479705](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39802479705) 亦 success。
- 原 AIG Render 網站 branch `web/aig-dual-formal-runtime-20261016` 中 `formal-web/shared-3d/aig-real3d-replay-lab.mjs` 已按原修復核心 blob exact 鏡像，提交 `c778ad3ddaeafd982ce7a0d305ffbf48ebb85d09`；**Render LIVE 仍為舊 SHA `89b4fe4080c24b970adf7a577c492ffa2755cb71`**，無新 deploy 證據，禁止宣稱線上 GPU 修復已生效。
- **不在本次 PASS 範圍**：真 Android 手機實機 GPU driver / Surface 問題、Windows EXE native 60 FPS、所有 Fanuc G 碼、4AX/5AX/6AX 實機運動學及 0.001 mm 工件真材料移除。保持 gate BLOCKED。
- 下一可執行步驟：核對原 Render 站確實部署最新 source 並讀回 `/shared-3d/aig-real3d-replay-lab.html` 與模組資源；之後在源資料完整對接情況下逐頁驗證 3～6 軸正式 Authority 模型，不能以簡化示範幾何替代。

## 2026-10-22 23:33 Asia/Taipei — 使用者「接回最後更新點」；最新現場核證

- **唯一最新可信 Real3D 修復核心 SHA：** `1f93fbeae097858fa9a9fffe786c0e2bd353d000`。核心 GPU `uniformMatrix4fv` 先前傳入函式的問題已改成 `identity()`；GPU framebuffer 像素上限、三角形預算與 context loss/restoration 保持，無新工程殼／圖片替身。
- **CI on this exact commit:**
  - [共享 WebGL 1.0](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803490604) completed/success；Node 11/11；真 Chromium phone+desktop GPU XYZ triangles：3AX **252**、FastModel **216**、5AX **264**；MSAA/SSAA 各設備 PASS。
  - [體素材料移除 1.1](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803490498) completed/success；16/16 Node；phone+desktop 均有實際占據格數值與 WebGL 畫面證據。
  - [受限 NC-first 1.2](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803490502) completed/success；phone+desktop 受限 G0/G1 原文輸入，**54 mm³、5152 mesh triangles**。
  - [單節執行及倒回 1.3](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803490560) completed/success；6/6 + 22/22 Node；phone+desktop 都回報單節總去除 **54 mm³**，並保留數值工件副本。
  - [FastModel 核心鎖](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803490452) completed/success；[來源稽核](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803500660) completed/success。
  - [完整 FastModel 回歸](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39803500929) 的 regression job **cancelled**（其餘多個獨立 job PASS）；不要將 cancelled 說成全部 PASS。前一次已成功的整套 regression 屬不同 SHA。
- **原 AIG Render LIVE：** 部署 `dep-dbd2mq8473hc73alhl60`，commit `c778ad3ddaeafd982ce7a0d305ffbf48ebb85d09`，Render confirmed LIVE。直接以該 *部署 commit* 取回 `formal-web/shared-3d` 的 `aig-real3d-webgl.mjs`、`aig-real3d-replay-lab.html`、`aig-real3d-replay-lab.mjs`、`aig-real3d-step-replay-1-3.mjs` 和 `aig-real3d-nc-preview-1-2.mjs`，每個 Git blob SHA **精確匹配**最新核心中的同名檔案。
- 最新網站來源分支 `web/aig-dual-formal-runtime-20261016` 的 HEAD `a02c92aea57440f465d31842413bd17718458e79` 比 Render LIVE 更新，但 [FastModel website Gate 39805556875](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39805556875) **failure**（source build 後 `git diff --exit-code -- formal-web/fastmodel` 未通過）。本斷點**不將失敗的新 website HEAD 部署或覆蓋現有 LIVE**。
- 外部 HTTP 工具讀取 `/shared-3d/aig-real3d-replay-lab.html` 回報 inaccessible；GitHub blob ＋ Render 部署 SHA 可驗證來源，但**正式線上頁實際互動與原生 Android／Windows 實機效能仍是未驗證事項**。
- **Release Gate 保持 BLOCK**：現有模擬只有受限 G21/G90/G54/G0/G1、預設 0.5 mm 體素；Fanuc G2/G3、G34/G81/G83、A/B/C 4～6 軸運動學、碰撞、0.001 mm 切削精度、10/5 Authority 正式機台視覺與 native APK/EXE 尚未通過。
- 下一實際工作斷點：維持部署 SHA `c778ad3d` 不回退，先排除網站分支「建置產物產生 diff」的 Gate FAIL、補完同 SHA FastModel 總回歸及正式 HTTP 手機頁面測試；在確保正式 Runtime 主程式與 Safety Gate 不被動到前，才進行 3AX→6AX Source Geometry/Kinematics 分頁接軌。
