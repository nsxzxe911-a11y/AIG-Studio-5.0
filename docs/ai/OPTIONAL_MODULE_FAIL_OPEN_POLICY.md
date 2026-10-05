# AIG 可選模組 Fail-Open 政策

適用：Tutorial / AI 導航 / 教程顯示層等非核心新增模組。

## 原則

1. 先修 RED；若該新增模組仍無法在本輪修到 GREEN，就先撤出安裝，不阻擋主 Runtime。
2. 撤出模組不得降版、不得 rollback、不得回工程殼。
3. Runtime 只顯示 STATUS/WARNING，例如 `OPTIONAL_MODULE_SKIP`；HOME / CAD / CAM / SIM / NC 繼續可用。
4. 正式入口不得硬 import 可選模組；使用 reflection 安裝。模組不存在時直接跳過。
5. focused verifier 在模組未安裝時回 `SKIP / MAIN_RUNTIME_CONTINUES`，不把可選模組缺席判成產品 FAIL。

## 可撤範圍（Tutorial V1）

- `core/src/main/kotlin/com/aigstudio/core/tutorial/TutorialPack.kt`
- `app/src/main/java/com/aigstudio/app/tutorial/`
- `desktop/src/main/kotlin/com/aigstudio/desktop/tutorial/`
- Tutorial focused test / verifier 可保留做後續修復證據。
- `shared/tutorial/` 資料包可保留；保留不等於已安裝。

## 不可用此規則直接刪除

- `MainActivity.kt`
- `DesktopApp.kt`
- HOME 正式 Runtime
- CAD / CAM / SIM / NC / 座標 / 幾何核心
- 版本與 exact-bind 基礎資料

核心本身若編譯失敗，必須修正核心改動；不能用「跳過」冒充 PASS。

## 重新啟用

可選模組只有在 focused verifier + Android/Windows 對應 compile 都 GREEN 後才重新列為已安裝。沒有真編譯或真啟動證據，不宣稱已完成。
