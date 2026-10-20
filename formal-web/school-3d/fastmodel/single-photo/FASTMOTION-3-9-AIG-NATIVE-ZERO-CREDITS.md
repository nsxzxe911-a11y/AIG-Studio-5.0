# AIG FastModel 3.9 — 自研優先、零點數、禁止付費 API 預設路由

## 由產品擁有者指定的正式方向
- AIG FastModel 為 AIG 團隊與 AI 長期共同開發的產品，不能把 Meshy、Stable Fast 3D 或其他第三方照片轉網格模型當作「AIG 自研 3D 核心」。
- **不消耗任何生成點數**。正式 AIG 的 Python 本機 server 透過 `make_server(...)` 預設 `allow_paid_3d=False`。付費重建 `/api/jobs` 與 `/api/reconstruction/jobs` 應返回 `ZERO_CREDITS_REMOTE_3D_BLOCKED`，就算機器上還有舊的金鑰，也不得呼叫第三方。雲端 LLM 與雲端 TTS 也在零點數預設模式關閉。沒有付費失敗後的自動備援。
- 錯誤引入的 `offline3d_service.py`（Stable Fast 3D 執行器）已從此 Draft 分支移除，未部署到 main、Render、APK 或 EXE。自研模式不會偷偷下載外部權重或啟動 Meshy API。
- UI 的「生成」按鈕保持 **disabled**，直到 AIG 自有任意照片→真 3D 核心可以交付真 GLB 並通過完整來源／幾何驗收。不能假裝目前核心可完成未實作的動作；原有的 GLB 匯入、網格掃描、骨架／頭頸／髮束風險檢查及動畫播放繼續有效。
- 此變更只在 PR #12 Draft，並非 production 網站已部署。

## AIG 已自研部分（已核對 GitHub 原始碼）
- `formal-web/school-3d/fastmodel/core/fastmodel.cpp`: C++20 頂點與三角索引驗證、DirtySpan 幾何增量更新、座標摘要。
- `formal-web/school-3d/fastmodel/web/`: WebGL2 GLB 讀取、光柵渲染、真骨架掃描、來源網格遮擋/外輪廓、髮束與頭頸風險、GPU 資源保護。
- `formal-web/school-3d/phase13-17/` 加 `fastmodel/tools/image_to_animation.py`: 指定 1672×941 基準、人工校準輪廓與 88 條髮絲導線，能從核准來源與手動規格生成技術 GLB。其設計明確寫明 **不支援任意照片自動重建**。
- `single-photo/pipeline.py` 之前的任意照片模式則實際**依賴 Meshy**；有可驗證的服務流程程式，沒有自研泛用神經重建模型。

## 下一步的真實研發缺口
1. AIG 自研前景分割與多視角相機校正（由用戶現有八視圖作候選，不能假定各圖是同一準確 3D 幾何）。
2. 真空間幾何體積、表面拓樸、背面／下半身未知幾何推估，而不以 2.5D 厚板、紙片或畫面動畫冒充真 3D。
3. GLB 網格與貼圖及真實骨架輸出；頭頸結合／髮束碰撞／裙擺等需逐姿態檢驗。
4. 專屬的零費用 Runtime 端到端來源 SHA、演算法版本 SHA、真 GLB SHA、Windows/Android 效能測試與 1080p 影片播放證據。
5. 不論開源程式套件是否要付 API 費，也須盤點 MIT/BSD/Apache/copyleft 或非商用模型授權；「零點數」並不等於第三方智慧財產沒有任何授權條件。若使用外部通用程式庫，清楚標註其來源且不得聲稱自研整個函式庫。

## Release Gate
- `noPaidRequest: true`、`externalInferenceUsed: false`、`originalPreserved: true`、`nativePhotoReconstructionComplete: false`。
- 源碼 CI PASS 僅代表拒絕第三方付費與既有核心可測試；不代表已經有任意照片重建女主角的真實 GLB 或完整 1080p 影片。
