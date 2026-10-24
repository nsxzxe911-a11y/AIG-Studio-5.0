# Real3D V104｜AI CAD 俯視優先 + 六面按需真 XYZ 驗證（2026-10-25）

**本階確定的技術方向**：不再要求同時生成六份獨立 3D，也不先追 HDR10/4K 特效；以臥式 CNC 工件的單一原點、單一來源模型、六向正交量測為類比，先用有來源的 **CAD XY 俯視**檢查模型是否正確，再依需要檢查正、後、左、右、下視角。GPU 繪圖只負責忠實顯示已取得的真三維，不替 AI 猜背面或變造已核准的原圖。

## 先修正三個容易造成重大錯誤的認知

1. **三軸 × 六向 = 18 組投影座標欄位，並不是 18 個物理空間維度。** 三維仍是 X/Y/Z；六面取樣彼此共用同一份 XYZ 及 source SHA。
2. **CNC Z-up 與 Real3D Y-up 絕對不可直接混用。** CNC `[Xc,Yc,Zc]`（單位 mm）到 Real3D `[Xr,Yr,Zr]=[Xc,Zc,-Yc]`，米制來源再 /1000。此為右手系旋轉，避免上下/左右顛倒或鏡像。TOP 為 CNC XY、Real3D XZ 平面；後、左、右是從同一 mesh 計算而來。
3. **單張俯視圖無法推算所有真實高度與未知底面。** 外加照片/CAD 輪廓可定義量測與推估可信度，沒有獨立照片、CAD 三維標註或掃描資料就不能稱六面真實已重建。頂面包圍盒的尺寸相同，也不代表內部曲線/頭髮/衣服或完整身份 1:1 PASS。這輪預設**不**因單張 CAD 頂視輪廓直接建立假的封閉人體或飛船殼體。

## 已提交的真程式

- `formal-web/shared-3d/aig-real3d-v104-cad-top-first.mjs`
  - `auditAIGReal3DV104Axes()`：正/後/上/下/左/右六相機正交且右手；CNC B 軸 0/90/180/270 僅作概念標籤，**不**是各機台實際正負軸向或安全加工認證。
  - `convertAIGReal3DCNCToWorld()`／`convertAIGReal3DWorldToCNC()`：顯式 Z-up↔Y-up、mm↔m、共同 Master Origin。
  - `createAIGReal3DTopCADObservation()`：接受有來源 SHA 的實際 CAD XY 尺寸封閉輪廓。來源標註 OBSERVED／AI_ESTIMATED，可選另附**確實量測**的頂面高度；沒有任何值時明示高度未知、底面未知。
  - `createAIGReal3DTopFirstInspector()`：針對一份合法、原始 Indexed XYZ scene 及 Mesh SHA，先只 raster TOP 的 source triangle ID、可見深度與占用格；FRONT/BACK/LEFT/RIGHT/BOTTOM 只在 requested 時才運算及快取。需求上限 50,000 原來源三角面、每向 16～192 pixel 網格，以限制 CPU。這是幾何可信度 debug，不是原生 4K 渲染路徑。
  - `fullSixFaceSummary()`：明確區分 3 軸、六向、18 投影欄位、主來源 SHA、視角來源；不把任何由同一 mesh 渲染的視角當成獨立相片觀測。
- `aig-real3d-v99-native-source-lab.html` + `aig-real3d-v104-cad-top-ui.mjs`：實際繁中控制「CAD 俯視先算／五面按需／六面來源審核」，每一面以原 Indexed XYZ source mesh 的 CPU 正交 z-buffer 資料著色，能查看來源面、頂點空間範圍、深度區間及實際快取數；支援使用者手動輸入 CNC XY 實際點列、標記是否觀測，計算尺寸誤差，**不會為了符合 CAD 就修改原始模型。** V99 GLB 原介面及 V102/V103 4K 著色不回退。

## Gate

1. Node Source：驗證六面右手系、m/mm 映射、真來源 TOP raster、按需五面、快取、不變的原始三角面及版本、OBSERVED/AI_ESTIMATED 區分、拒絕 2D 圖片冒充真 3D。
2. Chromium 真瀏覽器：上傳真正的 GLB bytes 與參考 PNG；V99 真 WebGL 模型成功載入；V104 首先計算 TOP、選右後才計算 RIGHT、選背才計算 BACK；重複右面應由快取讀取；CAD XY 手動來源未標 OBSERVED 時不能宣稱觀測真實；UI 六面 report 保持原始 SHA 和 12 個測試原始 triangles。
3. Source 與 Browser GPU 必須完成且實際 PASS，否則只能保留 Draft。任何 PASS 只證明幾何來源／方向正確，**不能推出照片 1:1 女主角高擬真、真深度預測、AI 已生成原圖看不到的後腦/衣服、六面資料已被六台攝影機實測。**

**預設仍 BLOCK**：真正 AI 以俯視輪廓學習未知幾何並重建高擬真人體、六張真正獨立觀察影像的資料、已驗證的三軸／B 軸 CNC 運動學、4K60 動畫電影、真 HDR10 輸出。未部署正式 Render、未合併、不取代 RGB HOME、CNC/Fanuc 與 APK/EXE 不動。
