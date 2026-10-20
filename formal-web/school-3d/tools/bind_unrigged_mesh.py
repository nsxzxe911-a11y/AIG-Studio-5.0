#!/usr/bin/env python3
"""AIG SCHOOL 3D — Phase10 mesh-first binder for *genuinely unrigged* glTF 2 GLBs.

Preserves independent input meshes, exact vertex data, materials, images, morph targets.
Adds a mesh-fitted 33-bone rig, normalized 4-joint skin weights and inverse bind poses.
Source Phase6 skeletal animations are used ONLY when target joint lengths admit a
uniform similarity transform; if not, IK and walk are withheld pending retarget.

This binds a real 3D mesh *supplied by another modeling stage*. It cannot reconstruct
an approved face from a single picture and never grants visual/Homepage authority.
"""
import argparse,copy,hashlib,json
from pathlib import Path
import numpy as np
from fit_mesh_first_rig import Bundle,bones_global,reweight_4_nearest

HERE=Path(__file__).resolve().parent
REVERSE=HERE.parent/'reverse-authority.v1.json' if (HERE.parent/'reverse-authority.v1.json').exists() else HERE/'reverse-authority.v1.json'
NAMES={
 'Hips':'Armature','Spine':'Hips','Chest':'Spine','Neck':'Chest','Head':'Neck',
 'LeftShoulder':'Chest','RightShoulder':'Chest','LeftArm':'LeftShoulder',
 'RightArm':'RightShoulder','LeftForeArm':'LeftArm','RightForeArm':'RightArm',
 'LeftHand':'LeftForeArm','RightHand':'RightForeArm','LeftUpLeg':'Hips',
 'RightUpLeg':'Hips','LeftLeg':'LeftUpLeg','RightLeg':'RightUpLeg',
 'LeftFoot':'LeftLeg','RightFoot':'RightLeg','LeftToe':'LeftFoot','RightToe':'RightFoot',
 'LeftEye':'Head','RightEye':'Head','LeftBrow':'Head','RightBrow':'Head','Jaw':'Head',
 'HairBack':'Head','HairFront':'Head','LeftThumb':'LeftHand','RightThumb':'RightHand',
 'LeftFinger':'LeftHand','RightFinger':'RightHand',
}

def validate_unrigged_target(g):
    if not g.get('meshes') or not g.get('nodes') or not g.get('scenes'):
        raise ValueError('missing independent input mesh/scene')
    if g.get('skins') or g.get('animations'):
        raise ValueError('target must be unrigged; use Phase9 adapter for skinned input')
    if len(g['scenes'])!=1 or g.get('scene',0)!=0:
        raise ValueError('imported model must be flattened to one glTF scene')
    mesh_nodes={}
    for i,node in enumerate(g['nodes']):
        if 'skin' in node or 'children' in node or 'matrix' in node:
            raise ValueError('mesh requires pre-flattened node hierarchy; no hidden transform')
        if 'translation' in node and any(abs(q)>1e-7 for q in node['translation']):
            raise ValueError('nonidentity mesh translation; bake transforms before binding')
        if 'rotation' in node and any(abs(q-o)>1e-7 for q,o in zip(node['rotation'],[0,0,0,1])):
            raise ValueError('nonidentity mesh rotation; bake transforms before binding')
        if 'scale' in node and any(abs(q-1)>1e-7 for q in node['scale']):
            raise ValueError('nonidentity mesh scale; bake transforms before binding')
        if 'mesh' in node:
            idx=node['mesh']
            if not isinstance(idx,int) or not 0<=idx<len(g['meshes']):
                raise ValueError('invalid input mesh node index')
            mesh_nodes.setdefault(idx,[]).append(i)
    if len(mesh_nodes)!=len(g['meshes']) or any(len(x)!=1 for x in mesh_nodes.values()):
        raise ValueError('each imported mesh must have exactly one identity node')
    for i,m in enumerate(g['meshes']):
        for prim in m.get('primitives',[]):
            if prim.get('mode',4)!=4:
                raise ValueError('only TRIANGLES primitives supported')
            at=prim.get('attributes',{})
            if 'POSITION' not in at or 'JOINTS_0' in at or 'WEIGHTS_0' in at:
                raise ValueError('expected unskinned mesh with POSITION')
            # EXPLICIT: leave original morph targets and texture/normal/index buffers intact.
    if not g['scenes'][0].get('nodes'):
        raise ValueError('empty imported scene')
    return mesh_nodes

def _read_anchors(anchors_path,target_path,rig_names):
    a=json.loads(Path(anchors_path).read_text(encoding='utf8'))
    if a.get('visualApproval')!='NOT_APPROVED' or a.get('allowedToPublish') is not False:
        raise ValueError('this adapter never authorizes visual release')
    reference=json.loads(REVERSE.read_text(encoding='utf8'))
    if a.get('reverseAuthoritySHA256')!=reference['source']['sha256']:
        raise ValueError('reverse Authority SHA mismatch')
    if not a.get('targetMeshSHA256') or a['targetMeshSHA256']!=hashlib.sha256(Path(target_path).read_bytes()).hexdigest():
        raise ValueError('unrigged target mesh SHA mismatch')
    if a.get('sourceLandmarks')=='2D_IMAGE_PIXELS':
        raise ValueError('single-image 2D pixels are not 3D landmarks')
    points=a.get('3dJointPositionsUnitless')
    if not isinstance(points,dict) or set(points)!=set(rig_names):
        raise ValueError('33 3D joint anchors required; missing or extra labels')
    d={name:np.array(points[name],dtype=np.float64) for name in rig_names}
    if any(x.shape!=(3,) or not np.isfinite(x).all() for x in d.values()):
        raise ValueError('invalid 3D joint anchors')
    # rejects zero or huge disproportionate bone gaps that contaminate skinning.
    limbs=[('Hips','LeftUpLeg'),('LeftUpLeg','LeftLeg'),('LeftLeg','LeftFoot'),
           ('Hips','RightUpLeg'),('RightUpLeg','RightLeg'),('RightLeg','RightFoot'),
           ('Chest','Neck'),('Neck','Head')]
    whole=np.ptp(np.stack(list(d.values())),axis=0).max()
    if not .05<float(whole)<1000:
        raise ValueError('zero/implausible skeleton bounds')
    for n,other in limbs:
        x=np.linalg.norm(d[n]-d[other])/whole
        if not .003<x<.8:
            raise ValueError('implausible joint length; check manual 3D anchors')
    return d,a

def _take_animation(src,out,src_names,src_glob,dst_glob,dst_ids,ratios):
    ratios=np.array(ratios,float)
    uniform=bool(np.max(ratios)-np.min(ratios)<.015)
    scale=float(np.median(ratios))
    transferred=[];blocked=[]
    for clip in src.g.get('animations',[]):
        walk='walk' in clip.get('name','').lower() or 'ik' in clip.get('name','').lower()
        if walk and not uniform:
            blocked.append(clip.get('name','unnamed walk'))
            continue
        new={'name':clip.get('name','unnamed') if walk else 'Idle_WithoutFacialMorph_REBOUND_TECH_ONLY','channels':[],'samplers':[]}
        for channel in clip.get('channels',[]):
            idx=channel.get('target',{}).get('node');path=channel.get('target',{}).get('path')
            name=src_names.get(idx)
            # Do not copy face morph channels unless target mesh supports exact same shape names.
            if not name or path not in ('rotation','translation','scale') or name not in dst_ids:continue
            sampler=clip['samplers'][channel['sampler']]
            if sampler.get('interpolation','LINEAR')!='LINEAR':
                raise ValueError('only LINEAR animation interpolation supported')
            times=src.read(sampler['input']).astype(np.float32)
            vals=src.read(sampler['output']).astype(np.float32)
            if not np.isfinite(times).all() or not np.isfinite(vals).all():
                raise ValueError('invalid animation accessor')
            if path=='translation':
                parent=NAMES.get(name)
                old_rest=src_glob[name]-src_glob[parent] if parent else src_glob[name]
                new_rest=dst_glob[name]-dst_glob[parent] if parent else dst_glob[name]
                vals=new_rest[None,:]+scale*(vals-old_rest[None,:])
            new_sampler={'input':out.append(times,'SCALAR'),'output':out.append(vals,'VEC3' if path=='translation' else 'VEC4' if path=='rotation' else 'VEC3'),
                         'interpolation':'LINEAR'}
            new['channels'].append({'sampler':len(new['samplers']), 'target':{'node':dst_ids[name],'path':path}})
            new['samplers'].append(new_sampler)
        if new['channels']:
            out.g.setdefault('animations',[]).append(new)
            transferred.append({'name':new['name'],'channels':len(new['channels'])})
    return {'clips':transferred,'blockedForIKRetarget':blocked,'uniformSimilarity':uniform,'scale':scale,
            'facialMorphClipsNotTransferred':True,'shoeSoleContactNotProven':True}

def graft(source,target,anchors_file,output):
    src=Bundle(source);out=Bundle(target)
    if len(src.g.get('skins',[]))!=1:raise ValueError('source must have a single 33-joint reference rig')
    mesh_nodes=validate_unrigged_target(out.g)
    skin=src.g['skins'][0]; src_ids=skin['joints']
    source_names={i:src.g['nodes'][i]['name'] for i in src_ids}
    ordered=[source_names[i] for i in src_ids]
    if len(ordered)!=33 or len(set(ordered))!=33 or set(NAMES)|{'Armature'}!=set(ordered):
        raise ValueError('reference bone list changed')
    points,decl=_read_anchors(anchors_file,target,ordered)
    source_glob=bones_global(src.g,src_ids)
    base=len(out.g['nodes']);ids={n:base+j for j,n in enumerate(ordered)}
    for n in ordered:
        parent=NAMES.get(n)
        local=points[n]-(points[parent] if parent else np.zeros(3))
        out.g['nodes'].append({'name':n,'translation':local.astype(float).tolist()})
    for n,parent in NAMES.items():
        out.g['nodes'][ids[parent]].setdefault('children',[]).append(ids[n])
    out.g['scenes'][0]['nodes'].append(ids['Armature'])
    matrices=[]
    for n in ordered:
        mat=np.eye(4,dtype=np.float32)
        mat[:3,3]=-points[n]
        matrices.append(mat.flatten(order='F'))
    target_skin={'name':'AIG_IndependentMesh_BoneFit_NOT_VISUAL_AUTHORITY',
                'joints':[ids[n] for n in ordered], 'skeleton':ids['Armature'],
                'inverseBindMatrices':out.append(matrices,'MAT4')}
    out.g['skins']=[target_skin]
    body_span=float(np.ptp(np.stack(list(points.values())),axis=0).max())
    total=0;weighted=0;count=0
    for mi,m in enumerate(out.g['meshes']):
        for p in m['primitives']:
            verts=out.read(p['attributes']['POSITION'])
            if verts.shape[1]!=3 or not np.isfinite(verts).all():raise ValueError('invalid vertex data')
            inds,weights=reweight_4_nearest(verts,points,m.get('name',''),body_span=body_span)
            p['attributes']['JOINTS_0']=out.append(inds,'VEC4',5123)
            p['attributes']['WEIGHTS_0']=out.append(weights,'VEC4')
            total+=len(verts);weighted+=int(np.count_nonzero(weights[:,1]>.001));count+=1
        out.g['nodes'][mesh_nodes[mi][0]]['skin']=0
    limbs=[('Hips','LeftFoot'),('Hips','RightFoot'),('Chest','LeftHand'),('Chest','RightHand'),('Neck','Head')]
    ratios=[np.linalg.norm(points[a]-points[b])/np.linalg.norm(source_glob[a]-source_glob[b]) for a,b in limbs]
    a=_take_animation(src,out,source_names,source_glob,points,ids,ratios)
    out.g.setdefault('asset',{})['generator']=out.g['asset'].get('generator','')+' / PHASE10 INDEPENDENT MESH BONE GRAFT, NOT VISUAL AUTHORITY'
    out.g.setdefault('extras',{})['AIGSchool3DProvenance']={
        'targetMeshSHA256':decl['targetMeshSHA256'],
        'reverseAuthoritySHA256':decl['reverseAuthoritySHA256'],
        'inputHasZeroSkinsAndZeroAnimations':True,'meshPositionIndicesPreserved':True,
        'visualApproval':'NOT_APPROVED','homepageAllowed':False,'phase10':True,
        'IKplaybackAllowed':a['uniformSimilarity'],'facialMorphAnimationRetargetRequired':True,
        'rigNameIsOnlyTemplateNotBodySizeAuthority':True
    }
    digest=out.finish(output)
    return {'sha256':digest,'path':str(output),'meshes':len(out.g['meshes']),
            'primitives':count,'vertices':total,'blendVertices':weighted,
            'joints':len(ordered),'inputWasUnrigged':True,'meshPosUntouched':True,
            'animation':a,'visualAuthority':'NOT_APPROVED'}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for name in ('source','target','anchors','out'):p.add_argument('--'+name,required=True)
    a=p.parse_args()
    print(json.dumps(graft(a.source,a.target,a.anchors,a.out),ensure_ascii=False,indent=2))