# AIG Real3D 極速 V89｜多視角真照片 UV 逆向投影（Draft）

2026-10-24。基於 V88 已通過 Source + Chromium real-GPU Gate 的固定共用 shader，加入**可見表面照相觀測**，而不是替各種電影材料反覆改 shader。

## 真正的功能範圍

- **來源不變：** 僅讀取原始已匯入的 Indexed XYZ/normals/faces 與來源一致的 V88 UV0 per-vertex sidecar。模型頂點和三角面保持原樣。原始 OBJ SHA、UV 檔 SHA、相機清單 SHA 與 1～6 張實拍 PNG/WebP 的逐檔 SHA 納入 Gate。
- **校正相機投影：** 每個來源照片提供已知攝影機 position/right/up/forward、fx/fy/cx/cy/near，投影到真實 XYZ。軸必須正交且右手攝影機視角方向正確。**本輪不估計相機外參或照片深度**；輸入錯誤必須 BLOCK。
- **真來源深度遮蔽：** 軟體 Z-buffer 使用原始三角面光柵化，拒絕後方遮蔽與背面或畫面外的照片樣本；視角視錐穿越近裁切面、工作量超限時 Fail-closed，不用偽造側壁。
- **共用 GPU Albedo：** 各觀測圖像依朝向權重融合至 UV atlas，交給 V88 的 Albedo shader 與 UV/Tangent buffer；不編造新的頂點、紋理 UV 或新 shader。未看見的原始表面 texel 使用鮮明洋紅 RGB(255,0,255) 表示 UNKNOWN，另輸出黑白多觀測遮罩及逐照片樣本數與整體覆蓋率。
- **真 GPU Gate：** 原始單節點模型必須在 native WebGL 640×640 真實讀回並與套用新 Atlas 後畫面 SHA 不同；只新增 2 個 UV/Tangent GPU buffer 與 1 張來源 Atlas GPU texture，不重建 XYZ/normal/index buffers。
- **資料界限：** 僅單來源 GPU chunk（多節點尚無全場景遮蔽），每張照片 4～512 px、<=2MB、最多 6 張，atlas 64/128/256，單個 mesh <=100,000 個 triangles，深度/UV 光柵的運算量有硬限制；不是 4K 完整電影照片重建。
- **不代表：** 來源照片或相機姿態經第三方測繪認證、任意單張圖完整 3D、照片 1:1 真實度、皮膚次表面散射、皮毛體積、布料動力學、透光折射、材質自動辨識、完整 3D 重拓樸、人臉辨識、Windows / Android 性能門檻或 CNC 實機安全 PASS。

## 來源檔格式

### 原始 UV sidecar（直接重用 V88）

```json
{
  "schema": "AIG_REAL3D_V88_USER_SOURCE_UV0_V1",
  "sourceSha256": "<64-hex-OBJ-file-SHA>",
  "uvByNode": {
    "denseIndexedChunk1": [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]
  }
}
```

此範例 UV 陣列僅示範 schema；實際長度要等於**來源單節點頂點數 × 2**，且必須是有效、不重疊的原始 UV0。V89 限 [0,1] 空間；多 UDIM/UV seam 自動展開仍未實作。

### 外部相機 manifest

```json
{
  "schema": "AIG_REAL3D_V89_SOURCE_CALIBRATED_VIEW_SET_V1",
  "sourceSha256": "<64-hex-OBJ-file-SHA>",
  "uvSidecarSha256": "<64-hex-UV-file-SHA>",
  "nodeId": "denseIndexedChunk1",
  "views": [
    {
      "id": "front",
      "fileName": "front.png",
      "imageSha256": "<64-hex-photo-file-SHA>",
      "camera": {
        "position": [0, 0, 3],
        "right": [1, 0, 0],
        "up": [0, 1, 0],
        "forward": [0, 0, -1],
        "fx": 450,
        "fy": 450,
        "cx": 256,
        "cy": 256,
        "near": 0.01
      }
    }
  ]
}
```

- position 使用匯入後的 3D **公尺**與 Y-up 坐標系；forward 指相機看向模型的正深度軸，right/up 為相機影像座標，正交且單位長度。
- fx/fy 是 pixel focal length；cx/cy 以輸入照片的左上角為起點，像素中心為 x+0.5/y+0.5；**相機與原始 OBJ 的對位需在外部量測標定完成**。
- 每張照片都要在 HTML 檔案輸入框選取，檔名與原始位元組 SHA 必須逐一符合 manifest。
- 無深度量測的照片只能以供應的 **原始幾何** 做 Z-buffer，不能證明原始外型已由照片真實重建。
- Atlas 照片色彩採 RGBA 直接加權；**未做 linear-light 白平衡、曝光校正、色彩空間校正或視角自動解算**。色差與接縫仍可能存在。

## V89 Gate

1. Source Gate：至少一個非人體原始兩面網格 QA，單張前視角應該只重投影正面，背面明確 UNKNOWN；加入背面校正相機後需增加覆蓋率，且可拒絕來源 SHA 或遮蔽錯誤。
2. Chromium Real GPU Gate：至少一次以 V89 產出的 Albedo Atlas 接入 V88 WebGL，GPU 真 640px PNG 來源和套圖 SHA 不同；不得新增幾何 reupload。
3. **設為 Draft，不自動合併 V88/V89，也不變更正式 Render RGB HOME / AIG-II / AIG Studio 5.0 CNC / Android APK / Windows EXE。**

下一階候選 V90：來源 OBJ `vt`/UV seam 高保真還原、多 chunk 全場景 BVH 遮蔽與視角批次平行化；必須用實際來源測試再宣稱效能。
