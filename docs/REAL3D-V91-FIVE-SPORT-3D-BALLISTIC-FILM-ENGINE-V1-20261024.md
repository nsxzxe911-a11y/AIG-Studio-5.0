# Real3D V91 正式研發規格 V1｜五球類速度／旋轉／碰撞／連續 3D 電影引擎

**建立日期：2026-10-24。屬於隔離 Draft 研發版本，非正式產品發布。**
接續 V90 原始 OBJ vt／多區塊 BVH／動態幾何影格。目標為通用 `AIGReal3DSportBall`，而不是棒球、網球、籃球、足球、乒乓球每個項目重新做物理核心。

## 1. 五運動的物理契約

| 運動 | 半徑 m | 質量 kg | 首輪主要動力 | 主要接觸 | 尚未完成的真實性要求 |
| --- | ---: | ---: | --- | --- | --- |
| 棒球 BASEBALL | .0366 | .145 | 重力、二次空阻、旋轉 Magnus 近似 | 手、球棒、地面 | 縫線、流場、不同球種實測參數 |
| 網球 TENNIS | .0335 | .0577 | 上旋／下旋／側旋、二次空阻 | 球拍、地面 | 球拍線床／球毛、球網、球場係數校準 |
| 籃球 BASKETBALL | .119 | .624 | 出手三維拋體、自轉 | 手、地面、籃板平面 | 籃框圓環／複雜網格連續碰撞 |
| 足球 SOCCER | .11 | .43 | 偏轉旋轉曲線、滾動／反彈近似 | 腳、地面 | 球面片縫、接觸變形、草坪滾動細節 |
| 乒乓球 TABLE_TENNIS | .02 | .0027 | 高阻力／高轉速／彈跳 | 球拍、球桌平面 | 球拍膠皮、球網和薄殼彈性模型 |

上述係數屬初始**示範近似**，不是官方賽事球測量標定。球的 3D 幾何採來源明示的 `NONHUMAN` 網格示範球，不得說是實物掃描。

**SI 統一**：m、s、kg、rad/s；時間單調，方向 XYZ/Y-Up，地面 y=0。

**動力學近似**：
- `dx/dt = v`
- `a = [0,-g,0] - 0.5·ρ·Cd·πr²·|v|·v/m + 0.5·ρ·Cl·πr²·|v|²·unit(ω×v)/m`
- `Cl = clamp(spinLiftScale·r·|ω|/max(|v|,.05),0,.38)` 只用於視覺工程原型，不代表棒球特殊縫線尾流的科學預測。
- 1/480s（可調）小步積分，將實際速度／位置／角速度與旋轉四元數寫進每個電影影格；球體移動不是貼圖平移。
- 最早球半徑－平面穿越事件採連續 crossing 與法向回彈 `Jn=-(1+e)*relativeNormalSpeed*m`，Coulomb 限制切向摩擦與球體慣量 `I=2/5 mr²`；**每 microstep 最多一個接觸事件**。球網、圓環、複合接觸與全面網格 CCD 尚未驗證。

## 2. 人／球接觸與真實動態來源

- `RELEASE`：來源角色從手釋球，必須有明確角色 ID、相機/現場校正速度與自轉。
- `IMPACT`：球棒／網球拍／腳／乒乓拍／手擊球，必須有來源接觸點、法向與該接觸點速度；先驗證接觸點與球心的真半徑位置相符，再施加衝量。假的「球剛好沿著畫好的線移動」不算通過。
- 現階段 **接觸速度由事件來源輸入**，尚無自動從真人影片驗證人物骨架／球拍動態軌跡。此部分保留 BLOCK。

## 3. 運行／錄製

- `aig-real3d-sports-ballistics.mjs`：五項運動共用 deterministic 3D 動力；frame array 記錄世界 XYZ/velocity/ω/quaternion。
- `aig-real3d-sports-3d-replay.mjs`：球體為真正三維 Indexed XYZ 三角面，紅色 3D marker 為其子節點，真 quaternion→GPU Euler transform，每個 renderFrame 產生真 WebGL 影格。
- `aig-real3d-sports-film-lab.html`：獨立繁中研究工作區，五運動切換、Play/Pause、逐格滑桿、真 WebGL PNG、WebM 錄製與檔案下載，回報真實影格統計。
- `recordAIGReal3DSportFilmWebM`：瀏覽器支援 `captureStream(0)` + `MediaRecorder` 時，以 rAF 真實時鐘按需提交 GPU 影格給 WebM 編碼。API 不提供則 BLOCK。不把「設定 60 FPS」當達到 60 FPS，不聲稱完成音效、音樂、配音、人物真人動態或 MP4。
- 所有物理/渲染源必須與 AIG-II / AIG Studio 5.0 / FastModel 共用運算核心，但**不直接寫入 Fanuc NC**。

## 4. Gate 與不可虛報項目

**Source Gate**：五運動球半徑質量驗證；無阻力拋體近似解析；旋轉曲球；撞地正向回彈與滑動摩擦；實際 actor-to-ball 衝量和錯誤接觸幾何 BLOCK；原始 3D 球面與 indices 不因影格改變。

**Browser Gate**：真 Indexed XYZ WebGL 640×640 前後不同 SHA；球體至少 2,000 真三角面，實際 CPU/GL render；獨立檢查 recorded WebM blob 與下載 SHA、解碼後內容/播放時間另立 Gate。不能靠 CSS/Canvas 2D 平移過關。

**Production Gate 仍 BLOCK**：
- 真人及動物骨架內外表面全／半包覆接軌；
- 球棒、球拍、腳和手與真人骨架自動碰撞；
- 專項風洞/軌跡參數實測校正和聯盟規則物理；
- 羽毛／海洋游動、布料、草皮/球體接觸變形；
- 1080p/60、2K/4K FPS 穩定性、完整音效與 MP4 編碼；
- CNC 實機安全、Android APK、Windows EXE 交付與正式 Render 部署。

**繼承來源注意**：V89 的 Chromium 640px native GPU test 原先以僅 2 張三角面呼叫具有 `>=2000` 來源 Gate 的 `captureNativePNG`，導致 Browser FAIL；V91 隔離分支將該**測試來源**修為 4,418 真原始三角面，不放寬 2,000 三角面 Gate。V90 程式是未合併的研發延伸，不能視作已完成驗收。

## 5. 續接方向

V92：高品質全／半包覆骨架（人、狗、鳥、魚）自適應表面＋連動 `Actor Contact` 幾何綁定；超過目前能力時維持 BLOCK，先不重複材質系統。
