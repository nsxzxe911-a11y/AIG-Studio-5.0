# 第三專案 FastModel / Real3D V107｜五軸 XYZ＋A 翻轉＋B 360°・腳至頭頂逐層繪製

**研發範圍：第三專案「AI 模型／繪圖渲染引擎」，非第二專案 Fanuc CNC 真機運動。** 承接 Draft V106 真來源照片 Alpha→CAD 輪廓→GLB 工作副本；V107 只把使用者提出的虛擬五軸可視化及真來源逐層顯示加入渲染端。不能把可旋轉的模型冒充為已從單張圖推得自然頭髮、手腳或背面人體。

## 真機構／座標概念

- 上方 **XYZ 三軸**：固定 CNC 右手原點 `X/Y/Z`，Z 軸上下；只改 Real3D *觀察相機*的位置，不移動下方模型轉台（也沒有 Fanuc 控制訊號）。`[Xr,Yr,Zr]=[Xc,Zc,-Yc]`，保留 MM 或 METERS 顯示來源比例。
- 下方 **A 軸**：虛擬搖籃上下翻轉，在 CNC local X / Real3D X 軸旋轉。
- **B 是 A 的子軸**，安裝在 A 的局部 CNC Z / Real3D Y 軸。實際模型姿態由**同一 GLB 的 GPU Model Matrix** `T(pivot)·Rx(A)·Ry(B)·T(-pivot)` 控制。B=0° 與 B=360° 合模一致；當 A=90° 時，B 局部軸應跟著變為 Real3D +Z，而不是留在全域 Y。
- A ±180° 是**虛擬 UI 試驗行程**、B 支援 0°～360° 全周。沒有獨立驗證的機台軸限位、體積包絡、機械碰撞、治具干涉與 Fanuc 安全證據時，不能說 A/B 物理設備可如此連續動作。

## 腳→頭頂的真正 GPU 逐層可視化

- 每個來源 GLB 真 indexed mesh 的 **原始世界 Y 高度**（Real3D Y-up ≡ CNC Z-up）在載入時稽核出 `minY/maxY`。高度進度 `p∈[0,1]`，裁切面 `minY + p(maxY-minY)`；渲染器以原始來源坐標轉 GPU uniform `uV107OriginalModel` 後在 fragment shader `discard` 尚未到達的更高部分。
- 裁切以**旋轉前來源坐標**為基準；A 翻轉或 B 旋轉不會更動腳→頭順序。GPU 不建立新頂點／三角形、不更改原本頂點法線、indices、UV、材質、不重貼圖。
- 真來源可以是人物、動物、飛船、CNC 工件的已授權 GLB；「腳／頭」只是**方向順序**，不是從一個 box 取得真人自然足、臉部、頭髮或完整背面的證據。
- `createAIGReal3DV107IncrementalStage()` 真 callback：逐層前進、暫停／取消、續接、重設、進度跳至指定位置，保留來源 SHA 和 scene revision。瀏覽器逐層播放透過 requestAnimationFrame，並限制每層間隔避免 UI 重複高負載。非同步 AI 重建 Worker 不被本模式阻塞。
- GPU 4K 既有 V96 路徑須保留 true native 3840×2160；若來源是 CNC MM，4K metric working scene 的 A/B pose 位移也必須精確 1/1000，預覽與真 4K 後恢復舊模型 stage，不產生污染。

## UI 與證據

原 V99／V104～106 Real3D **獨立研究工作頁**新增 XYZ mm 數字、A/B 滑桿、腳至頭逐層進度、播放、單步、暫停、繼續、全顯／重設，所有按鈕必須呼叫真 WebGL rendering。現有定版圖與 RGB HOME 不得替換。

**Node Gate**：真來源 Indexed XYZ、SHA、單位換算、A 父 B 360° 零位等價、A90/B90 非交換坐標、裁切高度不受 A/B 影響、工作原模型不改、停止／續接、安全限制明確 BLOCK。

**Chromium GPU Gate**：真的 GLB 與參考 PNG 來源 bytes、12-face 測試模型、不同 A/B 角與 partial/full 高度的實際 WebGL image SHA、UI XYZ 真 callback、從腳到頭播放暫停／續接、報表與 artifact screenshot；測試盒不是女主角，也不是原圖 1:1 真人幾何品質 PASS。

### 發布規則

Draft only。Node 或 Chromium Gate FAIL，維持 BLOCK。未完成真來源解剖、真照片深度、多視角掃描證據，不得宣稱真人自然頭腳／AI 1:1 重建／真 CNC 5軸機構通過。**不部署正式 Render、不覆蓋 AIG-II/CNC 主站、不改 Fanuc、APK/EXE 不出假包。**
