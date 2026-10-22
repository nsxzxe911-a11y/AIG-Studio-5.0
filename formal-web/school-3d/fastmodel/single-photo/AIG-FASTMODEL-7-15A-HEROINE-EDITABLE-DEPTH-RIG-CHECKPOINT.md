# AIG FastModel 7.15-A｜女主角頭髮、臉、頸、相對深度與骨架／衣物幾何 — 正式施工斷點

日期：2026-10-23（Asia/Taipei），第三專案繼續前進，舊 7.14 源圖/功能不撤銷。這份是**真實已落盤的程式**，不是空施工單。

## 原始資料及已鎖的女主角
原來源 manifest `aig-heroine-source-20261020.json`：`櫻花校園的青春時光.png`、1672×941、SHA-256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`。其為多場景插畫拼圖，主角色 ROI 340/25/662/916，只能作身份與 RGB 來源參考，**不是**經標定的 3D 深度。

## 7.15-A 這輪真正新增的五項功能
1. `aig-heroine-candidate-7-15.mjs`：沿用上一版人工確認分區 `AIG714_REVIEWED_SEED_RGB_REGION_V1`，針對頭髮/臉/頸周界按顏色梯度與相鄰異部位降低可信度、保留未知洞，不假裝頭髮與櫻花或陰影已完美識別。
2. **分離深度**：`depth_estimated` 只存單圖的相對隆起/圖像 Z **無量綱**，`source_type=SINGLE_IMAGE_ESTIMATE`，未觀測像素為 NaN；`depth_measured` 僅從 `AIG_FASTMODEL_7_13_METRIC_RECTIFIED_STEREO_MESH_MM` 可信頂點映射取 mm，`source_type=CALIBRATED_STEREO_MEASURED`。缺測資料不能被估計填寫進 mm，雙深度可下載獨立表內兩組 sparse 值及原來源。
3. **真正 3D 編輯草模**：原照片色彩映射到立體網格面，髮型、臉、脖子、外套、襯衫、裙子、背包等分類生成各自獨立 Three.js BufferGeometry，不互相焊接；只生成有可靠分區的正面三角面，保留孔洞。不同衣物候選厚度無真實量測，需待後續多角度掃描。
4. **骨架候選**：17 個 editable 關節（頭、頸、胸、骨盆、雙肩/肘/腕/臀/膝/踝等），介面允許修改 X/Y 並 copy-on-write 保留前一版。它們是圖像比例的候選定位，不是已綁 Skinning/物理 3D 人體骨頭。
5. `aig-heroine-candidate-ui-7-15.mjs` + 原 `metric-stereo-studio.html/mjs` 實際接通：可按鍵從單張女主角照片生成旋轉 3D 草模、導出估計/實測深度 JSON、骨架/服裝 JSON、真 GLTF2 可編輯草模 GLB（檔名 **NOT-1TO1**）。匯出 GLB 使用局部相對坐標且在 extras 註明不是實測的實物比例，任何原 7.13 經校正的毫米 GLB 保留獨立，不被草模覆蓋。

## 回歸／Gate 證據
- 新 Node：`tests/aig-heroine-candidate-7-15.test.mjs`，真正 source-safe hair/face/cloth 三角面、兩類 Z 永遠分開、骨架節點 copy-on-write、非法來源拒絕。
- 新 Chromium 全流程沿用 `tests/aig-heroine-scan-7-14.real-browser.mjs`，擴充單張 RGB→3D GLB／可編輯 neck→雙深度 JSON，再跑已校正雙照 GLB，檢查測量深度與單照估值共存。
- GitHub draft PR [#34](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/34)，Actions [#39844335719](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39844335719)。建立本記錄時仍在執行，**禁止提前聲稱 7.15-A 全部 PASS**。
- 正式 Render 網站舊工作區沒有被這次的實驗修復分支整包覆寫。Android APK／Windows EXE 也未因此自動生成。

## 下一個已入庫的獨立優先工作
之前核准的 `2D → 自動 2.5D/3D → 使用者文字敘述動畫`（FastModel One-Image Auto Motion）仍保留為下一個功能階段；不得用本輪的 skeleton candidate 冒充已完成的揮手、行走、蹲下、嘴形對話及完整 3D animation rig。下一階應將分開標示的 depth + mesh + joints 逐步接上可逆 Skinning/姿態動畫與 storyboard command runtime，再新增文字工作區。要維持深度來源、真 GLB 和真人比例的不確定性標籤。
