# AIG Studio 5.0｜Web Runtime

主要入口：`web/index.html`（實作版）。

- 已有 HOME、CAD Canvas 繪圖/編輯、CAM 刀路、SIM、3AX～6AX WebGL（含降級提示）、NC Fanuc 編輯、刀路工作頁與專案功能頁。
- 新增 **AI 本機加工助手**：只讀取已保存的 CAD/CAM/各軸 G-code，提供離線、規則式工作提醒，不使用雲端模型、也不修改或發送機台指令。
- 原 `web/main-runtime-preview.html` 是舊展示頁，不可再當正式網站入口，尤其不可取代 CAD/CAM/NC 真功能。
- 有網路或離線都可啟動已安裝 PWA；service worker 換版會更新快取，不能以舊快取冒稱新版。
- CNC 真機輸出停用。Web 功能存在不等於 Android/Windows 原生 Gate 或 0.001 mm 真機精度已通過。

## 驗證

`node ci/verify_web_runtime.mjs` 是 Web 專項 Gate；版本應以根目錄 `release-version.properties` 為準，不用畫面內舊版本字串判定發佈。

原始 `web/main-runtime-preview.html` 只保留歷史相容用途。

## Web 373：雙平台核准 HOME 圖

自 AIG-II private approved/427 pack 將 `home_mobile.jpg`、`home_desktop.jpg` 以二進位 Git Blob 原內容完整帶入可部署的 Studio Web 資源。兩平台圖片分開，不以 reference 圖冒充 Authority；現有公開 Web 圖庫共 43 張已核對來源圖資。Android 與 Windows 原生 Runtime Gate 未因此自動通過。

## 374｜工程殼外觀隔離 + 正式 RGB HOME

- 初始載入獨立 `web/aigii-skin.css`，使用核准 427 HOME 手機/電腦二進位檔作為非互動的低對比視覺底板。所有真正按鈕仍以原 Studio DOM `data-open-page`、`data-cad-*`、`data-cam-*`、`data-cmd` Callback 運行；不以整張圖片作假按鈕。
- `web/aigii-overlay.js` 建立 RGB 英雄區並保留 HOME 的 CAD/CAM/NC/AI state ref，不破壞工作頁。
- Web PWA cache 改為 374 + **網路優先的 HTML**、離線快取備援，不再永遠顯示上一次工程殼。
- 本次僅源碼和靜態驗證；使用者實際手機/桌面截圖驗收仍須補齊，WebGL 真切削 Gate 另列。

## Public portal separated from production CNC Workstation (375)

The root domain `/` serves `web/portal.html`: technology editorial homepage with news sections, categories, project description, downloads links and access to RGB library. The fully interactive CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI application remains byte-for-byte sourced from `web/index.html`, but deploys at `/studio.html` only. `Dockerfile.web-runtime` must never serve it as `/index.html`. The website gate enforces that. PWA navigations are network-first and distinct offline cache routes prevent the workstation from reappearing at `/`.
