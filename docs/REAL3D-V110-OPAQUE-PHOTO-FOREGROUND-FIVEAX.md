# Real3D V110｜普通不透明照片前景自動分離／獨立遮罩 Gate → V109 真 GLB → V107 五軸 GPU

**第三專案 FastModel 的實際研發，非 CNC 真五軸機台。** V109 原版「透明 PNG 真前表面」不動核心；V110 增加一般不透明 PNG 的**可稽核簡單背景**自動分離。這並不是已安裝的 AI 語義辨識模型，不可說成任意複雜照片已全自動去背。

## 已加的程式
- `aig-real3d-v110-source-mask.mjs`：從真正原圖 RGBA 像素分析邊框 RGB 中位數，要求整個邊框色差受限，再以 4 邊連通 flood-fill 辨識背景；計算前景單一連通區、邊界是否碰框、輪廓邊緣色彩可信度與佔比。
- 簡單純色/低變化背景通過時，輸出**新獨立透明 PNG 工作副本**；每個前景像素都沿用原圖 RGB，不捏造新內容。原始不透明 PNG SHA 與新透明工作副本 PNG SHA 完全分開。
- 櫻花校園、樹木、多人、毛髮半透明複雜背景若不符合安全閾值即 BLOCK，絕不把背景當人體。
- 複雜背景可使用使用者另外提供、已人工核對的前景 mask PNG；強制不同 SHA、同寬高、確認核准，支援亮度黑白與 alpha 兩種方式，**不能聲稱此遮罩是 AI 自動生成**。
- 使用 V109 帶原圖色彩 PNG 貼圖／原生 Indexed XYZ GLB 生成與 V99 GLB SHA ingest／V107 WebGL 真 A/B 子軸旋轉；原始 3D、Render RGB HOME、AIG-II、CNC Fanuc 均不受本研究分支影響。
- 在 V109 研究頁增加 V110 前景來源預覽、可選手工遮罩、審核勾選、來源模式報表；前景/工作副本不混淆。

## Gate
1. Node：單背景不同 RGB 尺寸、原始 RGB 不變、前景單連通、邊框/背景複雜/無主體阻擋、人工 mask 不同 SHA 才放行；沿用 V109 GLB regression。
2. Chromium 真 GPU：一般不透明來源真 PNG，前景分析與透明工作副本 SHA，再生成 GLB 解析材質/UV，使用 GPU A75/B120、高度 75% 與歸零；展示與來源 SHA 及截圖證據。複雜背景不提供遮罩時 BLOCK、另提供經確認 mask 才可渲染；保留 V109 舊真 Chromium 測試。
3. **完整真人 1:1、頭髮髮絲、遮蔽區背面、衣服體積、多視角照片配準、量測深度、手機 60 FPS、4K 真 GPU 源品質**全部獨立 BLOCK，無外部來源不認證。

本輪只做 FastModel V110 研究 Draft，無合併、無發布、無 APK/EXE，不能宣稱網站已更新；GitHub Actions 未成功之前技術 Gate 仍 BLOCK。
