# FastModel Real3D 2.1｜地圖真來源對位 × 原始人物動作片段｜正式施工斷點

2026-10-23 Asia/Taipei；由 2.0 可信 commit `e3cdb68f7a1ea2c42203b060b3d6d0c01c52e7ef` 向前施工。第三專案 Real3D 不回退、不砍 7.14 女主角原圖、不砍 7.15 可編輯骨架、不砍 7.16 外部資產庫、不動 AIG-II / AIG Studio CNC 已核准的正式 RGB 首頁或其他功能。

## 已施工的 Real3D 2.1（有真正程式與 callback）

1. 新 `aig-map-model-alignment-2-1.mjs`：只使用 7.12 versioned 地圖的真 Point/LineString/Polygon XY 座標；可選地圖上的建築輪廓、道路/樹木等某個圖徵，取 Point 原值或 Poly/Line **外框中心（候選，不是建築入口）**，由使用者選定一個既有 GLB 物件的 scene XZ 對位，3D Y 保留原值，原 quaternion/scale/mesh/face/骨架不變。記錄 featureId、map SHA、method、scene relative/metric provenance；地圖失效時拒絕修改。
2. `aig-world-runtime-2-0.mjs` 擴充 `updateWorldPositions`：原場景 3D model userData nodeId 綁原來源 GLB，不重解碼／不上傳新頂點，只變 Object3D.position，scene 文檔 copy-on-write，來源 id/SHA/分類/quaternion/scale 必須一致；重新開啟已存 2.1 placement 會以**實際來源地圖快照**重新驗證位置 provenance。
3. `viewer.mjs` 新增每角色獨立 `AnimationMixer`，只使用原始 GLB `animations[]` clip，逐一選取、播放、暫停，不要求所有人物共享一個根動畫。每個角色仍由一個 Three.js WebGLRenderer 合成；`unloadCurrent` 與舊單模型頁切換都會 dispose mixers/skinned data。沒有 GLB Clip 的女主角照片草模不能憑空播放跑跳。
4. `scene-runtime-studio.html/mjs` 現有 RGB 世界場景新增地圖圖徵／要對位的來源 GLB／XZ 偏移 UI，按「從地圖對齊」會接真位置合約和保留原 SHA 的外部 source world autosave。人物 actor 選單只列模型實有的 clip，Play/Pause 為真 `AnimationMixer` 控制。2.0 原 bug：先選 map→按建立新場景時未綁來源，已改為先 await 7.12 驗證再建立新場景。
5. 圖片分割、2.5D 深度、骨架和 NC Core 均不因此重算，也不把 2D 圖形直接硬變成實測 3D。地圖是 xy/source metadata，沒有真正 3D 量測的道路/建築高度依舊 unknown。物件的相對場景定位與經審核公尺嚴格分開。

## Gate
- `tests/aig-map-model-alignment-2-1.test.mjs`：真 7.12 地圖 import+feature geometry、模型 XZ 對齊、原 Y/GLB SHA/scale 不變，map SHA 假資料 BLOCKED，單圖相對尺度不冒充 1:1。
- `tests/aig-map-actor-2-1.real-browser.mjs`：技術 fixture 為**真合法二進位 glTF2 + AnimationClip**（不是核准真人模型），真 Chromium phone 390×844 + desktop 1280×900；入庫角色+建築+真地圖，單一 WebGL 場景兩模型，actor source clip 播放/暫停，建築來源 footprint XY 經偏移對位 XZ，原檔 SHA/height/scale 不改，外部 scene 自動保存與真 HTML screenshot。
- `.github/workflows/aig-shared-real3d-v1-3.yml` 保留全部舊 Real3D 1.x、1.9、2.0、7.13–7.16 及 NC 1.3 numerical Gate，新增 2.1 unit/browser 和獨立 proof artifact。
- 隔離 PR [#38](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/38)，驗收 [#39857199578](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39857199578) 建此斷點時**仍 queued**；未得到完成成功不可宣稱 PASS。
- 前一次 2.0 [#39854567894](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39854567894) 前次亦 queued；較早 1.9 [#39851721793](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39851721793) GitHub 最終為 completed/failure，失敗 job 為舊材料移除回歸，故仍須確定 CNC 1.3 不回退；不可把 2.1 完成源碼當整體雙專案 Gate 過關。

## 明確未完成／下一個已入庫的 2.5D / 3D AI 動畫方向

- 女主角已入庫原圖 1672×941，SHA256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`；**尚未實際一比一真實掃描出全身完整 3D rig**。GLB 來源動畫不能冒充是由這張單圖自動生成的人體動畫。
- 後續執行使用者早已核准的 `一張 2D 圖 → 自動 2.5D / 3D 可編輯草模 → 自然語言動作敘述 → 動畫序列`：先以來源一致性分類 Action ID、需要骨架但素材缺 Clip 時明確 BLOCKED、2.5D 可安全模擬視差/鏡頭；再建立真正行走跑跳與衣物骨架演算法，不能偷用第三方網頁假動畫充數。
- 原 Render 正式 AIG 網站與 Windows/Android APP 尚未更新此修復分支，真機 FPS、GPU 溫度、GLB 複合模型品質與原生 APK/EXE Gate 尚未驗證，不可誤稱已 LIVE。

**唯一施工方向：只增強下一層，保留 imageAuthority + Source SHA + 統一 Runtime，錯誤拒絕一個動作不重置其他工作頁。**
