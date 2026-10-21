#!/usr/bin/env python3
"""Fail closed if a known core has been deleted, replaced or silently downgraded.
A Git blob SHA is an exact file identity, not evidence of runtime correctness.
"""
import hashlib, json, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/"ci/core-recovery-lock.json").read_text(encoding="utf-8"))
assert manifest["phase"]=="CORE_FIRST_CONTROL_LATER"
bad=[]
for item in manifest["modules"]:
    path=pathlib.PurePosixPath(item["path"])
    if path.is_absolute() or ".." in path.parts:
        bad.append((str(path),"INVALID_PATH"));continue
    file=root.joinpath(*path.parts)
    if not file.is_file():
        bad.append((str(path),"MISSING"));continue
    data=file.read_bytes()
    actual=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
    if actual != item["gitBlobSha"]:
        bad.append((str(path),"BLOB_CHANGED "+actual))
    else: print("CORE_LOCK_MATCH|"+str(path)+"|"+actual)
if bad:
    for path,reason in bad:print("BLOCKED|CORE_LOCK|"+path+"|"+reason,file=sys.stderr)
    sys.exit(1)
print("CORE_LOCK_PRESERVED|"+manifest["project"]+"|"+str(len(manifest["modules"]))+"|SOURCE_IDENTITY_ONLY_NOT_RUNTIME_PASS")
