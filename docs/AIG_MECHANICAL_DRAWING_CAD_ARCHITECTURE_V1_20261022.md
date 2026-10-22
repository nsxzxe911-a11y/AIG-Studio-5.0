# AIG CNC｜機械工程圖資料核心與 CAD→CAM 邊界 V1

2026-10-22　狀態：**架構已納入修復分支；只以程式和 Gate 實際結果認定功能**。

## 核心資料模型（Android/Windows 共用）
- 工件/組立 Part/Assembly ID、工程圖號、修訂版、材質、毛料、單位、基準座標。
- 投影視圖：FRONT/TOP/RIGHT/LEFT/BOTTOM/REAR、等角、局部、DETAIL、SECTION；剖視 A-A、尺度、第三角/第一角投影配置明示。
- 可編輯 Native CAD 幾何 Entity 與每張視圖的來源關聯（不可把文字標註變成 G-code）。
- Dimension：線性/直徑/半徑/角度/深度/座標；名義值、上/下公差、基準孔、真正 geometry anchor 和來源。REF 參考尺寸不得當 CAM 授權。
- Datum A/B/C 和幾何公差控制框：平面度、垂直度、平行度、位置度、輪廓度、跳動等，含被測 feature、允許偏差及基準參照。**這是結構化儲存與引用檢查，不等於完整 ISO/ASME GD&T 合規運算引擎。**
- Features：孔、沉孔、攻牙、槽、鍵槽、圓角、倒角、口袋、外形；孔陣列、孔距、圓周節圓與多孔位關係。
- TitleBlock、圖號、版次、物料/BOM 與製造註記；View→Feature→Entity ID 關係，確保改圖不會讓文字尺寸自動變成不安全 NC。

## 真實邊界
CAD 名義幾何具解析數值，圖面為顯示／製造規格；只有合法且已驗證的幾何、CAM 工藝與機台條件才進入 NC/SIM。尺寸只證明設計意圖與量測關係，不因設定 0.001 mm 顯示精度就稱製程或加工公差達標。

Phase M1：機械圖 schema＋引用與單位/公差驗證；Phase M2：CAD 真 Entity 尺寸與孔特徵綁定；Phase M3：工程圖視圖投影/剖視/孔註記/圖框；Phase M4：零件特徵 ↔ CAM 真加工策略 / 材料移除；Phase M5：GD&T 量測、匯入/匯出、原生 UI 按鈕與逐頁 RGB / Android+Windows Gate。

## 測試必備
- 孔距 / 直徑 / 深度 / 毛料正確維度與幾何來源 ID 一致；REF 與 tolerance 不可改 G-code。
- 孔群 3/4/5 個節距位置、缺 datum、重複 feature、負深度、NaN、無效 reference 一律 BLOCK。
- 不同修訂版不可偷用舊尺寸生成新的 NC；未驗證的 GD&T 不可虛報 PASS。
- CNC 真機輸出必須維持 Fanuc 條件與 Release Gate，6AX C 軸未通過機台運動學者 BLOCKED。

### 相關標準（作為設計方向，不宣稱符合）
- ISO 129-1:2018 技術圖的尺寸/公差表示。
- ISO 128 系列圖法、ISO 7200 圖框與資訊欄、ISO 1101 幾何公差規則。
- ASME Y14.5-2018 (R2024) 尺寸及幾何公差體系。
此處不可混合 ISO/ASME 規則而無宣告與驗證。
