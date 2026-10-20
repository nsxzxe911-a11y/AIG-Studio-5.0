#!/usr/bin/env python3
"""Verify target mesh is untouched by rebind and inverse-bind rest transforms cancel."""
import argparse
import json
from pathlib import Path
import numpy as np
from fit_mesh_first_rig import Bundle,bones_global
from verify_prototype import verify

def audit(target, bound):
    target_b=Bundle(target); bound_b=Bundle(bound)
    t=target_b.g; g=bound_b.g
    assert len(t['meshes'])==len(g['meshes']), 'mesh count drift'
    vertices=0;blended=0;bad=0;prim_count=0
    for a,b in zip(t['meshes'],g['meshes']):
        assert len(a['primitives'])==len(b['primitives'])
        for p,q in zip(a['primitives'],b['primitives']):
            assert target_b.read(p['attributes']['POSITION']).tobytes()==bound_b.read(q['attributes']['POSITION']).tobytes(), 'geometry moved by skeleton binding'
            w=bound_b.read(q['attributes']['WEIGHTS_0'])
            joints=bound_b.read(q['attributes']['JOINTS_0'])
            assert np.isfinite(w).all() and np.allclose(w.sum(axis=1),1,atol=1e-5)
            assert int(joints.max())<33
            vertices+=len(w);blended+=int((w[:,1]>.001).sum());prim_count+=1
    assert all(x.get('skin')==0 for x in g['nodes'] if 'mesh' in x)
    bones=g['skins'][0]['joints']; pts=bones_global(g,bones)
    m=bound_b.read(g['skins'][0]['inverseBindMatrices'])
    errors=[]
    for i,idx in enumerate(bones):
        name=g['nodes'][idx]['name'];p=pts[name]
        mat=m[i].reshape((4,4),order='F')
        T=np.eye(4);T[:3,3]=p
        errors.append(float(np.max(np.abs(T@mat-np.eye(4)))))
    tech=verify(bound)
    assert tech['valid_glTF2_technical'],tech['errors']
    assert g['extras']['AIGSchool3DProvenance']['visualApproval']=='NOT_APPROVED'
    assert 'NOT VISUAL AUTHORITY' in g['asset']['generator']
    return dict(pass_mesh_untouched=True,pass_weights=True,pass_glb_structure=True,
      primitives=prim_count,vertices=vertices,blend_vertices=blended,
      restPoseErrorMax=max(errors),role='TECHNICAL_ONLY_NOT_APPROVED',
      visualGate='BLOCKED',avatarApproval=False,ikMayRun=g['extras']['AIGSchool3DProvenance']['IKplaybackAllowed'])

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--target',required=True);p.add_argument('--result',required=True);a=p.parse_args()
    print(json.dumps(audit(a.target,a.result),indent=2,ensure_ascii=False))