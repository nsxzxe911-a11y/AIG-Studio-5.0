# 圖片逆向成動畫：語言與實作缺口（FastModel 2.6）

**2.7 更新**：已新增 `single-photo/` 的任意受支援照片輸入、真 Meshy 生成／骨架／動作 API 流程與 Three.js PBR／TRS／morph viewer；不再需要固定構圖或手動 guides。這是已實作的服務接合程式，尚無服務金鑰、真照片推論與擬真品質驗收。詳見 [single-photo/README.md](single-photo/README.md)。原 2.6 固定圖工具仍完整保留，以下為其歷史能力與其他仍缺項目。

本次從 `93e8baf6486eeb2e403be694b871a91351ecaa5b` 向前補強。語言本身已有足夠基礎，缺的是功能、資料與平台接合；增加語言名稱不會自動產生可靠的 3D 人物。

| 語言／資料格式 | 現有用途及本輪補齊 | 仍缺的實作／驗收 |
| --- | --- | --- |
| Python | Phase13–17 的圖片輪廓、權重、髮束、GLB 產生器；2.6 新增單一入口 `tools/image_to_animation.py`，接通五階段、原圖／規格 SHA、獨立輸出、失敗隔離與紀錄 | 任意照片自動分割、相機校正、多視角深度、完整背面與臉部立體拓樸尚未完成 |
| JavaScript ES modules | 真 GLB 解析、播放、快取、頭頸檢查；2.6 新增 `web/animation-clips.mjs`，播放和稽核共用選定片段，取消所有片段隱式混播 | 目前明確支援 LINEAR rotation；translation／scale／morph weights、STEP／CUBICSPLINE、重定向及動作混合仍缺，遇到不支援的片段會拒絕並保留有效工作 |
| GLSL ES 3.00 | 現有 WebGL2 shader 進行骨架蒙皮與原彩貼圖播放 | 真透明髮束深度、完整 PBR 光照及精確碰撞仍缺；掃描線不是上述能力的替代品 |
| C++20 ＋ C ABI | 已有增量幾何及資源政策 `core/fastmodel_c_api.*`；本輪未改 ABI | 尚未接入 Windows／Android FastModel 原生 renderer、GPU timestamp、真裝置記憶體及溫度量測 |
| Kotlin／JVM | 倉庫已有 Android 與 Desktop 的 Kotlin 主程式 | FastModel 的 Android JNI／NDK 與 Windows JVM native binding 尚未接通；不必為此另造一套 C# 主程式 |
| JSON ＋ glTF/GLB | 手動輪廓／髮束規格、蒙皮、動畫與材質交換；2.6 新增含 SHA 的 `pipeline-report.json` | 原圖、校正、網格角色標記、正式人物與每段動作的視覺驗收仍需真實資料 |

## 已可執行：同一份來源圖片到離線動畫

在倉庫根目錄執行（Python 3.11+，先安裝既有 `formal-web/school-3d/tools/material-requirements.txt`）：

```bash
python formal-web/school-3d/fastmodel/tools/image_to_animation.py \
  --source /path/to/reference.png \
  --out /path/to/NEW-animation-directory
```

預設規格對應既有 1672×941 核准來源圖片 SHA。自備規格可加 `--envelope-spec`、`--hair-spec`，但仍必須使用相同 Phase13–17 手動校正構圖及 88 條髮束，不支援拿任意照片直接套入。程式不會自動改寫規格 SHA 來讓不相符的照片通過。

加 `--check-only` 僅驗證輸入，不產生動畫，不會將檢查通過描述為模型完成。

五階段為：圖片輪廓＋骨架 → 髮束＋動作 → 細髮束 → 來源色彩／輪廓校正 → 離線 HTML。輸出包括 `character-NOT-APPROVED.glb`、`animation-offline.html`、輸入快照、各階段 log／報告與 `pipeline-report.json`。離線頁按「載入附帶角色」後，在「動畫」頁選擇 GLB 真實片段；原圖不會被清理快取或輸出流程刪除。

輸出資料夾必須不存在。工具在自有暫存目錄完成所有階段，檢查來源未變與 GLB 動畫存在後才發布新資料夾。任一階段失敗不發布半成品，也不覆蓋既有 GLB／工作副本。

## 未完成項目與需要的資料

1. **完整 3D 重建**：需要多視角或深度約束、分割及相機校正；目前單圖導向的背面／厚度屬估計，2.5D 不等於完整人物重建。
2. **頭頸與髮束實體修復**：需要正式角色 GLB、頭／頸／髮束標記、實際拓樸及所有動作的逐幀影像；橋接候選與最近頂點抽樣不能當成焊接或無穿模證明。
3. **更多動畫通道**：在共用 pose evaluator 加上 translation／scale／morph 與插值，再讓渲染、掃描、稽核及匯出共同採用；目前拒絕不支援通道，不靜默丟棄它們。
4. **跨平台原生整合**：讓 Kotlin host 經 JNI／native binding 使用 C ABI，再實作平台 renderer／實測；現有 HTML 是離線瀏覽器交付格式，非 APK／EXE。
5. **影片輸出**：固定時間步進的逐幀渲染、音訊時間軸及影片編碼仍缺；GLB／HTML 動畫輸出不等於已輸出電影。

上述 P0 項目仍未驗收。新 CI artifact 是合成資料的技術證據；PR 維持 Draft，沒有發布正式網站、APK 或 EXE。
