# AIG FastModel 7.16｜主程式外資產庫 + 人物/建築/地圖/場景/轉場共用

2026-10-23（Asia/Taipei）。使用者要求將人物、建築、地圖、場景與轉場自動整理、儲存、重用；避免主程式塞滿圖檔與 GLB 拖慢載入。同時此前核准的 One-Image Auto 2.5D / 3D / 敘述動畫，**依舊列入後續技術，不以此資產庫假充動畫能力**。

## 7.16 實作（不是只列規格）
- `aig-external-asset-library-7-16.mjs`：FastModel browser IndexedDB `aig-fastmodel-library-7-16`，有 `assets` (類別與輕量索引) + `payloads` (SHA-256 content addressed Blob) + `meta`。人物、建築、地圖、場景、轉場、環境、動畫分類。每檔64MiB、總 1GiB、最多12000 索引，超額拒絕，不隨意刪除原檔。上傳時 byte digest 去重、多場景引用同一 SHA 只存一次 Blob。首頁僅載入 metadata，真正 GLB/PNG/JSON/MP4 只在使用者指定時取回。
- 素材學習/重用**明確為索引、標籤、核准和使用歷史**，只有 `approve(reviewed:true)` 後才有 tag reuse suggestion；所有原始 Blob 不變，不替換核准的真 Authority、不暗中 ML retrain，也不把測試假人偶升格成真 1:1。
- `asset-library-studio.html/mjs`：可直接使用的新 UI，繁中 RGB 深色版、檔案分類匯入、SHA、已審核素材查詢、人工核准、重用建議、手動取回單檔；管理容量與必要時要求瀏覽器 persistent origin storage。支援的桌面 Chromium 在**使用者授權** `showDirectoryPicker()` 後可把勾選素材備份到所選目錄中的 `AIG_FastModel_Library/{category}/{sha}.ext`，含 source-manifest.json，未授權不得寫入電腦任意資料夾。
- `aig-native-asset-library-7-16.mjs`：Node/Windows 原生外部 user-data adapter。Windows 用 `%LOCALAPPDATA%\AIG\FastModel\Library`，Android 本機原生要由 app 提供 `context.getFilesDir()/AIG/FastModel/Library`；原生目錄與 APP 安裝目錄分離。分類資料夾／objects SHA Blob／metadata/manifest.json，原始 Bytes readback SHA 比對、原子更新 manifest、不得指定安裝路徑寫入。**只是 adapters/source：Android APK/Windows EXE 主程式橋接尚未驗證或發布**。
- 自動儲存已接 7.15 女主角 GLB／7.12 場景 GeoJSON 地圖 JSON／現有真動畫錄影影片三條來源，只有完成可下載輸出之後 best-effort 入獨立 browser 資產庫。儲存失敗不影響既有下載、CAD/CAM/NC 或影格驗證；新素材預設 unreviewed。
- 修改 `build.mjs` 的本機離線 build，新增獨立 bundle/HTML；主 FastModel `index.html` 導航增加素材庫入口，但**不能因為導航而稱 Render 已上線**。

## 性能及正確界線
- 主程式 APK／EXE assets 在正式接入後不需要打包使用者資料，降低安裝包容量、更新成本、啟動時初始載入時間；內容 SHA 減少磁碟重複。
- **絕不能宣稱存放位置能降低已載入模型本身的三角面渲染、GPU VRAM 或動畫 CPU 工作量**。這需要 Real3D 1.6–1.8 GPU buffer/instancing、runtime unload/LRU 和場景按需啟動策略。
- Web 專用 IndexedDB 是瀏覽器 origin 儲存，不是真實可隨意指定 Windows AppData/Android 任意檔案系統路徑；使用者可能清除網站資料，故提供下載與實體備份，要求 persistent 仍不保證跨裝置永久儲存。
- AI「自動學習」此階是**已審核素材索引/重用歷史**，非重新訓練神經網路；絕不偷偷改已核准來源、也不自動刪素材。
- 缺少 Native host wiring、正式 Render diff 審核及 Google Drive 同步 Gate 時，不可把 Web 與 APK/EXE 當完成一致版本。

## Gate
- 新 Node：`tests/aig-asset-library-7-16.native.test.mjs`，覆蓋 Windows/Android userdata root、不在程式安裝目錄、華文名稱、SHA 去重、原始檔讀回驗證與非法源防護。
- 新 Chrome 真手機 viewport＋desktop：`tests/aig-asset-library-7-16.real-browser.mjs`，驗證人物、場景、地圖三種資產，重複二進位只儲存一份、重新開頁後仍能見索引、未核准不得重用、使用者核准後只記錄重用、按需下載 SHA 不變。這種測試為瀏覽器而不是 Android/Windows 原生 benchmark。
- 保留原 7.13 真毫米 XYZ / 7.14 色彩深度 / 7.15 骨架草模 / 1.6–1.8 GPU / 1.3 G0-G1 NC Core 既有 Gate。
- [PR #35](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/35) verification branch `verify/fastmodel-external-asset-library-7-16-20261023`；Actions [#39847425457](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39847425457) 建檔時尚未完成，**不能聲稱整套 PASS**。後續只針對實際 RED 修復並更新此斷點。

## 下一個技術升級
- 真 Android host / Windows 桌面 runtime 連接此 app-data adapter（保留局域網 / Drive revision+digest，不自動覆蓋來源）。
- 可淘汰的二級 GPU thumbnails/decoded mesh LRU cache、可釋放一次性場景 GPU buffer，與原始永久資產分開；這些尚未宣稱完成。
- Real3D 人物／建築／地圖／場景／轉場共享清楚的 Authority/Working/Derived 分層。依使用者已核准，後續才接「單圖 → 2.5D/3D → 文本動作 → 動畫」的實際編輯流程，不使工程殼取代正式 RGB UI。
