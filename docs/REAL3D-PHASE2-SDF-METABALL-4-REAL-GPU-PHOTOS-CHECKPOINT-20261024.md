# Real3D Stage1 — SDF / Metaball 真連續曲面 A/B（2026-10-24）

## 使用者指令
「下一皆」接續「很多種一起測試」與「19200 邏輯槽的繪圖／渲染雙核心2合一」。使用者已明確判定舊 Stage1 **分段三角網格外觀 FAIL**。嚴禁拿原人體分段網格的成功 GPU 繪圖聲稱自然人體合格。

## 研發分支，不部署正式網站
Draft PR #46：https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/46
基於 Draft PR #45 的 19200 邏輯 work-slot CPU Worker + single existing WebGL GPU。
禁止 merge/deploy Render `aig-new-home.html` 正式站或替換原 CNC、APK／EXE；使用者尚未核准新人體。

## 本輪真正完工的技術部分
1. SDF Smooth Union：讀 Stage1 原始男女身高、關節坐標、肩／臀參數，計算真實 analytic ellipsoid/tapered capsule signed-distance field；不是以關節圓柱拼接直接給 WebGL。
2. Metaball Gaussian：使用獨立的 Gaussian density 累積場，非 SDF 改名；修復首次女性雙腳獨立為三個連通區的錯誤。
3. CPU marching tetrahedra：3D 體積 scalar sample → shared-edge indexed XYZ vertices → triangles → smooth normals，真實 vertex connectivity / non-manifold edge Gate；任何未封閉或斷開的表面 BLOCK。
4. 現有 19,200 邏輯 work-slot drawing pipeline + 真 1 browser Web Worker + 唯一 WebGL renderer，每張真正 GPU framebuffer native 1080×1920 portrait PNG / SHA、4 張 male/female×SDF/metaball 同正交 front camera。
5. 新增獨立比較頁 `formal-web/shared-3d/aig-real3d-surface-lab.html` 與上層開發 UI 連結；真正測試按鈕、四張畫廊、每張下載、每張 topology/GPU 狀態。
6. 來源 Node Gate / Browser 4 PNG Gate：GitHub Actions run 39991305330 (2/2 success)，artifact 12516964267，四張驗證 PNG SHA 再檢，原生尺寸均 1080×1920。

## A/B 結果（真正 Node/Browser 量測）
| 性別 | 方法 | 三角形數 | surface components | non-manifold edges | 本階段外觀 |
|---|---|---:|---:|---:|---|
| 女 | SDF | 18044 | 1 | 0 | FAIL/BLOCK |
| 女 | Metaball | 16308 | 1 | 0 | FAIL/BLOCK |
| 男 | SDF | 18144 | 1 | 0 | FAIL/BLOCK |
| 男 | Metaball | 16404 | 1 | 0 | FAIL/BLOCK |

## 實圖人工觀察（不能以技術 PASS 取代）
新 4 張的頭頸／軀幹／大腿接合較舊 18 個圓柱零件型人體連續，曲面連接有明顯結構改善，但仍是簡化人形假人：頭部無自然臉部，下顎和頸仍有不自然比例；肩膀偏寬／胸部平坦；手部沒有真手掌手指；腳部仍呈球塊形狀，膝／小腿過渡欠真實；女性軀幹和骨盆比例不自然。自然肌肉／皮膚／衣服並未建立，不能說完成真人模型。正面照畫面是新生成體積網格，不是女主角 1:1。

## Gate
- **PASS（已證明）**：真的兩種不同體積場、各 1 connected component、0 open non-manifold edges；男性女性共四張真 1080×1920 GPU PNG / distinct SHA；shared 19200 drawing+renderer source/gpu pipeline。
- **BLOCK**：自然人體外觀、人臉、手指腳形、皮膚/服裝貼合、45°相機、新人體 4K/3K/2K 實拍、兒童/老人變體、Foto 1:1、手機/Windows 60FPS、正式 Render 部署/原生 APK EXE。
- 下一輪建議：加入來源品質良好且完整拓樸的 single-body neutral template / morphology 供對照，先頭頸、肩胸與腳型實際正面圖；避免拿球形腳和 faceless 假人做正式風格。
