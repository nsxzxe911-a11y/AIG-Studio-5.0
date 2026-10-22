# AIG FastModel 7.14｜正式女主角來源 × RGB／深度／立體掃描斷點

日期：2026-10-23 Asia/Taipei。第三專案 FastModel 的 **source/engine progress**；不回退 7.13 和既有 GPU、骨架、動畫／NC 回歸，不冒稱已完成女主角完整 1:1 人體 GLB。

## 真正找回使用者之前提供的女主角圖片
- 個人 Library 已取回並用原始 bytes 核對：`櫻花校園的青春時光.png`，**1672 × 941，PNG RGB，2,463,534 bytes，SHA-256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`**。
- 多面板插畫，左側為長棕髮、制服外套、紅格紋蝴蝶結、格紋裙／背包的主視角人物，右側為故事/不同角度插畫；**不是立體相機標定的同時雙目圖片**，不能拿右側面板求可靠毫米視差。
- main character ROI 粗略 x=340,y=25,width=662,height=916；**僅作照片彩色／輪廓來源座標候選**。源檔仍在用戶 Library，不將 private original PNG 發布到公開 GitHub。
- `aig-heroine-source-20261020.json`：正式鎖圖 SHA、尺寸與 ROI、非雙目、背面/腿部分被裁切等不能信任的幾何。
- 本地已從真原圖抽出正面人物透明遮罩候選，但毛髮邊界和背景仍需修正；**不當做核准最終 GLB 或一比一真實人體**。

## 7.14 技術真實新增
- `aig-heroine-scan-7-14.mjs`：人工選區校對之 RGB 類別顏色擴張 / segmentation confidence（頭髮、臉、頸、外套、襯衫、裙子、皮膚、背包等）；與 7.13 實測校正雙照 XYZ(mm) 整合，產生來源 RGB、per-vertex 深度 match confidence、三角面的真實法線、編碼部位標籤、UV & triangle groups。無信心/缺失的表面不造假補洞。不能把顏色分群等同真正自動的語義 AI 模型。
- `aig-heroine-scan-ui-7-14.mjs`：工作頁原照片點像素取 RGB 區域、人工復核、彩色深度圖（毫米，黑色=未知）、匯出 glTF/GLB with metres geometry + source SHA extras；原始像素不因導出修改。每次變更來源都要求重新確認分類。
- 另外**可直接只用一張女主角圖片**：`heroine-photo-only` 匯入 JPG/PNG/WebP。本地 SHA 核對後若符合原始女主角大圖，自動以鎖定 ROI 取主角部位。無雙照時可作 RGB／輪廓部位候選並匯出 reviewed JSON；明確 Z=UNKNOWN，真尺寸 GLB blocked，不要求一開始必須提供四面圖。失敗 source input 不清除原已驗證 7.13 model/GLB。
- `metric-stereo-studio.html/mjs`：與上一版 7.13 的 real WebGL、camera-scale、GLB 完全接軌，新增女主角面板與深度／顏色二模式。主 FastModel 頁顯式連結女主角 7.14，`build.mjs` 全離線 bundle。
- 完整路徑不會輸出 Fanuc CNC 真機指令，不使用網站工程殼。

## 測試與實際證據範圍
- 第一輪 [#39839376055](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39839376055)：Node 真 stereo 7.13、7.14 顏色/分類/法線/毫米測試與離線 build SUCCESS、WebGL 7.13 phone/desktop 既有 1900 vertices 3626 triangles / GLB PASS；新 7.14 phone Playwright 因 canvas 位於 viewport 下方，測試錯誤採用 raw `page.mouse.click` 未觸發任何 marker，判 RED。已改為 viewport 自動捲到來源圖 + locator click 精確觸控。
- 更新加上獨立單照片 RGB JSON，後續最後驗證隔離 PR #33，Actions [#39841349712](https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39841349712) 在此 commit 尚未取得終局；**不可標整體 7.14 PASS 直到實測完成**。
- Node math tests 維持雙目真深度 `Z=fx×baseline/d`：測試具物理 baseline=60mm、fx=120px、8px disparity 的 stereo source 會得 ~900mm；合成 image 測試不表示使用者原圖有同樣校正。

## 未完成與下一階
- 未把已批准女主角插畫本身生成**完整真實的正背面、人物骨架/皮膚/頭髮物理模型、真正 1:1 公釐掃描**；右側畫面不能當精確同時雙目。頭頸/髮束需使用真 geometry rig 與結構可信度、補拍/實測來源才可進入正式檢驗。
- 單張照片已有**彩色候選分區**，但人體背面、相機尺度/高度未知，不能稱實測深度；仍需研發結合已入庫骨架尺度先驗與多角度校準的新技術，低置信區必須顯式保留 estimated。
- FastModel 7.14 仍在 `repair/core-first-fastmodel-20261021` 來源分支，**未發布 Render 正式網站**，亦未產正式 signed Android APK、Windows EXE。
- 下一個真正技術研發：7.15 本機可執行的人體/衣物/髮束多圖可靠點跟蹤、骨架 3D 局部補掃描及姿態正規化；非真值面要保持可編輯估計，不整張 GLB 放成假測試模型。
