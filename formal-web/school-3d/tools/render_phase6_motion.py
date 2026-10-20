#!/usr/bin/env python3
"""CPU glTF skinning QA renderer for Phase5 technical humanoid (NOT visual Authority).
Renders actual sampled glTF bone animations; not a video based on moving a static picture.
"""
import sys, math, json
from pathlib import Path
import numpy as np
import vtk
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray
from scipy.spatial.transform import Rotation
sys.path.insert(0,str(Path(__file__).parent))
sys.path.insert(1,str(Path(__file__).parent.parent.parent/'AIG_3D_V1_Phase4/tools'))
# fallback import stable path regardless script current working dir
from verify_prototype import parse,acc_array

ROOT=Path(__file__).resolve().parent.parent
TARGET=ROOT/'assets/hero-rig-Phase6-TECHNICAL-ONLY.glb'
OUT=ROOT/'rig-motion-Phase6-TECHNICAL-ONLY.mp4'
js,blob=parse(TARGET)
node_parents={child:i for i,n in enumerate(js['nodes']) for child in n.get('children',[])}
ident=np.eye(4)
origins=[]
for n in js['nodes']:
 m=ident.copy();m[:3,3]=n.get('translation',[0,0,0]);origins.append(m)
ib=acc_array(js,blob,js['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
anim=next(a for a in js['animations'] if 'Walk' in a['name'])

def sample(t):
 local=[m.copy() for m in origins]
 for ch in anim['channels']:
  sam=anim['samplers'][ch['sampler']]
  ts=acc_array(js,blob,sam['input']).ravel()
  vals=acc_array(js,blob,sam['output'])
  t0=t % ts[-1];idx=min(int(np.searchsorted(ts,t0,side='right'))-1,len(ts)-2)
  alpha=float(np.clip((t0-ts[idx])/(ts[idx+1]-ts[idx]),0,1));target=ch['target']
  val=(1-alpha)*vals[idx]+alpha*vals[idx+1]
  if target['path']=='rotation':
   val=val/np.linalg.norm(val)
   local[target['node']][:3,:3]=Rotation.from_quat(val).as_matrix()
  elif target['path']=='translation':local[target['node']][:3,3]=val
 global_m=[None]*len(js['nodes'])
 def world(idx):
  if global_m[idx] is not None:return global_m[idx]
  p=node_parents.get(idx)
  global_m[idx]=world(p)@local[idx] if p is not None else local[idx]
  return global_m[idx]
 for i in range(len(js['nodes'])):world(i)
 return np.asarray([global_m[i]@ib[k] for k,i in enumerate(js['skins'][0]['joints'])])

ren=vtk.vtkRenderer();ren.SetBackground(.82,.86,.93)
win=vtk.vtkRenderWindow();win.SetOffScreenRendering(True);win.SetSize(380,540);win.AddRenderer(ren);win.SetMultiSamples(0)
colors={'skin':(.98,.73,.66),'hair':(.18,.12,.10),'fabric':(.13,.19,.34),'shirt':(.90,.90,.94),'skirt':(.20,.23,.39),'ribbon':(.58,.13,.17),'black':(.055,.06,.09),'eyes':(.30,.20,.18)}
parts=[]
for mesh in js['meshes']:
 for p in mesh['primitives']:
  attr=p['attributes'];verts=acc_array(js,blob,attr['POSITION']).astype(np.float32)
  joins=acc_array(js,blob,attr['JOINTS_0']).astype(int)
  weights=acc_array(js,blob,attr['WEIGHTS_0']).astype(np.float32)
  faces=acc_array(js,blob,p['indices']).astype(np.int64).reshape(-1,3)
  points=vtk.vtkPoints();points.SetData(numpy_to_vtk(verts,deep=True))
  poly=vtk.vtkPolyData();poly.SetPoints(points)
  data=np.c_[np.full((len(faces),1),3,dtype=np.int64),faces].reshape(-1)
  vfaces=numpy_to_vtkIdTypeArray(data,deep=True);cells=vtk.vtkCellArray();cells.SetCells(len(faces),vfaces);poly.SetPolys(cells)
  norms=vtk.vtkPolyDataNormals();norms.SetInputData(poly);norms.SetSplitting(False);norms.SetConsistency(True)
  mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(norms.GetOutputPort())
  actor=vtk.vtkActor();actor.SetMapper(mapper)
  c=colors.get(js['materials'][p['material']]['name'].split('_')[0],(.5,.5,.5));actor.GetProperty().SetColor(*c)
  actor.GetProperty().SetInterpolationToPBR();actor.GetProperty().SetRoughness(.65)
  ren.AddActor(actor)
  parts.append((points,poly,verts,joins,weights))
light=vtk.vtkLight();light.SetPosition(2,3,6);light.SetFocalPoint(0,1.3,0);light.SetIntensity(1.5);ren.AddLight(light)
cam=ren.GetActiveCamera();cam.SetPosition(2.2,1.30,3.7);cam.SetFocalPoint(0,1.06,0);cam.SetViewUp(0,1,0);cam.SetViewAngle(28);ren.ResetCameraClippingRange()
import subprocess
fps=8; nframes=16
ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','380x540','-r',str(fps),'-i','-','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT)],stdin=subprocess.PIPE)
probe=[]
for fi in range(nframes):
 tt=fi/fps; skin=sample(tt)
 maxmove=0
 for points,poly,verts,joins,weights in parts:
  ones=np.ones((len(verts),1),dtype=np.float32)
  pos=np.c_[verts,ones]
  deformed=np.zeros_like(verts)
  for channel in range(2):
   ids=joins[:,channel];w=weights[:,channel]
   if not np.any(w):continue
   mm=skin[ids]
   xyz=np.einsum('nij,nj->ni',mm,pos)[:,:3]
   deformed+=xyz*w[:,None]
  maxmove=max(maxmove,float(np.max(np.abs(deformed-verts))))
  points.SetData(numpy_to_vtk(deformed.astype(np.float32),deep=True));points.Modified();poly.Modified()
 win.Render()
 view=vtk.vtkWindowToImageFilter();view.SetInput(win);view.SetInputBufferTypeToRGB();view.ReadFrontBufferOff();view.Update()
 from vtk.util.numpy_support import vtk_to_numpy
 pic=vtk_to_numpy(view.GetOutput().GetPointData().GetScalars()).reshape((540,380,3))[::-1].copy()
 ff.stdin.write(pic.tobytes())
 probe.append({'seconds':round(tt,2),'max_skin_vertex_displacement_m':round(maxmove,5)})
ff.stdin.close();ret=ff.wait(timeout=60)
if ret!=0:raise RuntimeError('ffmpeg failed')
assert max(x['max_skin_vertex_displacement_m'] for x in probe)>0.008
(ROOT/'rig-motion-evidence.json').write_text(json.dumps({'tech_test':'cpu glTF JOINTS/WEIGHTS animation sample','fps':fps,'frames':nframes,'duration_seconds':nframes/fps,'visual_authority':'FAIL','frames_probes':probe},indent=2))
print('WROTE',OUT,OUT.stat().st_size,probe[0],probe[-1])