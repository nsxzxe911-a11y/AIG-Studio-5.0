# AIG RGB 手機 / 電腦雙母版與全層級副頁自適應規格

Status: `SPEC_LOCKED / WAIT_EXECUTION`
Scope: AIG-II + AIG Studio 5.0
Purpose: 鎖定手機版、平板/橫向版、桌面版的正式 AIG RGB 幻彩 UI/UX 生成規則；此文件只入庫需求，不從本 commit 自動開始施工。

## 1. 雙版產品規則

手機版 UI 與電腦版 UI 可以不同，但必須屬於同一套 AIG RGB 幻彩正式產品設計系統，不得形成兩套不同產品感。

允許差異僅限於：
- 版面配置
- 按鈕密度
- 工具列展開方式
- 面板停靠方式
- 手勢 / 觸控 / S Pen / 滑鼠 / 鍵盤操作方式
- 同一功能在不同尺寸下的容器與排列方式

禁止：
- 手機是正式 RGB、桌面變工程殼
- 桌面是正式 RGB、手機副頁變普通表單
- 任一層進入 runtime shell / debug panel / placeholder / engineering shell

## 2. AI 自動生成範圍

AI 必須能依正式母版自動生成與排版：
- 主頁
- 副頁
- 副頁的副頁（孫頁）
- 對話框
- 設定頁
- 刀具頁
- 機台頁
- 參數頁
- 編輯頁
- 檢視頁
- 浮動面板
- 抽屜 / 托盤
- 側欄 / Inspector

所有生成結果必須遵守：
- 黑底 `#020407`
- Panel `#07111B`
- RGB 幻彩玻璃風格
- 正式 AIG Header / Navigation
- AIG RGB Glass：Normal / Pressed / Selected / Disabled / Alarm
- 正式資訊卡與警示樣式
- 繁體中文顯示名稱（CNC 標準代碼例外）
- stable Page-ID / Panel-ID / Button-ID
- Button-ID -> Shared Command -> Runtime/Core -> Result/Status
- 禁止假按鈕、整張圖片假 Runtime、工程殼 fallback

## 3. 全層級視覺繼承

每個主頁、子頁、孫頁、浮動面板、彈窗、側欄、設定頁都必須自動繼承母版的：
- 配色
- 字型
- 邊框
- RGB Glass 狀態
- Header
- 主導航
- Panel 樣式
- HUD
- 錯誤 / 提醒風格
- 安全操作分區
- 產品身份與繁中術語

不得出現：
- 主頁正版 RGB，副頁普通表單
- 副頁正版 RGB，孫頁工程殼
- 白底 / 灰底通用管理後台
- debug dashboard 取代正式 UI

## 4. 響應式三層母版

AI 生成頁面時必須至少支援三層：

### A. 手機緊湊版
- 觸控優先
- 群組化
- 抽屜化
- 分頁化
- 多功能按鈕收納低頻子命令
- 危險操作獨立區

### B. 平板 / 手機橫向版
- 主視窗優先放大
- 工具與狀態區縮至側邊或底部
- 3D / SIM / 3AX / 4AX / 5AX / 6AX / NC 主視窗優先

### C. 桌面完整版
- 多面板
- 側欄可停靠
- Inspector / Properties 常駐
- 工具列可同時顯示更多功能
- 快捷鍵 / 滑鼠優先
- 4K 版面完整專業化

## 5. 手機翻轉與自適應

手機必須支援：
- 直向
- 橫向
- 即時自動切換排版
- 依解析度、比例與方向重排內容
- 1440×3088 基準
- 1080×2316
- 720×1544

翻轉後：
- Button-ID 與 command 不變
- 狀態不丟失
- 未完成 CAD/CAM/NC 編輯內容不丟失
- 3D 相機與加工狀態不應被初始化
- 危險鍵位置需保持明確分離

## 6. 按鈕自動排列規則

AI 排版不得亂排，優先順序固定：
1. 主要工作流功能
2. 當前情境最常用功能
3. 次要設定功能
4. 進階 / 低頻功能
5. 危險功能獨立區

### 手機
- 群組化
- 抽屜化
- 分頁化
- 常用功能置前
- 情境工具列
- 多功能按鈕收納子命令

### 桌面
- 主工具列
- 側欄
- Inspector
- 可停靠 Panel
- 快捷鍵
- 右鍵 / 情境選單

任何排版都不得因空間不足刪除功能。

## 7. 主視窗優先規則

3D / SIM / 3AX / 4AX / 5AX / 6AX / NC 頁面：
- 主加工 / 3D 視窗永遠優先
- 手機橫向主視窗建議 65%～75%
- 控制 / Axis / Playback 約 25%～35%
- Authority / status 卡不得壓縮主要加工視窗
- 其他按鈕與參數區在空間不足時自動折疊、停靠、抽屜化，而不是縮小主視窗到不可用

## 8. 固定正式導航骨架

所有裝置都必須保留：
- 正式 AIG 標頭
- 主導航
- 主要工作區
- 狀態 / HUD
- 錯誤 / 提醒區
- 安全控制區

骨架可因尺寸重排，但產品身份與正式 RGB 風格不可消失。

## 9. 母版繼承規則

AI 生成任何新頁前，必須先判斷所屬正式頁系統，並套用對應母版：
- CAD 子頁 -> CAD 母版
- CAM 子頁 -> CAM 母版
- 3D / SIM 子頁 -> SIM/3D 母版
- 3AX 子頁 -> 3AX 母版
- 4AX 子頁 -> 4AX 母版
- 5AX 子頁 -> 5AX 母版
- 6AX 子頁 -> 6AX 母版
- NC 子頁 -> NC 母版
- AI 子頁 -> AI 母版
- 系統設定 -> Settings 母版
- 刀具 / 夾具 / 機台設定 -> 對應正式功能母版

## 10. 手機 / 電腦雙母版系統

每個正式主頁至少必須有：
- Mobile Master
- Desktop Master

必要時另有 Tablet/Landscape Master。

副頁與再副頁不得從零隨機生成；必須從所屬母版衍生，保留：
- Page identity
- Design tokens
- Navigation semantics
- Command bindings
- Safety hierarchy
- Responsive rules

## 11. 接受標準

任一主頁 / 副頁 / 孫頁只有同時滿足下列條件才算完成：
- 正式 RGB 幻彩 UI
- 繁體中文顯示名稱
- Mobile / Landscape / Desktop 適配
- 翻轉後狀態與內容不丟失
- 按鈕自動排列合理
- stable Button-ID
- 真 callback / Shared Command / Core
- 主視窗優先規則成立
- 無工程殼
- 無 debug panel
- 無 placeholder 假功能
- 無整張圖片假 Runtime
- 有實際 Runtime 截圖 / evidence

## 12. 執行暫停

本文件只鎖定需求。
狀態維持：`SPEC_LOCKED / WAIT_EXECUTION`
只有使用者明確說「執行」或啟動對應自動成品模式後，才開始生成、改 Runtime、跑 Gate、打包或部署。
