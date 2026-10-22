# AIG FastModel Real3D 2.0｜人物 × 建築 × 地圖 × 鏡頭轉場共用場景｜來源可信斷點

日期 2026-10-23（台北）；上一個可信 GPU 與素材庫基礎為 Real3D 1.9 + FastModel 7.16，第三專案僅向前增加，共用 AIG-II / AIG Studio CNC 的幾何/來源規則，**不得清除先前正式 RGB Authority／女主角原圖**。

## 2.0 真正已寫入程式

1. `aig-world-scene-2-0.mjs`：單一 `AIG_FASTMODEL_REAL3D_2_0_SOURCE_LOCKED_WORLD_SCENE` 工作文件。可將多個來源 GLB 角色（女主角）、建築、環境、既有場景組成一份場景，個別 source asset ID + exact SHA-256 + part/type、Three XYZ 位置／quaternion／scale、revision，限制最多 12 個物件、48 個鏡頭影格。**LOCAL_RELATIVE** 允許未量測素材做編輯草模；切換到 **MEASURED_LOCAL_METRES** 要求每個 asset 已經人工核准、metric source 與 METRES 單位，不得從人物照片自動憑空取得 1:1 實體公尺。WGS84 僅可作局部近似，不代表測量級圖資。
2. `aig-world-runtime-2-0.mjs`：從 FastModel 7.16 外部資產庫抓取各來源完整 Blob（materialize 時 SHA 校驗）→ 嚴格核對 bytes/media/reference → Three GLTFLoader 真實解析、SkeletonUtils.clone (同來源可重用而不竄改) → 合成真 3D Group → 原 `PhotoViewer` 的**唯一 WebGLRenderer** 交易式提交。中途任何 GLB 損壞、SHA 錯誤、地圖來源不符，都不卸載上一份正常場景；取消晚完成之舊載入請求。原始 GLB/地圖保持 immutable，過渡切換不建立替身假模型。
3. `viewer.mjs` `mountVerifiedWorld()`：在相同 THREE scene 中展開實體 GLB source nodes，渲染是真三角面，而非圖片假 3D；保留來源角色自帶的 GLB 動畫 clip（目前只自動選單一角色的原始來源 clip，不發明新的人體骨架／跑跳）。成功後釋放舊場景 geometry/material/texture/skinned skeleton，而 GPU context 不重複啟動。
4. `aig-scene-map-7-12.mjs` 原版 import 驗證持續沿用。地圖輸出為 **{schema, revision, map:{...}}**，不是一般扁平 GeoJSON；2.0 在 runtime 讀真來源 7.12 snapshot 並檢查座標模式。`scene-runtime-studio.mjs` 新增實際 Point/LineString/Polygon 2D 地圖 Canvas 地面圖資預覽；與 3D 人物、建築共用場景 metadata，不憑空把道路平面外推成已測量的 3D 牆面、高度或 GPS 測量精度。
5. `scene-runtime-studio.html/mjs` 現有 Real3D 1.9 場景工作頁直接擴充 2.0 區塊，可選人物/建築/環境 GLB、選地圖來源、填 X/Y/Z/縮放及是否已人工確認實測比例；按下組合世界即在同一 GPU 工作視窗真實呈現，並**自動保存** source-locked world document JSON 到 7.16 外部素材庫，之後可跨頁重新載入與檢查同一來源 revision。鏡頭關鍵格 LINEAR/SMOOTHSTEP/CUT 可加入、時間軸拖動／Play／Pause，更新 key 不重新解析所有 GLB；移除工作場景只釋放 GPU、不刪外部來源。
6. 1.9 `AIG19SceneRuntime.clearActiveReferenceAfterExternalCommit()` 於 2.0 成功提交後清理舊單 GLB 的活動狀態，避免 1.9/2.0 模型身份不一致；GLB 與地圖 MIME 各依對應 parser，影片/轉場不塞進 GLB。
7. `build.mjs` 沿用 1.9 同一離線 bundle `scene-runtime-studio.js`，不重新製作工程殼首頁，不依賴 CDN。沒有在本次提交 APK/EXE 或部署 Render 正式站。

## 實際回歸 Gate / 已知狀態

- `tests/aig-world-scene-2-0.test.mjs`：角色＋建築＋地圖 SHA 與相對座標、拒絕錯來源、禁止非法 scale／未核准 1:1，真鏡頭時間軸 interpolation/CUT、重複 time blocked。
- `tests/aig-world-scene-2-0.real-browser.mjs`：真 Chromium phone/desktop 同網域外部 IndexedDB 匯入合法技術三角 GLB 角色＋建築與真 AIG712 來源版本的建築 polygon 2D 地圖 → 一個 WebGL renderer 組合 → 場景自動保存 → 兩個鏡頭關鍵格 → 跨頁重新開啟來源圖資 → 破損第三 GLB 應阻擋且維持上一幅 3D → 卸載 GPU 仍保留外部原檔；技術測試三角形**不是核准女主角實際人物**。
- CI 文件 `.github/workflows/aig-shared-real3d-v1-3.yml` 追加 2.0 unit/node check/browser proof artifact，同輪重跑原 1.9、7.16、7.14、Real3D 1.6–1.8 和 NC G0/G1 numerical tests，不應為 UI 施工故意降低核心 Gate。
- 隔離 [PR #37](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/37) `verify/real3d-world-compositor-2-0-20261023`，最後編輯之 check [#39854567894](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39854567894) 在建立本記錄時仍 queued。**程式已提交，但未見完整 CI 成功前不可標整體 PASS**。
- 既有 1.9 [#39851721793](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39851721793) 上次查詢亦 queued，尚不可以升格為正式 Web/Android/Windows 發布基準。

## 不可誤稱

- 不代表任何單一女主角櫻花插畫已完整一比一重建為量測 3D 人體；單照片深度仍僅相對猜測候選，原始圖與 SHA 保留。
- 此版本**有鏡頭真時間軸轉場**，不表示中文敘述直接生成行走／跳躍／說話的 AI 全角色動作（那仍是先前入庫的 2D→2.5D/3D→文本動畫下一個重點）。
- source map 是 7.12 來源驗證的 XY 圖資；不能由人/道路類別推定尺寸，不能冒充測量圖、伺服器地圖，也未自動生成整棟建築的立體 BIM。
- 未測量 Windows/Android 真機 GPU VRAM/FPS，不可把 Chromium phone viewport 當 S23/S23 Ultra 實機 120Hz 驗證，真正的 AppData/filesDir Native 與網站 Render 正式部署仍需各自 Gate。

## 下一階順序

1. 先完成 PR #37 真 Chromium 來源圖資／多 GLB world / 轉場／來源自動保存 Gate → RED 真因只修到 GREEN；不覆蓋當前使用者可用首頁。
2. 續接 AIG 7.12 真地圖 feature geometry XY 到建築 GLB 的使用者校準平面對位（避免臆造真 Z），加場景 actor motion playback 及 clip provenance。
3. 之後執行已入庫的「單張圖 2D → 2.5D 或可編輯 3D 草模 → 使用者敘述動畫」真控制與素材庫整合；跨 Web/Android/Windows 正式核准 RGB 每頁逆向＋雙案 Gate 後才做正式 release。
