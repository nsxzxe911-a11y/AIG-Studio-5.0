# 2026-10-22 AIG 三專案核心復原與第一批真控制接軌

**交接警告：不發布、不合併、不升版、不覆蓋使用者 CAD/NC／圖資。此文件及來源分支不可被低版本 main、過期網頁或舊工程殼覆蓋。**

## 三條唯一續接線（各獨立 DRAFT PR）
1. AIG-II: https://github.com/nsxzxe911-a11y/AIG-II/pull/12
   分支 `repair/core-first-aigii-20261021`，底層來源 `architecture/ui-button-id-hierarchy-20261017`。
2. AIG Studio CNC: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/14
   分支 `repair/core-first-studio-20261021`，底層來源 `release/studio-592-web-authority-core-closure`（原版號檔 370.0.0，切勿認為已安裝 592）。
3. AIG FastModel: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/15
   分支 `repair/core-first-fastmodel-20261021`，底層來源 `fix/fastmodel-real-motion-and-generation-state-20261021`。

## 已經可重現的核心證據（不等於完整 Release）
- AIG-II 真 JVM 完整回歸 PASS：CAD AUTO/MANUAL → 真 G0/G1/NC-first → SIM 數值材料移除 → 專案保存/讀回，G90/0.001mm、Safe-Z、未驗證 C 軸阻擋，連線獨立狀態。
  https://github.com/nsxzxe911-a11y/AIG-II/actions/runs/39630368867
- Studio CNC 真 JVM 完整回歸 PASS：CAD/MANUAL → CAM→3AX Fanuc NC→SIM 實際材料移除，A/B/C 保存和專案 V3，6AX C 軸 NC 後處理維持 BLOCKED。
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39628911916
- 兩 CNC 分支 Android debug APK 和 Windows JVM JAR 真編譯 PASS，但非 EXE、非實機 Runtime 截圖，也未 Release：
  https://github.com/nsxzxe911-a11y/AIG-II/actions/runs/39631615105
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39631625631
- FastModel 真測試：241 Node、49 Python、8 舊圖片管線、2 C++，手機/桌面 Chromium 錄製 1920×1080 WebM 並重新解碼比較不同畫格 PASS；使用合成圖，不是使用者女主角。
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39631008203

## 真修復（不得移除）
- 原 CNC `RuntimeLinkStore` 啟動把 MACHINE 假設為 CONNECTED → 已改成未握手預設 DISCONNECTED，UI 點擊變 WARNING，未驗證不能接真機；CAD/CAM/SIM/NC 仍可本機獨立運作。
- 兩 CNC CAD move/copy 防範 `Double.MAX_VALUE` 等有限但極端座標；預檢禁止在 Undo/資料/刀路寫入之前。
- AIG-II 舊九頁回歸條件→與既有十頁（含 6AX）正式契約一致；不可刪 6AX。
- FastModel 虛假 2.5D 疊人：原圖沒有乾淨背景時，整張圖只繪製一次、保持真推鏡，不允許人物重影；真正關節動畫仍 BLOCKED。
- 三案 `ci/core-recovery-lock.json` 保護原核心 blob SHA，改核心需同步審核鎖定，不得靠加版本過 Gate。

## 本輪控制接軌，僅限真正完成的範圍
- AIG-II Android：十頁正式導航、HOME 手機精簡導航使用 `UiDualIdContract` → `NAV_*` → `VIEW.NAV.*` → 原有 `onPage` 真回呼；Windows 早有同一契約。獨立 `uiNavigationBindingRegression` 測試。
- Studio CNC Android + Windows：先前只是宣告 `UiButtonManifestContract`，Runtime 沒調用；現在兩端真按鈕呼叫 `dispatchNavigation(ButtonID, expectedSurface)`，分派 `SharedUiCommand` 後執行原有 CAD/CAM/SIM/3AX-6AX/NC/AI/HOME 回呼。未知 ID、錯頁、錯命令直接失敗；獨立 `uiNavigationBindingRegression`。
- `ci/verify_native_control_bindings.py` 用來阻擋 native 編譯時失去 ID→callback 的原始碼路徑；此文字稽核不是實際觸控測試。
- FastModel：在六個**既有**真 DOM 按鈕（生成、播放、停止、錄影、影片驗證、報告）綁定穩定 Page/Button/Command ID；不複製、更換原 callback；Playwright 手機與桌面以真照片合成 Fixture 驗證錄影／解碼。模組 `aig-live-control-manifest.mjs`。
- 修正上述 UI/控制不等於完成所有副頁按鈕 ID／Command ID；仍需逐頁 Callback → 真 Core → 數值/檔案/畫面 Outcome Gate。

## 最新測試入口（請查即時結果，未 PASS 不允許後續 Gate）
- AIG-II Navigation＋完整核心＋Android／Windows 編譯：
  https://github.com/nsxzxe911-a11y/AIG-II/actions/runs/39653026220
- Studio CNC Navigation＋完整核心＋Android／Windows 編譯：
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39653038260
- FastModel 真六鍵及影片錄製：
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39653487221

## Release / Authority 尚未通過（不能誤稱全數修復）
Android/Nox 實際頁面、Windows EXE 安裝與維修、十頁 Mobile/Desktop 核准 Authority PNG/SHA 對照、全副頁 ButtonIDs→真核心結果、5/6 軸碰撞/TCP/機台輸出；FastModel 女主角原生比例／外觀／關節/格鬥動畫／真音訊與影片成品驗收皆未證明。持續分開 BLOCKED。

**下一階：先核對上述 Actions 與最新 PR commit，再執行原生 Runtime 點擊/視覺 Gate、Authority 來源比對；每頁功能 callback→core→結果分開接，不刪現有引擎、不可發布未驗證產物。**
