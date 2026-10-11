# AIG 新 UI → Core Capability 架構設計

日期：2026-10-11
適用：AIG CNC / AIG-II 手機正式 Runtime
狀態：Design Spec — 待使用者審閱

## 1. 目的

新版手機 UI 不再被視為舊功能的換皮。HOME / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI 十頁先完成新版 UI 功能面，再以 UI 實際需要反推 Core Capability。已有成熟真核心的能力保留；新 UI 需要而 Core 缺少、能力不足或資料模型不完整的部分，才升級或重製 Core。

唯一合法資料鏈：

`New UI Spec → Capability Contract → Command / State → Evaluator / Engine → Result → Renderer → RGB UI`

Renderer、Skin、hitbox 不得製造業務結果，不得自行估算加工、安全、碰撞、進度或機台狀態。

## 2. 固定產品邊界

- 手機先行；本規格不修改 Windows Desktop 版面。
- 可見主頁固定為 HOME / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI。
- MULTIFUNCTION 不得重新成為可見主頁；只允許保留內部相容路由。
- 正式 UI 維持黑底 AIG RGB、繁中、共用頂部導航與自適應全畫布。
- 新 UI 可先存在尚未完成 Core 的控制，但必須 Disabled 並標示 `CORE WAIT` 或等價狀態；禁止假 callback。
- 動態數值必須來自 Runtime State；無資料顯示 `— / 未連線 / 待評估`，不得露出 Skin 示範值。
- 評估、計算、驗證、碰撞、安全、進度等結果一律在 Core / Evaluator / Engine 產生。
- 端到端精度維持 0.001 mm。
- 版本只升不降；本規格不允許以降版、舊 UI 或工程殼解決問題。

## 3. 實作策略

### Stage A — 新 UI Surface 完整化

先把十頁新版 UI 的控制、欄位、狀態區、主要工作區與操作流程定義完整。每個可互動元件取得唯一 Capability ID，並標記 `READY / CORE_WAIT / DISABLED_BY_STATE`。Stage A 只完成 UI surface 與契約需求，不用假資料模擬未完成核心。

### Stage B — Capability Contract 與 Core Gap 修補

逐一比對每個 Capability ID 與現有 Runtime Contract。分類只允許三種：

1. `KEEP`：現有 Core 已真實、測過且符合新 UI。
2. `UPGRADE`：現有 Core 可保留，但 State / Command / Evaluator 能力不足。
3. `REBUILD`：現有能力無法滿足新版需求，建立新的 Core 邊界或 execution/evaluation subsystem。

### Stage C — Runtime / Renderer 接線

所有 READY capability 必須形成完整鏈路：UI action → RuntimePort → Core → State/Result → Renderer。Image-map 只負責座標與觸控映射，不得作為 Runtime State 是否可顯示的 gate。每頁固定啟用順序為：UI 定義 → Capability ID → Core 完成 → Runtime wiring → 測試通過 → `CORE_WAIT` 轉 `READY`；不得先把按鈕啟用再補核心。

## 4. Capability ID 規則

Capability ID 採 `PAGE.DOMAIN.ACTION_OR_VALUE`，例如 `CAM.STRATEGY.SAFE_Z`、`SIM.EVAL.PROGRESS`、`AXIS5.SAFETY.COLLISION`。每個 ID 必須能回答三件事：誰提供 Command、誰提供 State/Result、誰負責計算。

UI 元件不得只靠字串名稱或圖片座標推斷功能。每個 READY 元件至少綁定一個明確的 AigUiAction / Runtime Command 或唯讀 State selector。

## 5. 十頁 Capability 設計

### HOME — 聚合總控台

保留：十頁導航、專案/NC/AI 既有聚合來源。
新增/升級：Machine Runtime、Project Runtime、模組連線、同步狀態、工作版本、最後保存與各模組 readiness。
Core 規則：HOME 不計算加工結果，只聚合其他 Core 的 authoritative state。任何來源不存在即顯示 `—`。
分類：`UPGRADE`。

### CAD — 真幾何與編輯

KEEP：Line、Rect、Circle、Arc、Hole、Select、Undo/Redo、Snap、Layer、Dimension、Trim、Extend、Offset、Array、Chamfer、Fillet、Topology、Origin。
UPGRADE：新 UI 所需的尺寸約束狀態、完整選取/屬性狀態、PHOTO ALIGN / PHOTO SCALE 對應契約，以及新 UI 中所有 inspector 值的真 State。
Renderer 只繪真 CadState geometry/snap/selection/property，不保存幾何真相。

### CAM — 手動優先＋策略評估

KEEP：Manual、XYZABC、G0/G1/G2/G3、Tool、Diameter、Depth、Safe-Z、Feed、Speed、Inside/Outside、CW/CCW、Lead In/Out、Region、Fixture/Clamp/Keep-out、Avoidance、Freeze/Preview/Adopt/Save。
UPGRADE：策略評估結果、最小安全間隙、避讓有效性、路徑有效性、加工風險、路徑進度/長度/預估時間等 UI 需要的評估 State。
Core 規則：Manual 保持第一順位；自動策略不得覆蓋使用者已採用的手動刀路。

### SIM — 真材料移除與評估

KEEP：motion program、block index/count、material depth field、removed cells、min depth、removed volume、Run/Step/Reset/Display。
REBUILD：保留既有材料移除 base core，新增獨立 `SimEvaluationState` / evaluation subsystem，由 Core 計算 progress、elapsed、remaining estimate、collision/safety result、active block、material validity。
禁止 Renderer 由 block index 或畫面動畫自行推導百分比與剩餘時間。

### 3AX / 4AX / 5AX / 6AX — 真機台運動核心

KEEP：AxisMode、XYZABC pose、motion program id/revision、block index/count。
REBUILD：Axis Runtime 擴充成完整 execution state，包含 spindle、feed、tool、running/paused/stopped、axis limit result、pose safety、collision result、connection state。
REBUILD：控制 Command 必須覆蓋 Play/Pause/Stop/Display 與目前 Machine Profile 宣告可用的線性/旋轉軸 jog。軸數決定自由度數量，但 A/B/C 的實際指派、旋轉方向、安裝方向與運動鏈不得由頁面名稱硬寫死。
5AX/6AX 必須保留 CAM/NC 傳入的姿態資料，並由選定 Kinematics Profile 映射到實體旋轉模組；不得由 UI renderer 臨時產生姿態。
安全/限位/碰撞由 Axis/Core Evaluator 依選定 Machine/Kinematics Profile 計算，UI 只顯示。

#### 可替換 Machine / Kinematics / Scene Modules

3AX / 4AX / 5AX / 6AX 頁面是能力頁，不等於單一固定機台外型。每頁可選不同 Machine Profile；同一 4AX 頁可切換直立轉台、臥式轉台、不同安裝方向或其他經驗證的四軸配置。5AX/6AX 亦可依實際機台採不同 head/table 組合。

每個 `MachineProfile` 至少宣告：axisCount、logical axes、kinematic chain、axis transforms、travel/rotary limits、spindle module、table/rotary modules、fixture mount、scene profile、supported capabilities。

`KinematicsProfile` 負責把 CAM/NC 的 XYZ/姿態命令映射為實際機台模組運動；`SceneModuleProfile` 只決定可視化幾何與組裝位置。兩者分離，禁止因更換外觀模型而改變加工數學，也禁止 Renderer 自行決定運動學。

UI 控制由 Capability/readiness 動態顯示或禁用，不因更換機台形式而複製整頁 UI。切換 Machine Profile 必須在 execution STOPPED 狀態進行；切換後重新驗證軸限位、姿態、安全與目前程式相容性，不沿用未驗證的執行狀態。專案保存所選 Machine Profile ID / revision / digest，Android 與 Windows 後續使用相同語義。

### NC — Fanuc 編輯＋Execution Core

KEEP：編輯器、Validate、Machine Profile、XYZABC 範圍、Candidate、Preview/Adopt/Save、G0/G1/G2/G3、G80、G34 I/J/K、G81/G73/G83、M98 P4/P5、自訂 M-code、M42/M44 等既有 parser/runtime 能力。
REBUILD：保留既有 parser/editor/validation core，新增正式 NC execution subsystem 與 `NcExecutionState`，控制 Command 至少包含 Single Block、Dry Run、Block Skip、Optional Stop、Run/Pause/Stop、current block、execution mode、machine safety interlock result。
錯誤、Alarm、Warning 必須由 NC Core 產生 diagnostics；UI 不因錯誤閃退，並在 G-code 編輯區可定位。

### AI — 跨模組診斷與 Verified 流程

KEEP：Immutable Main / Working / Verified、Open、Stage、Verify、Promote、Restore。
UPGRADE：AI Input 改為結構化讀取 CAD/CAM/SIM/Axis/NC authoritative state；輸出結構化 diagnosis / recommendation / patch proposal / verification result。
AI 不得直接改 Immutable Main；任何修改先進 Working Copy，經驗證才 Promote。
AI 顯示卡只有在 Core/AI engine 真有結果時才出現；否則顯示待分析，不保留 Skin 示範建議。

## 6. State / Command / Evaluator 邊界

- `State`：只能表達 Core 已確認的當前真相；不可混入 UI 暫存值。
- `Command`：表達使用者意圖；不得把按鈕文字直接當命令。
- `Evaluator`：純計算/驗證，可重現、可測試，輸入明確 snapshot，輸出明確 result。
- `Engine`：負責幾何、刀路、材料移除、運動執行等有狀態流程。
- `Renderer`：只做座標轉換、繪製、hit-test feedback；不得決策加工或安全。
- `Skin`：只提供視覺，不提供真值、業務規則或隱藏 command。

## 7. UI 狀態模型

每個控制的 UI 狀態只能由 Capability readiness 與 Runtime state 決定：

- `READY`：Core contract、command/state、runtime wiring 全部存在。
- `CORE_WAIT`：新版 UI 已定義，但 Core 尚未完成；按鈕 disabled，不能 dispatch。
- `DISABLED_BY_STATE`：Core 已存在，但目前條件不允許，例如未連線、無候選刀路、NC 未驗證。
- `ALARM`：Core 回傳 Alarm severity；UI 顯示但不得崩潰。

Dynamic field 的 fallback 固定為 `—`、`未連線` 或 `待評估`；禁止以 0、68%、預設 RPM 等可被誤認為實測的數字當 placeholder。

## 8. Error Handling

所有模組各自管理自己的 diagnostics。CAD/CAM/SIM/Axis/NC/AI 的錯誤不得跨模組污染 state。跨模組連線失敗只改 connection/readiness，不清除本機工作資料。任何 Core exception 必須轉成 RuntimeMessage/Diagnostic，Renderer 不吞錯、不以紅色工程殼取代正式 UI。

無網路時 Local Core 仍可啟動；雲端/AI/同步不可阻塞 HOME 或 CAD/CAM/SIM/NC 本機使用。

## 9. 雙案共用與 Parity

AIG CNC 與 AIG-II 共用 Capability ID、Runtime Contract 形狀、State/Command/Evaluator 語義與測試案例。允許 package namespace、產品識別與 AIG-II 專屬 AI 更新能力不同，但同名 capability 不得在兩案代表不同功能。

每個可合併 checkpoint 必須檢查：
1. Contract parity。
2. Capability readiness parity。
3. Android Renderer 行為 parity。
4. 兩案各自 build/test 通過。

## 10. 驗證策略

### Contract tests
- 每個 UI Capability ID 必須能解析為 KEEP / UPGRADE / REBUILD 與 readiness。
- READY capability 必須有 command 或 state selector；純顯示值也必須有 authoritative source。
- CORE_WAIT capability 禁止 dispatch。

### Core / Evaluator unit tests
- CAD 幾何與編輯結果可重現。
- CAM manual XYZABC、避讓、Safe-Z、方向與策略評估有數值斷言。
- SIM removed cells/depth/volume/progress/safety 有數值證據，不以截圖替代。
- Axis 3/4/5/6 mode masking、Machine Profile 切換、kinematic mapping、limits、pose safety、execution state 有測試。
- NC parser/diagnostics/execution mode/G34/cycles/custom M-code 有測試。
- AI Verified 流程不可繞過 Working Copy。

### Runtime integration tests
驗證 `UI Action → RuntimePort → Core → State → Renderer` 完整鏈路，並確認 state 改變後畫面資料跟著變。不得只測按鈕可點。

### 夜神 Fast Loop
每頁至少驗證：頁面切換、主要工作區、READY 控制可操作、CORE_WAIT 控制不可假動作、動態值不露 Skin 示範數字。3→4→5→6→3 切換維持 One Scene / One Renderer / No Overlay。

### Formal Gate
完成一個可交付 slice 後才跑完整 Android Gate；日常小改維持 Fast Loop，不為每次 UI 微調打包。正式 release 仍須遵守版本只升不降與主程式正式 UI 啟動要求。

## 11. 實作分解

本文件是父架構規格，不把所有 Core 重製塞進一次修改。依賴順序固定：

1. **Slice A — UI Capability Catalog**：完成十頁新版 UI surface、Capability ID、readiness、CORE_WAIT 行為與 shared contract skeleton。
2. **Slice B — SIM + Axis Core**：先重製最缺的 SIM Evaluation 與 3/4/5/6AX execution/safety，並建立可替換 Machine/Kinematics/Scene Module Profile。
3. **Slice C — CAD/CAM/NC Gap**：保留成熟核心，只補新版 UI 明確缺口，包含 NC Execution。
4. **Slice D — AI Cross-Module**：最後接入各模組 authoritative state，完成結構化診斷與 Verified 流程。

每個 slice 必須獨立可測、可回退其未提交變更，不要求未完成 slice 的假實作來讓 UI 看似完成。

## 12. 完成條件

本架構完成的判定不是「十頁都有圖」，而是：

- 十頁每個可見功能都有 Capability ID 與 readiness。
- 所有 READY 功能都有真 Command/State/Evaluator/Engine 路徑；Axis 頁的機台形式由可驗證 Machine/Kinematics Profile 決定，不以固定模型硬編碼。
- 所有 CORE_WAIT 功能不執行假 callback。
- 動態值沒有 baked demo telemetry。
- 評估結果由 Core 產生且有數值測試。
- AIG CNC / AIG-II contract parity 維持。
- Android 真 Runtime 可啟動、切頁、操作；工程殼不是啟動入口。

## 13. 非目標

- 本輪不先重製 Windows UI。
- 不因新 UI 而刪除已驗證的 CAD/CAM/NC 成熟核心。
- 不以圖片生成、固定文字、Renderer 推算取代 Core。
- 不在本規格直接定義雲端登入/Drive 同步新協議。
- 不在未驗證前產正式 release APK/EXE。
