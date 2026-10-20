# AIG School 3D – Phase 13 自研網格包覆與細骨架轉向

## 開發原則
不使用 VRoid、第三方授權人物模型、商用建模器、Blender 外掛或外部角色服務。原創 glTF/GLB、網格細分、蒙皮綁定、動畫輸出由此階段 AIG Python 標準庫程式自行產出；可視化使用 AIG 撰寫的 Canvas JavaScript，不依賴第三方建模軟體。

## 完成並驗證
- 以已核准的 `櫻花校園的青春時光.png`，SHA-256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910` 為來源；來源不符一律拒絕匯入。
- 定義 6 個只覆蓋原圖主要可見人物的輪廓區域：裙、制服上衣、左右袖、臉與頭髮。範圍為手工近似，需要下一輪可編輯輪廓校正。沒有生成原圖裁掉的腿。
- 原創 ear-clipping + 四分細分三角幾何，完成 18 個 glTF mesh parts：6 個正面、6 個**推定**背面和 6 個推定側壁；10,992 三角面，8,292 個頂點。
- 使用 7 個可見／推定上半身骨架節點（不套 Phase6 原本大骨架尺寸），蒙皮 JOINTS_0/WEIGHTS_0 與 7 個 inverseBindMatrices；骨架**本身無體積**，細線展示寬 2 px。
- 三組真正 glTF 動畫：Head Yaw（左右轉頭 12° 測試）、Left Shoulder rotation、Right Shoulder rotation。讀取生成後 GLB 真實網格，在 12° 頭部旋轉中測到 333 臉部頂點，最大座標位移約 0.05515 自訂單位。
- 實際輸出 GLB SHA256 `ed55b9d69ca7b496551482cf5dd15700cb25088dd225da1d21cfc69d552aeb82`；`trimesh` 作為**外部唯讀檔案解析驗證**，回報 18 個 geometry。建模本身不使用該工具。
- 本地原圖測試 18 項 PASS；CI 合成圖程式測試 10 項 PASS。
- `envelope-workbench.v1.html/.js`：AIG 自製可離線執行的圖片 SHA-256 驗證、網格貼圖變形、細骨架轉向滑桿與網格顯示。JS 靜態檢查 PASS；Chromium 直接開本地 file:// 網址會 `ERR_BLOCKED_BY_ADMINISTRATOR`，但改用 Playwright `page.set_content` 載入完全相同的 HTML＋JS，**實際驗證原圖 SHA、轉頭 8°、右肩 -6°、網格顯示、拖曳輪廓點、輸出修改後 JSON 成功，0 個 JavaScript exception**。這是瀏覽器元件測試，**不是獨立正式 URL、S23 實機或 4K 視覺驗收**。

## 絕對不得宣稱
- **NOT APPROVED 3D女主角**：來源僅一張三分之四視角合成圖。單張圖沒有真實深度、背面髮型、人體背部面數、鞋底及完整雙腿；GLB 的背面/厚度只是 2.5D 工程推定，**不等於真人等級完整 3D 模型**。
- GLB 圖片貼皮在斜轉角度會有拉伸、皺折或背景漏色；現階段不是完整電影畫質、自然布料或髮絲物理。
- 目前不解鎖正式 AIG 首頁、APK、EXE、CNC runtime；PR #12 維持 Draft。
- 雲端 GitHub CI 若沒有來源 PNG，只能生成**合成測試圖**的技術模型，不能假稱核准圖片外觀 PASS。

## 延續工程
接回 Phase10「獨立 GLB 重綁」時，保留這份原圖的網格頂點與比例，先驗證較高精度輪廓與頭髮分層，才將可見部分 7 關節擴充為完整 33 關節。骨架只服從造型，絕不能以舊娃娃幾何替代。先做可編輯網格局部調整、繼續校驗原圖正視與已知側面，不能宣稱未見面的真值。

## 2026-10-20 UI 實測補充
- 修正第一版髮型輪廓誤包天空背景，重新生成 GLB；仍有背景漏色，故編輯模式可拖拉多邊形控制點校正。
- 編輯結果由「匯出輪廓 JSON」保留，利用 `python tools/build_envelope.py --source approved-reference.png --spec AIG-Phase13-edited-envelope-NOT-APPROVED.json --out rebuilt.glb` 重建；所有輸出繼續 `NOT_APPROVED`。