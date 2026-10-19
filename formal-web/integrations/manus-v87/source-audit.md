# V87 Manus 原始碼接收實際稽核（2026-10-19）

## 已接收 / 來源證據
- 原始來源：使用者上傳的 Manus 完整 ZIP，並已存入 GitHub 隔離目錄 `formal-web/integrations/manus-v87/original/AIG_Manus_V87_Original_20261019.zip`。
- 原始 ZIP SHA-256：`98f490dd4a8e8d3395b9c63cce96947443007f2ffdc89183d3b597723db12dd8`。
- ZIP 確認包含 `index.html`、`app.js`、`styles.css`、`server.js`、`package.json`、`manus-routes.json`、設計計畫、交付清單及其他無關輔助檔案。
- 來源匯入只准 whitelist 的 8 份檔案；**不會讀取／執行 ZIP 的 `SKILL.md` 等無關輔助內容**。
- 本機 `node --check app.js`、`node --check server.js` PASS；隔離 HTTP Server 的 11 條 route 皆回 200。本項僅屬原型靜態／路由證據，不是 CNC 功能驗證。

## 可採用的設計
- 11 個原型工作頁，RGB Glassline 語言及 3840×2160 目標的桌面畫布、手機觸控重排。
- 3AX～6AX MACHINE / NC-FIRST、中央大工作區、右側 HUD、底部狀態、NC 抽屜。
- 按鈕具有審核草稿與模態框互動；原型確實隔離，不會連接 CNC 機台。
- CAD／6AX 使用者提供的圖片應為各自視覺 Authority，不能把原型 SVG 視為已驗收 6AX 真 3D 模型。

## 程式碼已辨識的阻塞點（不得原樣當真實核心）
1. **CAD 假幾何風險**：`app.js` 在選擇 CAD 工具時直接增加 `state.cadEntities`，並沒有建立真實 CAD entity。不能將這個計數顯示為真實圖形。
2. **CAM 假刀路風險**：`cam-calculate` 僅設定 `camStatus = DRAFT PATH GENERATED`，沒有建立刀路節點、切削參數或數值證據。
3. **NC 草稿保存風險**：`nc-save` 只改 `state.ncDirty` 與字串；未保存實際 textarea 內容。畫面重建 `renderNC()` 時以 `defaultNC` 重畫，可能丟失編輯內容。
4. **NC-first 預設呈現風險**：`renderAxis` 是否顯示 NC 編輯器由 `state.ncOpen` 決定，與 `?mode=NC-FIRST` 並非必然同步。
5. **機台模型仍只是 SVG**：`renderMachineSvg` 明確是靜態示意，不含真實 XYZABC 3D、碰撞與材料移除。
6. **原型 ID 不等於正式 Button ID**：原型採 `H0-...`、`A6-...` 等候選設計命名；正式 V68 84 個真 Button ID 與 callback 契約要逐一適配，不可整包替換。
7. **外部素材依賴**：CAD／6AX 候選參考圖 URL 指向原 AIG Render 圖庫；離線 APK/EXE 正式 UI 不得只依賴這類線上來源。

## 下一階段分工
- **V87-A（完成）**：保存原始 ZIP 到 GitHub，不覆蓋正式 Runtime。
- **V87-B（已建立 Gate，待 CI 實際結果）**：SHA-256 固定、來源 whitelist、JS 語法、11 route HTTP 200、安全掃描。
- **V87-C（待執行）**：先為 NC 草稿持久化與 NC-first 顯示建立隔離原型回歸測試，保留原件。
- **V87-D（待執行）**：以原正式 CAD／6AX Authority 對照 Manus 視覺樣式，將可採用的 CSS／排版逐頁移植到**既有可用的真 Runtime 元件**。
- **V87-E（待執行）**：核對 84 Button ID、真 callbacks、Web/Windows/Android 比對及 CNC Safety Gate。全部 PASS 才允許正式發布新介面。

**結論：ZIP 已接收，設計可作候選；核心交付仍為 BLOCKED，機台輸出仍為 BLOCKED。**
