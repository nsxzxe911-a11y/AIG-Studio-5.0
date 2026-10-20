#!/usr/bin/env python3
"""Check actual encoded GLB IK foot joint contact in scale-relative units; no shoe/visual claims."""
import argparse,json
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from verify_prototype import parse,acc_array
from fit_mesh_first_rig import bones_global

def verify_fit_contact(path):
    g,data=parse(path)
    if not g.get('extras',{}).get('AIGSchool3DProvenance',{}).get('IKplaybackAllowed'):
        raise ValueError('Nonuniform retarget must recompute target-specific IK; animation BLOCKED')
    anim=next((a for a in g['animations'] if a['name']=='Walk_FootContact_IK_Phase6'),None)
    if anim is None:raise ValueError('missing baked walk clip')
    ids={n.get('name'):i for i,n in enumerate(g['nodes']) if n.get('name')}
    parent={child:i for i,n in enumerate(g['nodes']) for child in n.get('children',[])}
    channels={}
    for c in anim['channels']:
        s=anim['samplers'][c['sampler']]
        channels[c['target']['node'],c['target']['path']] = (acc_array(g,data,s['input']).flatten(), acc_array(g,data,s['output']))
    times=channels[ids['Hips'],'translation'][0]
    assert len(times)>40
    anchors=bones_global(g,g['skins'][0]['joints'])
    source_hip_to_foot=.9 # Phase6 known technical fixture norm; not a human height
    leglen=float(np.linalg.norm(anchors['Hips']-anchors['LeftFoot']))
    ratio=leglen/source_hip_to_foot
    assert .15<ratio<2.5
    minimum_lift=.065*ratio
    result={'footJointOnly':True,'visualApproval':'NOT_APPROVED','minSwingLiftForRig':minimum_lift,'legs':{}}
    for side in ('Left','Right'):
        samples=[]
        for fi,t in enumerate(times):
            cache={}
            def world(idx):
                if idx in cache:return cache[idx]
                node=g['nodes'][idx];t3=np.eye(4);t3[:3,3]=node.get('translation',[0,0,0])
                if (idx,'translation') in channels:t3[:3,3]=channels[idx,'translation'][1][fi]
                if (idx,'rotation') in channels:t3[:3,:3]=Rotation.from_quat(channels[idx,'rotation'][1][fi]).as_matrix()
                cache[idx]=world(parent[idx])@t3 if idx in parent else t3
                return cache[idx]
            foot=world(ids[side+'Foot'])[:3,3]
            stance=(t<=1 if side=='Left' else t>=1)
            samples.append((float(t),foot,stance))
        steady=np.array([p[1] for p in samples if p[2]])
        swing=np.array([p[1] for p in samples if not p[2]])
        slide=float(np.ptp(steady[:,2]));drift=float(np.ptp(steady[:,1]));lift=float(swing[:,1].max()-steady[:,1].min())
        assert slide<1e-4*ratio, (side,'stance slip',slide)
        assert drift<1e-4*ratio,(side,'stance y drift',drift)
        assert lift>minimum_lift,(side,'insufficient scale-relative lift',lift,minimum_lift)
        result['legs'][side]={'stanceXzDriftModelUnits':slide,'stanceYDriftModelUnits':drift,'swingLiftModelUnits':lift}
    result['status']='JOINT_CONTACT_PASS_NOT_SHOE_CONTACT'
    return result
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('path');args=a.parse_args()
    print(json.dumps(verify_fit_contact(args.path),indent=2))