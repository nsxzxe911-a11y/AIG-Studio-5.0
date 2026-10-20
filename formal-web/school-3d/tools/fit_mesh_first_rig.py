#!/usr/bin/env python3
"""AIG School Hero — mesh-first GLB rig adapter. TECHNICAL TEST ONLY.

Takes a *pre-authored target mesh* plus corresponding target-space 3D joint anchors.
Does NOT infer bone lengths or body height from a cropped 2D illustration.
Computes rest joint transforms, skin weights, inverse bind matrices, animation
translations and explicit provenance/approval fields. Does not create face art.
"""
import argparse
import copy
import hashlib
import json
import math
import struct
from pathlib import Path
import numpy as np

MAGIC = 0x46546C67
COMP = {5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
NC = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

class Bundle:
    def __init__(self, path):
        self.raw=Path(path).read_bytes()
        if len(self.raw)<20 or struct.unpack_from('<III',self.raw,0)!=(MAGIC,2,len(self.raw)):
            raise ValueError('invalid glTF 2.0 GLB header')
        n,k=struct.unpack_from('<II',self.raw,12)
        if k!=0x4E4F534A or n%4 or 20+n+8>len(self.raw):
            raise ValueError('invalid first GLB JSON chunk')
        self.g=json.loads(self.raw[20:20+n])
        binlen,bintype=struct.unpack_from('<II',self.raw,20+n)
        if bintype!=0x004E4942 or (20+n+8+binlen)!=len(self.raw):
            raise ValueError('missing single GLB BIN chunk')
        self.data=bytearray(self.raw[20+n+8:])
        if self.g['buffers'][0]['byteLength']>len(self.data):
            raise ValueError('binary bytes missing')
    def read(self, access_idx):
        a=self.g['accessors'][access_idx]
        if a.get('sparse') or a.get('normalized'):
            raise ValueError('unsupported sparse or normalized accessor; fail closed')
        view=self.g['bufferViews'][a['bufferView']]
        if view.get('byteStride'):
            raise ValueError('unsupported interleaved buffers; must repack first')
        t=COMP[a['componentType']];shape=(a['count'],NC[a['type']]);
        offset=view.get('byteOffset',0)+a.get('byteOffset',0)
        size=int(np.prod(shape))*np.dtype(t).itemsize
        if offset+size>len(self.data):raise ValueError('accessor out of range')
        return np.frombuffer(self.data,dtype=t,count=np.prod(shape),offset=offset).reshape(shape).copy()
    def append(self, a,typ,component=5126):
        val=np.ascontiguousarray(a,dtype=COMP[component]);size=NC[typ]
        if val.ndim==1:val=val.reshape(-1,1)
        if val.shape[1]!=size:raise ValueError('accessor element size mismatch')
        while len(self.data)%4:self.data.append(0)
        bv={'buffer':0,'byteOffset':len(self.data),'byteLength':int(val.nbytes)}
        self.g['bufferViews'].append(bv)
        self.data.extend(val.tobytes())
        acc={'bufferView':len(self.g['bufferViews'])-1,'componentType':component,
             'count':len(val),'type':typ}
        self.g['accessors'].append(acc)
        return len(self.g['accessors'])-1
    def finish(self, path):
        self.g['buffers'][0]['byteLength']=len(self.data)
        js=json.dumps(self.g,separators=(',',':'),ensure_ascii=False).encode()
        js+=b' ' * (-len(js)%4)
        self.data.extend(b'\0'*(-len(self.data)%4))
        whole=12+8+len(js)+8+len(self.data)
        result=(struct.pack('<III',MAGIC,2,whole)+struct.pack('<II',len(js),0x4E4F534A)+js+
            struct.pack('<II',len(self.data),0x004E4942)+self.data)
        Path(path).parent.mkdir(parents=True,exist_ok=True)
        Path(path).write_bytes(result)
        return hashlib.sha256(result).hexdigest()

def bones_global(g, joints):
    """Compute glTF rest point from parent translations, no animated pose."""
    names={i:g['nodes'][i].get('name','') for i in joints}
    parent={child:i for i,node in enumerate(g['nodes']) for child in node.get('children',[]) if child in joints}
    cache={}
    def get(idx):
        if idx not in cache:
            own=np.array(g['nodes'][idx].get('translation',[0,0,0]),dtype=float)
            cache[idx]=own+(get(parent[idx]) if idx in parent else 0.)
        return cache[idx]
    return {names[i]:get(i) for i in joints}

def reweight_4_nearest(vertices, anchors, mesh_name='', body_span=1.0):
    """Blend using distances to anatomy segments; no bone-to-mesh autoscaling."""
    names=list(anchors)
    pts=np.asarray(vertices,dtype=np.float64)
    starts=[];ends=[];idxs=[]
    n_to_parent={
        'Hips':'Armature','Spine':'Hips','Chest':'Spine','Neck':'Chest','Head':'Neck',
        'LeftShoulder':'Chest','RightShoulder':'Chest',
        'LeftArm':'LeftShoulder','RightArm':'RightShoulder',
        'LeftForeArm':'LeftArm','RightForeArm':'RightArm',
        'LeftHand':'LeftForeArm','RightHand':'RightForeArm',
        'LeftUpLeg':'Hips','RightUpLeg':'Hips','LeftLeg':'LeftUpLeg','RightLeg':'RightUpLeg',
        'LeftFoot':'LeftLeg','RightFoot':'RightLeg',
        'LeftToe':'LeftFoot','RightToe':'RightFoot',
        'LeftEye':'Head','RightEye':'Head','LeftBrow':'Head','RightBrow':'Head',
        'Jaw':'Head','HairBack':'Head','HairFront':'Head',
        'LeftThumb':'LeftHand','RightThumb':'RightHand','LeftFinger':'LeftHand','RightFinger':'RightHand',
    }
    is_hair='hair' in mesh_name.lower()
    for idx,n in enumerate(names):
        if n=='Armature':continue
        if is_hair:
            if n not in ('HairBack','HairFront','Head','Neck'):continue
        elif n.startswith('Hair') or n in ('LeftEye','RightEye','LeftBrow','RightBrow','Jaw'):
            continue
        parent=n_to_parent.get(n,'Armature')
        if parent not in anchors:raise ValueError('missing parent joint '+parent)
        starts.append(anchors[parent]); ends.append(anchors[n]);idxs.append(idx)
    if not idxs: raise ValueError('no joint segments')
    distance=np.empty((len(pts),len(idxs)),dtype=np.float64)
    for i,(a,b) in enumerate(zip(starts,ends)):
        v=b-a
        t=np.clip(((pts-a)*v).sum(axis=1)/(max(v@v,1e-10)),0,1)
        q=a+t[:,None]*v
        distance[:,i]=np.linalg.norm(pts-q,axis=1)
    n=min(4,len(idxs))
    order=np.argpartition(distance,n-1,axis=1)[:,:n]
    selected=np.take_along_axis(distance,order,axis=1)
    # Not physically meaningful if target anchors float far beyond the mesh.
    radius=max(float(body_span),1e-4)
    if np.median(selected[:,0])>radius*.4:
        raise ValueError('landmarks are too far from candidate mesh; alignment invalid')
    weights=1/np.maximum(selected,0.007*max(radius,1e-4))**3
    weights/=weights.sum(axis=1,keepdims=True)
    inds=np.asarray(idxs,dtype=np.uint16)[order]
    ji=np.zeros((len(pts),4),dtype=np.uint16)
    we=np.zeros((len(pts),4),dtype=np.float32)
    ji[:,:n]=inds;we[:,:n]=weights.astype(np.float32)
    return ji,we

def adjust_animation_translation(bundle, orig_global, new_global, joints, allow_uniform_scale_only=True):
    # Similarity ratio from full-body rest pose; nonuniform fitting invalidates the IK foot-contact guarantee.
    samples=[('Hips','LeftFoot'),('Hips','RightFoot'),('Chest','LeftHand'),('Chest','RightHand'),('Neck','Head')]
    ratios=[np.linalg.norm(new_global[a]-new_global[b])/np.linalg.norm(orig_global[a]-orig_global[b]) for a,b in samples]
    uniform=bool((max(ratios)-min(ratios))<.015)
    ratio=float(np.median(ratios))
    nodes=bundle.g['nodes']
    index_to_name={i:nodes[i]['name'] for i in joints}
    for animation in bundle.g.get('animations',[]):
        if 'Walk' in animation.get('name','') and not uniform:
            animation['name']='IK_REQUIRES_RETARGET_DO_NOT_PLAY_'+animation['name']
        for ch in animation.get('channels',[]):
            if ch['target']['path']!='translation':continue
            node_index=ch['target']['node'];name=index_to_name.get(node_index)
            if not name: continue
            samp=animation['samplers'][ch['sampler']]
            values=bundle.read(samp['output'])
            # For hips, animation stores absolute local translation. Scale Δ relative to source rest, then translate to fitted rest.
            oldlocal=np.array(nodes[node_index].get('translation',[0,0,0]),dtype=float)
            newlocal=new_global[name]-new_global['Armature'] if name=='Hips' else None
            if newlocal is None:continue
            updated=newlocal[None,:]+ratio*(values-oldlocal[None,:])
            samp['output']=bundle.append(updated,'VEC3')
    return {"similarityRatios":[round(x,5) for x in ratios],"uniformSimilarity":uniform,"ratio":ratio,
            "IKplaybackAllowed":uniform}

def bind_to_target(source, target, anchors_file, output):
    orig=Bundle(source); out=Bundle(target)
    anchors_doc=json.loads(Path(anchors_file).read_text(encoding='utf-8'))
    if anchors_doc.get('visualApproval')=='APPROVED' and not anchors_doc.get('approvedMeshSHA256'):
        raise ValueError('cannot approve unverified target')
    # The 3D landmarks must explicitly belong to this same reverse-approved VISUAL SOURCE.
    # This does not pretend the cropped 2D image gives depth or a human's absolute height.
    reference_path=Path(__file__).resolve().parent.parent/'reverse-authority.v1.json'
    if not reference_path.exists():
        reference_path=Path(__file__).resolve().parent/'reverse-authority.v1.json'
    if not reference_path.exists():
        raise ValueError('missing reverse Authority manifest — cannot rebind without source identity')
    reverse=json.loads(reference_path.read_text(encoding='utf-8'))
    source_hash=reverse.get('source',{}).get('sha256')
    if not source_hash or anchors_doc.get('reverseAuthoritySHA256')!=source_hash:
        raise ValueError('reverse Authority SHA mismatch')
    expected=anchors_doc.get('targetMeshSHA256')
    if not expected or hashlib.sha256(Path(target).read_bytes()).hexdigest()!=expected:
        raise ValueError('target mesh SHA mismatch / unsigned target')
    if anchors_doc.get('cameraCalibrated') is not True and anchors_doc.get('sourceLandmarks')=='2D_IMAGE_PIXELS':
        raise ValueError('2D pixel landmarks are not physical 3D points')
    if len(orig.g['skins'])!=1 or len(out.g['skins'])!=1:
        raise ValueError('technical prototype binder currently requires single skinned mesh')
    joints=orig.g['skins'][0]['joints'];ordered_names=[orig.g['nodes'][i]['name'] for i in joints]
    if [out.g['nodes'][i].get('name') for i in joints]!=ordered_names:
        raise ValueError('topology or bone naming changed; use explicit mapping')
    declared=anchors_doc['3dJointPositionsUnitless']
    if set(declared)!=set(ordered_names):raise ValueError('missing/extra bone anchors')
    candidate_points={name:np.array(declared[name],dtype=float) for name in ordered_names}
    if any(x.shape!=(3,) or not np.isfinite(x).all() for x in candidate_points.values()):
        raise ValueError('invalid 3D anchors')
    source_global=bones_global(orig.g,joints)
    target_global=candidate_points
    # Transform animation translation channels while original rest transforms are intact.
    a=adjust_animation_translation(out,source_global,target_global,joints)
    parent={child:i for i,node in enumerate(out.g['nodes']) for child in node.get('children',[]) if child in joints}
    for idx in joints:
        name=out.g['nodes'][idx]['name'];pa=parent.get(idx)
        parent_name=out.g['nodes'][pa]['name'] if pa is not None else None
        local=candidate_points[name]-(candidate_points[parent_name] if parent_name else 0.)
        out.g['nodes'][idx]['translation']=local.tolist()
    ibm=[]
    for idx in joints:
        name=out.g['nodes'][idx]['name'];point=candidate_points[name]
        mat=np.eye(4,dtype=np.float32);mat[:3,3]=-point
        # glTF accessor stores matrices in column-major layout
        ibm.append(mat.reshape(16,order='F'))
    out.g['skins'][0]['inverseBindMatrices']=out.append(np.array(ibm),'MAT4')
    nverts=0;blended=0;unchanged_geometry=0
    bounds=np.array(list(target_global.values()),dtype=float)
    body_span=float(np.max(np.ptp(bounds,axis=0)))
    for mi,m in enumerate(out.g['meshes']):
        for prim in m['primitives']:
            attrs=prim['attributes']
            verts=out.read(attrs['POSITION'])
            # Critically do not change candidate/approved mesh positions.
            before=attrs['POSITION']
            indices,weights=reweight_4_nearest(verts,target_global,m.get('name',''),body_span=body_span)
            attrs['JOINTS_0']=out.append(indices,'VEC4',5123)
            attrs['WEIGHTS_0']=out.append(weights,'VEC4')
            nverts+=len(verts)
            blended+=int(np.count_nonzero(weights[:,1]>.001))
            if attrs['POSITION']==before:unchanged_geometry+=1
    gen=out.g.setdefault('asset',{}).get('generator','')
    out.g['asset']['generator']=gen+' / MESH-FIRST RETARGET TECHNICAL, NOT VISUAL AUTHORITY'
    out.g.setdefault('extras',{})['AIGSchool3DProvenance']={
       'reverseVisualSHA256':anchors_doc.get('reverseAuthoritySHA256'),
       'targetMeshSHA256':expected,
       'visualApproval':'NOT_APPROVED',
       'sourceRigCannotOverrideTargetMesh':True,
       'weightsRecomputed':True,
       'IKplaybackAllowed':a['IKplaybackAllowed'],
       'rigScaledToUnitlessTargetMesh':True
    }
    sha=out.finish(output)
    return dict(output=str(output),sha256=sha,vertexCount=nverts,primitivesUntouchedGeometry=unchanged_geometry,
        blendVertices=blended,jointCount=len(joints),animationFit=a, visualApproval='NOT_APPROVED')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',required=True)
    parser.add_argument('--target',required=True)
    parser.add_argument('--anchors',required=True)
    parser.add_argument('--out',required=True)
    args=parser.parse_args()
    print(json.dumps(bind_to_target(args.source,args.target,args.anchors,args.out),indent=2,ensure_ascii=False))