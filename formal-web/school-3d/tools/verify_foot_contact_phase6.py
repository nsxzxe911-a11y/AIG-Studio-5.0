#!/usr/bin/env python3
"""Validate *baked glTF animation* contact on genuine rig joints. NOT cinematic QA."""
import argparse,json,sys,math
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'AIG_3D_V1_Phase4'/'tools'))
try:
 from verify_prototype import parse,acc_array
except ModuleNotFoundError:
 sys.path.insert(0,str(Path(__file__).resolve().parent))
 from verify_prototype import parse,acc_array

def verify_contact(glb):
 j,blob=parse(glb)
 anim=next((a for a in j['animations'] if a['name']=='Walk_FootContact_IK_Phase6'),None)
 if anim is None:raise AssertionError('Foot-contact IK animation absent')
 ids={n['name']:i for i,n in enumerate(j['nodes']) if 'name' in n}
 assert all(n in ids for n in ['Hips','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'])
 parents={child:i for i,n in enumerate(j['nodes']) for child in n.get('children',[])}
 channels={}
 for ch in anim['channels']:
  t=ch['target'];s=anim['samplers'][ch['sampler']]
  channels[(t['node'],t['path'])]=(acc_array(j,blob,s['input']).flatten(),acc_array(j,blob,s['output']))
 times=channels[(ids['Hips'],'translation')][0]
 assert len(times)>=41 and abs(float(times[-1])-2)<1e-6
 results={'animation':anim['name'],'frames':len(times),'duration_s':float(times[-1]),'by_leg':{}}
 samples={side:[] for side in ('Left','Right')}
 for fi,t in enumerate(times):
  cache={}
  def world(idx):
   if idx in cache:return cache[idx]
   n=j['nodes'][idx];T=np.eye(4);T[:3,3]=n.get('translation',[0,0,0]);
   if (idx,'translation') in channels:T[:3,3]=channels[(idx,'translation')][1][fi]
   if (idx,'rotation') in channels:T[:3,:3]=Rotation.from_quat(channels[(idx,'rotation')][1][fi]).as_matrix()
   cache[idx]=world(parents[idx])@T if idx in parents else T
   return cache[idx]
  for side in ('Left','Right'):
   foot=world(ids[side+'Foot'])[:3,3]
   stance=(t<=1.0 if side=='Left' else t>=1.0)
   samples[side].append({'t':float(t),'y':float(foot[1]),'z':float(foot[2]),'stance':bool(stance)})
 for side,vals in samples.items():
  stance=[p for p in vals if p['stance']]
  zspan=max(p['z'] for p in stance)-min(p['z'] for p in stance)
  yspan=max(p['y'] for p in stance)-min(p['y'] for p in stance)
  swing=[p for p in vals if not p['stance']]
  lift=max(p['y'] for p in swing)-min(p['y'] for p in stance)
  # Since source skeleton rig foot has static world y=.14 and ground-tested heel extends below it, 
  # we test joint contact rather than claim exact shoe sole physics.
  assert zspan<1e-4,(side,'stance z drift',zspan)
  assert yspan<1e-4,(side,'stance vertical drift',yspan)
  assert lift>.065,(side,'insufficient swing foot clearance',lift)
  results['by_leg'][side]={'world_space_stance_z_span_m':zspan,'stance_y_span_m':yspan,'swing_joint_lift_m':lift}
 results['pass']=True
 results['limitations']='Foot joint space (not shoe sole collision). No visual face/gait/s23 evidence; asset NOT APPROVED.'
 return results

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('glb',type=Path);a=ap.parse_args()
 print(json.dumps(verify_contact(a.glb),ensure_ascii=False,indent=2))