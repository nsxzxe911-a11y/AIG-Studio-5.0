/* AIG School 3D authority gate. No unapproved placeholder geometry. */
(() => {
  "use strict";
  const root = document.querySelector("[data-school-hero]");
  if (!root) return;
  const q = (selector) => root.querySelector(selector);
  const statusNode = q("[data-status]");
  const detailNode = q("[data-detail]");
  const codeNode = q("[data-gate-code]");
  const startButton = q("[data-start]");
  const checkButton = q("[data-check]");
  const posterNode = q("[data-poster]");
  const placeholderNode = q("[data-placeholder]");
  const viewport = q("[data-viewport]");
  let verified = null;
  let mounted = null;
  let busy = false;

  function message(status, detail, code = "BLOCKED") {
    statusNode.textContent = status;
    detailNode.textContent = detail;
    codeNode.textContent = code;
  }
  function block(reason) {
    verified = null;
    startButton.disabled = true;
    startButton.setAttribute("aria-disabled", "true");
    message("正式 3D 素材尚未通過驗證", reason);
  }
  function isValidHash(value) {
    return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
  }
  function safeLocalPath(value) {
    return typeof value === "string" && /^\.\/assets\/[a-z0-9][a-z0-9._-]*\.(png|webp|glb)$/i.test(value) && !value.includes("..");
  }
  async function readAndVerify(asset, maxBytes) {
    if (!asset || asset.approval !== "APPROVED" || !safeLocalPath(asset.path) || !isValidHash(asset.sha256)) {
      throw new Error("尚無核准資產及完整 SHA-256");
    }
    if (!window.crypto || !crypto.subtle) throw new Error("目前環境無法進行 SHA-256 驗證");
    const response = await fetch(asset.path, { cache: "no-store" });
    if (!response.ok) throw new Error("正式圖片／模型檔尚未放入網站");
    const length = Number(response.headers.get("content-length") || 0);
    if (length > maxBytes) throw new Error("素材超出載入大小上限");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) throw new Error("素材不存在或過大");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const actual = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
    if (actual !== asset.sha256.toLowerCase()) throw new Error("SHA-256 不一致，拒絕載入");
    return bytes;
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    startButton.disabled = true;
    checkButton.disabled = true;
    posterNode.hidden = true;
    placeholderNode.hidden = false;
    message("正在驗證角色 Authority", "僅載入驗證資料，不啟動 WebGL", "VERIFY");
    try {
      const response = await fetch("./authority.v1.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Authority Manifest 無法讀取");
      const manifest = await response.json();
      const assets = manifest.assets || {};
      if (manifest.schemaVersion !== 1 || manifest.deploymentState !== "PREVIEW_READY" ||
          !["poster", "character", "campus", "animations"].every((key) => assets[key]?.approval === "APPROVED" &&
           isValidHash(assets[key]?.sha256) && safeLocalPath(assets[key]?.path)) ||
          manifest.runtime?.approval !== "APPROVED") {
        throw new Error("等待核准的角色、動作、場景和瀏覽器 Runtime 完整入庫");
      }
      const posterBytes = await readAndVerify(assets.poster, 16 * 1024 * 1024);
      const blob = new Blob([posterBytes], { type: "image/png" });
      const objectURL = URL.createObjectURL(blob);
      posterNode.src = objectURL;
      posterNode.onload = () => URL.revokeObjectURL(objectURL);
      posterNode.hidden = false;
      placeholderNode.hidden = true;
      verified = manifest;
      startButton.disabled = false;
      startButton.setAttribute("aria-disabled", "false");
      message("已核對海報 SHA，3D 模型待啟動時再次驗證", "按「進入 3D 展示」後才載入模型、動作及引擎", "READY");
    } catch (e) {
      block(e instanceof Error ? e.message : "不明資產錯誤");
    } finally {
      busy = false;
      checkButton.disabled = false;
    }
  }
  async function start() {
    if (busy || !verified) return;
    if (!window.WebGL2RenderingContext || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      message("3D 未啟動", "此裝置不支援 WebGL2，或已要求減少動態；保留正式靜態海報");
      return;
    }
    busy = true;
    startButton.disabled = true;
    message("正在驗證真 3D 模型及動畫", "下載前先比對核准 SHA-256", "VERIFY");
    try {
      const assets = verified.assets;
      const [character, campus, animations] = await Promise.all([
        readAndVerify(assets.character, 70 * 1024 * 1024),
        readAndVerify(assets.campus, 90 * 1024 * 1024),
        readAndVerify(assets.animations, 35 * 1024 * 1024)
      ]);
      // Passing SHA means 'unchanged bytes', NOT 'valid rigged character'.
      // Structural verification prevents a mislabeled mannequin GLB from becoming the runtime model.
      const validator = await import("./glb-audit.v1.mjs");
      const checks = [
        validator.auditGLB(character, "character"),
        validator.auditGLB(campus, "campus"),
        validator.auditGLB(animations, "animations")
      ];
      const failed = checks.find((result) => !result.pass);
      if (failed) {
        throw new Error(`3D 結構驗收失敗（${failed.role}）：${failed.errors[0]}`);
      }
      const characterDoc = validator.parseGLB(character);
      const animationDoc = validator.parseGLB(animations);
      const rigNames = new Set((characterDoc.nodes || []).map(n => String(n.name || "").toLowerCase()).filter(Boolean));
      const driven = new Set((animationDoc.animations || []).flatMap(a => a.channels || [])
        .map(ch => String(animationDoc.nodes?.[ch.target?.node]?.name || "").toLowerCase()).filter(Boolean));
      const matched = [...driven].filter(n => rigNames.has(n)).length;
      if (driven.size < 3 || matched / driven.size < 0.7) {
        throw new Error("動作骨架與角色骨架節點名稱匹配率不足（需 ≥70%）");
      }
      const runtime = await import("./scene-runtime.v1.js"); // Added only after Stage 3 visual gate.
      if (typeof runtime.mountScene !== "function") throw new Error("正式 3D 引擎接口缺失");
      if (mounted?.dispose) mounted.dispose();
      mounted = await runtime.mountScene({ viewport, character, campus, animations, manifest: verified });
      if (!mounted || typeof mounted.dispose !== "function") throw new Error("場景缺少清理接口");
      message("正式 3D 模型已載入", "已通過資產完整性檢查；後續仍需手機與桌面視覺驗收", "3D RUN");
    } catch (e) {
      message("3D 未啟動（不會降級換假模型）", e instanceof Error ? e.message : "模型讀取失敗");
      startButton.disabled = false;
    } finally {
      busy = false;
    }
  }
  checkButton.addEventListener("click", refresh);
  startButton.addEventListener("click", start);
  window.addEventListener("pagehide", () => { if (mounted?.dispose) mounted.dispose(); });
  refresh();
})();
