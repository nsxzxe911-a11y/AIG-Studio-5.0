# Real3D V94｜高精度立體本體、結構分件、材質與電影品質六層 Gate

建立日期：2026-10-24。已進入 GitHub Draft 隔離施工。規則：**幾何本體不精準，渲染再漂亮也不算高品質。** V91～V93 的球體物理、生物骨架與 3D 動態都保留。

## 正式執行順序

1. **原始幾何精度 Gate**：程式 aig-real3d-v94-source-structure-audit.mjs，針對原始 Indexed XYZ 直接計算來源三角形總數、原始面閉合、原始索引邊、非流形邊、法線與鄰接面方向、曲面硬／軟邊、原始部件連通性與三維長寬高。外部來源有實測值時才檢查厚度、尺寸與測點 mm 殘差；缺少真來源背面、量測者與實物證據一律 BLOCK。
2. **結構分件 Gate**：aig-real3d-v94-obj-structure-intake.mjs 直接讀取原始 OBJ v/f/g/o face groups、檔案 SHA/單位、原始 vertex global ID 與 face counts，不擅自推測裝甲、引擎、器官或人物背面。使用者明確分配 SHELL/ARMOR/ENGINE/SKIN 等 part roles。
3. **動畫拓樸 Gate**：aig-real3d-v94-dynamic-topology-gate.mjs，檢查每個真 XYZ 影格是否保留原始 face IDs、幀間跳動、三角面積塌陷、邊長伸縮、朝向翻轉候選及時序一致性，並列出出問題的原始 face ID。禁止藉平滑、SDF、metaball、模板假人體掩蓋來源問題。
4. **實測點工作副本（來源不變）**：新增 aig-real3d-v94-measured-geometry-working-copy.mjs。使用已帶證據 SHA 的至少三個真 POINT_3D 原始 OBJ 頂點量測，且移動範圍在 2 mm 內，才允許對原始頂點做稀疏修正的 Working Copy。絕不移動沒有實測的點、絕不新增背面／三角面或覆寫 Original。修改必須通過逐原始 face 的動態拓樸伸縮與塌陷 Gate；超出即 BLOCK。研究頁提供「依實測點修正工作副本」真 callback。

5. **材質來源 Gate**：aig-real3d-v94-cinema-quality-budget.mjs 接續 V88 原始 UV/Tangent/Normal/Clearcoat；Albedo、金屬／粗糙度、Normal 貼圖必須有檔案 SHA、貼圖尺寸和來源 UV 證據。估算畫面每米 pixel 與來源每米 texel；不能把低解析貼圖放大成 4K 假裝 4K 立體。
6. **電影真 GPU Gate**：獨立本機研究頁 aig-real3d-v94-precision-review.html，真 WebGL 正／側／背／斜四視角，原生 GPU PNG 證據；仍維持 2,000 真 Indexed XYZ triangles 的原來 GPU screenshot 門檻。電影 1080p60、2K、4K FPS、配音、MP4、長片輸出尚無本輪正式證據，不得宣稱。
7. **交付 Gate**：只有 Source + Chromium GPU + 有效原始來源驗證全部 PASS，才可討論發布。此輪隔離 Draft；原 Render RGB HOME、AIG-II、AIG Studio 5.0、NC/Fanuc、APK、EXE 一律不改。

## 使用者能操作的 V94 審核

開啟隔離研究頁，放入原始 OBJ 並選擇來源單位 METERS 或 MM（檔案僅在本機瀏覽器讀取），由 crypto.subtle 計算 OBJ bytes SHA256。選擇來源 part role 與是否必須真封閉。可再加入量測 JSON，其 sourceSha256 必須與原始 OBJ 相同，observations 陣列可提供 DIMENSION、THICKNESS、POINT_3D 三種類別的來源原頂點與允差。不是每個檔案都有完整背面；沒有的部位不自動生成。

範例量測 JSON：

```json
{
  "sourceSha256": "原始OBJ的64碼SHA256",
  "observations": [
    {
      "kind": "DIMENSION",
      "partId": "component0",
      "evidenceSha256": "64碼量測來源SHA256",
      "axis": 0,
      "measuredMm": 1200,
      "toleranceMm": 0.05
    }
  ]
}
```

可檢視原始 indexed faces 與可量測之實際厚度、閉合、硬邊、法線並下載原始 SOURCE-PRECISION-GATES.json。若真原始來源不完整或沒有量測證據，最終 1:1 精度仍是 BLOCK。

## V94 驗收明確界限

- 幾何審核工具 Source PASS 不代表真人、狗、鳥、魚 1:1 真實外型 PASS。
- 閉合索引面不代表實物厚度有實際量測；源 OBJ bytes SHA 也不等於原始掃描授權／外部真實量測已驗證。
- 原始材質對應不代表完成 physically validated multilayer PBR、皮膚次表面、毛髮散射和玻璃折射。
- 動態 face IDs 連續不代表全身不穿模或真肌肉肌膚物理已驗證。
- 正式產品仍維持 BLOCK，禁止合併未通過的 candidate 或替換主網站。
