# AIG V87｜Manus 外部原型接收區（隔離施工）

## 已確定來源
- Manus 任務：[MASuqJksfKEaHGqz7yFXi8](https://manus.im/app/MASuqJksfKEaHGqz7yFXi8)。
- 使用者回報完成；已在連接的 Manus 瀏覽器分頁讀到「任務已完成」及交付清單。
- Manus 回報：11 個頁面／路由、四個軸頁的 MACHINE 與 NC-FIRST、6AX 大型工作視窗、手機與桌面截圖、`node --check app.js`／`server.js` PASS。
- 此回報**不等於**已接入 AIG 真核心，也沒有 Manus 原始碼進入 GitHub 正式站。

## 待接收的來源檔案
請從 Manus 任務的「查看此任務中的所有檔案」下載**完整原型專案 ZIP**（連同 `public/` 目錄），不要只傳圖片。

接收後在**隔離目錄**解壓，逐項核對：

| Manus 原型來源 | 比對用途 |
|---|---|
| `index.html` | 十一頁的 DOM、焦點順序、語意與獨立工作模式 |
| `app.js` | 真按鈕是否有狀態改變、假訊號、缺失回呼 |
| `styles.css` | 3840×2160 RGB 風格、手機自適應、無遮擋 |
| `plan.md` | Page ID、Subpage ID、Button ID、Command ID、Callback 映射 |
| `TODO.md` | 原型待辦與未通過條件 |
| `public/manus-routes.json` | 11 route 清冊 |

Manus 任務中的這些檔案目前提供**任務頁私有預覽連結**，而連線工具只能讀取頁面摘要，不能取得原始檔位元組。禁止自行捏造內容或用圖片冒充原始碼。

## 整合原則
1. AIG 原正式 Render 網站 `aig-dual-formal-runtime.onrender.com` 為唯一正式發布位置；原型必須先進 staging／隔離目錄。
2. Windows 正式 RGB 為主，手機觸控重排；CAD 和 6AX 依使用者各自核准的圖片 Authority，不互相挪用。
3. 既有正式 84 個 Button ID 契約於施工分支 `aig-web-v69-photo-to-finished-part/formal-web/runtime/v68-button-layout-contract.json`；**外部原型自己的 ID 只能對照，不得以新 ID 默默替換真實回呼**。
4. 任何 UI 渲染都不得隱藏真實錯誤或掩蓋危險控制。正式 Runtime 核心、原有 CAD/CAM/SIM/NC 工作資料不可由原型覆蓋。
5. CNC 真機輸出、0.001 mm 工程證據、真材料移除、碰撞、NC 後處理，需要 AIG 原始核心另外驗證，不能採用 Manus 原型中的模擬成功狀態。
6. 禁止匯入不明遠端 script、敏感 Token、WebSerial / 裝置輸出介面；未審查腳本不可在正式站執行。

## 階段與 Gate
- **V87-A 外部成果識別：已建立 manifest。** `handoff-manifest.json`；Manus 來源檔**尚未取得**。
- **V87-B 素材與程式接收：BLOCKED**，待原型 ZIP／來源。
- V87-C 靜態與安全檢查：`node formal-web/integrations/manus-v87/intake-check.cjs --strict`。
- V87-D 逐頁 Windows/手機 RGB 比對 + 11 route + stable Button ID 映射 + callback 實測。
- V87-E 單頁隔離整合（AI／6AX 擇一），再做其他頁；不直接以原型整包取代 `mobile-runtime.html`。
- V87-F 瀏覽器測試、CAD→CAM→SIM→NC 回歸與 CNC 安全 Gate；全部 PASS 才由正式 Render 部署，隨後分別建置 APK／EXE。

**目前 V86 正式站持續 LIVE，V87 尚未發布。**
