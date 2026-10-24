# Real3D V99｜AI 真三維幾何接入、來源證據及原生 4K

日期：2026-10-24。GitHub Draft PR #99，繼承 V98。原 Render RGB HOME、CNC／Fanuc、已定版女主角圖資、Android APK／Windows EXE 全部保持不變。

## 為何 V99 不再生成另一個低階人形

V95～V98 已證實照片線索 → 3D Indexed XYZ 候選 → 視角投影 → 有界頂點修正 → V92 骨架 → 4K GPU 的技術可行性，但 V95 的 3,784 面來源候選不足以等同定版女主角高擬真外型。

V99 引入真正以獨立 AI 模型／掃描／高品質 3D 軟體建立的**原生 GLB 幾何來源**，由 AIG 接收後維持其原始 mesh，不使用 V95 橢球替代，也不靠自動細分、SDF、Metaball 或 Template Morph 冒充照片 1:1。

## 實作結果與技術門檻

- `aig-real3d-v99-native-model-ingest.mjs`：在瀏覽器/Node 22 本地讀取真 glTF 2.0 binary GLB。以 WebCrypto 對原參考圖 bytes 及生成模型 bytes 分別計算 SHA-256，必須與聲明來源一致；真正解析 POSITION／NORMAL／indices accessor，保持原始 face ID 與 triangle count。包含開放邊、非流形、退化面及模型實際來源 bounds 報告。
- 讀取 glTF GLB 必須滿足檔案結構、bin 範圍、accessor 索引及 componentType 的安全驗證。不支持的 compressed/sparse/external buffer、glTF node transform 或材質貼圖真實來源會明示 BLOCK / 未驗證。當前轉入 AIG 場景的只是真幾何及基本材質參數；GLB 內嵌原生骨架/形變 clips 尚未轉換給 AIG Runtime 動畫。
- `aig-real3d-v99-ai-inference-adapter.mjs`：給**已取得本機神經網路模型權重的推論器**正式介面。實際驗證權重 bytes SHA、照片 bytes SHA，呼叫本機推論 provider，再檢查其輸出必須是有效、SHA 正確的 GLB。這支接口自己**沒有附帶已訓練或已獲授權的 ML 權重**，成功運作不等於已裝妥本機生成 AI。測試用假 provider 只證明接口呼叫與防偽機制，不能宣稱真 AI 生成成功。
- 接入 V98 共用來源：PERSON、ANIMAL、SHIP、ENVIRONMENT、CNC_PART 共用 source SHA、原始 node IDs、Asset ID 與真 2D／3D 投影。可送 V96 3840×2160 原生 4K GPU 技術輸出，原始網格不須換回 V95 Proxy。
- 真繁中隔離操作頁：`formal-web/shared-3d/aig-real3d-v99-native-source-lab.html`。上傳原始照片及真 GLB、選資產類型、驗證 SHA、GPU 正／側／背／斜預覽、4K 幾何品質 Gate、真原生 4K PNG 下載。圖片及 GLB 都只在本機瀏覽器讀取，沒有送外部推論服務。
- 自動化 Source 測試使用 V97 既有真正 glTF2 animated binary 輸出為測試輸入，檢查原始 3,784 面 indices / XYZ 不變、雙 SHA、防篡改、五資產共用、V98→V96 4K 接軌。Chromium GPU 亦用合成非真人影像生出真 GLB，再經使用者操作流程匯入真 GPU 渲染，檢驗 3840×2160 PNG 實際像素及 SHA。測試資料**不是**已定版女主角高擬真 GLB。
- Source Gate + Chromium GPU Gate 都須實際 PASS 才能稱 V99 技術原型 PASS；若 FAIL，不應合併或部署。

## 下一個必要條件：本機已授權 AI 模型本體

V99 是**真正模型的來源與推論適配層**，並非神經網路推論權重或 AI 影像生成內部隱藏 feature tensors。不能存取 ChatGPT 影像生成功能的私有模型權重，也不能把設計圖當成已有 XYZ。若要一張肩部照片直接輸出逼真高密度女主角，需要一個已可在指定裝置執行的、合法取得權重的 image→3D 模型及其前後處理接入，先得到真高品質 GLB，再交由 V99 真模型導入與 V98 雙向照片誤差校正。

**維持 BLOCK：** 原女主角身份 1:1、真正高密度 AI 生成結果及權重實機測試、自然臉部／眼髮／布料、UV/PBR HDR、真骨架重綁、實機 60FPS、4K 全片／配音音樂、2:12:08 長片，以及 Windows／Android 發布。定版原圖與原網站不覆蓋。
