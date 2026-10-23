# AIG Real3D 人體曲面淘汰／續階紀錄（2026-10-24）

使用者提供原 AIG 網站實際畫面，明確指示「淘汰～下一個」。

## 退役（不再列為正式人體候選）
1. Stage1 分段 loft / capsules joined as independent meshes: 真人外型嚴重分段；
2. SDF Smooth Union: 真 scalar field、閉合，但渲染顯示沒有正常頭部臉型、肩胸過硬、手腳球化；
3. Metaball Gaussian: 真 continuous implicit skin，但整體更像橡膠假人。

上述引擎仍可保留 CNC 布林或特殊效果的實驗代碼，但**不作 Real3D 人體外觀預設候選**；若沒有明確重新授權，不再用加三角形、畫質提升、修文字標籤來假稱自然人體完成。

## 2026-10-24 下一階
- 人體完整正面輪廓控制籠（scalp／jaw／neck／shoulder／arm／palm／thumb／torso／hips／two legs／sole／toes）明確設計，不依 SDF／Metaball 的球體組裝；
- 用真正單一連通、閉合 3D 模板籠構成含前後厚度的表面，支持 height / build 直接改動真正 XYZ 幾何；
- 同源 Template Morph 與細分 Subdivision A/B（來源 Node test: 男女各 template 11776、subdivision 84992 triangles；1 component、0 nonmanifold edges）；
- 共用前階 19200 個**邏輯工作槽**，真 CPU Web Worker + 唯一 WebGL context，正面正交 1080x1920 PNG SHA；
- 必須直接從 Chromium 真 GPU 擷取男/女兩種方法共四張圖片後檢查外觀才能下結論；沒驗證就 BLOCK；
- Template 目前是自行設計的立體控制籠，不是真人 1:1 掃描，未實作完整 21-bone natural skinning，也尚未做 4K/45 度；
- 開發 Draft PR #47，不覆蓋正式 RGB 首頁/CNC/其他案程式，實測通過且獲同意才將研發比較頁安全加到原網站。
