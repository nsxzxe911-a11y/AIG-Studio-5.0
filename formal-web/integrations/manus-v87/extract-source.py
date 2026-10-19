#!/usr/bin/env python3
"""Import ONLY audited named Manus files into isolated V87 candidate directory.
Do not extract untrusted archive paths or auxiliary SKILL.md."""
from pathlib import Path
import hashlib,json,sys,zipfile
ROOT=Path(__file__).resolve().parent
archive=ROOT/"original"/"AIG_Manus_V87_Original_20261019.zip"
out=ROOT/"candidate"
EXPECTED_ARCHIVE_SHA256="98f490dd4a8e8d3395b9c63cce96947443007f2ffdc89183d3b597723db12dd8"
SOURCES={
 "index.html":"index.html",
 "app.js":"app.js",
 "styles.css":"styles.css",
 "server.js":"server.js",
 "package.json":"package.json",
 "manus-routes.json":"public/manus-routes.json",
 "AIG-II CNC Studio 5.0｜隔離 UI/UX 原型計畫.md":"plan.md",
 "AIG-II CNC Studio 5.0｜交付清單.md":"TODO.md",
}
def main():
    if not archive.is_file():
        raise SystemExit("BLOCKED: Original Manus archive not present")
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest!=EXPECTED_ARCHIVE_SHA256:
        raise SystemExit("BLOCKED: Original archive digest mismatch")
    count=0;reports=[]
    with zipfile.ZipFile(archive) as z:
        for src,dest in SOURCES.items():
            info=z.getinfo(src)
            if info.file_size>8*1024*1024:
                raise SystemExit("BLOCKED: oversized candidate file "+src)
            if info.is_dir():
                raise SystemExit("BLOCKED: source is directory "+src)
            data=z.read(info)
            if len(data)!=info.file_size:
                raise SystemExit("BLOCKED: corrupt ZIP size "+src)
            target=out/dest
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
            reports.append({"file":dest,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()})
            count+=1
    report={"schema":"AIG_V87_MANUS_ARCHIVE_INTAKE","archive_sha256":digest,"imported":count,"files":reports,"originalUnmodified":True,"machineOutput":"BLOCKED"}
    (ROOT/"source-integrity.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("V87_ARCHIVE_SHA_PASS | extracted audited entries",count,"| machine output BLOCKED")
if __name__=="__main__":
    main()
