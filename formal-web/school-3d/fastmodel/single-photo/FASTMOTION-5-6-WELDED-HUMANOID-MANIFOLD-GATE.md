# FastModel 5.6｜肩髖挖孔焊接、閉合索引拓樸與手掌輪廓（技術人體）

## 可信續接點
- 5.5.0 `e0816a8e4b26d254672cdff38d08152a5c127854`，GitHub Actions #39527483187 completed/success，90／90。
- 本階只向前升到 **5.6.0**，保留獨立的 5.5 生成器、所有 4.0～5.4 來源完整性證據，以及 4.9 劇情／語音／音效／音樂／影片功能。
- 所有建置仍位於 AIG Studio 5.0 Draft PR #12；尚未成為正式 Render 網站、APK 或 EXE 的實際部署證據。

## 5.6 真正修改的 GLB 幾何
1. 新檔 `aig-native-body-5-6.mjs` 與舊 `aig-native-humanoid-5-5.mjs` 分離。從 5.4 真來源 SHA 和已核對的 4.0 自研圖片輪廓比例衍生獨立 5.6 技術模型，無第三方生成服務。
2. 5.5 的部分肩髖只用 3 個三角面從軀幹連到肢體，並留下可能重疊的 torso quad。5.6 在左右肩、左右髖各移除 **2 個高度段 × 4 個周向段**的 torso 面，形成 **12 條真邊**的開口，再把開口逐邊接到肢體第一圈的 **12 頂點**。真正使用共享 indexed vertices；不存在只靠外觀遮掩的貼皮「接縫」。
3. 軀幹上緣／下緣增加中心封口 indexed triangles。新增手掌末端兩圈幾何；四肢不再只是一段細長線或懸空棒。
4. Gate 檢查 **每個 indexed 三角面有效、每條無向 edge 恰有兩個 incident faces、兩個 face 的邊方向相反、所有 body 頂點必須被索引使用、整個 body 必須是單一 connected component**。不能用數個各自封閉的假人體盒子冒充一整張身體。
5. GLB 仍有真 Skeleton、17 bones、`JOINTS_0`、`WEIGHTS_0`、四段 quaternion bone clips；由真 GLTFLoader 回讀並跑既有 5.0 `STRUCTURAL_QA_PASS_ONLY` 骨架位移與頭頸胸檢查。5.1 實際髮束／肩頸碰撞依然獨立，不會因 closed indexed topology 就自動放行。
6. RGB button IDs：`aig56-build`、`aig56-report`、`aig56-status`，必須是可點真 callback。只有原 4.0 任務完成且 5.4 來源驗證通過才可生成。成功下載 `AIG-5.6-NATIVE-JOINT-WELDED-SKINNED-TECHNICAL.glb` 和來源 SHA、網格邊數／面數／5.0 測試 JSON，並使用既有真 3D 播放工作區播放。

## 不可誤稱的限制
- **拓樸水密**意指一張索引曲面沒有邊界、沒有重複孤立元件，**並不能證明幾何零自交、沒有互穿、動畫中不拉裂、法向永遠正常或物理材質真實**。
- 沒有新增真正的臉部影像還原、五官辨識、合格的指尖／手掌骨骼、關節生理活動限制、裙裝衣料物理、背面照片驗證或真正透明髮絲碰撞。手掌仍只是改良技術形體，非真人手部掃描。
- 輪廓尺寸只有整體來源長寬比約束，**頭／手／腳的人體尺寸為 AIG 程式推估，不是來源照片的測量證據**。
- 17 骨＋四段動畫是技術動作，不是完整打架編排；未證實正式女主角外觀、人臉/制服匹配、原生 Android + Windows 60FPS、真機持續效能或正式 1080p 有聲成片。
- 5.3 統一 Gate 的人物人工審核、實機性能、正式影片仍 BLOCKED；`formalHeroineApproved`、`releaseAllowed` 均不可因 5.6 通過而變 true。

## 測試
- Node 真 GLTFLoader 回讀 GLB，分辨 BODY／馬尾真 SkinnedMesh、17 節 bones、四段 quaternion clips。
- 5.0 骨架／肩頸頭共享 indexed surface 與骨骼 pose move 通過。
- 5.1 真動畫五姿態碰撞測試独立取樣，不以自研 5.6 topology 混充 collision SAFE。
- 附加錯誤 40-vertices／十個相互獨立封閉 tetra 的 case，確認即使每條邊恰好出現兩次、單獨水密，**整張 body 不連通也必須 BLOCK**。
- 5.6 UI 按鈕真 callback、來源 SHA、原版 5.5 生成器與所有原有影音功能保留。
- 最後 commit GitHub Actions 全部 completed/success 才是新的可信 5.6 Source Gate 斷點。
