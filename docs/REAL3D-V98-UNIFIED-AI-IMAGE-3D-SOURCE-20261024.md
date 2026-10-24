# Real3D V98｜AI 繪圖與真 3D 模型共用來源核心（2026-10-24）

已施工於 AIG Studio 5.0 GitHub Draft PR #98，base 為 V97，正式 RGB Render、CNC/Fanuc、APK/EXE 都不變。

## 為何要這一階

V97 可以將照片色彩輪廓修正為 3D 頭部候選；V96 可以輸出真正 3840×2160 4K Frame Buffer，但之前 2D AI 圖資與 3D 模型欠缺**同一份原始身份／座標／來源證據契約**，也欠缺外部可觀察特徵反向校正與動畫重綁。

V98 不重新做一具新假人體，不用 SDF、Metaball、Template Morph、Subdivision 或單純增加三角面自稱畫質改善。

## 已完成的程式及契約

1. `aig-real3d-v98-unified-source-projection.mjs`：共用 PERSON／ANIMAL／SHIP／ENVIRONMENT／CNC_PART 五類來源；`assetId`、來源影像 SHA、來源 3D SHA、每個實際 Indexed XYZ 節點／face-count、相機和照片視角資料。來源和 AI 預估視角分開標記。
2. 3D→2D：依真正場景世界矩陣及正交／透視相機投影到照片像素，輸出真正源頂點投影及網格線。相機鏡頭、像素寬高、原始 node IDs 與 vertex IDs 固定，沒有重新 AI 生成新圖片。可計算每個觀察特徵在像素的真 RMSE。
3. 2D→3D：`aig-real3d-v98-projection-fit.mjs` 針對可驗證的 `OBSERVED` 照片點 ↔ 原始網格 vertex ID，用正交相機線性投影雅可比求有界的原始 XYZ Working Copy 修正。要求新 RMSE 真正下降、面索引與源網格不變，退化／翻面則 BLOCK。估計側背面不能用作真實校正證據。透視鏡頭只有比較路徑，不會謊稱相機已標定的 inverse fitting。
4. 修正完即重綁 V92 原六關節骨架及既有影格動畫，無需重造人物源模型；Working Copy 可繼續讓 V96 Native 4K GPU 檢驗或由 V97 morph GLB 入口匯出。
5. `aig-real3d-v98-ai-3d-bridge.mjs` 復用 V97 肩部照片輪廓候選，統一動畫、模型、影像 SHA 與 4K 檢驗；飛船、建築／場景、動物及 CNC 應輸入其真 Indexed XYZ 來源幾何，而非用橢球人體代替。
6. 正式隔離繁中研究頁新增「V98 統一 2D/3D 投影」、「套用觀察點校正與骨架接軌」和真 3D source wireframe canvas、外部觀察點 JSON。這些都有真程式回呼。需要使用者提供對應點時會明白提示，不偽造外部相機證據。

## 可操作的照片／網格頂點對應格式

請先上傳照片、建立 V97 候選。以下 JSON 中 imageSha256 必須填真來源 PNG 的 SHA，頂點 ID 需與真正 Working Copy 對應；手工標記／本機實際 ML 輸出均需附來源、可信度。

```json
{
  "imageViews": [
    {
      "viewId":"frontPhoto",
      "imageSha256":"原始照片的64碼 SHA-256",
      "width":256,
      "height":256,
      "sourceVisibility":"OBSERVED",
      "landmarkSource":"USER_MARKED",
      "camera":{
        "projection":"orthographic",
        "yaw":0,"pitch":0,
        "focus":[0,0.84,0],
        "orthoSpan":2.15,"distance":4,"fovDeg":55
      },
      "anchors":[
        {"nodeId":"bodyCandidate","vertexIndex":400,"xPx":100,"yPx":100,"confidence":1},
        {"nodeId":"bodyCandidate","vertexIndex":800,"xPx":120,"yPx":150,"confidence":1},
        {"nodeId":"bodyCandidate","vertexIndex":1500,"xPx":150,"yPx":200,"confidence":1}
      ]
    }
  ]
}
```

上面 anchor 數值僅是**格式範例**，不是已觀察的女主角標記！沒有正確的照片-頂點對應不能要求正式精度 PASS。

## Gate 與還沒突破的限制

GitHub Actions V98 測試證明的核心是：五類來源共享 2D／3D 合約、獨立原始三角面不被改壞、真觀察點像素誤差下降、骨架重綁、Chromium 真 WebGL 3D 串流，以及 V95-V97 回歸不回退。來源與 GPU 完成狀態必須看對應 CI run，不能預先寫 PASS。

這輪**沒有權限直接取得 ChatGPT 影像生成模型的內部神經網路權重／特徵張量**，因此不能宣稱「現在 AI 畫一張女主角就能直接得到 1:1 真人臉」；V97 仍採非深度學習的影像色彩啟發式。要突破下一項外觀瓶頸，須有可用、授權的本地人臉／髮絲／深度模型及清楚的介面，或經驗證的掃描／多視角來源。單張圖片背面與視角不確定性必須標示為 AI 推估，不是自然真實度 PASS。

另尚未完成的項目：真實女主角臉部特徵相似度量化、髮絲及服裝自然曲面、PBR/HDR 光學認證、完整 4K60 動畫電影、2:12:08 全片輸出、Android/Windows 雙平台實機 Gate；一律 BLOCK，不能把 Source Gate PASS 當成以上完成。
