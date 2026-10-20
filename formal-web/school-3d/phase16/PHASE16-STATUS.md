# AIG School 3D — Phase 16 細髮束／髮尾漸層（技術候選，視覺未核准）

2026-10-20；接續 Phase 15 Commit `1ca42ff62986e34e86616005d967b31f76cc5ab7`，原 Render 正式首頁 / APK / EXE / CNC 均未改動。

## 真正完成

- 在 Phase 15 已存在的 88 組 `True3DHairCard` 網格內將每組改為 **6 片更細的 3D 子髮片 primitive**，總數 **528**。不是把粗髮片保留下來再疊加；真正 mesh primitive 內容已替換。
- AIG 自寫生成程式，沒有使用第三方人物模型／已授權建模軟體。來源圖 SHA-256 為 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`，輸出 exact SHA 防漂移。
- **平均子髮束幾何寬度 0.33129 原圖像素；最大 0.60555 像素**。每條沿 13 截面向髮尾縮小 90%，比 Phase15 88 片粗髮片小得多。這是原圖座標系寬度，不等於 S23 顯示器上的單像素寬度。
- 新增 **一張自寫 PNG RGBA 柔化遮罩** (64×256，GLB 二進位內嵌)，PBR 材質使用 `alphaMode=BLEND`，髮片邊界與髮尾透明退場。不是預先生成的商用髮型紋理。
- 保留全部 18 個原 Phase13 人物網格 descriptor 和 Phase15 GLB 二進位前綴；保留 176 個現有髮束骨骼關節及真 GLB 動作。**6 根小髮束共用原 2 個關節**，因此是幾何細分，不是假稱 528 套獨立髮絲物理。
- 12 個本機 `unittest` 對核准圖／真正 GLB 通過。相同 12 項測試對**自行生成的合成圖**也通過，可用 GitHub Actions 自動重建驗證。
- 真正 GLB 累計：106 meshes、hair 528 primitives、新細髮片 52,800 triangles / 27,456 vertices；輸出 6.4 MB，SHA 參見 `out/build-report.json`。
- 照片參考 vs Phase15 粗髮束 vs Phase16 528 細髮束真正骨骼變形投影對照圖，及基於真實 GLB 頂點／骨架動畫讀回的動作測試 MP4。這些證據是 **CPU 中心線投影技術圖**，**不是 GPU/PBR 的電影級實機渲染**。

## 驗收界線

**結構／尺寸縮小／來源 SHA／真骨架動畫的測試 PASS，不代表外觀 PASS。** 實際畫面仍有大 V 字髮流、根部結構生硬、沒有額前瀏海層次及真正臉部拓樸。2.5D 背面形狀為人工推定，沒有 AI 臉部推論模型。每個 bundle 6 primitives 也可能影響 WebGL draw calls，需要 S23/Windows 4K GPU FPS 測試。

第三方角色：無；正式 AIG 網站：不部署；PR #12：草稿；Authority：`PREVIEW_ONLY_NOT_PRODUCTION`，VISUAL FAIL。

## 下一階更值得做的部分

優先修「V 字髮流」和頭皮覆蓋：將前瀏海／側面／背面 3D 髮束中心線按核准原圖重新描出，減少髮根空隙與穿透，再針對瀏覽器透明排序、髮束彈性與 FPS 做實機驗證。