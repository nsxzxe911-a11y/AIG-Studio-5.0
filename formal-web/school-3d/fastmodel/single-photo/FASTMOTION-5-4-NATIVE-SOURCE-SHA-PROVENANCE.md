# FastModel 5.4｜自研原圖－硬碟 GLB－生成器 SHA 來源完整性 Gate（Draft）

## 可信基準與新入口
- 延續 5.3.0 SHA `1bba8d4bbfde15c6d34c80f8f35d5aa10b575169`，來源測試 run `39524076888` completed/success。
- 本輪向前 `5.4.0`，保留現有 3.7～5.3、AI 劇情／聲音／音效／音樂、真 GLB 動畫與錄影邏輯。
- 新後端路徑：`GET /api/aig4/jobs/{job_id}/provenance`，僅接受既有本機 AIG 自研 4.0 已完成且一致的任務。
- RGB Button ID：`aig54-check`、`aig54-download`、`aig54-status`；4.0 確實建立技術 GLB 後才能點按，失敗隔離。
- 不使用 Meshy、外部 API、Cloud inference 或付費點數；不會私自修改原圖、GLB 或重跑有副作用的工作。

## 真實證據流程
1. AIG 4.0 建立新工作時，除保留來源圖片 SHA，亦在任務日誌固定當下 `aig_native4.py` 的 SHA-256。
2. 啟動隔離 Python worker 前、worker 完成後再次檢查生成器程式 SHA；若期間變更，該任務 FAIL，而非產出來源不明的 GLB。
3. 5.4 來源驗證從後端 *硬碟實體檔* 重新 SHA-256：`front-input`、可選 `side-input`、GLB、`scaffold.json`，對比 job 實際保存的 `sourceSHA256`／`artifacts`。
4. 解析 glTF 2.0 的真正 GLB JSON chunk，確認內嵌的 `extras.sourceImageSHA256` 和原始輸入 bytes 一致，並強制其為 `structuralDraftOnly:true`、`rigged:false`、`realHeroineGLBApproved:false`。
5. 瀏覽器收到來源報告後，再對檔案選擇器目前的原圖計算 SHA、下載 GLB、用 WebCrypto 重算 GLB SHA，和伺服器實際檔案及內嵌來源 SHA 做一致性核對。
6. 通過只回 `NATIVE_SOURCE_INTEGRITY_ONLY`，絕不是完整人體模型、女主角來源外觀、動畫、物理髮絲或正式發布合格。
7. 5.3 的統一驗收 JSON 會另外列出 `native4TechnicalIntegrity54`；不增減原本 11 項 Gate 的放行規則。即使 4.0 原圖 SHA 符合 3.7 指定女主角 JPEG，`FULLBODY_SKIN_5_0` 與正式身份比對仍未通過。

## 限制與安全邊界
- SHA 是**位元一致性證明**，不是數位簽章。5.4 在可信的同源本機伺服器與瀏覽器環境下能查出檔案被更動，但不能排除有權修改全部程式與記錄的人蓄意偽造整套來源。
- 5.4 自研 4.0 仍是「來源剪影衍生、未知背面推估的封閉體積草模」，並不會生成真的符合原照片比例的完整 3D 全身人物、骨架動畫或髮束。
- 已存在的 5.4 以前舊任務若缺「生成器 SHA」欄位，須標記 `AIG54_PRE54_JOB_MISSING_GENERATOR_PROVENANCE`，不能倒填或冒充當時已紀錄。
- 不取得 Android／Windows 原生實機 60 FPS、正式女主角照片/GLB 語義相似度、臉部人工核准、真打架或 1080p 有聲成片實測證據。
- GitHub Source Gate、Draft PR、正式 Render Live、APK、EXE 是不同的證據，切勿混用。

## Gate 與交付
- Python 回歸：真正隔離自研 4.0 Job、來源／GLB／生成器 SHA、真 glTF extras、HTTP provenance、實際竄改 GLB 位元後 FAIL。
- JS 回歸：實際 GLB bytes hash、來源與 GLB 雙 SHA、冒名來源、假的 rigged／Approved、錯 jobId、5.3 正式 Gate 仍 BLOCK；所有 RGB Button IDs、前階 AV 路徑仍存在。
- 只在本階最終 SHA 的 GitHub Actions 完整 completed/success 才能宣稱 5.4 來源程式 Gate PASS。未合併 PR #12，也未執行正式 Render 部署；正式女主角全身 GLB 仍待自研引擎真正完成。
