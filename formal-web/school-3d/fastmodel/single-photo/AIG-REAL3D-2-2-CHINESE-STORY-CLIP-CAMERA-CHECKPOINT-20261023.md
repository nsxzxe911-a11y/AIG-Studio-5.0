# AIG FastModel Real3D 2.2｜中文劇本真 GLB 動作、場景鏡頭、字幕與外部資料庫

時間：2026-10-23 Asia/Taipei。接續 2.1 核心與最後可信 repair branch，只向前施工，不將工程殼取代正式 AIG RGB 首頁，也不重建核准女主角原圖。

## 已提交並實作的程式（不是測試規劃）

1. `aig-text-world-storyboard-2-2.mjs`：在瀏覽器**完全離線**解析使用者的有限長度繁體中文敘述（最多 1,800 字、24 行、360 秒）成真 source-bound timeline。可選填時間「0秒 node-1：走路」；動作由現有 `story-to-animation.mjs` 的中文動作 ID / keyword contract 解析後比對 2.1 場景內該人物原始 GLB 裡真實存在的 AnimationClip。多角色需明確 nodeId；來源沒有 clip、Clip 名稱模糊、來源更換或同角色動作重疊就 BLOCKED，不會自己合成真 3D 人體走跑。全部 action event 都有 nodeId、assetId、SHA、clipIndex、duration。
2. 鏡頭「1秒 鏡頭：校門口」只准使用 2.0 使用者已設定且時間相符的 camera keyframes，讀原始來源的 XYZ / FOV 與 LINEAR／SMOOTHSTEP／CUT；不從語意任意猜測真實校門口座標。「旁白／字幕／台詞」只顯示文字，不冒充 TTS 聲音檔。
3. `AIG22StoryPlayer` 使用 2.1 `AIG20WorldRuntime.selectSourceActorClip` 和真 GLB AnimationMixer，經 PhotoViewer 的既有 onFrame 回呼管理劇情時間軸；保持單一 renderer、多角色各自播放來源動作，播放結束/使用者 Stop 時還原 callback，原模型/地圖和來源資料不清空。
4. `scene-runtime-studio.html/mjs` 已新增真正可操作的中文劇情編輯器、解析、播放、停止、字幕顯示、劇本 JSON 保存/重新載入。檔案經 FastModel 7.16 另存外部 IndexedDB 的 `animation` 分類：記錄 scene id/revision/原始多 GLB SHA/人物動作 clip 名稱/相機關鍵格。保存、讀回都必須驗證來源與原文重新編譯的精確 cue，防止手動竄改 JSON 或舊場景動作被套到新模型。新場景、來源增加、鏡頭更新、地圖對位、GPU unload 會要求重新核對舊劇本，不能因錯誤而初始化其他工作頁。
5. 已加入 `tests/aig-text-world-storyboard-2-2.test.mjs`：真來源走路 + 鏡頭 + 字幕、不同角色明確選擇、無 run/jump 原始 clip 必須 BLOCKED、來源 SHA/revision／clip 改變拒絕、對已入庫劇本改造假 clip ID 必須 BLOCKED、播放時間軸及互不干擾。
6. 真 Chromium phone + desktop `tests/aig-map-actor-2-1.real-browser.mjs` 追加合法二進位 glTF2 source walk clip 技術 fixture（前一版 short-step 保留），實際按鈕操作中文腳本「走路 + 來源鏡頭 + 字幕」、影片素材未合成語音、獨立記錄 2.2 截圖與 JSON；沒有 GLB run clip 的「跑步」必須拒絕。單元和 browser 證據新增至舊 NC / 3D Gate，不刪以前 7.13–7.16 和 Real3D 1.6–2.1 的已建功能。

## 版本及驗收真實界線

- 隔離 Draft [PR #39](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/39)，初始 GitHub Action [#39859072032](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39859072032) 初檢 queued；**不能宣稱 full PASS**。
- 此功能是 deterministic text → original GLB clip orchestration，不是完整 AI Text-To-Motion 模型、AI 自動聲優/TTS、背景音樂，也沒有從單照片重建真實 1:1 的脖子、服裝內外幾何與可變形皮膚。
- 2.5D 深度可編輯面已有 7.15 草模基礎，本輪並未把估算 Z 改成毫米、也沒有將四周看不到的身體部位假造為測量真身。
- GitHub 來源已有新程式，但未部署正式 AIG Render 網站、未產新的 Android APK/Windows EXE，也未達 S23 60/120 FPS、真模型動畫品質驗證。真實女主角來源／Authority 不得被技術三角形替代。

## 下一個技術焦點／不可回退

- 將 7.15 **2D→相對 2.5D→GLB 草模** 的髮／臉／脖子／衣物／骨架候選，逐步升級為經約束可編輯的真人關節、skin weights、角色 clip，與 2.2 真劇本 cue 連上；不能因為目前缺 walk clip 就偷偷造線框人偶冒充真 3D 完成。
- 下一個階段可接使用者指定的 2D/2.5D 視差運鏡與透明度轉場，不從一張人物插畫自動推論實測體積或用短片假替代 3D scene。
- AIG-II CNC / AIG Studio 的真 0.001mm、正確 Fanuc 座標、G0/G1 材料移除與 3–6AX Authority Gate 均不得因 FastModel 開發降低；正式 RGB Mobile/Desktop 頁面與新的 FastModel 源碼是獨立 version chain，需逐頁驗證才能正式發布。

## 同輪實際整合修正（不能回退）

- 依 GitHub 來源逐行檢查發現舊 `scene-runtime-studio.mjs` 有 `say('BLOCKED：+String(...)` 的**未結束字串**，導致場景工作頁主程式根本不能解析。已修回正確 JavaScript 字串，並在切換單一 GLB／多 GLB 時解除過期劇本時間軸，保留原工作場景。
- 原 `viewer.mjs` 的 `mountVerifiedWorld()` 也有 `typeof orbit!=='boolean)` 少一個引號，已真正修復。使用 V8 對 FastModel 2.2 核心、2.0/2.1 地圖場景核心、Viewer、正式工作頁進行無副作用 JavaScript 語法解析：以上全部成功。另已把 `node --check viewer.mjs` 和 `node --check scene-runtime-studio.mjs` 納入 CI 前置硬 Gate。
- 劇本文檔重新載入前除 scene revision、每來源 SHA、真 GLB clip ID 外，現在會重新用原始中文全文重編譯並與儲存的 cues 精確比對；任一事後改動都 BLOCKED，沒有隱性可執行假動畫。
- 更新後隔離 PR #39 驗收 [#39860112621](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39860112621)；先前工具查詢仍 queued，**不得宣稱 Chrome PASS、網站 LIVE 或 S23/Windows 真機 GPU 指標已完成**。
