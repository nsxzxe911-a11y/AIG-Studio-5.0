# AIG Real3D｜幾何先行、光影後置的渲染框架 V1（2026-10-24）

## 為什麼人物會看起來膨脹？

真正的 Bloom/Glow 會使**高亮像素擴散到物件外緣**，使觀眾看到較胖的*發亮外輪廓*，但它不會改變來源 mesh 的頂點座標、骨架節點或原始剪影。柔焦、厚重衣服、相機透視與過大的高光也會改變視覺讀感。必須以關掉所有光影的**原始投影**和真網格尺寸做對照。

實查現行 `aig-real3d-webgl.mjs`：fragment shader 只有環境/漫射、Blinn 類鏡面高光和 emissive，並**沒有**實體 bloom blur／threshold／HDR composite framebuffer。舊 `aig-real3d-human-bridge.mjs` 有依 body-build 調整腰寬和厚度的規則。舊程序性人體已遭使用者明確淘汰，不能修平滑後再報外觀 PASS。

## 統一 RenderGraph（先給 3D 體型正確的框架）

```
真實來源 OBJ / GLB / 掃描（原始檔 SHA + 授權來源）
   ↓
Geometry Gate（原始 XYZ / mm / up-axis / 頂點 / 面片 / 身高 /
               軀幹、手指、頭臉、足部是否存在；不靠平滑修補）
   ↓
G0｜Raw Silhouette（黑背景純白不發光人體）
   ↓
G1｜Neutral Normals（法線方向 RGB，觀察接縫／翻面）
   ↓
G2｜Flat Albedo（不加燈光、保留基礎色）
   ↓
G3｜Neutral Lit（單燈 + 環境光 + 普通高光；與相機固定）
   ↓
G4｜Textured Material／Skin + Rig（來源 UV/貼圖/蒙皮，需另施工）
   ↓
G5｜Film Color + Selective FX（科幻燈牌／引擎／星門的局部 glow）
   ↓
Encode（時間軸／字幕／音軌／MP4 or WebM；不得冒稱已實作）
```

### 強制原則
- G0/G1/G2/G3 固定 **同一幾何 SHA、身高、正交相機角度、縮放與幀座標**。前/側/背/斜四視角必須有截圖 PNG 與幾何比例表。
- 所有外觀品質檢查**預設關閉** bloom、dof、motion blur、chromatic aberration、glow halo，且不得把皮膚或人體邊緣作發光遮罩。
- G0 的前視寬/高、側視厚/高是**幾何外包盒比例**，可協助指出問題，不等於醫學量測、真人外形正確或苗條／肥胖判定。
- 鏡頭採 **Orthographic 正交** 用於判斷比例；電影鏡頭可再選透視，但不能用變焦的畫面來取代人體比例驗收。
- 先分清人物胸腹/骨盆/四肢/手指/足部真模型；人物穿厚重科幻盔甲應另外判定「衣裝厚度」，不能把外裝當肌肉結構。
- G5 若日後施工，需用「emissive mask + highlight threshold + 半徑/強度上限 + scene-only composite」，僅用於星門、引擎與燈具。人物邊界在 G0 和 G5 各自另取 mask 比對，超出容許的亮暈像素必須報警，不可認定真幾何變粗。
- 完整人物外觀需要人眼/參考圖片多角度驗收。**測試素材若是程序非人體，所有自然人體 PASS 一律 BLOCK。**
- RGB 幻彩邊框是 UI skin，不能混到人體模型的幾何判定，與 RenderGraph 各自獨立。
- 1080p／60FPS 是**優化目標**，需用實機 GPU/CPU 帧時與記憶體量測，不以沒有載入正式人物的 benchmark 冒稱實際已達標；2K/4K 只能在硬體與編碼器真成功後開啟。

## 本次實際完成的基礎設施（未部署正式網站）

1. 共用 WebGL shader 增加 **`setInspectionMode('LIT'|'SILHOUETTE'|'NORMALS'|'ALBEDO')`**，預設 LIT 兼容既有頁。修改的是 fragment color 分支，沒有更動 `aPosition`、`uModel`、骨架或網格。
2. `aig-real3d-render-inspection.mjs` 不修改任何頂點，只讀取實際節點世界坐標計算 XYZ bounds、正面寬高比與側面厚高比，並產生固定正交相機參數。
3. 獨立施工工具 `aig-real3d-render-inspection-lab.html`，允許本機 GLB、實測身高，真正 WebGL 輸出「正面原光照／正面純輪廓／正面法線／正面無光照材質／側面純輪廓／背面純輪廓／45°純輪廓」七張 1080×1920 PNG＋SHA。來源不傳雲端。
4. Node 源碼 Gate + Playwright 實 GPU Gate，使用明確標示為**非人體**的 GLB fixture；目的是驗證 Frame 不會因光影模式更換而偷偷改變來源尺寸，不能取代真人外觀驗收。
5. 使用者已核准的 Desktop/Mobile《星際之旅》RGB 介面保持原樣，既有 AIG-II、AIG Studio CNC 3AX–6AX/NC、Render LIVE 不修改。PR Draft，真正式 Runtime 發布另依 Gate 執行。

## 下一個正式外觀 Gate

拿一份有權利、可溯源的原始真實完整人體 3D，和可靠外觀參考圖對照：
- 正交投影同尺寸 G0 輪廓，審查腰、手、腳、頭臉的真實比例。
- G1 法線與開放邊、互穿、接合錯誤。
- G2/G3 膚色、凹凸與暗部。
- 通過之前**完全不開 Bloom，也不進人像動畫驗收**。真 3D 人體仍 BLOCK。
