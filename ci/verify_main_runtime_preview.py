from pathlib import Path

root = Path(__file__).resolve().parents[1]
runtime = (root / "web/index.html").read_text(encoding="utf-8")
preview = (root / "web/main-runtime-preview.html").read_text(encoding="utf-8")

if preview != runtime:
    raise SystemExit("MAIN_RUNTIME_PREVIEW_STALE|preview must render the actual WebGL Runtime")

for token in (
    '<canvas class="sim3dCanvas" data-glcanvas>',
    'getContext("webgl"',
    ':["X","Y","Z","A","B","C"]',
    "'+axis+' 真 3D 加工模擬",
    "A/B/C 真旋轉",
):
    if token not in preview:
        raise SystemExit("MAIN_RUNTIME_PREVIEW_MISSING|" + token)

print("MAIN_RUNTIME_PREVIEW_PASS|LIVE_WEBGL|3AX_4AX_5AX_6AX|ABC_ROTATION|SOURCE_PARITY")
