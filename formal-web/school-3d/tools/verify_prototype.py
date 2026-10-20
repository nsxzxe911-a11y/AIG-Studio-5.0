import argparse,json,struct,hashlib,math
from pathlib import Path
import numpy as np

def parse(path):
 b=Path(path).read_bytes();magic,vers,total=struct.unpack_from('<III',b,0)
 assert magic==0x46546c67 and vers==2 and total==len(b)
 size,jtype=struct.unpack_from('<II',b,12);assert jtype==0x4e4f534a
 j=json.loads(b[20:20+size]);offs=20+size
 binsize,btype=struct.unpack_from('<II',b,offs);assert btype==0x004e4942
 data=b[offs+8:offs+8+binsize]
 assert len(data)==binsize and j['buffers'][0]['byteLength']<=binsize
 return j,data

def acc_array(j,b,idx):
 a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']]
 nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']]
 arr=np.frombuffer(b,dtype=dtype,count=nc*a['count'],offset=v.get('byteOffset',0)+a.get('byteOffset',0))
 return arr.reshape(a['count'],nc)

def verify(path):
 j,b=parse(path);errors=[]
 names=[x.get('name','') for x in j['nodes']]
 triangles=0;skin_prims=0
 for mesh in j.get('meshes',[]):
  for p in mesh.get('primitives',[]):
   a=p['attributes']
   for key in ('POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'):
    if key not in a:errors.append('missing attribute '+key)
   if 'JOINTS_0' not in a:continue
   v=acc_array(j,b,a['POSITION']);normal=acc_array(j,b,a['NORMAL']);w=acc_array(j,b,a['WEIGHTS_0']);jo=acc_array(j,b,a['JOINTS_0']);indices=acc_array(j,b,p['indices'])
   triangles+=len(indices)//3;skin_prims+=1
   if not np.isfinite(v).all() or not np.isfinite(normal).all():errors.append('nonfinite vertex')
   if not np.allclose(w.sum(axis=1),1,atol=1e-5):errors.append('weights not normalized')
   if jo.max()>=len(j['skins'][0]['joints']):errors.append('joint index out of range')
   if indices.max()>=len(v):errors.append('indices out of bounds')
   if p.get('targets'):
    for t in p['targets']:
     if acc_array(j,b,t['POSITION']).shape!=v.shape:errors.append('morph mismatch')
  if any(p.get('targets') for p in mesh.get('primitives',[])):
   if mesh.get('extras',{}).get('targetNames')!=['Blink','Smile']:errors.append('missing face morph targets')
 if len(j['skins'][0]['joints'])<24:errors.append('skeletal count')
 if len(j['animations'])<2:errors.append('missing animation clips')
 for anim in j['animations']:
  if not anim['channels']:errors.append('no channels')
  for ch in anim['channels']:
   s=anim['samplers'][ch['sampler']]
   t=acc_array(j,b,s['input']).ravel()
   vals=acc_array(j,b,s['output'])
   if not np.all(np.diff(t)>0):errors.append('nonmonotonic time')
   if ch['target']['path']=='rotation' and (vals.shape[1]!=4 or len(vals)!=len(t)):errors.append('quaternion count')
   if ch['target']['path']=='translation' and (vals.shape[1]!=3 or len(vals)!=len(t)):errors.append('translation count')
   if ch['target']['path']=='weights' and len(vals)!=len(t)*2:errors.append('morph weights accessor count')
   if not np.isfinite(vals).all():errors.append('nonfinite animation')
 for x in j['images']:
  if not x.get('mimeType')=='image/png' or 'bufferView' not in x:errors.append('texture external')
 for mat in j['materials']:
  if not all(k in mat.get('pbrMetallicRoughness',{}) for k in ('baseColorTexture','metallicRoughnessTexture')) or not mat.get('normalTexture'):
   errors.append('PBR missing '+mat.get('name',''))
 report={'valid_glTF2_technical':not errors,'errors':errors,'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),
 'vertices_skin_primitives':skin_prims,'triangles':triangles,'joint_count':len(j['skins'][0]['joints']),
 'animations':[a['name'] for a in j['animations']],'morph_target_count':2,'embedded_pbr_maps':len(j['images']),
 'appearance_approval':'NOT APPROVED: this fixture does not match cinematic image Authority',
 'qa_level':'technical structure only; rendering, true natural walking, and mobile performance not verified'}
 return report

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('file');a=ap.parse_args();r=verify(a.file);print(json.dumps(r,indent=2,ensure_ascii=False));exit(0 if r['valid_glTF2_technical'] else 1)