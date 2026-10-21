# AIG FastModel 5.0 — 真全身 GLB 骨架與胸頸頭連續蒙皮 Gate（Draft）

## 目的與範圍
由 FastModel 4.9 向前升級，不修改或覆蓋 4.5～4.9 幾何、腳本、真音訊、音樂、音效或影片錄影。
4.9 實際只對技術頭頸與馬尾 GLB 的三角面做抽樣接觸檢測，**不是完整人體**。
5.0 不再冒用 4.9 草模來宣稱生成女主角，而是增加能接收真正完整人體 GLB 的獨立、失敗即阻擋的 QA 入口。

## 已實作的本機流程
1. 正式 RGB 頁用 `aig50-input` 選擇全身原始 GLB（上限 40 MiB）；讀檔計算真正 SHA-256，不上傳至第三方，也不寫回 4.9 或正式檔案。
2. 呼叫既有 `parseRiggedGLB`：檢查真二進位 glTF 2.0 Header、JSON 來源與嵌入資源安全性，再用 Three.js `GLTFLoader` 回讀。拒絕外部載入 URL。
3. `aig-fullbody-5-0.mjs` 檢查 **15 個具有實際 Skeleton Bone 身分**的主要人體骨骼及關節上下游階層，包括頭、頸、胸、脊椎、髖、雙手臂／前臂、雙大腿／小腿／腳。
4. 逐頂點檢查真正的 `JOINTS_0`／`WEIGHTS_0`、權重總和、索引範圍、非有限數；拒絕超預算網格。不用貼圖顏色或名字假裝網格已接合。
5. 對實際 indexed triangles 建連通分量，只有在同一個 SkinnedMesh 連通分量中能找到足夠的**胸、頸、頭骨骼權重**，才報告 `shoulderNeckHeadActualSharedIndexedComponent:true`。它證明索引路徑相連，不等於皮膚視覺品質通過。
6. 使用實際 `AnimationMixer` 設定每段動作的起點／中點；通過讀出的 `SkinnedMesh.getVertexPosition()` 比較真正幾何位移。沒有有效動畫位移不會假稱真動畫完成。
7. 真 Button ID：`aig50-run` 觸發、`aig50-report` 下載完整 JSON，`aig50-status` 顯示缺骨／拓樸／動作結果；原有各頁獨立運作，不因 5.0 BLOCK 清空。

## 邊界與不可過度宣稱
- `STRUCTURAL_QA_PASS_ONLY` 是結構層級，不是正式女主角 Gate。來源是否與使用者指定人物照片相符、臉型皮膚、透明髮絲、角色前後視角、實際有聲影片以及 Windows／Android 實機 60 FPS 都**沒有驗收**。
- 指定角色的全身完整模型並未因這次提交自動生成；需要真實來源 GLB 才能執行本機 QA。
- 胸頸頭共享索引分量無法保證骨骼變形後皮膚無接縫，也不保證別的物件（衣物、馬尾）不穿透或頭髮沒有自交。5.0 不執行物理髮絲碰撞，也不寫出自動接合後的全身人物 GLB。
- 目前無經人工核准的正式人物 GLB，故 `formalCharacterApproved:false`、`releaseAllowed:false` 固定保留。
- GitHub Push source Gate PASS、PR Gate PASS、Render LIVE、APK、EXE、GPU／FPS 為完全不同的證據層級，不能互相替代。

## 驗證
- 5.0 測試建立具備真 Three.js `Bone`／`Skeleton`／`SkinnedMesh`／`QuaternionKeyframeTrack` 的 **合成全身**（絕非正式角色），驗證正例中的胸頸頭實際連通、骨架階層、合法權重與動畫位移。
- 缺骨、損壞權重、錯誤階層及 SHA 不符應 BLOCK；UI tests 強制 Button IDs 與真 callback 並保留 4.9 舊流程。
- 必須以最後 commit 的完整 GitHub Actions 完成紀錄才能宣稱來源 Gate 通過；Draft PR #12 未合併，不更新正式 Render 網站或 APK／EXE。
