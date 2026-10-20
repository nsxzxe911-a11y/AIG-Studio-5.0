#!/usr/bin/env python3
"""AIG SCHOOL 3D — fully skinned glTF test fixture.
This is deliberately NOT approved heroine art and must NOT be published to the main homepage.
Generates a real 3D mesh, glTF Skin/weights/inverse bind poses, PBR embedded textures,
facial morph targets, and skeletal idle/walk clips for integration & rig pipeline QA.
"""
import argparse, json, struct, math, hashlib, os
from pathlib import Path
from collections import defaultdict
import numpy as np
from PIL import Image

MATERIALS = ['skin','hair','fabric','shirt','skirt','ribbon','black','eyes']
BONES=[
 ('Armature',None,(0,0,0)),('Hips','Armature',(0,1.04,0)),('Spine','Hips',(0,1.20,0)),
 ('Chest','Spine',(0,1.44,0)),('Neck','Chest',(0,1.63,0)),('Head','Neck',(0,1.78,0)),
 ('LeftShoulder','Chest',(-.185,1.53,0)),('LeftArm','LeftShoulder',(-.28,1.50,0)),
 ('LeftForeArm','LeftArm',(-.43,1.29,0)),('LeftHand','LeftForeArm',(-.53,1.09,0)),
 ('RightShoulder','Chest',(.185,1.53,0)),('RightArm','RightShoulder',(.28,1.50,0)),
 ('RightForeArm','RightArm',(.43,1.29,0)),('RightHand','RightForeArm',(.53,1.09,0)),
 ('LeftUpLeg','Hips',(-.093,1.02,0)),('LeftLeg','LeftUpLeg',(-.105,.59,0)),
 ('LeftFoot','LeftLeg',(-.105,.14,.028)),('LeftToe','LeftFoot',(-.105,.08,.15)),
 ('RightUpLeg','Hips',(.093,1.02,0)),('RightLeg','RightUpLeg',(.105,.59,0)),
 ('RightFoot','RightLeg',(.105,.14,.028)),('RightToe','RightFoot',(.105,.08,.15)),
 ('LeftEye','Head',(-.056,1.835,.105)),('RightEye','Head',(.056,1.835,.105)),
 ('LeftBrow','Head',(-.055,1.89,.110)),('RightBrow','Head',(.055,1.89,.110)),
 ('Jaw','Head',(0,1.74,.10)),('HairBack','Head',(0,1.90,-.08)),
 ('HairFront','Head',(0,1.94,.04)),('LeftThumb','LeftHand',(-.52,1.04,.04)),
 ('RightThumb','RightHand',(.52,1.04,.04)),('LeftFinger','LeftHand',(-.53,1.00,.02)),
 ('RightFinger','RightHand',(.53,1.00,.02))
]
NAME_TO_BONE={name:i for i,(name,_,_) in enumerate(BONES)}
class GLB:
 def __init__(self):
  self.bin=bytearray()
  self.json={'asset':{'version':'2.0','generator':'AIG self-built skinned prototype / NOT VISUAL AUTHORITY'},'scene':0,'scenes':[{'nodes':[]}],
   'nodes':[],'meshes':[],'materials':[],'textures':[],'images':[],'samplers':[],'skins':[],'animations':[],
   'bufferViews':[],'accessors':[],'buffers':[]}
 def add_bytes(self,bytez,alignment=4):
  while len(self.bin)%alignment:self.bin.append(0)
  off=len(self.bin);self.bin.extend(bytez);v={'buffer':0,'byteOffset':off,'byteLength':len(bytez)}
  self.json['bufferViews'].append(v);return len(self.json['bufferViews'])-1
 def arr(self,ar,component,typ,target=None,minmax=False):
  ar=np.asarray(ar); ar=np.ascontiguousarray(ar)
  bv=self.add_bytes(ar.tobytes());v=self.json['bufferViews'][bv]
  if target:v['target']=target
  acc={'bufferView':bv,'componentType':component,'count':len(ar),'type':typ}
  if minmax:
   acc['min']=np.min(ar,axis=0).astype(float).tolist();acc['max']=np.max(ar,axis=0).astype(float).tolist()
  self.json['accessors'].append(acc);return len(self.json['accessors'])-1
 def embedded_img(self,p):
  bytez=Path(p).read_bytes();img={'bufferView':self.add_bytes(bytez),'mimeType':'image/png','name':Path(p).stem}
  self.json['images'].append(img)
  self.json['textures'].append({'sampler':0,'source':len(self.json['images'])-1})
  return len(self.json['textures'])-1
 def save(self,path):
  self.json['buffers']=[{'byteLength':len(self.bin)}]
  j=json.dumps(self.json,ensure_ascii=False,separators=(',',':')).encode('utf-8');j+=b' '*((-len(j))%4)
  b=bytes(self.bin);b+=b'\0'*((-len(b))%4)
  total=12+8+len(j)+8+len(b)
  out=struct.pack('<III',0x46546C67,2,total)+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(b),0x004E4942)+b
  Path(path).write_bytes(out)
  return {'sha256':hashlib.sha256(out).hexdigest(),'bytes':len(out),'triangles':sum(sum(p['index_count']//3 for p in m.get('_metas',[])) for m in [])}

def normalize(x):
 n=np.linalg.norm(x,axis=-1,keepdims=True);return x/np.clip(n,1e-9,None)

class Meshes:
 def __init__(self):self.parts=[]
 def add(self,material,vertices,faces,uv,joint,blink=None,smile=None):
  v=np.asarray(vertices,np.float32);f=np.asarray(faces,np.uint32).reshape(-1,3);uv=np.asarray(uv,np.float32)
  assert len(v)==len(uv) and f.max()<len(v)
  n=np.zeros_like(v)
  a=v[f[:,1]]-v[f[:,0]];b=v[f[:,2]]-v[f[:,0]]
  vn=np.cross(a,b)
  for k in range(3):np.add.at(n,f[:,k],vn)
  n=normalize(n)
  if np.isscalar(joint):j=np.full((len(v),4),[joint,0,0,0],dtype=np.uint16)
  else:
   j=np.asarray(joint,np.uint16)
  w=np.zeros((len(v),4),dtype=np.float32);w[:,0]=1
  self.parts.append(dict(mat=material,v=v,f=f,uv=uv,n=n,j=j,w=w,blink=blink,smile=smile))
 def ellipsoid(self,mat,center,radius,joint,segments=80,rings=40,face=False):
  uu=np.arange(segments+1)/segments;vv=np.arange(rings+1)/rings
  u,v=np.meshgrid(uu,vv);theta=np.pi*v;phi=2*np.pi*u
  x=radius[0]*np.sin(theta)*np.cos(phi);z=radius[2]*np.sin(theta)*np.sin(phi);y=radius[1]*np.cos(theta)
  p=np.stack((x+center[0],y+center[1],z+center[2]),-1).reshape(-1,3)
  uv=np.stack([u,1-v],-1).reshape(-1,2)
  if face:
   # mild anatomical sculpt: cheek narrowing at jaw; forehead, rounded cheek and forward nose bridge
   yy=p[:,1]-center[1];mask=np.clip((-.02-yy)/(.19),0,1)
   p[:,0]*=(1-.11*mask)
   p[:,2]+= .007*np.exp(-((p[:,0]/.032)**2+((p[:,1]-1.805)/.075)**2))
   # Actual blendshape targets on the head surface (not a still-image animation)
   blink=np.zeros_like(p);smile=np.zeros_like(p)
   for sign in (-1,1):
    dx=(p[:,0]-sign*.055)/.026;dy=(p[:,1]-1.841)/.017
    m=np.exp(-dx*dx-dy*dy)
    blink[:,1]-=.010*m
    mouthx=(p[:,0]-sign*.031)/.020;mouthy=(p[:,1]-1.744)/.017
    sm=np.exp(-mouthx*mouthx-mouthy*mouthy)
    smile[:,1]+=.008*sm
  else:blink=smile=None
  f=[]
  for i in range(rings):
   for j in range(segments):
    a=i*(segments+1)+j;b=a+segments+1;f.extend([(a,b,a+1),(a+1,b,b+1)])
  self.add(mat,p,f,uv,joint,blink,smile)
 def tube(self,mat,origin,end,r0,r1,joint,segments=24,lengths=14):
  origin=np.asarray(origin,float);end=np.asarray(end,float);d=normalize(end-origin)
  ref=np.array([0,0,1]) if abs(d[2])<.95 else np.array([1,0,0]);u=normalize(np.cross(d,ref));v=np.cross(d,u)
  verts=[];uv=[];faces=[]
  for k in range(lengths+1):
   s=k/lengths;c=origin*(1-s)+end*s;r=r0*(1-s)+r1*s
   for h in range(segments+1):
    t=h/segments;point=c+r*(math.cos(2*math.pi*t)*u+math.sin(2*math.pi*t)*v)
    verts.append(point);uv.append((t,s))
  for k in range(lengths):
   for h in range(segments):
    a=k*(segments+1)+h;b=a+segments+1;faces.extend([(a,a+1,b),(a+1,b+1,b)])
  self.add(mat,verts,faces,uv,joint)
 def pleated_skirt(self):
  seg=128;rings=20;verts=[];uv=[];faces=[]
  for i in range(rings+1):
   s=i/rings; y=1.02-.38*s
   for k in range(seg+1):
    t=k/seg;ang=2*math.pi*t;pleat=(.013+.016*s)*math.cos(ang*16)
    r=.17+.11*s+pleat
    verts.append((r*math.cos(ang),y,.9*r*math.sin(ang)));uv.append((t,s))
  for i in range(rings):
   for k in range(seg):
    a=i*(seg+1)+k;b=a+seg+1;faces.extend([(a,b,a+1),(a+1,b,b+1)])
  self.add('skirt',verts,faces,uv,NAME_TO_BONE['Hips'])
 def flowing_hair(self):
  # multiple continuous ribbon surfaces, physical triangle meshes, not independent bead shapes
  rng=np.random.default_rng(4317)
  for strand in range(76):
   ang=(strand/76)*2*math.pi
   start=np.array((.108*math.cos(ang),1.91+.018*math.sin(2*ang),-.040+.083*math.sin(ang)))
   # front fringe / back hair separate targeted control
   fringe=math.sin(ang)>.54
   span=.17 if fringe else (.42+.09*rng.random())
   widths=.006 if fringe else .011
   nlen=14;verts=[];uv=[];faces=[]
   for i in range(nlen+1):
    t=i/nlen
    center=start+np.array((.04*math.cos(ang)*t*t,-span*t,-.026*t+.028*math.sin(ang*3)*t))
    wave=.012*math.sin(t*math.pi*3+ang*7)*t
    center[0]+=wave
    tangent=np.array((math.cos(ang),0,math.sin(ang)))
    w=widths*(.88+.12*math.sin(t*math.pi))*(1-.63*t)
    for k in [-1,1]:
     verts.append(center+ k*w*tangent);uv.append(((k+1)/2,t))
   for i in range(nlen):
    a=2*i;faces.extend([(a,a+2,a+1),(a+1,a+2,a+3)])
   self.add('hair',verts,faces,uv,NAME_TO_BONE['HairFront' if fringe else 'HairBack'])
 def add_body(self):
  self.ellipsoid('skin',(0,1.818,0),(.124,.168,.115),NAME_TO_BONE['Head'],96,64,face=True)
  self.ellipsoid('hair',(0,1.933,-.035),(.133,.14,.125),NAME_TO_BONE['HairBack'],96,56)
  self.flowing_hair()
  for sign in (-1,1):
   ex=sign*.052
   self.ellipsoid('eyes',(ex,1.841,.105),(.027,.016,.012),NAME_TO_BONE['LeftEye' if sign<0 else 'RightEye'],28,16)
   self.ellipsoid('black',(ex,1.838,.116),(.011,.012,.005),NAME_TO_BONE['LeftEye' if sign<0 else 'RightEye'],20,12)
   self.tube('hair',(ex-sign*.024,1.888,.116),(ex+sign*.02,1.888,.118),.004,.003,NAME_TO_BONE['LeftBrow' if sign<0 else 'RightBrow'],16,8)
  self.ellipsoid('skin',(0,1.798,.118),(.018,.034,.02),NAME_TO_BONE['Head'],28,16)
  self.ellipsoid('ribbon',(0,1.739,.113),(.024,.004,.006),NAME_TO_BONE['Jaw'],30,12)
  self.tube('skin',(0,1.705,0),(0,1.617,0),.052,.045,NAME_TO_BONE['Neck'],40,16)
  self.ellipsoid('shirt',(0,1.392,0),(.190,.221,.110),NAME_TO_BONE['Chest'],84,44)
  self.ellipsoid('fabric',(0,1.448,-.035),(.208,.218,.125),NAME_TO_BONE['Chest'],88,48)
  # navy jacket panels: front central white shirt remains visible
  for sign in (-1,1):
   self.ellipsoid('fabric',(sign*.125,1.404,.057),(.082,.218,.067),NAME_TO_BONE['Chest'],48,32)
   self.tube('fabric',(sign*.180,1.532,0),(sign*.41,1.30,0),.073,.057,NAME_TO_BONE['LeftArm' if sign<0 else 'RightArm'],30,20)
   self.tube('shirt',(sign*.405,1.3,0),(sign*.479,1.18,.01),.053,.050,NAME_TO_BONE['LeftForeArm' if sign<0 else 'RightForeArm'],28,10)
   self.tube('skin',(sign*.48,1.18,.01),(sign*.51,1.075,.04),.033,.028,NAME_TO_BONE['LeftHand' if sign<0 else 'RightHand'],28,14)
   self.ellipsoid('skin',(sign*.51,1.06,.035),(.039,.071,.023),NAME_TO_BONE['LeftHand' if sign<0 else 'RightHand'],36,18)
   for finger in range(4):
    p=(sign*(.488+finger*.014),1.018,.046)
    q=(sign*(.488+finger*.014),.959,.045)
    self.tube('skin',p,q,.007,.004,NAME_TO_BONE['LeftFinger' if sign<0 else 'RightFinger'],9,6)
   self.tube('skin',(sign*.480,1.074,.059),(sign*.460,1.020,.092),.013,.005,NAME_TO_BONE['LeftThumb' if sign<0 else 'RightThumb'],14,7)
  # narrow V collar and bow loops
  self.tube('shirt',(-.06,1.598,.104),(0,1.50,.111),.026,.017,NAME_TO_BONE['Chest'],22,13)
  self.tube('shirt',(.06,1.598,.104),(0,1.50,.111),.026,.017,NAME_TO_BONE['Chest'],22,13)
  for sign in (-1,1):
   self.ellipsoid('ribbon',(sign*.068,1.528,.12),(.065,.029,.016),NAME_TO_BONE['Chest'],44,20)
  self.ellipsoid('ribbon',(0,1.527,.135),(.019,.028,.022),NAME_TO_BONE['Chest'],26,14)
  self.pleated_skirt()
  for sign in (-1,1):
   hip=NAME_TO_BONE['LeftUpLeg' if sign<0 else 'RightUpLeg']
   knee=NAME_TO_BONE['LeftLeg' if sign<0 else 'RightLeg']
   foot=NAME_TO_BONE['LeftFoot' if sign<0 else 'RightFoot']
   self.tube('skin',(sign*.10,.72,0),(sign*.105,.50,0),.058,.046,hip,36,18)
   self.tube('skin',(sign*.105,.49,0),(sign*.105,.19,.015),.040,.031,knee,36,20)
   self.tube('shirt',(sign*.105,.255,.01),(sign*.105,.136,.012),.034,.034,knee,32,14)
   self.ellipsoid('black',(sign*.105,.1,.065),(.055,.075,.132),foot,48,26)
  return self


def make_model(source,outpath):
 b=GLB();g=b.json
 g['samplers'].append({'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497})
 sources={}
 for n in ('skin','hair','fabric'):
  for ch in ('basecolor','normal','metallicroughness'):
   sources[n,ch]=b.embedded_img(source/f'{n}_{ch}.png')
 for name in MATERIALS:
  tex='fabric' if name in ('shirt','skirt','ribbon') else 'hair' if name in ('eyes','black') else name
  color={'shirt':[.92,.93,.99,1],'skirt':[.39,.45,.61,1],'ribbon':[.62,.16,.23,1],
   'black':[.035,.038,.046,1],'eyes':[.29,.22,.18,1]}.get(name,[1,1,1,1]);
  m={'name':name+'_PBR','pbrMetallicRoughness':{'baseColorTexture':{'index':sources[tex,'basecolor']},
   'metallicRoughnessTexture':{'index':sources[tex,'metallicroughness']},'baseColorFactor':color,'metallicFactor':.0,'roughnessFactor':.65},
   'normalTexture':{'index':sources[tex,'normal'],'scale':.27},'doubleSided':name=='hair'}
  g['materials'].append(m)
 rootpos={k:np.array(pos) for k,_,pos in BONES}
 for name,parent,point in BONES:
  translation=np.array(point)-(rootpos[parent] if parent is not None else np.zeros(3))
  node={'name':name,'translation':translation.tolist()}
  g['nodes'].append(node)
 for idx,(name,parent,_) in enumerate(BONES):
  if parent is None:g['scenes'][0]['nodes'].append(idx)
  else:g['nodes'][NAME_TO_BONE[parent]].setdefault('children',[]).append(idx)
 skin={'name':'AIG_Hero_PrototypeRig_NOT_APPROVED','joints':list(range(len(BONES))),'skeleton':0}
 ib=[]
 for _,_,pos in BONES:
  m=np.eye(4,dtype=np.float32);m[:3,3]=-np.asarray(pos)
  ib.append(m.T.flatten()) # glTF COLUMN major
 skin['inverseBindMatrices']=b.arr(np.stack(ib).astype('<f4'),5126,'MAT4');g['skins'].append(skin)
 meshes=Meshes().add_body()
 triangles=0;parts=[];head_node=None
 for count,p in enumerate(meshes.parts):
  material=MATERIALS.index(p['mat'])
  pos=b.arr(p['v'].astype('<f4'),5126,'VEC3',34962,minmax=True)
  nor=b.arr(p['n'].astype('<f4'),5126,'VEC3',34962)
  uv=b.arr(p['uv'].astype('<f4'),5126,'VEC2',34962)
  ji=b.arr(p['j'].astype('<u2'),5123,'VEC4',34962)
  we=b.arr(p['w'].astype('<f4'),5126,'VEC4',34962)
  fi=b.arr(p['f'].reshape(-1).astype('<u4'),5125,'SCALAR',34963)
  prim={'attributes':{'POSITION':pos,'NORMAL':nor,'TEXCOORD_0':uv,'JOINTS_0':ji,'WEIGHTS_0':we},
   'indices':fi,'material':material,'mode':4}
  mesh={'name':f'AIG_{p["mat"]}_{count}_RigFixture','primitives':[prim]}
  if p['blink'] is not None:
   bm=b.arr(p['blink'].astype('<f4'),5126,'VEC3',34962)
   sm=b.arr(p['smile'].astype('<f4'),5126,'VEC3',34962)
   prim['targets']=[{'POSITION':bm},{'POSITION':sm}]
   mesh['weights']=[0,0];mesh['extras']={'targetNames':['Blink','Smile']}
  mi=len(g['meshes']);g['meshes'].append(mesh)
  node_idx=len(g['nodes']);g['nodes'].append({'name':mesh['name'],'mesh':mi,'skin':0})
  g['scenes'][0]['nodes'].append(node_idx)
  if p['blink'] is not None:head_node=node_idx
  triangles+=len(p['f']);parts.append(p['mat'])
 def rot_x(rad):return [math.sin(rad/2),0,0,math.cos(rad/2)]
 def rot_z(rad):return [0,0,math.sin(rad/2),math.cos(rad/2)]
 def add_channel(a,node,path,times,values,typ):
  arr_times=b.arr(np.array(times,dtype='<f4'),5126,'SCALAR',minmax=True)
  arr_vals=b.arr(np.array(values,dtype='<f4').reshape(-1) if typ=='SCALAR' else np.array(values,dtype='<f4'),5126,typ)
  sid=len(a['samplers']);a['samplers'].append({'input':arr_times,'output':arr_vals,'interpolation':'LINEAR'})
  a['channels'].append({'sampler':sid,'target':{'node':node,'path':path}})
 idle={'name':'Idle_Breath_Blink','samplers':[],'channels':[]}
 add_channel(idle,NAME_TO_BONE['Spine'],'rotation',[0,1.5,3],[rot_x(0),rot_x(.018),rot_x(0)],'VEC4')
 add_channel(idle,NAME_TO_BONE['Head'],'rotation',[0,1.5,3],[rot_z(0),rot_z(-.035),rot_z(0)],'VEC4')
 add_channel(idle,head_node,'weights',[0,.66,.73,.82,1.8,3],[[0,.18],[0,.18],[1,.18],[0,.18],[0,.25],[0,.18]],'SCALAR')
 g['animations'].append(idle)
 walk={'name':'Walk_Grounded_Test','samplers':[],'channels':[]}
 times=[0,.25,.5,.75,1,1.25,1.5,1.75,2]
 for joint,phase,amp in [('LeftUpLeg',0,.28),('RightUpLeg',math.pi,.28),('LeftArm',math.pi,.23),('RightArm',0,.23),('LeftLeg',1.3,.17),('RightLeg',1.3+math.pi,.17)]:
  vals=[rot_x(amp*math.sin(2*math.pi*t+phase)) for t in times]
  add_channel(walk,NAME_TO_BONE[joint],'rotation',times,vals,'VEC4')
 add_channel(walk,NAME_TO_BONE['Hips'],'translation',times,[[0,1.04+.012*(1-math.cos(4*math.pi*t)),0] for t in times],'VEC3')
 add_channel(walk,head_node,'weights',[0,1,2],[[0,.12],[0,.16],[0,.12]],'SCALAR')
 g['animations'].append(walk)
 info=b.save(outpath)
 info.update({'triangles':triangles,'primitives':len(meshes.parts),'joints':len(BONES),
              'clips':[x['name'] for x in g['animations']], 'faceMorphs':['Blink','Smile'], 'textures':len(g['images']),
              'visualAuthority':'NOT_APPROVED','usage':'internal skinning/runtime integration QA only'})
 return info

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
 a=p.parse_args();a.output.parent.mkdir(parents=True,exist_ok=True)
 print(json.dumps(make_model(a.source,a.output),ensure_ascii=False,indent=2))