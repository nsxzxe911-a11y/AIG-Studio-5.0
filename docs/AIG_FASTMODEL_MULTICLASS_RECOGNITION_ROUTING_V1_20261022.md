# AIG FastModel｜多類別自動辨識與引擎分流規格 V1（入庫）

日期：2026-10-22　狀態：**核准架構／待完整辨識模型實作**。不可把下述 taxonomy 或 routing stub 說成自動影像辨識已完成。

## 主體分類與屬性分開
主類別：HUMAN、ANIMAL、PLANT、BUILDING、HOUSE、CAR、MOTORCYCLE、SPORTS_FACILITY、MECHANICAL_DRAWING、OTHER、UNKNOWN。HOUSE 是 BUILDING 的子類；CAR/MOTORCYCLE 隸屬 VEHICLE。機械零件、機台圖面另走 `MECHANICAL_DRAWING` 路由，不得被車輛照片分割或人形骨架處理覆蓋。

獨立屬性：dominantColor（例如 BLUE）、材質、場景、可動部件、比例來源（觀測／先驗推估／手動確定）、可信度、image SHA、主體 bounding-region。**BLUE 是顏色，不是物件種類**；顏色不得單獨決定是否是汽車或房子。

## Pipeline
1. 原始影像 SHA／EXIF／色彩空間／尺寸校驗；不可暗中改原圖。
2. 主體分割＋多物體物件實例偵測（目前僅 6.12 的單主體色差／alpha 分割，**不代表語意分割**）。
3. 真正的多類別模型提供 `{classId, score, bbox, maskDigest, modelId/version}`，不僅是色彩和面積啟發式；分層一致性、Unknown/OOD、物件混雜、一致性 gate。
4. 自動路由到 Domain Engine：人體/動物骨架、植物柔性、建築結構/立面、車輛輪組與可動機件、運動設施場地/器材、機械 CAD 工程圖辨識。各路由的真 3D 模型能力要獨立證實。
5. 規格化輸出 `ClassificationEvidence`：原圖 SHA、候選類別和分數、可驗證的顏色、區域及遮擋、模型引用、各字段來源（PIXEL_OBSERVED / MODEL_INFERRED / USER_CONFIRMED）、UNKNOWN/BLOCKED 原因。
6. Classifier 未安裝、輸出信心不足、類別衝突、缺少專用 3D 核心：**安全阻止自動生成並回傳明確原因**。不把預設 17 骨人形 GLB 說成動物、房屋、車輛或植物。

## 特別路由
- 建築/房屋：屋頂、牆、門、窗、樓層等拓樸；未知背面僅可標註推估，不能一張照片保證 BIM 級尺度。
- 汽車/機車：車身/輪胎/軸距/轉向/車燈/懸吊；真動作與外觀另行測試。
- 運動設施：場地平面（籃球/網球/足球/跑道）與器材（健身/游泳等）要分群；透視校正和法定實際尺寸分開。
- MECHANICAL_DRAWING：路由到 CAD 機械圖 OCR/幾何/尺寸/GD&T 待驗證模組；圖紙中的已標註尺寸與照片估測值絕不能混用。
- 顏色：從受光照片量測色彩與校正置信度分開，不能推論表面真材質、彈性或光譜反射率。

## 可測試的 Gate
- 同時出現一台藍色車和藍色房子，兩個主體實例不合併；顏色一致但 classId 不同。
- 沒有分類模型時返回 `CLASSIFIER_UNAVAILABLE`，不是猜測「藍色＝汽車」。
- HUMAN 不得送到 PLANT SDF，MECHANICAL_DRAWING 不得送人體骨架；沒真建模核心的 domain 只允許觀測報告。
- 各 domain 正反測試、來源 SHA、真模型輸出、手機/Windows 逐頁 UI callback 都 PASS，才可稱正式自動辨識可用。

## 現況（不能混淆）
已通過：單張照片的 6.12 像素色差主體分析、人/動物/植物**手動**選擇、技術人體 GLB。
未通過：真正多類別 AI classifier、建築/車輛/運動設施語意 segmentation、各類真 3D 建模、機械工程圖自動讀尺寸、植物物理。
V1 規格先入庫，將未知一律顯示為 Unknown/Blocked；已經做出的核心與 RGB Authority 不刪除。
