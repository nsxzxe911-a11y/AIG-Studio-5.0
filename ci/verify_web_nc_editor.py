from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'data-nc-action="INSERT"','data-nc-action="DELETE"','data-nc-action="BLOCKSKIP"',
 'data-nc-action="TOP"','data-nc-action="BOTTOM"','data-nc-cursor','data-nc-help',
 'function ncCursorInfo','function ncHelpForLine','keydown','lineStart','skipEligible'
]
for n in needles: assert n in html, "WEB_NC_EDITOR_MISSING:"+n
for key in ("G90","G54","G43","M98","G","M","X","Y","Z","F","S","T","A","B","C","H","I","J","K","7","8","9","-",".","4","5","6","0","/","1","2","3"):
    assert f'"{key}"' in html, "WEB_NC_KEY_MISSING:"+key
for text in ("Ctrl+S","Ctrl+Enter","Alt+I","Alt+D","Alt+B","Cursor-Line CNC Help"):
    assert text in html, "WEB_NC_SHORTCUT_OR_HELP_MISSING:"+text
print("WEB_NC_EDITOR_GATE_PASS|INSERT|DELETE|BLOCK_SKIP|TOP_BOTTOM|CURSOR_HELP|CNC_KEYPAD|ABC|HIJK|KEYBOARD")
