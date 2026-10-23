# AIG 新版首頁 → Real3D Stage 1 安全接軌（2026-10-23）

使用者指定唯一新版首頁：
https://aig-dual-formal-runtime.onrender.com/aig-new-home.html

## 已實查正式站
- Render workspace: `My Workspace` / `tea-dauad1hsrm7s73bf58kg`，由使用者確認。
- 正式服務：`aig-dual-formal-runtime` (`srv-db8v565g1s2s738paemg`)，static site，publishPath `formal-web`，Git branch `web/aig-dual-formal-runtime-20261016`，autoDeploy on commit。
- 最後查到 LIVE 部署源 commit `f24cb08a05670974dbc9dfe9cb7c53b7288bf8d8` (2026-10-22)。
- `formal-web/aig-new-home.html` 在部署分支真實存在，source blob SHA `a335df7af3734b0998c1726183647390cd60d0f5`，頁面為繁中黑底 RGB 版型，3AX 新版工作頁 `3ax-nc-workbench.html`、手機 RGB 3AX `3ax-mobile-workspace.html`、下載 `aig-download-center.html`，舊資料分隔頁 `index.html`。不能把舊 index 當正式新首頁。
- 正式靜態網站 build command 只有 `echo AIG dual formal runtime ready`，並不自動編譯 FastModel ESM；成功部署靜態 HTML 不能代表最新 Real3D Browser Runtime 已可執行。
- 單純直接網頁擷取在目前工具遇到 cache-miss；上列現況以 Render 服務與 GitHub 實際部署分支的來源核實，無假稱瀏覽器真實畫面已開啟。

## 本次 Draft PR #44 改動（**沒有部署**）
1. 先讀正式部署分支的原有新版首頁，把整份 `aig-new-home.html` 在 Real3D 開發分支同步保存，且保留原本 3AX、手機 3AX、下載卡片、RGB 主色與手機 CSS 媒體查詢；只在既有小型狀態橫列加入明確 `Real3D 人體比例驗收（Stage 1 BLOCK）` 連結，避免用未驗收模型搶占正式工作入口。
2. `real3d-stage1-review.html` 改為返回 `aig-new-home.html`，不指向舊 index；其 Stage1 啟動鏈要求 **同站真實 `dist/scene-runtime-studio.html` + JS** 存在且有 Stage1 身體來源控件，不支援就 BLOCK，無假 3D 鈕。
3. 恢復舊 `index.html`，移除之前誤植的 Real3D 試驗入口；原站歷史資料保持舊樣。
4. GitHub Stage1 Gate 的 paths 監看與 HTTP 檢查改為 `aig-new-home.html`、`real3d-stage1-review.html`、正式 server 的真頁面路由與編譯 JS，artifact 收錄新版首頁及 Stage1 review。
5. 原本男女兩成人基礎人體、0.001mm、21 joints、頭頸、肩/骨盆、雙大腿、足底、真 WebGL 四視角及 4K/3K/2K/1080P 仍按 Stage1 Gate，不因網站有入口而自動過關。

## 明確阻擋條件
- 尚未 merge Draft PR #44；尚未把新人體核心放到正式 branch；未觸發正式 Render deploy。
- 最新 Stage1 容器及四視角真截圖要先經 Chromium，並由使用者審核外觀；程式/網頁語法通過 ≠ 真人比例 PASS。正式網頁要等來源核驗、bundle artifact 和雙平台實際檢查後才允許更新。
- 不能修改原正式 CNC 的 3AX/NC、CAD/CAM 存檔或刪除 RGB 原圖。
