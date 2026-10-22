# AIG 新版簡潔工作首頁｜可信斷點 2026-10-23（Asia/Taipei）

## 使用者回饋／本次決策
原始網站導覽過多：工程 Gate、UI/UX、版本、科技新聞與真正 CNC 工作頁混雜。重新建置**獨立簡潔入口**，但保留原本網站和本機專案資料，不回退、不刪除，不使用被撤銷的 438 Authority 或舊 V90–V95 Web Runtime 假裝正式操作。

## 已新增且在 AIG 原網站 branch 的來源
- `formal-web/aig-new-home.html`：黑底 RGB 風格、手機／桌面排版、3 個清楚目標：CNC 3AX 真 NC 單節數值頁／現有 FastModel 研究頁／原生下載狀態。工程資訊收進預設折疊的 details。
- `formal-web/index.html`：老站頂端新增清晰的「進入新版首頁」入口，原有內文與導覽保留，故原站可做歷史/技術查核。
- `formal-web/3ax-nc-workbench.html`：HOME 導航接新首頁，新增「輸入 NC → 解析 NC → 下一節／整段模擬」三步導引；原數值 WebGL 和 NC 控制節點保留。
- `formal-web/3ax-nc-workbench.css`：三步導引的響應式呈現。
- `formal-web/school-3d/fastmodel/single-photo/tests/aig-clean-home.real-browser.mjs`：手機 360×780、橫向 915×412、桌面 1440×900 的真 Chromium 入口／水平溢出／連結測試。
- `.github/workflows/aig-clean-home-gate.yml`：新增獨立 Gate，檢查入口、現有 CNC Real3D 模組來源、三個目的地、截圖／JSON 證據。

## 已知仍未完成
- 網站來源提交已存在，但最後查到 Render `aig-dual-formal-runtime` 的 `LIVE` 部署仍是 `c778ad3d`，**不是新版首頁的提交**。不得聲稱新的 URL 線上可操作，除非後續 Render 部署與 HTTP 真瀏覽器 Gate 均驗證成功。
- 新版 CNC 3AX 使用已存在的 Real3D 1.3 G0/G1 受限只讀 NC-first 體素模擬，0.5 mm 數值解析度，不是 0.001 mm 真加工精度。3AX Authority 實體機台圖／真 GLB 校準、4AX～6AX 運動學、Fanuc 全部指令、APKs／EXEs 完成仍維持 BLOCKED。
- 建立的簡潔首頁不是重新實現完整 CAD/CAM/SIM/3～6 軸。尚未真正接回的頁籤都明確標示施工中，而不是假的可按按鈕。

## 下一個工作順序
1. 檢查新增 GitHub Action `AIG Clean New Homepage Phone Desktop Gate` 的真正 status、若有 RED 先修；檢查前次 `AIG New 3AX Real3D Workspace Gate`。
2. 核對 Render 上線的**exact commit SHA**，GET `/aig-new-home.html`、`/3ax-nc-workbench.html`、模組腳本／CSS，全 PASS 後開放正式入口。
3. 手機/桌面 UI UX 實圖驗收；檢查導覽、按鈕位置、主要 viewport 65–75%、無水平擠壓，數值 G1 切削有真材料移除而 G0 為 0。
4. 正式 Authority 圖和 3AX 真實機台幾何獨立 SHA 驗證後，才將 1.4/1.5 來源綁定的真 3AX 模型接上新工作頁。
5. 一頁一頁接 CAD/CAM/SIM/4AX/5AX/6AX/NC/AI，保留 Button ID→Shared Command→Runtime/Core 的真鏈路，不把工程殼重新貼回來。
