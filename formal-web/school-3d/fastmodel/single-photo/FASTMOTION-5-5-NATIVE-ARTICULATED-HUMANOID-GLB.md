# FastModel 5.5 — 自研真全身骨架 GLB 與四段動畫（技術人體，不是正式女主角）

## 上一可信斷點
- 5.4.0 GitHub SHA `bb97e06d5c0a1d3773c8cbfd10c2d93090ce8bc4`，Push Run `39526017791` completed/success。
- 自此只向前升到 `5.5.0`。保留 4.0～5.4 完整來源證據、PR #12 Draft、RGB UI、台詞/劇情/音效/音樂與影片錄製功能。

## 本輪完成的程式功能
- 新 `aig-native-humanoid-5-5.mjs` **完全由 AIG 程式本機生成**真正 glTF 2.0 binary GLB，不需要外部模型供應商、付費 API、CUDA/GPU 生成模型或第三方圖片資料庫。Three.js 作為 GLB 回讀與預覽引擎，不依賴第三方遠端 3D 生成服務。
- 需完成既有 4.0 自研輪廓來源及 5.4 的原始照片＋GLB 檔案 SHA 核對，才能開啟 5.5 生成按鈕。使用 4.0 `scaffold.json` 的 `sourceSHA256` 與實際測得的全圖 silhouette width/height ratio 約束整體人體橫向比例。
- 17 個實際 Skeleton bone：hips、spine、chest、neck、head、左右 upper arm/forearm、左右 upper/lower leg/foot、ponytailRoot/ponytailTip。
- 人體技術外觀是 **可辨認的 3D 軀幹、頭頸、雙臂、雙腿、雙腳、馬尾**，而不只是照片平面或背景景深位移。模型建立 index triangle meshes、normal、COLOR_0、JOINTS_0、WEIGHTS_0、skin inverse bind matrices、父子 skeleton、四段實際 quaternion rotation clips。
- 四段 GLB 動作：`AIG55_TURN_HEAD`、`AIG55_NOD_HEAD`、`AIG55_WAVE_LEFT_ARM`、`AIG55_PONYTAIL_SWING`。皆為真正蒙皮動畫，不是影片循環或單純移動相機。
- 前端 RGB Button ID `aig55-build`、`aig55-report`、`aig55-status`。生成後下載真正 GLB；用原 `parseRiggedGLB`/GLTFLoader 回讀並執行既有 `auditAIG50FullBody` 骨架變形檢查。結構合格的技術模型可載入既有 3D 播放器，讓 5.1、5.2 繼續在 *相同模型來源 SHA* 做動畫接縫及瀏覽器 FPS 檢查。
- 真來源與模型 SHA、17 骨、4 Clips、50 Gate 原始報告及限制可另下載 JSON；若不能取得真 GLB，沒有假的「生成完成」或 60 FPS 證明。

## 不得混淆的部分
- 5.5 是 **程序式技術人體**，不等於「任意照片一鍵精確重建寫實真人」。照片只給 *整體輪廓橫寬/身高比*；頭、五官、服裝、材質、關節、背面、頭髮、軀幹厚度由 AIG 啟發式規則推估。
- 肩、髖交接雖使用共享 torso indexed vertices 連接肢體表面，尚不是通過水密檢驗的真拓樸 weld；不能稱為完全無接縫、無自交或真皮膚物理連續。
- COLOR_0 為自研技術辨識色，不是使用者核准女主角臉、深灰制服、格裙、照片紋理、透明髮絲與自然打鬥動作。
- GLB 中存 `sourceImageSHA256` 並不構成人物外觀或法務身份相似性的證明。真正的女主角視覺 Authority 必須另外檢查。
- 5.0 的 `STRUCTURAL_QA_PASS_ONLY` 若通過，只代表 15 個人體角色骨骼、indexed 胸頸頭連通和 sampled deformation 通過；5.1 幾何取樣需獨立驗證。5.3 人物來源鏈、人工外觀核准與 Android/Windows 原生 FPS 仍 BLOCKED。
- 正式 Render 網站／APK／EXE 並未因 GitHub Source PASS 自動部署或打包；真機 GPU、60 FPS、長時間熱負載未測量。
- 任何測試用輪廓、合成網格、合成關鍵影格均只證明演算法能力，絕不可冒稱是女主角正式美術來源。

## Gate
- Node tests 使用真正 `GLTFLoader.parseAsync` 讀 5.5 自研 GLB，核對 17 骨、2 SkinnedMesh、4 Clip 和每頂點真蒙皮。
- 直接送入既有 5.0 骨架分支，確認實際動畫蒙皮頂點位移與頭頸胸連通。加入 5.1 動態肩頸／髮束取樣試驗，但此物理 Gate 可獨立 BLOCK。
- 不可用的來源 SHA、不同 meshType、變更成已核准或 autoRigging 的假 scaffold 必須 FAIL。
- 新部門 RGB 按鈕、callback、真輸出檔、SHA 不可缺失；版本只上升、不回退。最後最新 SHA 的 GitHub Actions 必須 completed/success 才可作為正式可信續接點。
