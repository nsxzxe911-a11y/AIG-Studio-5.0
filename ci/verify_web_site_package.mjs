import fs from "node:fs";
import path from "node:path";

function fail(code) { throw new Error("AIG_WEB_SITE_PACKAGE_FAIL:" + code); }
function read(file) { if (!fs.existsSync(file)) fail("MISSING_" + file); return fs.readFileSync(file, "utf8"); }

const docker = read("Dockerfile.web-runtime");
const html = read("web/index.html");
const gallery = read("web/gallery.html");
const overlay = read("web/aigii-overlay.js");
const sw = read("web/service-worker.js");
const manifest = JSON.parse(read("web/manifest.webmanifest"));

for (const needle of [
  "COPY web/index.html /usr/share/nginx/html/index.html",
  "COPY web/service-worker.js /usr/share/nginx/html/service-worker.js",
  "COPY web/manifest.webmanifest /usr/share/nginx/html/manifest.webmanifest",
  "COPY web/gallery.html /usr/share/nginx/html/gallery.html",
  "COPY web/aigii-overlay.js /usr/share/nginx/html/aigii-overlay.js",
  "COPY uiux/assets/ /usr/share/nginx/html/assets/",
  "COPY web/authority/home_mobile.jpg /usr/share/nginx/html/assets/authority/home_mobile.jpg",
  "COPY web/authority/home_desktop.jpg /usr/share/nginx/html/assets/authority/home_desktop.jpg",
  "COPY app/src/main/assets/aig-generated-rgb/approved/184/*.png /usr/share/nginx/html/assets/icons/"
]) if (!docker.includes(needle)) fail("DOCKER_COPY_" + needle);
if (docker.includes("COPY web/main-runtime-preview.html") || !docker.includes('aigii-overlay.js')) fail("LEGACY_PREVIEW_DEFAULT");
if (!html.includes("function makeCadRuntime(root)") || !html.includes("function makeCamRuntime(root)") ||
    !html.includes("function makeAiRuntime(root)") || !html.includes("function makeGlScene")) fail("RUNTIME_BINDING_LOST");
if (!html.includes('["6AX","#27e9ff"]') || !html.includes('["AI","#9f72ff"]')) fail("TEN_PAGE_NAV_MISSING");
if (!html.includes("CNC machine output disabled")) fail("MACHINE_OUTPUT_WARNING_MISSING");
if (!sw.includes("APP_SHELL") || !manifest.start_url) fail("OFFLINE_SHELL_MISSING");
new Function(overlay);
const galleryScript = gallery.match(/<script>([\s\S]*?)<\/script>/i);
if (!galleryScript) fail("GALLERY_SCRIPT_MISSING");
new Function(galleryScript[1]);
const match = galleryScript[1].match(/const entries=(\[[\s\S]*?\]);\s*const grid=/);
if (!match) fail("GALLERY_ENTRIES_MISSING");
const entries = JSON.parse(match[1]);
if (entries.length < 40) fail("GALLERY_SHRUNK");
const countByType = {};
const unique = new Set();
for (const entry of entries) {
  if (unique.has(entry.url)) fail("DUPLICATE_ASSET_" + entry.url);
  unique.add(entry.url);
  countByType[entry.type] = (countByType[entry.type] || 0) + 1;
  const src = entry.url.startsWith("./assets/authority/")
    ? path.join("web/authority", path.basename(entry.url))
    : entry.url.startsWith("./assets/icons/")
    ? path.join("app/src/main/assets/aig-generated-rgb/approved/184", path.basename(entry.url))
    : entry.url.startsWith("./assets/")
      ? path.join("uiux/assets", path.basename(entry.url)) : null;
  if (!src || !fs.existsSync(src)) fail("UNRESOLVED_ASSET_" + entry.url);
}
if (countByType["官方 HOME"] !== 2 || countByType["頁面／機台參考"] !== 9 || countByType["按鈕圖示"] < 30) fail("ASSET_CLASSIFICATION");
console.log("AIG_WEB_SITE_PACKAGE_PASS|INTERACTIVE_HOME_CAD_CAM_SIM_3_4_5_6_NC_AI|RGB=" +
            entries.length + "|APPROVED_HOME_MOBILE_DESKTOP|OFFLINE_SHELL|NO_FAKE_PREVIEW|CNC_OUTPUT_DISABLED");
