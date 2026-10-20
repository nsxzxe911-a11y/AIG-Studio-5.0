"""Bounded structural evidence for real binary geometry; never visual approval."""
import json, math, struct
from pathlib import Path


def audit_glb(path, require_animation=False):
    raw=Path(path).read_bytes()
    if len(raw)<28 or struct.unpack_from('<III',raw)!=(0x46546c67,2,len(raw)):raise ValueError('GLB_HEADER_INVALID')
    offset=12;doc=None;binary=None
    while offset<len(raw):
        if offset+8>len(raw):raise ValueError('GLB_CHUNK_INVALID')
        n,kind=struct.unpack_from('<II',raw,offset);offset+=8
        if n%4 or offset+n>len(raw):raise ValueError('GLB_CHUNK_INVALID')
        chunk=raw[offset:offset+n];offset+=n
        if kind==0x4e4f534a:doc=json.loads(chunk)
        elif kind==0x004e4942:binary=chunk
    if not doc or binary is None or doc.get('asset',{}).get('version')!='2.0':raise ValueError('GLB_STRUCTURE_MISSING')
    if any(x.get('uri') for x in doc.get('buffers',[])):raise ValueError('GLB_EXTERNAL_BUFFER')
    if any(x.get('uri') and not x['uri'].startswith('data:') for x in doc.get('images',[])):raise ValueError('GLB_EXTERNAL_IMAGE')
    def floats(index):
        a=doc['accessors'][index]
        if a.get('sparse') or a.get('componentType')!=5126:raise ValueError('GLB_FLOAT_ACCESSOR_UNSUPPORTED')
        dim={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}.get(a['type'])
        if not dim or not 1<=a['count']<=2000000:raise ValueError('GLB_ACCESSOR_BUDGET')
        v=doc['bufferViews'][a['bufferView']];stride=v.get('byteStride',dim*4);start=v.get('byteOffset',0)+a.get('byteOffset',0)
        if stride<dim*4 or start<0 or start+stride*(a['count']-1)+dim*4>min(len(binary),v.get('byteOffset',0)+v['byteLength']):raise ValueError('GLB_ACCESSOR_BOUNDS')
        values=[struct.unpack_from('<'+str(dim)+'f',binary,start+i*stride) for i in range(a['count'])]
        if any(not math.isfinite(q) for row in values for q in row):raise ValueError('GLB_NONFINITE')
        return values
    lo=[math.inf]*3;hi=[-math.inf]*3;vertices=triangles=0;weighted=False
    for mesh in doc.get('meshes',[]):
        for p in mesh.get('primitives',[]):
            if p.get('mode',4)!=4:raise ValueError('GLB_TRIANGLES_REQUIRED')
            points=floats(p['attributes']['POSITION']);vertices+=len(points)
            for row in points:
                if len(row)!=3:raise ValueError('GLB_POSITION_INVALID')
                for k,q in enumerate(row):lo[k]=min(lo[k],q);hi[k]=max(hi[k],q)
            count=doc['accessors'][p['indices']]['count'] if 'indices' in p else len(points)
            if count%3:raise ValueError('GLB_INDEX_COUNT_INVALID')
            triangles+=count//3
            weighted|=all(k in p['attributes'] for k in ('JOINTS_0','WEIGHTS_0'))
    if triangles<4 or vertices<4 or any(not math.isfinite(hi[k]-lo[k]) or hi[k]-lo[k]<1e-6 for k in range(3)):raise ValueError('GLB_3D_GEOMETRY_MISSING')
    changing=False
    for clip in doc.get('animations',[]):
        for channel in clip.get('channels',[]):
            sampler=clip['samplers'][channel['sampler']]
            values=floats(sampler['output'])
            changing|=len(values)>1 and any(row!=values[0] for row in values[1:])
    if require_animation and (not doc.get('skins') or not weighted or not changing):raise ValueError('GLB_SKINNED_ANIMATION_MISSING')
    return {'vertices':vertices,'triangles':triangles,'extentXYZ':[hi[k]-lo[k] for k in range(3)],'skins':len(doc.get('skins',[])),'animationClips':len(doc.get('animations',[])),'changingKeys':changing,'pbrMaterials':sum('pbrMetallicRoughness' in m for m in doc.get('materials',[])),'structuralOnly':True,'visualQualityVerified':False,'releaseAllowed':False}
