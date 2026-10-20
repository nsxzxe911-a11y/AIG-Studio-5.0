#!/usr/bin/env python3
"""Technical QA fixture: intentionally scaled low-grade 3D mesh; NOT a reverse-approved character."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
from fit_mesh_first_rig import Bundle,bones_global

def build(source,target,landmarks,scale=.78):
    b=Bundle(source);j=b.g['skins'][0]['joints']; points=bones_global(b.g,j)
    count=0
    for mesh in b.g['meshes']:
        for prim in mesh['primitives']:
            indices=[prim['attributes']['POSITION']]
            indices.extend(t['POSITION'] for t in prim.get('targets',[]) if 'POSITION' in t)
            for idx in indices:
                accessor=b.g['accessors'][idx]
                view=b.g['bufferViews'][accessor['bufferView']]
                offset=view.get('byteOffset',0)+accessor.get('byteOffset',0)
                v=b.read(idx)
                val=np.asarray(v*scale,dtype='<f4');b.data[offset:offset+val.nbytes]=val.tobytes()
                if 'min' in accessor:accessor['min']=val.min(axis=0).tolist()
                if 'max' in accessor:accessor['max']=val.max(axis=0).tolist()
            count+=1
    b.g['asset']['generator']+=' / MESH-SCALE QA TARGET, NOT VISUAL AUTHORITY'
    b.g.setdefault('extras',{})['visualApproval']='NOT_APPROVED'
    sha=b.finish(target)
    refsha='83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910'
    data=dict(schemaVersion=1,sourceLandmarks='TECHNICAL_3D_UNITSPACE_NOT_2D_PIXELS',cameraCalibrated=False,
        reverseAuthoritySHA256=refsha,visualApproval='NOT_APPROVED',targetMeshSHA256=sha,
        approvedMeshSHA256=None,allowedToPublish=False,
        **{'3dJointPositionsUnitless':{name:[float(x) for x in pos*scale] for name,pos in points.items()}})
    Path(landmarks).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    return dict(mesh=str(target),sha=sha,scaledMeshGeometryPrimitives=count,declaredJointCount=len(points))
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--target',required=True);p.add_argument('--landmarks',required=True);a=p.parse_args()
    print(json.dumps(build(a.source,a.target,a.landmarks),indent=2))