# AIG 三專案引擎升級暨錯誤可觀測性規範（2026-10-22）

狀態：**正式施工決策 / 尚未發布**。此文件規範 AIG-II、AIG Studio 5.0 CNC 與 AIG FastModel；既有 RGB Authority、原核心與可信 SHA 不回退、不替換、不以 UI 截圖替代真功能。

## 唯一順序

1. **核心先行**：解析幾何→CAD 拓樸/Offset/Trim/布林與精度 → CAM 真路徑 → SIM 真材料移除 → NC/Fanuc 安全 → FastModel 自動人體比例/真全身骨架/蒙皮/真動作。CAD CNC 和動畫各有獨立核心，不誤把刀心軌跡視為人物骨架。
2. **控制單元**：Page/Subpage/Button ID → Shared Command → Core Function；每個按鈕必須可呼叫、回傳錯誤/狀態。沒核心能力時禁用/琥珀 Blocked，不用工程殼、靜態圖或假回呼替代。
3. **邏輯配對**：CAD → CAM → SIM → NC 和 3AX~6AX / FastModel 影格 → 影片；完整輸入、處理、狀態與輸出同輪驗證。斷開 CONNECT 時頁面仍可獨立工作，真機輸出維持安全封鎖。
4. **畫面收口**：原核准 RGB Authority 10 頁（Mobile / Desktop 逐頁獨立 SHA）；FastModel 動畫工作區沿用色票與控制狀態，不把 CNC 頁強加到人物動畫介面。

## 為什麼 AI 反覆改錯

- 核心 Kotlin/Node 編譯成功 ≠ 執行效果、真 3D 動作、機台安全或完整頁面可用。
- gitBlobSha 只驗證來源版本一致；不保證功能數值、輸出檔或畫面正確。
- GitHub Actions 全紅可能是 **核心 FAIL、控制/UI 狀態/測試時序 FAIL、打包/上傳配額 FAIL**。應分開歸因，禁止把配額錯當幾何 bug。
- 沒有同一 SHA 的實際操作截圖、影片、來源、控制狀態與輸出數值，就容易每輪遺失缺陷上下文。
- FastModel 的局部頭頸 GLB 及 2D 推鏡測試不能升格成一張照片全身真 3D 人物動畫。

## 每次修復的強制證據卡（Error / Improvement Record）

每個缺陷須有穩定 `AIG-DEFECT-<專案>-<連號>`，而且至少包含：

| 欄位 | 必填內容 |
|---|---|
| Commit | 精確 branch + full HEAD SHA；任何來源變更後舊 PASS 無效 |
| Error Source | CORE_MATH / CORE_ANIMATION / CONTROL_CALLBACK / UI_STATE / TEST_RACE / BUILD / ARTIFACT_QUOTA / MISSING_AUTHORITY / UNKNOWN |
| Expected vs Actual | 相同輸入的幾何誤差、加工量、渲染影格變化、檔案可播放證據或明確錯誤 |
| Reproduction | 自動測試名稱、指令、設備/瀏覽器/解析度、可靠重現資料與限制 |
| RED → GREEN | 修復前真 FAIL log + 修改後同案 PASS log；若是測試本身錯誤須先釐清 |
| Negative Test | 退化幾何/NaN/跨界/超界/錯模/斷線/禁用/過期非同步完成等至少一類 |
| Regression | 其他既有功能/原圖/專案檔/G-code/動畫不回退；全核心 Inventory 與鎖定 SHA |
| Runtime Evidence | 手機/桌面真實畫面、按鈕狀態、互動後結果、輸出 SHA/檔、原始 run URL |
| Gate Result | PASS / FAIL / BLOCKED / NOT_TESTED，分 CORE / CONTROL / END_TO_END / UI / NATIVE / DELIVERY |
| Release decision | 任一危險或必需證據 FAIL/BLOCKED/NOT_TESTED，Release = BLOCKED |

## 升級驗收

### AIG-II / Studio CNC
- 幾何用解析式保留權威資料；畫面網格只是顯示，不讓三角形粗細決定 CNC 0.001 mm 精度。
- 2D 有效：交點、相切、Trim、Extend、Offset、圓弧方向、封閉/自交、巢狀、孤島、重疊；嚴格數值公差。
- 3D：真正實體與 3~6AX 運動學（XYZABC）、刀具/夾具碰撞、材料體積移除、路徑+NC+SIM 一致。
- 每個核心功能須有正向與反向的「真運算」測試；不支援的 C 軸真機 NC/碰撞保持 BLOCKED。

### FastModel
- 單張照片/上半身的 **比例估測** 與不可見區域推估分開標示；無法憑一張照片保證被遮擋部位真實長相。
- 最低驗收依序：全身骨架/關節覆蓋 → 有效蒙皮 → 真 GLB 頂點位移/姿態 → 髮束/頭頸空間碰撞 → 1080p 真影片解碼多幀差異 → 實機效能。
- 只能做技術頭頸或 2D/2.5D 鏡頭動畫時，必須在 UI/報表明示，不得標示全身真 3D PASS。
- 畫面/GLB/影片來源一律綁定 source digest；非同步舊任務結果不得覆寫新來源。

## 唯一聯合 Release Gate

`SOURCE LOCK → REAL CORE → REAL CONTROL → END-TO-END DATA → AUTHORITY PIXEL + APP LAUNCH → ANDROID+WINDOWS BUILD+DELIVERY → RELEASE`

每個 gate 必須對應當輪 HEAD SHA。失敗時只隔離出錯模組，保留 Working Copy 與已驗證資產；不回退版本或重置 CAD/動畫。

## 已知實際故障及分類（紀錄，非宣布 PASS）
- AIG-II 原生編譯成功，但 `actions/upload-artifact` 因 GitHub artifact quota hit：**DELIVERY/INFRA**，不可說成 CAD 編譯失敗或 APK 已可下載。
- FastModel 影片自然完成時 Stop 按鈕禁用，Playwright 跨任務 check+click 競態：**TEST_RACE vs UI_STATE**；測試需在同一 browser task 觀察並操作；出錯保存 Screenshot + 有界按鈕狀態 JSON。
- FastModel `app.mjs` lock 曾指向舊 SHA，先對照歷史 commit 及現有真控制 callback，再更新 SHA；不能關閉完整性檢查放行。
- CAD 過去按大小誤判相互分離的 OUTER/INNER：**CORE_MATH**，改用拓樸包含關係；在 `CamEngine.generate` 入口攔截自交閉合輪廓才能稱真正修復。
- FastModel 的 30Hz GLB 技術蒙皮檢查不能認定真女主角完整 3D。真完整模型的 Gate 仍 BLOCKED。

## 決策
**每一輪不以「升版本」或「測試全部綠」報功，而是以新能力的正反測試＋真實輸出＋逐頁 UI／實機證據為準。** 任何缺失均明確報告，不能把能力缺口藏進排版、圖片或未驗證的 CI PASS。
