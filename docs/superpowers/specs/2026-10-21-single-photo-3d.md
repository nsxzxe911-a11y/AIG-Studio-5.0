# FastModel 2.7：單張照片到可播放的 3D

目標：使用者選一張 PNG/JPEG/WebP，按一次生成，由程式接續真正的神經網格生成、PBR 材質、人物骨架與動作，下載 GLB 並在相容的光柵 PBR viewer 播放。這是新後端與正式 UI 流程；不修改 2.6 固定來源的舊流程。

選擇：以 Meshy 官方 Image-to-3D → Rigging → Animations API 作可替換的第一個真重建後端。沒有模型權重、GPU 或 API 帳戶時，顯示未連接，不製造替代模型。現有工具無 Meshy/Tripo 連接，執行環境無相應金鑰或 NVIDIA GPU；本輪可驗證程式與合成協定流程，不能驗收真照片生成品質。

PNG/JPEG/WebP 不限制既有 1672×941 構圖或手動 guides。保留原檔，另存 EXIF 轉正且最大邊 2048 的上傳 PNG；來源 SHA 與實際上傳 SHA 分開紀錄。人物動作要求完整單一人形；一般物件模式生成模型並使用明確標示的相機環繞展示，不宣稱物件有骨架動作，動植物、多人、局部臉像不保證綁定成功。

服務端從 MESHY_API_KEY 讀憑證，不送往瀏覽器或紀錄；生成由使用者的生成按鈕明確觸發並顯示上傳 Meshy／消耗帳戶點數。任何重建服務的實際試跑須有可用帳戶；本輪不購買點數或建立付費資源。

任務記錄永久保存每段 task ID，斷線後 query 舊任務，不重複 POST。送出前寫 SUBMITTING；若 POST 結果未知則停在 SUBMISSION_UNKNOWN，提供 attach 已知 task ID 的恢復方式，絕不自動重送計費。下載錯誤可重試已完成任務。失敗保留來源及已成功模型。

GLB 必須有真 POSITION／三角面及非零 XYZ 範圍，人物輸出需 skins、weights 與會變動的 animation keys。檢查是結構證據，不等於拓樸焊接、照片保真或擬真驗收。輸出與 UI 一律 releaseAllowed=false、inferredUnseenSurfaces=true。

viewer 使用 MIT 的 Three.js／GLTFLoader／AnimationMixer 支援普通模型、蒙皮、translation/rotation/scale/morph、PBR 材質；固定 dependency 版本並以 esbuild 打包本機 JS，不載入 CDN、第三方人物或外部環境圖。支援片段／暫停／相機與獨立下載 GLB。匯出 viewer 可離線播放，生成階段需網路。保留既有 AIG RGB 黑底繁中／主視窗優先／錯誤隔離。

驗證：測試先失敗再實作；真本機 HTTP 協定 fixture 驗證 task chaining、重啟續接、不重送、無金鑰阻擋、失敗模型不消失及 GLB 結構拒假；Three.js 測試使用真正 GLTFLoader/AnimationMixer 驗證輸出 translation/rotation/scale/morph 姿態；瀏覽器若可用再驗真 UI。原來源 Gate 保留，PR Draft，不部署正式網站/APK/EXE。
