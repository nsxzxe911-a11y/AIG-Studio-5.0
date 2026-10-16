from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
h=(root/'index.html').read_text('utf-8')
c=(root/'app.css').read_text('utf-8')
j=(root/'app.js').read_text('utf-8')
required=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']
assert all(x in j for x in required), 'TEN_PAGE_NAV_FAIL'
assert '#020407' in c and 'background:#020407!important' in c, 'BLACK_BACKGROUND_FAIL'
assert 'AIG RGB AUTHORITY' in h and 'authority-image' in h, 'AUTHORITY_PANEL_FAIL'
assert 'machine-canvas' not in h and 'drawMachine' not in j, 'LOW_RES_CANVAS_FAIL'
assert 'image-rendering:auto' in c, 'IMAGE_RENDERING_FAIL'
print('AIG_WEB_RGB_TEN_PAGE_VISUAL_PASS')
