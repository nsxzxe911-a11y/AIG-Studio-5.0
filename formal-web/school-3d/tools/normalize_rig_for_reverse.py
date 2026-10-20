#!/usr/bin/env python3
"""AIG School 3D: Normalize the old 33-joint rig without allowing it to distort Reverse Authority.

This is a sizing DIAGNOSTIC / adaptation handoff, NOT an approved 3D heroine.
Output MUST NOT be treated as a rigged character or as proof of 3D identity.
"""
import ast
import json
from pathlib import Path
from math import dist

HERE = Path(__file__).resolve().parent
SCHOOL = HERE.parent
SOURCE = HERE / "build_rig_phase6.py"
CONTRACT = SCHOOL / "character-proportion-contract.v1.json"
REVERSE = SCHOOL / "reverse-authority.v1.json"

def read_legacy_bones(source=SOURCE):
    """Statically read BONES only, never import old model builders or emit a character."""
    tree = ast.parse(Path(source).read_text(encoding="utf8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "BONES" for t in node.targets):
            bones = ast.literal_eval(node.value)
            assert len(bones) == 33, "unexpected legacy rig skeleton; verify manually"
            return bones
    raise ValueError("legacy BONES not found")

def build_handoff():
    contract = json.loads(CONTRACT.read_text(encoding="utf8"))
    reference = json.loads(REVERSE.read_text(encoding="utf8"))
    assert contract["sourceAuthoritySHA256"] == reference["source"]["sha256"]
    assert contract["pipeline"]["legacyRigHasAuthority"] is False
    assert contract["pipeline"]["doNotScaleReverseMeshToLegacyBones"] is True
    assert contract["bake"]["allowedToBind"] is False
    assert contract["camera"]["calibrated"] is False
    assert contract["camera"]["absoluteHeightMetres"] is None
    assert contract["gates"]["rejectLegacySizeAuthority"] is True
    bones = read_legacy_bones()
    names = {bone[0] for bone in bones}
    assert len(names) == len(bones), "duplicate bones"
    points = [b[2] for b in bones]
    ys = [p[1] for p in points]
    # Normalize coordinates to a dimensionless 0–1 tech-rig envelope, not a physical human height.
    ymax, ymin = max(ys), min(ys)
    envelope = ymax - ymin
    assert envelope > 0
    normalized = []
    for name,parent,position in bones:
        assert parent is None or parent in names
        normalized.append({
            "name":name, "parent":parent,
            "unitlessPoint":[round(position[0]/envelope,8),round((position[1]-ymin)/envelope,8),round(position[2]/envelope,8)],
            "role":"TEMPLATE_ONLY_NOT_APPROVED_FOR_BIND"
        })
    head = next(b[2] for b in bones if b[0] == "Head")
    shoulder = next(b[2] for b in bones if b[0] == "LeftShoulder")
    hips = next(b[2] for b in bones if b[0] == "Hips")
    body_ratio = dist(shoulder,hips)/max(dist(head,shoulder),1e-9)
    return {
       "state":"TECHNICAL_TEMPLATE_ONLY",
       "bindAllowed":False, "homepageAllowed":False,
       "authoritySourceSHA256":contract["sourceAuthoritySHA256"],
       "legacyRig": {"boneCount":len(bones),"jointYSpanOriginalUnits":round(envelope,6),
                     "maximumJointYOriginalUnits":ymax,"headJointYOriginalUnits":head[1],
                     "oldShoulderToHipVsShoulderToHead3d":round(body_ratio,6),
                     "physicalHumanHeightInferred":False},
       "observed2D":contract["observedPixels"],
       "limitations":["uncalibrated camera","lower legs cropped","depth not observable",
                      "do not compare 2D projection to raw 3D world ratios without camera fitting"],
       "normalizedBoneTemplate":normalized,
       "nextRequired":"Fit approved sculpt/mesh/camera first; then retarget bone rest transforms, skin inverseBindMatrices and IK lengths."
    }

def main():
    import argparse
    p=argparse.ArgumentParser()
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    data=build_handoff()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({"state":data["state"],"bindAllowed":data["bindAllowed"],
      "bones":data["legacyRig"]["boneCount"],"realHeightInferred":False,"output":str(args.out)}))

if __name__ == "__main__":
    main()
