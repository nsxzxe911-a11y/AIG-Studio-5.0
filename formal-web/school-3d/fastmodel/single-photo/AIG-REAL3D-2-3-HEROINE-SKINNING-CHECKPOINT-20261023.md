# AIG FastModel Real3D 2.3｜原始照片可見部位真蒙皮 × 骨架動畫 GLB

2026-10-23 Asia/Taipei；從 Real3D 2.2 中文劇本引擎向前做 **實際演算法和正式工作頁功能**，不另畫空白假人偶、不刪 7.13 真毫米雙視相機掃描、7.14 原圖色彩辨識、7.15 頭髮／臉／脖子／獨立衣物網格、7.16 外部素材庫、2.0 地圖場景和 2.1–2.2 原始 CLIP 控制。

## 新增的實際技術

1. `aig-heroine-deform-2-3.mjs`：輸入 7.15 **從使用者已核對 RGB 標籤生成的可見前表面草模** `AIG_FASTMODEL_7_15A_EDITABLE_HEROINE_DEPTH_CANDIDATE`，依 sourceDigest SHA、每個部位原 vertex/UV/原照片 RGB、胸／頸／頭的相對 2D joints，為可見頭髮、臉、脖子、外套、襯衫、裙等獨立三角網格建立 **真 skinIndex/skinWeight 每頂點 4-slot（最多兩關節非零）**。權重正規化總和 1，可接受未核准 7.15 初始 joint hints **只當自動草模**，明列 `reviewRequired`，不強迫第一步手動照四角照片；原照片背面與未看到之腿部不憑空創建。胸→頸→頭軸異常/來源 SHA 錯誤/非有限頂點或權重異常 Block。
2. `aig-heroine-skin-three-2-3.mjs`：正式 THREE `Bone` + `Skeleton` + `SkinnedMesh`，每個原 RGB 材質部位 separate SkinnedMesh 但共用 3-bone chain；`skinIndex`、`skinWeight` 實際進 GPU，骨架 quaternion 在來源三角頂點上產生真 skin deformation。兩個不超過 22° 的候選動畫 `aig23_estimated_head_turn_USER_PREVIEW` 與 `aig23_estimated_head_nod_USER_PREVIEW` 是從使用者相對骨架**程序化生成的小角度動作**；不再冒充來源 GLB 內原有 clip，也不能冒稱自然人體跑跳、AI 物理衣物。
3. 使用者原本的 `metric-stereo-studio.html` 7.15 草模下面增加 **05｜自動生成骨骼蒙皮＋預覽轉頭**、**06｜匯出真 SkinnedMesh 動畫 GLB**、**還原 7.15 草模**。`aig-heroine-candidate-ui-7-15.mjs` 真 callback 接上來源與蒙皮、雙動作 GLTFExporter、7.16 本機 IndexedDB 自動入庫；草模被修改/來源變更即停用舊 rig 的下載且只清 Derived GPU 實體，原圖、7.13 實測面和 7.14 覆核 labels 均不刪。SVG 骨架線不是結果，使用者 WebGL 畫面真 SkinnedMesh 才是結果。
4. `metric-stereo-studio.mjs` 沿用現有 WebGLRenderer OrbitControls、主視窗和 7.13/7.14/7.15 進場 UI；在既有幀更新時對 skin23 AnimationMixer 連續更新；切換回 7.15 或關閉頁面會銷毀 Derived meshes/materials/skeleton GPU，不銷毀原始照片或實測深度。
5. `tests/aig-heroine-deform-2-3.test.mjs` 真實源對照：頂點+獨立 RGB+蒙皮與正規化權重、非法比例、未確認/已確認審核區分、來源變更阻擋、頭頸軸拒絕。影像來源為人工構造技術小測而非真人 approval。
6. `tests/aig-heroine-skin-2-3.real-browser.mjs` + `tests/aig-heroine-skin-2-3.browser-entry.mjs`：Node/esbuild 測試時才建立臨時驗收 harness，真 Chromium phone 390x844 + desktop 1280x900 顯示 THREE 3D 來自獨立 Hair/Face/Neck/Jacket RGB mesh 的 **4 個 SkinnedMesh**，用 Bone quaternion 驅動改變頭髮 vertex，輸出 **GLTF2 Binary** 並使用真 GLTFLoader 重新載入 **4 個 SkinnedMesh + 2 source-labeled procedural clips**。合法合成測試幾何不能叫正式女主角成品；目標是驗證真正蒙皮/GLB export-import 能運作。

## 真 Gate 與目前唯一可信驗收斷點

- 隔離 Draft [PR #40](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/40)，工作區變更仍在 `repair/core-first-fastmodel-20261021`，未整包覆寫正式 Render 原站。
- 第一輪 [#39862231853](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39862231853) 前置 source/Node + 離線 build + Real3D 2.3 **真 Chromium phone+desktop WebGL 渲染/蒙皮變形/GLB 匯出+再讀回均通過**，實際 log 有：`AIG23_REAL_GPU_SKINNED_MESH_RGB_GLTF_REIMPORT_PASS phone 4 0.05870004771055928` 和 desktop 同樣值；之後遇到舊 Real3D 2.1 工作頁的非同步多物件操作測試，在第一個物件完成前就點第二個，報 `1 !== 2`。已在 2.1 舊測試補 `world-new`、world 1-object、2-object **真正寫入 UI proof 後才往下**，沒有關閉測試、沒有只調大 timeout。
- 最新 [#39862476289](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39862476289) 在記錄時仍 queued；未經完成 success 不得稱整套 Gate PASS。另 [#39862476304](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39862476304) source Gate 與 [#39862476310](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39862476310) 修復回歸 Gate 並行，不代表已接 Android APK/Windows EXE。
- **沒有**拿手機 Chrome viewport 當 S23/S23 Ultra 真機 60/120FPS。沒有 Android APK/Windows EXE Release，沒有真正 Render 官方網站上線，也沒有確認 1672×941 使用者核准女主角原圖已完成真正解剖正確蒙皮、1:1 尺寸或物理正確髮束/皮膚/衣物。

## 下一階 2.4 實作重點（尚未寫完）

1. 從 7.15 真 RGB / neck/hair masks 改善可編輯雙骨節甚至手臂蒙皮的 user-reviewed 拓樸與縫隙；不能把照片未顯示的腿自動列為測量真實 3D 人體。
2. 讓 2.3 **程序化來源標籤**的頭部動作與 2.2 中文 `轉頭/點頭` Cue 建立**明確區分**原始 GLB clip vs 使用者允許的 procedural draft，兩者不能偷換；之後才加入 walk/run/squat 需要實際可轉骨節和已檢驗接地，不能直接拿全身平移假冒跑跳。
3. 真機 native Android/Windows 共享 runtime、GLB exporter 及 S23 FPS 實測，Render 正式網站需要逐頁 Authority diff+Dual-Gate 才能交付。
