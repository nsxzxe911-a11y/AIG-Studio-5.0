# Real3D 極速 V93｜四類生物共用「真骨架＋來源表面＋物理附著」引擎

日期 2026-10-24；隔離研發 Draft。承接 V92 的來源骨架全／半包覆與接觸 V91 球體物理，**不能以貼圖平移代替有深度的幾何、皮膚、羽毛與魚鰭運動。**

## 一套引擎、四類結構

| 生物族 | 引擎中承認的真來源結構 | 載入方式 | V93 的真正範圍 |
| --- | --- | --- | --- |
| HUMAN | SKIN_PATCH, GARMENT | 經來源 SHA 綁定的 3D 三角面、關節和 root-pin | 真 3D 布料片隨骨架移動，彈性鉸接；不是整件衣服 FEM |
| QUADRUPED | FUR, SKIN_PATCH | 身體來源骨架＋來源毛簇幾何與附著點 | 真 3D 毛束動態鉸接；不等於百萬根毛髮流場 |
| BIRD | FEATHER | 翅膀關節＋原始羽片三角面及基部固定點 | 源三角面飛羽隨骨架＋阻尼彎曲；尚未驗證實際飛行氣動 |
| FISH | FIN | 柔性來源骨架＋來源魚鰭三角面根部 | 流體速度可驅動魚鰭鉸接，未模擬真 CFD、水流耦合與薄膜變形 |

**四種名稱只是資料契約；引擎不因名稱就自行生成假人體／假狗／假鳥／假魚。** 未提供原始 3D 幾何和 source-authored rig/weights/attachment manifest 則正式模型一律 BLOCK。

## 新增程式及演算法

- `aig-real3d-biomechanical-attachments.mjs`：來源 joint matrix 親子繼承、root pin、每點變形權重 0..1，皮膚／衣物／毛簇／羽毛／魚鰭都由同一套模組處理。全部原始 XYZ、indices 不可更動；GPU 更新僅限 working copy。
- **Secondary angular dynamics**：綁定關節的 3D 支架鉸鏈，由使用者提供來源 `bindPivot`、`hingeAxis`、`flexDirection`、質量慣量、彈性剛性／阻尼／限制角。外界有明示的 wind/water velocity 時產生轉矩，關節本身的世界加速度也產生慣性轉矩。以有界固定小步積分；不能說是電影級布料、羽毛或流體模擬。
- **FULL_WRAP / HALF_WRAP**：骨架、root pins、secondary physics 同步計算。HALF 只允許略過當前不可見的完整來源 3D chunk 繪製，不能凍結未顯示的關節。BVH 自動視角推斷尚未與 V93 展示頁打通，不能宣稱裁切效能已測。
- `aig-real3d-four-species-film.mjs`：V92 真 indexed 3D actor、V93 真來源 3D attachment、V91 真球體在同一場景逐影格 GPU 渲染，提供 WebM 原生錄製通道。不是 2D billboard、UV 幻術或圖片平移。
- **來源與限額**：單一 V93 batch 最多 32 個來源 attachments，明示材質源 vertices/faces 與 0 變形 root；失配來源 SHA、非正交 hinge、無固定根、重量不合法或超限的材質直接 FAIL。

## QA 可追溯

- `aig-real3d-v93-qa-fixture.mjs` 有四種測試結構，全部用來源明確標示的 **NONHUMAN synthetic QA** 曲面；測試毛／羽／衣／魚鰭的一致程式，而非把程序性模型充當真的逆向生物掃描。
- Source tests：檢查原始 source JSON 及 indices 不變、真關節固定根、外部流速會影響來源 tip、四物種共用引擎、HALF 與 FULL 相同完整骨架、GPU 緩衝只做原始頂點 working copy delta。
- Chromium real GPU：固定 640×640 indexed XYZ 原生 GPU PNG SHA，真 3D actor + flexible source surface + moving ball 同畫面；不允許增加原始 VBO/index 全上傳；不以失敗的 download UI 事件作為 GPU 失敗證據，直接讀取真 Blob bytes 驗證 PNG/WebM。
- **來源回歸**：V92 既有 Chromium Browser 失敗根因為 V89 PNG 已真實建立後「下載事件」逾時，故 V93 修改回歸測試改為驗證真正由 GPU/MediaRecorder 產生的 Blob byte、PNG header、解析度與 SHA，絕不放寬 native pixel readback。

## 正式阻擋

沒有取得經授權的真人／動物高密度掃描與具實測標定的骨架權重，因此人體、四足動物、鳥類、魚類 **外觀真實度、解剖精確、照片 1:1、毛羽大量高密度表現、衣服穿模／自碰撞、真肌肉 FEM、流場 CFD、電影 1080p60／4K、完整音樂配音／字幕／MP4、雙平台 APK/EXE、實機 CNC 安全**全部仍為 BLOCK。

本 PR 不合併、不部署原 Render 網站；不更換 RGB HOME，也不修改正式 AIG-II／AIG Studio 5.0 CNC runtime。
