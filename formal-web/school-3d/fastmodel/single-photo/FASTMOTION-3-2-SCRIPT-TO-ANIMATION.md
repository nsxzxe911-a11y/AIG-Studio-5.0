# FastModel 3.2｜打字劇情 → 真實 3D 動作時間軸（Draft）

承接可信 FastModel 3.1 `26600956c572eee43b491e8b60c5fbb801cc40d8`，採 **AIG Studio 5.0 Draft PR #12** 向前升級，不合併、不部署 Render 正式網站，不更新 APK／EXE。

## 這一階真正提供的能力

- 在 FastModel GLB 工作區打字輸入繁體中文劇情，例如「女主角走進教室，轉身，閃避，出拳」。
- `story-to-animation.mjs` 逐句拆解，辨識行走、站立、轉身、閃避、格擋、出拳、踢擊、跳躍、跑步、倒下與鞠躬；明列未知劇情、鏡頭指令、多角色需求，**不得略過後自稱完成整段動畫**。
- 僅使用已經真正載入的 GLB 原動畫或經 FastModel 3.1 嚴格 Rig 相容性通過的外部 GLB 動作。片段名稱／別名必須能被唯一配對；缺失或有兩個以上候選皆 `BLOCKED`，不隨便指派替代動作。單張照片 2.5D 的搖晃和相機環繞不得偽裝為關節動畫。
- `StoryPlayback` 在同一個 `AnimationController` 的實際 Three.js `AnimationMixer` 中，按各 clip 的真實 duration 輪流播放來源骨架 keyframe；不新增第二個人物、不更動 PBR 皮膚、頭頸網格、模型資產。進入／完成段落有真 callback 與播放／停止鍵。
- 原有 2.8 皮膚異常、2.9 四方向與 3.0 動畫 16 格驗收都保留。劇情播放中暫不進行衝突性的 pose 截圖或外部動作匯入；手動切換片段、變更人物或改劇情即停止並廢止前一次時間軸。
- 可匯出 `AIG-3-2-Story-Action-Timeline-Evidence.json`，包含劇情文字、逐段 source clip／duration、GLB 人物 SHA、外部動作來源 SHA、缺失素材與 `generatedMotionFromText:false`；失敗時不發布假的影片或人物。
- 目前沒有正式女主角 GLB、驗收通過的打鬥 GLB，所以不能在 Github CI 真正錄製女主角的打鬥影片，也不宣稱人物打架、髮絲穿模／頭頸修復或 Windows/Android 60 FPS 已通過。

## 支援與限制

| 使用情況 | 行為 |
|---|---|
| 劇情「走路、轉身、閃避、出拳」，四段 GLB Clip 都存在且唯一 | **可預覽**實際 3D 骨架動作連續時間軸 |
| 有劇情，但人物 GLB 無相容動作 | 明確列出未安裝的動作，無假動畫 |
| 需要兩人互相打鬥／對手出現 | `SECOND_ACTOR_MODEL_MISSING`；只載入單一人物的工作區不能自動造第二角色 |
| 劇情包含鏡頭推拉／爆炸／對話口型 | `DIRECTED_CAMERA_NOT_IMPLEMENTED` 或 `UNSUPPORTED_SCENE_OR_DIALOGUE`，需要日後真正的攝影／特效／語音軌引擎 |
| 動作名同時對應多個 clip | `AMBIGUOUS_ACTION_CLIPS`，先確認具體動作 |
| 動作來源 Rig 不相容 | 3.1 拒絕匯入，不強行套用 |
| 只有影片、沒有相容 GLB | 需要可驗證的 Rig、Motion 資料，不能直接當真 3D 骨架動作 |

**目前不是生成式 Text-to-Motion 模型**：只是保守且真實可執行的文字分鏡 → 已有動作庫序列播放。未提供文字指令憑空生成新骨架動作、多人交手互動、臉部口型、音效、影片匯出 MP4，也不保證連續切換 clip 完美銜接無腳滑／穿模。這些都必須另設真實 Runtime、輸出與實機 Gate。

## 3.2 驗證要求

- `tests/story-to-animation.test.mjs` 檢驗中文四段劇情轉 clip、確實移動 Three.js `Bone`、手動終止、中途內容變動、缺少動作／第二人／特效／未知段落不偽裝完整、來源 SHA、UI 操作／JSON。
- CI 逐段 `node --test`，並使用 build 的 `dist/index.html` 及 `dist/app.js` 驗收控制項和真正的混合器連線。Synthetic/source PASS 不等於真女主角 PBR、真格鬥影片或 native GPU FPS PASS。
