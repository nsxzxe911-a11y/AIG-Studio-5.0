# AIG FastModel (第三專案) — Real3D 1.7 真 GLB GPU 計時與自適應預覽

驗證斷點：2026-10-23 Asia/Taipei。正式 CNC 手機 3AX Render 網站未動；不重置任何模型、畫布、NC 工作副本或使用者本機檔案。

## 真正交付的源碼（repair/core-first-fastmodel-20261021）
- `aig-glb-gpu-adaptive-1-7.mjs`：只信任 WebGL2 `EXT_disjoint_timer_query_webgl2` **非同步、非 disjoint、有效**的 GPU 毫秒；採 4 階比例 {.5,.65,.8,1} × 原始 DevicePixelRatio（上限 1.5），遲滯與冷卻避免不停跳檔。CPU submit/rAF/FPS 不得觸發 GPU governor。預覽像素比改變不修改 GLB/骨架/貼圖/動作或 CNC。
- `viewer.mjs`：將 1.7 GPU 量測正式接進原 Three.js `PhotoViewer` 的 GLB 動畫渲染 loop；只有來源模型已實際載入、視窗可見、非逐格審核／錄影／外部動作時才可觸發。錄影前關閉自適應並恢復原預覽；不支援 GPU timer 就保持原畫質、不偽造量測。
- `index.html` 與 `app.mjs`：在原 FastModel 5.2 WebGL FPS 頁下新增啟用／停用與 JSON 診斷下載；記錄 browser UA、已載入模型、目前動畫 clip、SHA 如存在、是否支援真 GPU timer、有效樣本／p50／p95／預覽倍率。保留 5.2 原本 240 幀 FPS 錄製與其他功能。
- `tests/aig-glb-gpu-adaptive-1-7.test.mjs`：真 GPU/偽造 CPU 樣本隔離、disjoint 拒絕、遲滯及最大最小品質、120 筆 GPU 觀察視窗。
- `tests/aig-glb-gpu-1-7-lab.mjs`、HTML、Playwright：用 Three GLTFExporter 在 CI 生成**真正 GLTF 2.0 二進位動畫**與 Quaternion Clip，交給 FastModel 既有 GLTFLoader/PhotoViewer 真渲染，檢查 GPU timer fallback、三角面繪製、姿態改變、停用後倍率恢復、原頂點不變。資料是技術立方體 GLB，**不是女主角**；禁止拿它作臉、頭髮、布料、穿模與正式模型核准。
- `.github/workflows/aig-shared-real3d-v1-3.yml`：跑 1.7 Node 與真 GLTF Playwright alongside previous 1.6 GPU memory/1.3 NC-source numeric replay，CI test fixture 以 esbuild IIFE 包出，不發布 synthetic GLB 到正式 Runtime。

## 真實驗證
- Draft source verification PR #28: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/28
- 首輪 CI #39830888125 發現 test fixture 使用 IIFE 不支援的 top-level await，**REJECTED**。僅修正測試包裝方式，未修改 model 或 GPU 演算核心。
- 修正後 [CI #39831083832](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39831083832) **completed/success**：
  - 真 Chromium phone：`AIG_REAL_GLTF2_1_7_GLTF_ANIMATION_GPU_BROWSER_PASS phone gpuTimerSupported=true samples=84`
  - 真 Chromium desktop：`AIG_REAL_GLTF2_1_7_GLTF_ANIMATION_GPU_BROWSER_PASS desktop gpuTimerSupported=true samples=65`
  - 兩平台均是實際 GLB + quaternion animation / indexed WebGL triangles。此 `samples` 為 browser frame callback 次數；不等同有效 GPU timer query 筆數，須查看個別 proof JSON 才能引用真 GPU p95。
  - 1.6 資源管理真 WebGL browser PASS（手機/電腦 G0/G1 Buffer created=2、mesh evictions=11），既有 1.3 G0/G1 數值回歸亦 PASS。
  - 真動畫 1.7 evidence artifact #12448412550。
  - 原生 Artifact ZIP 已取回逐檔檢查：手機 84 個實際渲染 callback 中有 **15 筆**有效 async GPU timer，p95=**48.991295ms**；桌面 65 幀 callback 有 **9 筆**有效 GPU timer，p95=**55.573801ms**。這些發生在 GitHub Headless Chromium／SwiftShader **軟體 WebGL 測試環境**，絕不能稱為真 Android 或 Windows 獨顯 GPU 效能，也不能宣稱比 1.6 快多少百分比。
  - 原測試在 GPU renderer dispose 後才截圖，造成**空白 Canvas 截圖證據缺陷**；真幾何、Quaternion 動畫與 Render draw calls 數值 Gate PASS。已改成先獨立擷取仍在渲染的 WebGL Canvas 再 cleanup；新版 [#39832016004](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39832016004) 已 **completed/success** 並下載 Artifact **#12449815943**，實際打開桌面 PNG 確認 WebGL 立體技術 GLB 可見、非黑畫面；手機同樣通過獨立 Canvas 畫面檢查。
- 完整 FastModel 7.x 專案 regression #39831083940 已有 7/8 個工作 completed/success，僅 7.11 獨立特徵對應 Gate 在 2026-10-23 仍 in_progress；**不能提前標示整套 FastModel 8/8 PASS**。
- 原 Render LIVE branch `web/aig-dual-formal-runtime-20261016` 與本修復 branch 的 `app.mjs` / `viewer.mjs` 大幅分歧。**不得整包覆蓋網頁程式**；以 isolated integration / exact source diff 加入網站，在 LIVE browser Gate PASS 前仍維持現網站版本。

## 明確未通過
- 真實使用者核准人物／動物 GLB 的 GPU 加速 FPS 比較、眼／髮／頭頸外觀、碰撞與正常真人比例；Android/Windows native 60/120 FPS、溫度／GPU 裝置實測、正式 APK/EXE。
- 如果 GPU timer extension 缺席、樣本 disjoint 或失效，1.7 **不會**自動降低 preview quality。
- 不建立任何新的 CNC 真機通信；不能拿 FastModel Real3D 技術 Gate 代替 CNC Fanuc Gate。

## 下一可驗證動作
1. 完成 #39831083940 全部原 FastModel 7.x 回歸；任何 RED 都先排除。
2. 以核准的真 GLB 在 Android/Windows（或真機對應 Chromium）測 GPU 有效毫秒、FPS p50/p95、卡頓比例、畫質切換前後比較，記下裝置條件；合成 GLB Gate 不代表實用速度提升。
3. 保持正式 AIG 網站原版本，先做 branch-by-branch module delta 和原 UI Authority 逐頁 Gate，再部署獨立的新 FastModel GPU 1.7 頁，不跨案覆寫。

## 最新完整截圖 Gate 補充
- 修正版 1.7 Chromium 手機：85 個 UI frame callbacks／15 個有效 `EXT_disjoint_timer_query_webgl2` GPU samples，p95 = 59.385669 ms；Desktop：54 幀／6 個有效 GPU samples，p95 = 66.249576 ms。均是在 GitHub **SwiftShader 軟體後端**，不是原生裝置效能。
- 兩種測試皆將真 GLTF 2.0 動畫 GLB 送入既有 Three.js PhotoViewer，保持 1 個 Quaternion Clip、原 vertex positions 無修改、GLB 來源物件不被替換；資料是技術立方體不是使用者正式女主角。測試來源與截圖可在 PR #28 的 Artifact #12449815943 查核。
- 以後的接續以 **新版視覺及數值 Gate #39832016004** 為可信來源，首輪測試的黑圖不能當作通過證據。
