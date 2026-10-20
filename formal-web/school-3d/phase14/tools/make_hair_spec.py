#!/usr/bin/env python3
"""AIG original hair guide spec from approved Phase13 2D silhouette.
No third-party character assets; strands are inferred guides, NOT extracted individual hair fibers.
"""
import json, math, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'phase13'/'mesh-envelope.v1.json'
if not SOURCE.exists():SOURCE=Path('/mnt/data/AIG_School3D_Phase13_Envelope/mesh-envelope.v1.json')
OUT=Path(__file__).resolve().parents[1]/'hair-face-spec.v1.json'
def build():
    p=json.loads(SOURCE.read_text())
    assert p['source']['sha256']=='83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910'
    strands=[]
    for side,n in [('left',36),('right',36),('fringe',16)]:
        for i in range(n):
            u=i/(n-1)
            if side=='left':
                root=[round(585+85*u,2),round(100+17*math.sin(math.pi*u),2)]
                tip=[round(393+181*u,2),round(416+179*u+8*math.sin(u*7),2)]
                bulge=-44+29*u
            elif side=='right':
                root=[round(656+74*u,2),round(96+19*math.sin(math.pi*u),2)]
                tip=[round(797+172*u,2),round(379+200*u+9*math.sin(u*6),2)]
                bulge=42-21*u
            else:
                root=[round(564+161*u,2),round(110+14*math.sin(math.pi*u),2)]
                tip=[round(555+188*u,2),round(190+44*abs(u-.5),2)]
                bulge=4*math.sin(6*u)
            strands.append(dict(id=f'{side}-{i:02d}',group=side,root=root,tip=tip,
                curvature=round(bulge,2),width=round((0.55+1.02*((i*7)%17)/16)*(0.55 if side=='fringe' else 1),2),
                phase=round(i*0.63+ (0 if side=='left' else 0.47 if side=='right' else .88),4),
                colorIndex=i%5))
    return dict(schemaVersion=1,id='AIG_PHASE14_SELF_DEVELOPED_HAIR_FACE',source=p['source'],
        inheritedPhase13='mesh-envelope.v1.json',cameraCalibrated=False,
        releasedToHomepage=False,approved3DModel=False,
        hair=dict(description='88 procedural guides inferred from image silhouette, NOT recovered true strands',
                  solver='damped spring + wind + fixed scalp roots',rootAnchoring=True,segmentsPerStrand=9,
                  maxWindPixels=20,colorPalette=['#241920','#38272b','#694645','#a06c5e','#d09d7e'],strands=strands),
        face=dict(method='bounded geometric correction; no neural inference or face identity claims',
            center=[654,224],eyeLandmarks=[[638,178],[713,189]],mouthLandmark=[678,268],
            jawLandmark=[661,314],maxWarpPixels=5,identityStable='PENDING_VISUAL_REVIEW'),
        sketch=dict(method='in-house edge-preserving color quantization + luminance ink',
                    colorLevels=14,edgeStrength=0.39),
        gate=dict(visualAuthority='NOT_APPROVED',render2_5DOnly=True,noThirdPartyCharacterMesh=True,
                  originalPixelsUnchangedOnDisk=True,aiModelAvailable=False))
if __name__=='__main__':
    OUT.write_text(json.dumps(build(),indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print(OUT, len(build()['hair']['strands']))