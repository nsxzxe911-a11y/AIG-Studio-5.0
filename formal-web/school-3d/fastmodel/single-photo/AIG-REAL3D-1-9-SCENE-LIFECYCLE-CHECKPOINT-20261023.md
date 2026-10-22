# AIG FastModel Real3D 1.9｜單一 GPU 場景、按需載入、RAM LRU、場景切換與資源回收

2026-10-23 Asia/Taipei。依使用者核准的下一技術階段真實施工；**不是只為了升版做報告，也沒有把新工程工作頁取代核准 RGB 首頁**。

## 真正落盤的模組

- `aig-scene-lifecycle-1-9.mjs`：將 FastModel 7.16 的外部 IndexedDB 素材庫接入真 GLB 工作場景。人物、建築、場景、環境 GLB 按需從 sha256 原始 Blob 讀入，庫本身會在 materialize 時重新核對 digest；模型切換用 generation/serialized commit 排除較晚完成的舊請求，壞來源不覆蓋上一個有效畫面。CPU 二進位 LRU 預設 **48 MiB、4 個來源**，可安全清空；不刪原始模型或已核准 Authority。地圖 JSON、影片／轉場不是 GLB，留在各自模組。
- `viewer.mjs`：在原同一個 `PhotoViewer` (Three.js WebGLRenderer) 加 `unloadCurrent()`，工作頁關閉時明確移除當前 model 和動畫；精確去重 dispose shared geometries/materials/textures，以及 SkinnedMesh 的 skeleton/bone texture。不重新初始化整個 FastModel 引擎，未動既有 1.7 GPU governor／1.8 InstancedMesh 開關。原始幾何檔仍在資料庫；`renderer.info.memory` 是 renderer resource count，不是完整 GPU VRAM bytes。
- `scene-runtime-studio.html/mjs`：獨立繁中正式風格手機／電腦 3D GPU 工作區，點擊「按需開啟」才建 WebGL context；可從外部素材庫選擇人物／建築／場景 GLB，真正旋轉檢視，清除 RAM、卸載工作模型 GPU、查看活動來源及 cache/renderer 監控。原素材庫頁保持輕量，HTML 和 JS 不會直接嵌入大量 GLB/影片。
- `asset-library-studio.html`、`index.html`、`build.mjs`：新增正式導覽和獨立離線 bundle。兩個頁面為同一個網站來源，分享 7.16 本機資料索引，但只有 3D 工作頁才建 GPU renderer；沒有新增多個渲染器共同常駐。

## 效能與完整性界線

- 「放到主程式外」改善的是**檔案/啟動體積與磁碟去重**，不是正在渲染之 3D 模型的真實頂點成本。這階用按需載入、二進位來源 LRU 與舊 GPU scene dispose 進一步降低峰值 RAM/資源累積。
- 僅保留一個在此工作頁活動的 GLB scene。不同瀏覽器分頁、不同程序/設備間的 GPU context **尚無跨程序獨占協調**，所以不能宣稱整台手機同時只有一個 GL context。
- WebGL dispose 僅代表要求 Three.js 清理；GPU driver 真正釋放可能延遲，實際 VRAM bytes、Android S23 60/120FPS、Windows GPU FPS **未實測**。
- Android/Windows Native 7.16 user-data adapter 已編碼但原生主程式未接線；本階是 Web+local-first source 修復分支，**沒有部署 Render 正式網站，也沒有生成新的 APK/EXE**。

## 真正驗收方式

- `tests/aig-scene-lifecycle-1-9.test.mjs`：來源不變、綁定單 scene、RAM LRU、cache reuse、壞 GLB 留舊場景、source select 多重競爭避免舊請求覆蓋新、地圖/影片 GLB 路徑 fail-closed。
- `tests/aig-scene-lifecycle-1-9.real-browser.mjs`：Chromium phone+desktop 從真 IndexedDB 匯入合法 GLTF2 A/B 和壞 GLB，載入 WebGL → 切換 → 壞來源維持原 3D → 清 RAM 而保留 B → unload GPU → 導回外部素材庫原三份資料仍在；保留 screenshot/artifact。
- 維持既有 1.3 NC 真數值、1.6–1.8 GPU、7.13 真毫米 XYZ、7.14 人物 RGB/深度、7.15 可編輯骨架、7.16 外部資料庫 Gate。這些 Gate 是防回退，不是 CNC 真機 Gate。
- 隔離驗證 [PR #36](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/36)：第一輪 [#39850317457](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39850317457) **RED**，Chromium phone 真 GLB A 場景已在 WebGL 成功載入，但測試將 UI JSON `cacheSources` 誤寫為 `cachedSources`，導致斷言 `undefined!==1`，並非模型無法載入。已修測試欄位並同步 repair + verification 分支；最新 [#39851496997](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39851496997) 在此檢查點仍 queued。**未看到 completed/success 不可宣稱整套 PASS**。
- 經 7.16 舊 regression [#39848194866](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39848194866) 發現 test 計數等待使用前一項的「已保存」文字，會在新 import IndexedDB transaction 尚未完成時提早進入斷言，造成 2 筆而非 3 筆的假 RED；已調整每次直接等待 `儲存項目 N 筆` 真實更新。記憶體壓力與真儲存完整性仍需最新 Gate。

## 下一個技術焦點（尚未完成）

1. 真正的多場景快取可依 Android/Windows VRAM、溫度、電源與畫質設定調整；場景切換時支援預取下一小片而不預載全場。
2. 地圖 GeoJSON／建築/道路/植被模型綁定真世界比例與本機 scene graph，動畫轉場使用共用 renderer 時仍保留來源 SHA，使用不同模組按需讀取。
3. 與正式 AIG 網站和原生 APK/EXE 的差異合併及手機橫向 RGB 主視窗逐頁真圖片驗收；**不可整個 app.mjs 覆蓋網站，亦不可把網站工程殼當正式 Runtime**。
4. 前一輪核准的 2D→2.5D/3D→使用者敘述動畫與真角色 1:1 多角度掃描仍在待執行技術佇列；不因本次 GPU 場景管理而刪除。

## 最新微升級（同輪，只向前）
- 與活動 GPU scene SHA 完全相同時直接 `ALREADY_ACTIVE_NO_REPARSE`，保留目前鏡頭／動畫姿態，不再重傳同一套頂點至 GPU；額外單元測試已納入。
- 真實 SkinnedMesh 的 Skeleton/bone texture 於結束 scene 時也採獨立集合只釋放一次，避免髮束／骨架動畫切換時累積 GPU 資源。
- 新版來源檔本身以隔離 PR #36 最後一個核對 SHA 為準，不使用早期的失敗畫面當成功證據。
