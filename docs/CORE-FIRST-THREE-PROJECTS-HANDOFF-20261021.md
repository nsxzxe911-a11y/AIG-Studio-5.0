# AIG 三專案｜核心復原接續點（2026-10-21）

**階段：CORE FIRST / CONTROLS NOT YET CONNECTED / NO RELEASE**。
這份紀錄是長期交接點，不代表完成。重新開始時先開下列三個 DRAFT PR，不得由較舊的 main/網站頁重新生程式、升版或覆蓋核心。

## 三個實際工作分支（不可混用）
- AIG-II: [Core-first PR #12](https://github.com/nsxzxe911-a11y/AIG-II/pull/12)。
  從 `architecture/ui-button-id-hierarchy-20261017` 分支取得，與 main 已分歧；
  復原 `shared/aigii/Core.kt`、CAM/同步、Axis Cockpit 等原始核心，使用 `tests/aigii/CoreRecoverySmoke.kt`；
  核心 lock: `ci/core-recovery-lock.json`；驗證 [Actions #39624373722](https://github.com/nsxzxe911-a11y/AIG-II/actions/runs/39624373722)。
- AIG Studio 5.0 CNC: [Core-first PR #14](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/14)。
  來源 `release/studio-592-web-authority-core-closure`。**該來源 release-version.properties 仍為 370.0.0，分支標題不是原生安裝版本。**
  既有 `Cam.kt`、`FanucNc.kt`、`Machining3D.kt`、`ProjectRepository.kt` 等核心不得刪換；
  回歸 `core/src/test/kotlin/com/aigstudio/core/CoreRecoverySmoke.kt`；
  [初次 PASS #39624383546](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39624383546)；
  [加入真材料移除／G0-G1 後的重跑 #39624853035](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39624853035)，以最新結果為準。
- FastModel: [Core-first PR #15](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/15)。
  來源 `fix/fastmodel-real-motion-and-generation-state-20261021`，不是原生 CNC 主線。
  [測試 #39624522501](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39624522501) 通過 npm 真生成 source regression；
  補齊缺少的 Pillow CI 安裝，不代表女主角 3D/真正人體動作已可用。

## 核心證據（不得改寫成正式完成）
- Git object blob SHA lock 確認「原始碼仍在且未被無聲替換」，**不是** runtime、APK、EXE 或視覺品質證書。
- AIG-II 重點：MANUAL 無 CAD→真 ToolPoint→Fanuc G0/G1→SIM 有實際深度負值格點→專案保存與 Safe-Z 阻擋。仍缺正式裝置 Gate 和所有頁面可操作性驗收。
- Studio 重點：MANUAL 含 A/B/C→真 NC／材料移除→6AX 座標與 G-code 專案保存。仍缺機台 3～6 軸物理幾何及手機／桌面 Gate。
- FastModel：單圖運鏡≠人物關節動畫。女主角外觀/真 3D 重建/骨架/多段動作及完整 1080p 人物影片仍 BLOCKED；不准用技術人偶冒充。
- 原核准 RGB 十頁實體素材與新版按鈕 ID：要分開稽核 Mobile/Windows 的原圖 SHA、可用檔案和 ButtonID/CommandID，**不得**以不存在的位元組或對話文字宣稱完成。

## 下一步鎖定順序
1. 以這三條 PR 的 CI 和原始核心為起點處理 FAIL；不刪核心不退版。
2. 各核心 CAD/CAM/SIM/NC/3AX–6AX/AI 或 FastModel 編譯和資料讀回都得到實際證據；缺證據保留 BLOCKED。
3. 取得最新 Native 主程式來源及 Android/Windows 裝置驗證，解決目前來源分支／版本漂移。
4. **最後才**接 UI：Image Authority → Region ID → Button ID → Shared Command → 真 core callback → 實際畫面與產出。
5. 每頁分別驗收，禁止僅檢查圖/按鈕外觀就標 PASS；CNC 真機輸出維持 BLOCKED 直至安全 Gate 通過。
6. 未授權不合併至 main／部署正式 Render／發佈 APK、EXE；測試不得覆寫 CAD/G-code 使用者資料。
