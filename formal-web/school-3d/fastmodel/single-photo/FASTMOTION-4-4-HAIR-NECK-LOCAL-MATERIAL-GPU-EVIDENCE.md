# AIG FastModel 4.4 — 頭頸 SDF + 髮量距離預警 + 局部材質 + GPU 證據

## 路線和真實可驗證的能力
- AIG 自有幾何／SDF、零第三方重建推論、零 API 生成點數。4.0 的來源 SHA、原有 GLB，4.1 SDF，4.2 GPU/隔離，4.3 局部四肢快取全部保留。工作仍在原 Draft PR #12，正式 Render、APK、EXE 不變。
- `aig-qa-4-4.mjs`：`auditHairNeck(scene)` 取 3 個中心線高度查技術頭頸 SDF 是否連續；另在四個高度、三個橫向位置取樣頸後代理表面與髮量橢球 SDF 的**符號距離**。這能偵測「代理體積距離／穿越」，但**不能**用於判定髮束細線、皮膚拓樸、真正 3D 頭頸是否已修好。
- 預覽的髮量後移量可從 `0.000` 到 `0.080` 正規化幾何單位，以減少頸後代理體積重疊。**此值不是 mm，也不是從照片推導的物理真實距離**；髮量後移可能破壞髮根相接，因此即使碰撞數值過關，依然必須再做人眼外觀／真正 mesh / 姿態逐幀檢查。
- `appearanceFor()`：自然、暖色、夜色三種 skin/dress/hair 三獨立預覽色，WebGL2 的 `uSkinColor/uDressColor/uHairColor` 只更新 uniforms，沒有重新製作模型網格。沒有來源紋理 UV、PBR 貼圖、髮絲實際材質，也不暗稱畫質 4K 已驗證。
- `Aig44TimingEvidence`：保留有界 240 筆（可設定容量）JS 提交時間及**有效、非 disjoint** WebGL2 GPU query 樣本，分別輸出 p50/p95/max。無 query 的設備標示 `gpuTimingReal:false`；時間不是 FPS、VSync、掉幀率或 Android/Windows 性能 PASS。
- UI 可手動調整髮量前後距離、三種材質與重算頭頸技術風險，並匯出包含來源 SHA、當前設定、代理 QA 結果和 GPU/JS 計時的 JSON 證據。功能需經 4.0 來源驗證才解鎖，不改動正式 GLB。

## 最重要的真值分層

| 層次 | 可以 PASS 的事項 | 嚴禁冒稱 |
|---|---|---|
| Geometry QA | 頭頸**解析式 SDF** 連續、髮量球體對頸後樣本的 signed distance、材質參數重用 | 真頭頸三角面已補洞、真實長髮碰撞或裙襬物理 |
| GPU / performance | JS 指令提交 p50/p95，支持 `EXT_disjoint_timer_query_webgl2` 時的實測 GPU query p50/p95 | 畫面 present FPS、Android 60/120 FPS、Windows 4K 實際 FPS |
| Character | 原始圖片 SHA 與可修改幾何保持一致，未知部位繼續標為 inferred | 真女主角臉、髮型、手腳、洋裝已按八面精準完成 |
| Security | 零雲端生成點數、無第三方推論、錯誤不丟棄已通過 GLB | 硬體已真正跑過、CI 模擬 shader 等於真 GPU 驗證 |

## 本輪正式功能測試
- `tests/aig-qa-4-4.test.mjs`：頭頸 signed distance、髮量代理交疊隨後移量變化、真來源 SHA 綁定、材質改動不改 shader/buffer、非法值阻擋、真正 GPU query/disjoint 分離、有限資料保留、UI callback 與零點數限制。
- 原 GitHub 完整 Source Gate 的 Node、Python、SDF、4.3 Rig 等測試也須全部完成才能標本輪 Source PASS。
- 真機驗收仍列為下一個必須完成項目：Android S23 60/120Hz / Windows WebGL2 編譯、GPU 時間、WebGL context lost、發熱、RAM，四肢大姿態和髮束／頸部實際碰撞。

## 後續重點
4.5 應優先採真相機照片的手動 landmark 補正＋多視角比例校準，並開始「頭／頸／髮束各自單獨真 mesh」與外觀圖對比 Gate，而不靠持續增加假語義 SDF 體塊宣稱女主角已還原。下一步在具備受權的 Windows/Android 執行環境後直接測試真正 GPU 計時。正式 Render 網站合併/部署需獨立審核。
