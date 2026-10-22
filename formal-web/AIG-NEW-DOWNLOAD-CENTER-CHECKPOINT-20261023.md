# AIG 新版下載中心 — 2026-10-23 正式斷點

## 使用者需求
將舊 native-download.html 的「原生版本與下載核對」（包含 QA 產物與下載狀態、APK + EXE 真編譯、AIG-II/Studio 來源與原生 Release、以及本機 CNC 工作備份）移入新 AIG 網站，減少舊版凌亂工程區的往返操作。保持原 GitHub Repo、Render 服務、CAD/CAM/NC 本機資料、正式 UI Authority 規則，不刪除舊頁。

## 已實際落盤至原 Render GitHub branch
- formal-web/aig-download-center.html：新版 RGB 黑底下載中心。3 個快速入口（Android Studio QA APK ZIP、Windows Release、真實雲端編譯）；AIG-II／Studio／FastModel QA 卡片；保留來源 SHA、artifact ID、ZIP SHA-256、2026-10-29 QA 到期時間並置於折疊詳細資訊；對每一類檔案明確限制正式 Release Gate；原專案有據可查，沒有捏造下載按鈕。
- formal-web/aig-download-center.js：移植原生網頁之本機 CNC 匯出功能，在按鈕 click 時讀取 localStorage 中符合 CAD/CAM/NC/GCODE/DRAFT/WORKING 且非密鑰的項目；生成 AIG_WEB_LEGACY_LOCAL_DRAFT_BACKUP JSON，不發送網路、不修改/刪除原資料。
- formal-web/aig-new-home.html：頂部「下載狀態」與第三張「版本與下載」卡片都接到新 a ig-download-center.html（實際正確檔名：aig-download-center.html）。
- formal-web/3ax-nc-workbench.html：原生 APK/EXE 驗證快捷亦改指新下載中心。
- formal-web/native-download.html：保留舊版內容與舊資料備份，新增清楚的「進入新版下載中心」入口。
- formal-web/qa-downloads.html：加上新版下載中心返回入口，不破壞舊版 QA 證據。
- formal-web/school-3d/fastmodel/single-photo/tests/aig-download-center.real-browser.mjs：Playwright 真 Chromium 360×780、915×412、1440×900 下載中心排版、真 QA 連結、click JSON 備份、認證 Token 排除、無破壞原 storage。
- formal-web/school-3d/fastmodel/single-photo/tests/aig-clean-home.real-browser.mjs：新首頁實際點「版本與下載」到新版下載中心、備份控件存在。
- .github/workflows/aig-clean-home-gate.yml：新版首頁 + 下載中心及本機備份真瀏覽器 Gate。
- formal-web/school-3d/fastmodel/single-photo/tests/aig-real3d-replay-v1-3.test.mjs：從先前已通過的 repair branch 還原一樣的精確 1.3 數值測試 blob，修復 3AX Gate missing fixture failure，不改數值核心。

## 最新實際驗證證據
- 測試用草稿 PR #17：https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/17 —— 僅用來觸發 CI，不合併、不發布。
- AIG Clean New Homepage Phone Desktop Gate #39817488219：完成 SUCCESS，包含真 Chromium 新首頁與下載中心、手機／橫向／桌面佈局、使用者 click JSON 備份、機密 key 排除；artifact #12442078982。
- AIG New 3AX Real3D Workspace Gate #39817488223：完成 SUCCESS，包含原 1.3 數值 fixture、實際 WebGL/G1 54mm³、G0 不切削、NC 匯入匯出、本機 Working Copy 重新整理復原、G43 Fail-closed、三種螢幕尺寸；artifact #12442987490。
- 以上 PASS 是 Chromium 測試與數值核心 Gate，不是原生 APK/EXE 正式 Release、擬真 3AX 模型、4AX–6AX 運動學或 0.001 mm 連續材料移除精度。

## Render 最後 LIVE 尚未更新
- 服務 srv-db8v565g1s2s738paemg，branch web/aig-dual-formal-runtime-20261016。
- 最近核對 Render LIVE 仍是 2026-10-22 15:27Z 部署 dep-dbd2mq8473hc73alhl60，來源 commit c778ad3ddaeafd982ce7a0d305ffbf48ebb85d09。
- GitHub 原網站分支已提交新版，但自動部署事件尚無對應新 SHA；不可把目前 /aig-download-center.html 宣稱為正式線上可見，Render 需獨立 exact SHA 驗收。

## 下一斷點
1. 先使原 Render 服務的最新 GitHub branch commit 實際部署，GET 新下載中心與 JS/CSS、FastModel、NC-first 模組靜態資產確認 HTTP 200，Render deploy exact SHA。
2. 手機／桌面真網站測試存取及備份下載，避免 GitHub PR Chromium PASS 誤當正式網址 PASS。
3. 新下載中心未來整合按 latest CI artifact digest 與到期/Release Gate 更新狀態；不得宣稱已永續存檔在 Render。
4. 逐頁以核准 RGB Authority、真核心 Callback 恢復 CAD/CAM/SIM/NC/4-6AX，保持正式工作頁簡潔。
