# AIG FastModel 5.9｜真動畫自動避讓、25 姿態回退與 WebGL 16 格證據（Draft）

## 基準與範圍
- 正式可信來源：FastModel 5.8.0 commit `067e637a3b73968897d580358304ac82d143391f`，Actions run `39531537517` 90／90 PASS。
- 只向前升級到 **5.9.0**，不修改／覆蓋 5.5～5.8 既有生成器，不重建 5.0～5.4 已保存來源；保留 RGB 工作區、劇情、語音、音效、音樂、錄影。
- 本階仍在 `feature/aig-school-3d-hero-v1-20261020` 的 Draft PR #12，**尚未部署正式 Render 網站、Android APK 或 Windows EXE**。

## 5.9 真正新增
1. 新 `aig-auto-fit-5-9.mjs` 使用 5.8 真實 `generateAIG58FittedTechnical()` 產生四組有界避讓候選（基準裙襬 1.16 倍、髮束後移 .046，再比較更寬裙擺／更多背部空間），各自匯出具 17 節骨架、9 個 SkinnedMesh、5 Clip 的真 GLB。
2. 每組都先以 **真正 GLTFLoader** 回讀，使用 `AnimationMixer` 及真蒙皮三角面、5.8 `intersectMeshTriangles` SAT 做兩段動畫各五姿態共十個樣本；逐組保存獨立 GLB SHA-256、裙裝／身體與馬尾／身體接觸數及取樣 Clip 名。
3. 只有裙裝接觸數及馬尾接觸數**兩項都不高於基準**的候選可以入選；若接觸數相同則保留變形較小的選項。禁止用「裙子改善十個接觸、頭髮變差五個」來宣稱整體更好。
4. 自動選中的模型與原 5.8 基準，**再各用全部五段動畫 × 五姿態的 25 個真三角面樣本**複核。任一類的接觸數增加，即退回基準 GLB。沒有改善就保留原 5.8，報告不能顯示「已消除穿模」。
5. 回歸 5.0 的 `STRUCTURAL_QA_PASS_ONLY`、原 GLB SHA、一致 Clip 與所有前階工作流；生成的 GLB 可下載、真 3D 工作區可播放。結果可下載含各候選、初選／終選及五段逐段數據的 JSON。
6. 工作區新增 `aig59-build`、`aig59-capture`、`aig59-report`、`aig59-status`，皆為真 callback。獨立「真 16 格」按鈕透過既有 `view.captureTimelineReview()`，實際擷取當前 **同 SHA GLB**、當前動畫 Clip 的四個時間點 × 四視角 WebGL PNG；沒有真 GLB/GPU/Clip 時不得偽裝成截圖成功。
7. 採用的 GLB SHA 與 5.4 的真來源圖 SHA 分別存證，舊圖片／scaffold／模型改變立即隔離 5.9 審查結果。來源與模型不是同一位元組 hash，不能混用。

## 不得虛報的限制
- 這是自研局部程序式參數搜尋，**不是完整髮束／裙裝物理模擬**；離散 25 姿態零接觸亦不能證明所有時間、所有三角面及裙子／髮束自身都無穿模。
- 更寬的裙襬或後移髮束不一定更好，實測可能增加接觸。必須報告原始與終選的真正接觸 Δ 及必要的回退，未測量到改善不得宣稱修復成功。
- 真 16 格 PNG 是播放器的渲染像素，**不是正式人物美術人工核准**，畫面不等於來源照片精確還原；「櫻花校園」指定照片未建立可信的臉部 landmark + 3D 深度測量鏈。本階不能宣稱女主角五官比例已精確校正。須日後有來源測量值及人工審核才可解除 Block。
- GitHub Actions Source Gate 只能證明程式正確及合成來源 Fixture；**沒有自動驗收真女主角、Android/Windows 原生 60 FPS、長時間 GPU/溫度或正式 Render Live**。
- 對所有 5.9 的成果報告，`releaseAllowed:false`、`photoFaceLandmarkMeasurementAvailable:false`、`continuousMotionCollisionFreeProven:false` 固定保留。

## 回歸 Gate
- 先用真 Three.js GLTFLoader 對多組實際生成的 GLB 做 10 姿態 SAT，再真執行 25 姿態 baseline/final 選擇，核對原生 5.0 真骨架及 9 網格、5 Clip。
- 不同來源 SHA、混合不同 Clip、缺少五姿態／篡改總接觸數、候選放大範圍越界一律 BLOCK，禁止只以文字欄位冒稱實際 GPU 或照片外觀 PASS。
- 原 RGB Button ID 唯一，`app.mjs` 需具真 callback 並保留音樂、語音與動畫工作流程。
- 5.9 最新 SHA 完整 CI completed/success 才視為可信施工斷點；PR 繼續 Draft 不偷跑正式網站。
