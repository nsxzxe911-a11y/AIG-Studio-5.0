# AIG RGB 繁體中文與 AI 自動排版增補規格

Status: `SPEC_LOCKED / WAIT_EXECUTION`
Scope: AIG-II + AIG Studio 5.0
Parent spec: `docs/AIG_RGB_FULL_UIUX_EXPANSION_SPEC.md`
Purpose: 在不啟動施工的前提下，鎖定繁體中文命名、AI 自動排版、RGB 幻彩設計系統與後續功能擴充規則。

## 1. 使用者可見名稱一律繁體中文

正式 Runtime、Web、Android、Windows 的使用者可見 UI，預設語言統一為繁體中文（zh-TW）。

規則：
- 主頁、分頁、副頁、按鈕、工具列、選單、卡片、提示、狀態、警告、對話框、設定項目、教學名稱，全部使用繁體中文。
- 英文 command name、class name、Button-ID、Shared Command、檔案名、內部 API 可保留作程式內部識別，不得直接當正式 UI 標籤。
- CNC 標準代碼與軸名稱可保留，例如 `G0/G1/G2/G3`、`G41/G42`、`M-code`、`XYZABC`、`F/S/T/H`，但旁邊功能名稱必須繁中。
- 預設顯示繁中；若使用者於設定切換 English，才由 Shared Settings Contract 切換語系。
- 不得在同一正式頁面隨機混用中文與英文功能名稱。

建議繁中主頁名稱：
- HOME → 首頁
- CAD → 製圖
- CAM → 加工
- 3D Toolpath → 3D 刀路
- SIM → 模擬
- 3AX → 三軸
- 4AX → 四軸
- 5AX → 五軸
- 6AX → 六軸
- NC → 程式
- AI → AI 助手
- Settings → 設定

## 2. CAD 一鍵多功能群組改為繁中

正式 CAD 不刪除任何功能，只重新分組。

繁中一鍵群組：
- SMART DRAW → 智慧繪圖
- SMART EDIT → 智慧編輯
- SMART CORNER → 倒角／圓角
- SMART PATTERN → 陣列
- SMART DIMENSION → 尺寸
- SMART SNAP → 鎖點
- SMART PHOTO → 圖片校正
- SMART FILE → 檔案

互動規則：
- 短按：使用目前／最近一次子工具。
- 長按或展開：顯示完整子工具。
- 最近使用的子工具固定顯示在群組按鈕上。
- 手機以抽屜／浮動工具盤顯示；桌面可同時提供快捷鍵。
- 所有子功能仍必須有獨立 Button-ID、Shared Command、Core callback 與狀態回饋。
- AI 可調整群組順序，但不可隱藏或刪除功能。

## 3. AI 自動生成正式 RGB 主頁與副頁

AI 不是只在缺圖時補頁，而是正式 UI/UX 生成器。

每一個新增功能頁與副頁，由 AI 根據以下資料自動生成：
- 功能 inventory
- Authority 圖與已核准 RGB 視覺
- Button-ID manifest
- Shared Command contract
- Runtime state
- 裝置尺寸與方向
- 危險操作等級
- 使用頻率與情境

生成後必須遵守：
- 黑底 `#020407`
- Panel `#07111B`
- AIG RGB 幻彩 Glass：Normal / Pressed / Selected / Disabled / Alarm
- 與父頁相同的品牌、字體層級、邊框、發光、陰影與間距語言
- 手機／平板／桌面自適應
- 三軸～六軸大型加工視窗維持主要視覺區 65%～75%
- 危險操作與一般操作分離
- 不得把整張 Authority 圖當假 Runtime
- 不得 fallback 到工程殼、debug panel、test dashboard、placeholder
- 缺少功能時顯示正式 RGB 的「尚未可用／受限」狀態，不可跳工程殼

## 4. AI 自動排版必須有穩定規則

為避免 AI 每次更新都把頁面重新洗牌，新增 Layout Lock：
- 每頁有 `Page-ID`
- 每個區塊有 `Panel-ID`
- 每個按鈕有穩定 `Button-ID`
- AI 只能在允許的 layout zones 重新排列
- 已核准 Authority、主加工視窗比例、危險控制位置不得自行改動
- 純排版優化不得改 command mapping
- AI 重新排版後必須產生 layout diff 與 runtime screenshot evidence

## 5. 建議新增的正式功能頁

### 刀具與加工資料
- 刀具庫
- 刀具管理
- 刀柄／刀套
- 刀具組裝
- 刀具幾何
- 刀號與 H 補正
- 磨耗補正
- 刀具壽命
- 進給／轉速資料庫
- CAM 刀具指派
- 一鍵套用刀具加工參數

### 工件與夾具
- 工件設定
- 毛胚設定
- 虎鉗／卡盤／壓板
- 夾具庫
- 組裝
- 禁入區
- 干涉／碰撞參與
- 夾持方向與安全高度

### 機台與座標
- 機台設定檔
- 三軸／四軸／五軸／六軸配置
- 行程與軟限位
- 機械原點
- 工作座標 G54～G59
- 旋轉軸方向／零位
- 運動學參數
- Fanuc 相容設定
- 自訂 M-code

### 系統與顯示
- 顯示設定
- RGB 幻彩效果
- HUD 密度
- UI 縮放
- 大型加工視窗比例
- Grid／Origin／Axis 顯示
- Toolpath／Stock／Fixture 顯示
- 透明度
- PBR 品質
- 相機行為
- Renderer backend
- GPU 3D policy
- FPS Auto / 120 / 90 / 60 / 30
- Quality
- Power／溫控
- S Pen／鍵盤快捷鍵
- Local-first／AutoSave／Recovery
- Google Drive 同步

## 6. 建議加入「功能很多但畫面仍乾淨」的四個系統

### 6.1 命令搜尋
提供正式 RGB「命令搜尋」：輸入「圓」「刀具」「G54」「五軸」「補正」即可跳到對應功能或頁面。

### 6.2 我的最愛
使用者可把常用功能固定到首頁、CAD、CAM、NC 或軸頁的快捷區，不修改原完整功能樹。

### 6.3 最近使用
自動顯示最近使用的 5～10 個工具／加工策略／NC 功能，減少重複展開選單。

### 6.4 情境工具列
AI 依目前選取物件與工作狀態只顯示相關功能，例如：
- 選到圓 → 半徑、直徑、偏移、陣列
- 選到刀路 → 進給、深度、方向、Safe-Z
- 選到 NC 行 → 編輯、錯誤、3D 定位、單節執行

情境工具列只能新增捷徑，不得移除完整功能入口。

## 7. 建議加入「一鍵工作流」

除一鍵多功能按鈕外，增加真正的多步工作流快捷操作：
- 一鍵：CAD 圖形 → CAM 外形刀路 → SIM
- 一鍵：選孔 → 鑽孔策略 → G81/G83 → SIM
- 一鍵：NC 程式 → 解析 → 3D 刀路 → 材料移除
- 一鍵：工件＋夾具 → 碰撞檢查
- 一鍵：刀具 → 推薦 Feed/Speed → 套用 CAM
- 一鍵：錯誤行 → 定位 → AI 說明 → 建議修正

任何一鍵工作流都必須保留預覽／確認；CNC 真機輸出仍經 Safety Gate，不得一鍵繞過。

## 8. 建議加入工作區預設

同一功能允許不同資訊密度：
- 精簡模式：常用操作＋大型視窗
- 標準模式：正式預設
- 進階模式：完整參數與分析
- NC 專注模式：G-code＋3D＋錯誤
- 模擬專注模式：大型 3D＋播放／碰撞／材料移除

這些都是同一套正式 RGB UI，不得切換到另一個工程介面。

## 9. 建議建立繁中術語字典

建立單一 `zh-TW` 術語來源，避免不同頁使用不同翻譯，例如：
- Toolpath = 刀路
- Stock = 毛胚
- Workpiece = 工件
- Fixture = 夾具
- Holder = 刀柄
- Offset = 補正／偏移（依情境固定）
- Work Coordinate = 工作座標
- Machine Coordinate = 機械座標
- Single Block = 單節
- Dry Run = 空跑
- Block Skip = 單節跳過／選擇跳過（正式術語需統一一次）

UI 不得自行生成多種同義翻譯。

## 10. 建議加入設定檔與跨裝置同步

使用者的以下 UI/工作習慣應可保存：
- 我的最愛
- 最近使用
- CAD 常用工具
- CAM 常用策略
- 刀具庫
- 顯示密度
- HUD
- FPS
- 相機預設
- 鍵盤／S Pen 快捷鍵
- 工作區模式

Local-first 保存，再依既定 Google Drive revision + digest 規則背景同步；衝突不得自動覆蓋。

## 11. AI 生成品質 Gate

任何 AI 新生成頁／副頁必須同時通過：
- 繁中顯示名稱 Gate
- RGB Design Token Gate
- Authority／Layout Lock Gate
- Button-ID Gate
- Shared Command Gate
- 真 callback Gate
- responsive Gate
- no-engineering-shell Gate
- no-placeholder Gate
- dangerous-action separation Gate
- screenshot evidence Gate

AI 可以自行設計，但不能自行降低功能、精度、安全或產品身份。

## 12. 執行狀態

本文件只入庫規格，不啟動 UI/UX 施工。

狀態維持：`SPEC_LOCKED / WAIT_EXECUTION`

只有在使用者再次明確下達「執行／啟動」後，才開始依此文件與 parent spec 生成正式繁中 RGB 主頁／副頁與功能連接。