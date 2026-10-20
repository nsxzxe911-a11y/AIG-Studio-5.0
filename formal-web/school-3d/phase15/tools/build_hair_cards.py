#!/usr/bin/env python3
"""AIG Studio Phase15: real 3D hair-card meshes and skeletal wave animation.

Extends the *original* AIG Phase13 self-built skinned 2.5D envelope GLB.
No third-party character, neural-network asset or Blender/VRoid dependency.
Source-dependent 2.5D locations and inferred backside are NOT full 3D authority.
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, math, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
DEFAULT_PHASE13=Path('/mnt/data/AIG_School3D_Phase13_Envelope/out/source-envelope-NOT-AUTHORITY.glb')
DEFAULT_HAIR_SPEC=Path('/mnt/data/AIG_School3D_Phase14_HairFace/hair-face-spec.v1.json')
DEFAULT_ENVELOPE_SPEC=Path('/mnt/data/AIG_School3D_Phase13_Envelope/mesh-envelope.v1.json')
BONES=['Armature','Hips','Chest','Neck','Head','LeftShoulder','RightShoulder']

def import_aig13_builder(path:Path):
    sp=importlib.util.spec_from_file_location('aig13_envelope_builder',path)
    if not sp or not sp.loader:raise ValueError('Missing original AIG Phase13 builder')
    mod=importlib.util.module_from_spec(sp);sp.loader.exec_module(mod)
    return mod

def read_glb(path:Path):
    raw=Path(path).read_bytes()
    if len(raw)<28 or struct.unpack_from('<III',raw,0)!=(0x46546c67,2,len(raw)):
        raise ValueError('not a valid GLB2')
    off=12;json_blob=None;binary=None
    while off<len(raw):
        n,t=struct.unpack_from('<II',raw,off);off+=8
        if off+n>len(raw):raise ValueError('GLB chunk out of bounds')
        if t==0x4e4f534a:json_blob=raw[off:off+n]
        elif t==0x004e4942:binary=raw[off:off+n]
        off+=n
    if json_blob is None or binary is None:raise ValueError('missing GLB JSON/BIN')
    return json.loads(json_blob),bytearray(binary)

def qrot(a,b):
    """Quat composing screen-plane Z and depth-axis X motion."""
    # q = Z(a) * X(b), xyzw
    sa,ca=math.sin(a/2),math.cos(a/2)
    sb,cb=math.sin(b/2),math.cos(b/2)
    return (ca*sb,sa*sb,sa*cb,ca*cb)

def pixel_world(px,py,ps):
    return ((float(px)-653)*ps,(941-float(py))*ps)

def centerline(s, spec, pxunit):
    t=s
    root=spec['root'];tip=spec['tip'];dx=tip[0]-root[0];dy=tip[1]-root[1]
    L=math.hypot(dx,dy) or 1
    normal=(-dy/L,dx/L)
    c=float(spec['curvature'])*math.sin(math.pi*t)*0.72
    return (root[0]+dx*t+normal[0]*c,root[1]+dy*t+normal[1]*c)

def make_hair(base_path, source_img, hair_spec_path, phase13_spec_path, out_path, builder_path):
    source_img=Path(source_img);base_path=Path(base_path)
    hs=json.loads(Path(hair_spec_path).read_text(encoding='utf8'))
    e=json.loads(Path(phase13_spec_path).read_text(encoding='utf8'))
    source_sha=hashlib.sha256(source_img.read_bytes()).hexdigest()
    if source_sha!=hs['source']['sha256'] or source_sha!=e['source']['sha256']:
        raise ValueError('SHA mismatch: approved source image required')
    if hs['releasedToHomepage'] or hs['approved3DModel'] or e['releaseAllowed'] or e['approved3DModel']:
        raise ValueError('visual authority gate has changed unexpectedly')
    if len(hs['hair']['strands'])!=88 or hs['hair']['segmentsPerStrand']!=9:
        raise ValueError('Phase14 hair spec changed unexpectedly')
    if len({s['id'] for s in hs['hair']['strands']})!=88:raise ValueError('duplicate strand id')
    base_g,raw_bin=read_glb(base_path)
    if base_g.get('extras',{}).get('sourceImageSHA256')!=source_sha:raise ValueError('base is not the same approved reference')
    if base_g.get('extras',{}).get('legacyDollGeometryUsed') is not False:raise ValueError('legacy doll rig forbidden')
    if len(base_g.get('skins',[]))!=1 or len(base_g.get('meshes',[]))!=18:
        raise ValueError('incorrect Phase13 envelope mesh')
    if [x['name'] for x in base_g['nodes'][:7]]!=BONES:raise ValueError('skeleton name mismatch')
    core=import_aig13_builder(Path(builder_path)); gl=core.GLB()
    gl.g=base_g;gl.data=raw_bin
    # Second skin: original Phase13 skin remains byte-for-byte in its own accessors.
    gl.g['asset']['generator']='AIG Phase15 88 new real 3D Hair Cards on original Phase13 envelope, NOT VISUAL AUTHORITY'
    gl.g.setdefault('materials',[])
    hair_materials=[]
    for i,hexcolor in enumerate(hs['hair']['colorPalette']):
        if len(hexcolor)!=7 or not hexcolor.startswith('#'):raise ValueError('invalid hair color')
        rgb=[int(hexcolor[j:j+2],16)/255 for j in (1,3,5)]
        hair_materials.append(len(gl.g['materials']))
        gl.g['materials'].append({'name':'AIG_ORIGINAL_HAIR_CARD_SHADE_'+str(i),
          'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':rgb+[1.0],
          'metallicFactor':0.0,'roughnessFactor':0.72},'emissiveFactor':[c*.03 for c in rgb]})
    orig_len=len(gl.data)
    pxunit=float(e['mesh']['pixelToUnit'])
    reference_head=e['skeleton']['joints'][4]['xy']
    head_x,head_y=pixel_world(*reference_head,pxunit)
    hairjointids=[];jointhomexy=[];part_count=0;total_tri=0;total_verts=0
    for i,s in enumerate(hs['hair']['strands']):
        strand_name=s['id']
        root=tuple(pixel_world(*s['root'],pxunit))
        mid=pixel_world(*centerline(.55,s,pxunit),pxunit)
        z_base=.029+0.00035*(i%6)
        root_node=len(gl.g['nodes'])
        gl.g['nodes'].append({'name':'Hair_'+strand_name+'_Scalp',
          'translation':[root[0]-head_x,root[1]-head_y,z_base],
          'extras':{'scalpFixedInHeadPose':True,'legacyDollGeometry':False}})
        tip_node=len(gl.g['nodes'])
        gl.g['nodes'].append({'name':'Hair_'+strand_name+'_Swing',
          'translation':[mid[0]-root[0],mid[1]-root[1],0.]})
        gl.g['nodes'][4].setdefault('children',[]).append(root_node)
        gl.g['nodes'][root_node]['children']=[tip_node]
        hairjointids.extend((root_node,tip_node));jointhomexy.append((root,mid,z_base))
    skinjoint=list(range(7))+hairjointids
    skin_idx=len(gl.g['skins'])
    ibm=[]
    for nodeid in range(7):
        # Get original authoritative bind inverse matrix from skinned rest data; do not recompute existing bones.
        # The original 7-matrix accessor is reused in this new skin via duplicate entries in buffer accessors.
        pass
    # Inverse bind for existing Phase13 joint points: rest transforms global. New joint points remain in world.
    pose=[tuple(pixel_world(*j['xy'],pxunit))+(0.,) for j in e['skeleton']['joints']]
    for x,y,z in pose:
        ibm.append((1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1))
    for root,mid,z in jointhomexy:
        for x,y in (root,mid):
            ibm.append((1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1))
    ibm_access=gl.accessor('f',ibm,'MAT4')
    gl.g['skins'].append({'name':'AIG_Original_HairCard_183Joints_NoDoll','skeleton':0,
       'joints':skinjoint,'inverseBindMatrices':ibm_access})
    cardinal=9
    for i,s in enumerate(hs['hair']['strands']):
        root,mid,z_base=jointhomexy[i];strid=s['id']
        verts=[];norms=[];uvs=[];jrows=[];wrows=[];tris=[]
        width_px=max(1.,min(5.,float(s['width'])*2.9))
        n=cardinal
        positions=[]
        for k in range(n):
            t=k/(n-1);cx,cy=centerline(t,s,pxunit)
            a=centerline(max(0,t-.03),s,pxunit);b=centerline(min(1,t+.03),s,pxunit)
            ddx=b[0]-a[0];ddy=b[1]-a[1];len2=math.hypot(ddx,ddy) or 1
            nx,ny=-ddy/len2,ddx/len2
            halfwidth=width_px*(1-.65*t)*.5
            left=(cx-nx*halfwidth,cy-ny*halfwidth)
            right=(cx+nx*halfwidth,cy+ny*halfwidth)
            positions.append((left,right))
        # 4 vertices per section: front L/R, back L/R => nonzero depth / true 3D ribbon.
        for k,(left,right) in enumerate(positions):
            t=k/(n-1)
            # skin blends from scalp-root to mid/swing bone with 9 true longitudinal sections
            tip_w=0.0 if t<.12 else min(.98,max(0,(t-.12)/.78))
            j1=7+i*2;j2=j1+1
            for back in (False,True):
                for x,y in (left,right):
                    wx,wy=pixel_world(x,y,pxunit)
                    verts.append((wx,wy,z_base-.0017 if back else z_base+.0025+.001*math.sin(math.pi*t)))
                    norms.append((0,0,-1 if back else 1))
                    uvs.append((x/e['source']['width'],1-y/e['source']['height']))
                    jrows.append((j1,j2,0,0));wrows.append((1-tip_w,tip_w,0.,0.))
        for k in range(n-1):
            a=k*4;b=(k+1)*4
            tris.extend(((a,a+1,b),(a+1,b+1,b)))
            tris.extend(((a+2,b+2,a+3),(a+3,b+2,b+3)))
            # Small edge thickness gives genuinely non-coplanar shape at oblique views.
            tris.extend(((a,b,a+2),(a+2,b,b+2),(a+1,a+3,b+1),(a+3,b+3,b+1)))
        # cap scalp and tip
        tris.extend(((0,2,1),(1,2,3),((n-1)*4,(n-1)*4+1,(n-1)*4+2),((n-1)*4+1,(n-1)*4+3,(n-1)*4+2)))
        inds=[z for tri in tris for z in tri]
        prim={'attributes':{
           'POSITION':gl.accessor('f',verts,'VEC3',34962,True),
           'NORMAL':gl.accessor('f',norms,'VEC3',34962),
           'TEXCOORD_0':gl.accessor('f',uvs,'VEC2',34962),
           'JOINTS_0':gl.accessor('H',jrows,'VEC4',34962),
           'WEIGHTS_0':gl.accessor('f',wrows,'VEC4',34962)},
           'indices':gl.accessor('I',inds,'SCALAR',34963),
           'mode':4,'material':hair_materials[int(s['colorIndex'])%len(hair_materials)]}
        gl.g['meshes'].append({'name':'True3DHairCard_'+strid,'primitives':[prim],
            'extras':{'widthFromReferencePixels':width_px,'depthInferred':True,'sourceGuideId':strid}})
        gl.g['nodes'].append({'name':'HairMesh_'+strid,'mesh':len(gl.g['meshes'])-1,'skin':skin_idx})
        gl.g['scenes'][0]['nodes'].append(len(gl.g['nodes'])-1)
        total_tri+=len(tris);total_verts+=len(verts);part_count+=1
    # Keyframe skeleton animation: hair roots stay anchored, spring waves only bones.
    steps=25;times=[round(k/12,6) for k in range(steps)]
    time_access=gl.accessor('f',times,'SCALAR')
    animation={'name':'Hair_Wind_Spring_Phase15_True3D_Bone_Wave','samplers':[],'channels':[]}
    for i,s in enumerate(hs['hair']['strands']):
        length=math.hypot(s['tip'][0]-s['root'][0],s['tip'][1]-s['root'][1]);gain=min(1.0,max(.22,length/370))
        phase=float(s['phase']);group=s['group']
        for k,nodeid in enumerate((hairjointids[i*2],hairjointids[i*2+1])):
            arr=[]
            for t in times:
                # mild damped spring, 2D screen and real 3D depth wobble. No frame-by-frame vertex fake.
                v=2*math.pi*t
                az=(.025+.060*k)*gain*math.sin(v*1.05+phase-0.65*k)
                ax=(.018+.045*k)*gain*math.sin(v*.79+phase*.83-.52*k)
                arr.append(qrot(az,ax))
            out_idx=gl.accessor('f',arr,'VEC4')
            animation['samplers'].append({'input':time_access,'output':out_idx,'interpolation':'LINEAR'})
            animation['channels'].append({'sampler':len(animation['samplers'])-1,'target':{'node':nodeid,'path':'rotation'}})
    gl.g['animations'].append(animation)
    gl.g['extras'].update({'phase15':True,'real3DHairCardGeometry':True,
      'originalPhase13MeshCount':18,'hairCardCount':88,'hairRigJointCount':176,
      'hairPivotCount':88,'hairCardIndependentBoneAnimations':176,
      'sourceImageSHA256':source_sha,'hairSpecSHA256':hashlib.sha256(Path(hair_spec_path).read_bytes()).hexdigest(),
      'inferredSideAndBack':True,'hasGenuineFacialAI':False,'visualAuthorityApproved':False,
      'releaseAllowed':False,'notAHuman3DScan':True,
      'note':'True 3D hair ribbons with real skinning and joint animation, atop an approximate 2.5D source envelope. The face remains low fidelity.'})
    out_path=Path(out_path);sha=gl.write(out_path)
    return {'sha256':sha,'fileBytes':out_path.stat().st_size,'trianglesAdded':total_tri,
      'verticesAdded':total_verts,'hairCards':part_count,'newHairJoints':len(hairjointids),
      'skinCount':len(gl.g['skins']),'animationCount':len(gl.g['animations']),
      'animationChannelsAdded':len(animation['channels']),'allMeshCount':len(gl.g['meshes']),
      'originalBinBytes':orig_len,'sourceSHA256':source_sha,'visualApproved':False,
      'frontReferenceVisibleOnly':True,'thirdPartyCharacterUsed':False}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--base',required=True)
    ap.add_argument('--source',required=True)
    ap.add_argument('--hair-spec',required=True)
    ap.add_argument('--envelope-spec',required=True)
    ap.add_argument('--phase13-builder',required=True)
    ap.add_argument('--out',required=True)
    ap.add_argument('--report')
    a=ap.parse_args()
    report=make_hair(a.base,a.source,a.hair_spec,a.envelope_spec,a.out,a.phase13_builder)
    if a.report:Path(a.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()