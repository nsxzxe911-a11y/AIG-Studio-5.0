# AIG FastModel 4.0 — 自研比例／未知視角／3D 體積／深度／信心圖

**身份**：AIG 自研幾何演算法，零第三方 AI 推論、零雲端點數；仍使用可查來源的通用開源 Python/Pillow 圖像讀取庫。GitHub PR #12 Draft-only；不覆蓋 AIG-II、Studio main、正式 Render、APK 或 EXE。

## 技術交付／六項模組

| 模組（正式 ID） | 真正的 4.0 實作 | Gate / 限制 |
|---|---|---|
| `AigProportionAnalyzer` | `proportions()` 以前景像素 X/Y、外接框、10 段相對寬度、中心線建立比例清單與來源 SHA | **沒有人體語意模型**。頭身比、肩寬、腰線、臂長、腿長、髮量、裙線均標為 `UNCERTAIN_NO_*`，不可捏造測值 |
| `AigViewCompletionEngine` | `render_view()` 將實際 3D 草模從 0/45/90/135/180/225/270/315° 渲染成八張 PNG | 全部是草模投影，**不是真實補拍照片或神經生成未知面紋理** |
| `AigVolumeScaffoldBuilder` | `volume()` 每 64 層、每層 32 方位，建橢圓截面曲面、封閉上下蓋，非零厚度的真三角面 | 具體物件的手腳／頭頸／裙子還沒有分離成語義網格 |
| `AigDepthCompletionCore` | 只用正面輪廓時，以橢圓深度比例推估；可選第二張分離乾淨的側面圖限制各高度的深度剖面 | 未校正相機焦距、不同照片尺度與姿態；厚度是估值，不是深度感測 |
| `AigConfidenceMapGenerator` | 每網格點 `OBSERVED_2D_COLOR_INFERRED_3D_DEPTH`、`INFERRED_SIDE_SURFACE`、`UNCERTAIN_BACK_SURFACE`，存 2D 熱圖與 mean（啟發式） | mean 不是準確率，不可把 0.25/0.10 值當成 25% 及 10% 真實成功機率 |
| `AigMeshDraftBuilder` | `write_glb()` 直接自研寫 glTF 2.0 GLB，`POSITION/NORMAL/COLOR_0/indices`，真三角面＋PBR 基礎材質、來源 SHA | `skins=0`、`animations=0`、未驗證角色視覺、未核准發佈 |

**真正的產物**：`AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb`、`proportions.json`、`scaffold.json`、`confidence-2D-HEURISTIC.png` 與 `unknown-views/{000..315}-INFERRED.png` 八張圖。以實際成功工作為準，無偽 GLB 兜底。

## 來源流程與 Gate

1. 原圖輸入：優先真 RGBA PNG 背景透明。乾淨單色背景可用自研顏色距離前景擷取；背景雜亂、高顏色變異就 `AIG4_COMPLEX_BACKGROUND_USE_RGBA_MASK`，不可把校園建築、人物或櫻花一併塞進女主角 3D。
2. 最大圖片處理預算：解碼原圖不得超過 12M 像素；最多 20 MiB 每張；限同一次前景連通區的佔比與完整外接框。人物被裁切出邊界則阻擋。
3. 正面可見外形只證明 **二維投影**。深度／背面／衣裙／脖子／手腳真實立體形狀均為推估；側面圖可以限制厚度，但未完成多相機比例配準。
4. `AigNative4Jobs` 具有來源 SHA、原圖保存、requestId 去重、局部失敗不覆蓋既有結果，服務端僅本機 loopback 且 `X-AIG-Request: 1`。永遠不呼叫 Meshy、Stable Fast 3D 或任何第三方網路生成接口。
5. `GET /api/aig4/capabilities`、`POST /api/aig4/jobs`、`GET /api/aig4/jobs/{id}`、`GET /api/aig4/jobs/{id}/files/model.glb` 等為真函式；畫面中 4.0 的按鈕可以送出任務並取得真正生成 PNG 與 GLB。為避免覆蓋主工作頁，使用者需再明確按一下「載入草模」才換上這份模型。
6. **無自動付費備援**。3.9 的外部點數 API 仍預設封鎖；4.0 本機算法會承認不完整而非暗中改用第三方。

## 例：本機直接執行（不須服務帳號／外部模型權重）

```bash
python aig_native4.py --source /path/to/foreground.png --out /path/to/NEW-output-dir
python aig_native4.py --source /path/to/front.png --side /path/to/side.png --out /path/to/NEW-output-dir
python aig_native4.py --source /path/to/foreground.png --out unused --check-only
```

`--out` 已存在將 BLOCK，不會刪除或回退專案；純 `--check-only` 不製造 GLB。臉部、頭頸、髮束、服裝及全身擬真都是後續研發工作，4.0 的幾何原型**不代表**使用者指定女主角的真實外觀。

## 4.0 Status State

`INPUT_SELECTED → PRECHECK_COMPLETE → GEOMETRIC_VOLUME_BUILDING → GEOMETRIC_DRAFT_COMPLETE`

錯誤：`AIG4_COMPLEX_BACKGROUND_USE_RGBA_MASK`、`AIG4_FOREGROUND_COVERAGE_UNSAFE`、`AIG4_FOREGROUND_*_CROPPED`、`AIG4_IMAGE_CHANGED`、`AIG4_JOB_NOT_COMPLETE` 等直接 BLOCK；不可輸出「完成角色」假狀態。

## Release Gate

| 驗證項目 | 4.0 真正能夠提供的證據 | 必須保持未通過的證據 |
|---|---|---|
| 零點數、離線自研 | 不使用網路／第三方推論與權重，來源 Gate 測試可核對 | 誤以為通用開源 Pillow = 侵犯自研模型：需遵循套件自身授權 |
| 比例／遮罩 | 來源 SHA、2D bbox、長寬比、10 級輪廓寬度，未知語義都 `UNCERTAIN` | 真實頭身／骨骼比例與單圖人體深度 |
| 真 3D 而非 2.5D 紙片 | 閉合三角面、三軸 extent、glTF 真 GLB、8 個幾何相機投影 | 精準人體高模、相機校正、材質與背面確定性 |
| 動畫 | 草模可用 3D 工作區作物件環繞預覽 | `Rig/Skin=0`、`Clip=0`、打鬥／行走影片實測仍無證據 |
| 女主角實證 | 只有模型引用前景圖的 SHA | 真正長髮遮頸、臉部相似、裙擺、穿模、1080p／60 FPS |

## 4.1 → 4.4 穩定接法（只升版，不回退）

- **4.1**：分離頭、頸、胸腔、手臂、骨盆、腿、裙擺、髮束等語義表面；解析骨架連線，建立有可追蹤來源 SHA 的獨立網格 patch 與無洞頭頸橋接。針對背景雜亂圖片需要自研可靠人物遮罩，無遮罩時 BLOCK。
- **4.2**：以視角方向和 UV 圖譜提供來源可見表面貼圖、其他表面不確定性標註；不以平移或鏡像正面圖片當作確定背面。
- **4.3**：原生 glTF Skin / inverse bind matrices、動畫 TRS 插值、姿態安全判定，再接 60 Hz Android／Windows 實測。
- **4.4**：真 GLB/打鬥骨架/音樂配音字幕 → 真 1920×1080 有聲影片；播放器音畫、掉幀、像素及頭頸髮束穿模須實測才放行。

所有後續階段保持 `formalHeroineApproved:false` 直到真實圖片對照與實機通過。
