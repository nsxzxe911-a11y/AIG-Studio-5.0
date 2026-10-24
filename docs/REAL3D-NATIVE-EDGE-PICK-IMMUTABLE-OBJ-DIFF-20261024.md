# Real3D｜真正可選取的原始異常邊＋兩份 OBJ 修復前後唯讀對照 V1

**2026-10-24，承接 PR #58，不能將技術診斷誤稱真實人體模型完成。**

## 本輪真實施工

- `aig-real3d-defect-edge-picker.mjs`：選取原始 Indexed OBJ 異常邊。四視角 GPU PNG 疊圖具真點選 callback；依圖片 `object-fit:contain` 反推原始 **1080×1920** 像素，測線段到點距離、選最近邊，回傳原始 vertex indices、3D world XYZ、角度、SHA、錯誤類別；手指不容易點中時還有真來源邊按鈕清單。不是畫裝飾按鈕。
- 在 Real3D 黑輪廓／咖啡色材質工作區，選中時直接顯示原始 **兩端世界座標公尺（原始四捨五入資料）**、異常類型與 SHA。只顯示在頁面，不回寫 OBJ。
- `aig-real3d-immutable-defect-diff.mjs`：讀取**兩份不同 SHA 的真正 OBJ**，要求同一實測身高、Up 軸與五區標記審核，分別掃描原始拓樸，顯示全球開放邊／非流形／退化面變化、局部五區變化、原有異常消失、新引入異常、未改變的異常；以**原始 3D 邊端點座標**決定缺陷是否相同，不靠頂點編號（重建後頂點可重新排序）。保留證據截斷旗標；截斷時不執行會誤判的嚴格異常差異。
- `aig-real3d-human-brown-render-lab.mjs/.html`：先選取修復前來源 OBJ + 21 個原始標記，真按鈕選取候選修復後 OBJ，兩份 SHA 不同才比較；以**同一正交四視角的原始 GPU 相機**輸出修復後咖啡色 PNG（加上可下載的原始異常邊 Canvas 診斷線），和修復前原始咖啡色 GPU PNG 並排。產生含 4 組新圖 SHA、5 區數值的可下載 JSON。
- 異常數下降≠能自動宣告修復成功；拓樸正常≠臉、頸、手指、腳趾自然。比較結果的 `verifiedAnatomicalRepair:false`、`naturalHumanAppearancePASS:false`、`releasePASS:false` 仍強制保留。

## 測試方法

- Node 使用明確非人體合成橢球 OBJ，建立完好原始網格與**真正故意少一片三角形**的網格，兩份不同 SHA。驗證異常邊實際可選、圖片 CSS 留白校正、修復前後開放邊減少、新增加的邊與同 SHA/座標軸差異時必須 BLOCK。
- Playwright 真 Chromium：載入完好合成網格→載入破洞合成網格，從真四角 GPU 異常圖點邊、看到原始頂點編號與 XYZ；另外上傳完整獨立 OBJ，生成四張**另一模型的真 GPU**並核對每張 PNG SHA、報告；再提交與破洞來源一模一樣的 SHA，必須拒絕。全部只有技術圖，不能視為可信真人外觀測試。
- 操作完全在本機頁面，不上傳人像／OBJ 到第三方；不執行自動修補，也不建立 SDF、Metaball、Template Morph、Subdivision 人體。
- 此分支 PR Draft，未合併到正式 Render；核准的 RGB HOME、手機和 Windows 分版、3AX～6AX/NC 與 APK/EXE 都不變。

## 下一關（不先宣告已完成）

真正真人來源驗證與人工比對；若要實際自動修補原始 OBJ，需新的明確來源權限、修補演算法與幾何 Gate，不可把「差異審核」偽稱「自動修復成功」。
