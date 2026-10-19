#!/usr/bin/env python3
"""V87 final Manus deliverable consistency gate. Reads archives, never runs code."""
from pathlib import Path
from zipfile import ZipFile
import hashlib,json
ROOT=Path(__file__).resolve().parent
old=ROOT/"original"/"AIG_Manus_V87_Original_20261019.zip"
final=ROOT/"original"/"AIG_Manus_V87_Final_Design_Deliverables.zip"
expected_old="98f490dd4a8e8d3395b9c63cce96947443007f2ffdc89183d3b597723db12dd8"
expected_final="5049ad89079ea87e3db275c5a593f23f88b2f14ca8579a8c8dd0e6a9249fb97d"
def sha(data):return hashlib.sha256(data).hexdigest()
assert sha(old.read_bytes())==expected_old,"original archive mismatch"
assert sha(final.read_bytes())==expected_final,"final archive mismatch"
with ZipFile(old) as a,ZipFile(final) as b:
    source={i.filename for i in a.infolist() if not i.is_dir()}
    completed={i.filename for i in b.infolist() if not i.is_dir()}
    missing=source-completed
    assert not missing,"original files omitted: "+repr(missing)
    changed=[n for n in sorted(source) if sha(a.read(n))!=sha(b.read(n))]
    assert not changed,"original files unexpectedly changed: "+repr(changed)
    extra=sorted(completed-source)
    pdf=[n for n in extra if n.lower().endswith(".pdf")]
    pptx=[n for n in extra if n.lower().endswith(".pptx")]
    assert len(pdf)==1 and len(pptx)==1,"design PDF/PPTX not uniquely present"
    assert b.read(pdf[0]).startswith(b"%PDF"),"PDF header invalid"
    slide_data=b.read(pptx[0])
    with ZipFile(__import__("io").BytesIO(slide_data)) as deck:
        slides=[n for n in deck.namelist() if __import__("re").fullmatch(r"ppt/slides/slide[0-9]+\.xml",n)]
        assert len(slides)>=10,"design presentation has fewer than ten slides"
    expected_new_pages={"cover.html","audit.html","principles.html","workflow.html","pages.html","axis6.html","contract.html","states.html","validation.html","handoff.html"}
    assert expected_new_pages.issubset(completed),"presentation web pages incomplete"
    report={"schema":"AIG_V87_MANUS_FINAL_ARCHIVE_VERIFIED",
       "original_sha256":expected_old,"final_sha256":expected_final,
       "source_file_count":len(source),"source_identical":True,
       "added_count":len(extra),"added_filenames":extra,
       "slides":len(slides),"pdf_header_ok":True,
       "CNC_CORE_GATE":"NOT_RUN","MACHINE_OUTPUT":"BLOCKED"}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print("V87_FINAL_DESIGN_ARCHIVE_PASS / original UI sources unchanged / no CNC code executed")
