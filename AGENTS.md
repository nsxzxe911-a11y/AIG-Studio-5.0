# AIG Studio — AI 30 秒維護入口

**Read AGENTS.md first. Unless the index cannot resolve the issue, do not begin by scanning entire multi-thousand-line MainActivity/DesktopApp files.**

## 先做這 5 件事

1. 讀 `release-version.properties`，確認只升版不降版。
2. 讀 `docs/ai/AI_MAINTENANCE_QUICK_GUIDE.md`，依症狀找「第一個檔案 + symbol + 最小驗證」。
3. 只讀該 symbol 周邊；索引解不了才擴大搜尋。
4. 先跑 focused verifier，不要先跑深層 regression。自動 Regression / Rollback / Downgrade 維持 OFF。
5. 要宣稱完成前，再跑對應 Android / Windows compile；沒有真編譯或真啟動證據就不要寫 PASS。

## 快速入口

- HOME / Android：`app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Windows：`desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt`
- CAD：`core/src/main/kotlin/com/aigstudio/core/Document.kt`、`Geometry.kt`
- CAM：`core/src/main/kotlin/com/aigstudio/core/Cam.kt`
- SIM / 3D / 多軸：`core/src/main/kotlin/com/aigstudio/core/Machining3D.kt`
- NC / Fanuc：`core/src/main/kotlin/com/aigstudio/core/FanucNc.kt`
- RuntimeLink：`core/src/main/kotlin/com/aigstudio/core/RuntimeLinks.kt`
- Full-open：`core/src/main/kotlin/com/aigstudio/core/OpenRuntimePolicy.kt`
- RGB HOME：`core/src/main/kotlin/com/aigstudio/core/UiAssetContract.kt` + `ci/verify_home_rgb_pack_416.py`
- Tutorial：`shared/tutorial/` + `ci/verify_tutorial_pack_v1.py`
- AI 維護索引：`docs/ai/AI_MAINTENANCE_QUICK_GUIDE.md`

## 斷線續接

先找最後可信 checkpoint / feature HEAD → `git diff` / compare → 已證實證據 → 未完成 Task。不要重做已完成 Task，也不要把聊天敘述當成 build/device 證據。

## 固定政策

- 正式啟動直接進 Runtime UI，不回工程殼。
- 3D～6AX / CNC 診斷訊息不阻擋 Runtime。
- AI RGB 圖資與程式生成允許；缺圖可走 AI RGB pipeline。
- Banter / emoji 只改呈現；不得改數值、G/M code、刀路、action target 或 callback。
- AIG-II 是雙專案 exact-bind 的主控制端；Studio 版本變更後要由 AIG-II 更新 exact SHA。
