# AIG Studio — AI 快速維護索引

目的：先用症狀定位最小範圍，再進程式；除非索引無法定位，否則不要先全文掃描大型 Runtime 檔。

## 類別索引

[STARTUP_HOME] 正式 HOME / 啟動入口 / HOME FIRST。
[RGB_ASSET] AIG RGB 圖資、AI 補圖、HOME pack、SHA。
[CAD] 幾何、選取、Snap、Dimension、Trim/Extend/Offset/Array。
[CAM] AUTO/MANUAL、Safe-Z、G41/G42、避讓、刀路。
[SIM] 真 3D、材料移除、刀路顯示與重算。
[AXIS_3_6] 3D / 3AX / 4AX / 5AX / 6AX 與 A/B/C。
[NC_FANUC_POST] Fanuc NC / Post / G/M / G54 / G90 / G43。
[ANDROID_WINDOWS] Android 與 Windows UI 分流。
[SETTINGS] 設定中心、FPS、GPU、開發與相容性。
[RUNTIME_LINK] CAD↔CAM↔SIM↔NC data-flow link。
[SYNC_UPDATE] Project revision、背景同步、更新。
[FULL_OPEN_POLICY] Regression/Rollback/Downgrade OFF、診斷只顯示。
[EXACT_BIND] Studio 版本與 AIG-II exact SHA 綁定。
[TUTORIAL_PACK] AI 導航 / 教程 / Banter / 表情 / digest。
[BREAKPOINT_RECOVERY] AI/網路斷線後續接。

## 症狀 → 第一個檔 → symbol → 最小驗證

| 症狀 | 第一個查的檔 | 搜尋 symbol / token | 最小驗證 |
| --- | --- | --- | --- |
| HOME 不見 | `app/src/main/java/com/aigstudio/app/MainActivity.kt` | `showRuntimeHome` / `FORMAL RGB HOME` | `python ci/verify_runtime_surfaces.py` |
| RGB 圖不對 | `core/src/main/kotlin/com/aigstudio/core/UiAssetContract.kt` | `HOME_PACK_VERSION` / `RGB_PACK_VERSION` | `python ci/verify_home_rgb_pack_416.py` |
| CAD 畫圖/編輯問題 | `core/src/main/kotlin/com/aigstudio/core/Document.kt` | `undo` / `redo` / entity mutation | focused CAD verifier / core compile |
| CAM 刀路問題 | `core/src/main/kotlin/com/aigstudio/core/Cam.kt` | `MANUAL` / `Safe` / `G41` / `G42` | CAM focused test + `:core:compileKotlin` |
| SIM 材料移除問題 | `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt` | `material` / `removal` / `simulate` | SIM focused test + `:core:compileKotlin` |
| 6AX 問題 | `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt` | `6AX` / `axisC` / `A` / `B` / `C` | axis focused verifier + Android/desktop compile |
| NC / Fanuc 問題 | `core/src/main/kotlin/com/aigstudio/core/FanucNc.kt` | `G54` / `G90` / `G43` / `M98` / `G34` | NC focused test + `:core:compileKotlin` |
| Android 畫面問題 | `app/src/main/java/com/aigstudio/app/MainActivity.kt` | 對應頁面函式名 | `:app:compileDebugKotlin` |
| Windows 畫面問題 | `desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt` | `homePanel` / 對應 panel | `:desktop:compileKotlin` |
| 設定頁問題 | `app/src/main/java/com/aigstudio/app/MainActivity.kt` | `showUserSettingsCenter` | settings focused verifier |
| RuntimeLink 不同步 | `core/src/main/kotlin/com/aigstudio/core/RuntimeLinks.kt` | `RuntimeLinkStore` / `RuntimeLinkContract` | `:core:runtimeLinkRegression` |
| Project sync 問題 | `core/src/main/kotlin/com/aigstudio/core/ProjectRepository.kt` | `revision` / `digest` / conflict | sync focused verifier |
| 更新被舊規則擋 | `core/src/main/kotlin/com/aigstudio/core/OpenRuntimePolicy.kt` | `STATUS_ONLY` / `ARTIFACT_INVALID` | `python ci/verify_full_open_runtime_policy.py` |
| 版本 exact-bind | `release-version.properties` | `versionName` | Studio SHA 確認後到 AIG-II `integration/manifest.json` 更新 exact SHA |
| Tutorial/嘴炮/表情問題 | `shared/tutorial/tutorial-index.json` | `banter_levels` / `expression_ids` | `python ci/verify_tutorial_pack_v1.py` |
| AI 斷線續接 | `docs/superpowers/progress/2026-10-05-aig-tutorial-pack-v1-progress.md` | `Current:` / `Task` / `Ruling` | 比對 feature HEAD + diff + 最後 PASS 證據 |

## 深入定位規則

### HOME / UI
先找現成函式或 contentDescription，再只讀該區塊。不要先打開完整 `MainActivity.kt` 從第一行掃到底。

### RGB / AI 補圖
先看 `UiAssetContract.kt`、`approved/<pack>/manifest.json`、SHA，再看 `ci/promote_ai_home_asset.py` / `ci/verify_home_rgb_pack_416.py`。184 按鈕包與新 HOME pack 分開，不得互相覆蓋。

### CAD / CAM / SIM / NC
先進 core 檔，UI 只負責 callback。除非 callback 沒接到 core，否則不要先改 UI。

### 3D～6AX
先確認資料模型是否已有 A/B/C，再檢查 renderer / workspace。WARNING/STale 不得重新變成升版 BLOCK。

### Android / Windows
手機與電腦是兩套 layout density；只共用語意與核心資料，不要求同一版面縮放。

### Full-open
`OpenRuntimePolicy.kt` 是第一入口。一般 CNC/3D～6AX 診斷為 STATUS/WARNING；真正 compile/package/integrity failure 才是 `ARTIFACT_INVALID`。Auto Regression / Rollback / Downgrade 都應維持 OFF。

### Tutorial Pack
先跑 `ci/verify_tutorial_pack_v1.py`。Pack 版本 `1.0.0`，AIG-II / Studio canonical digest 必須一致。Banter 與 emoji 是 presentation-only。

### 斷點續接
順序固定：最後可信 branch HEAD → progress ledger / checkpoint → compare/diff → 已完成 Task → 未完成 Task → focused verifier。不要重做已經有 commit + PASS 證據的 Task。
