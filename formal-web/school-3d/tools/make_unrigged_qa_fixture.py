#!/usr/bin/env python3
"""For testing an independent GLB import only. This intentionally reuses REJECTED Phase6 geometry.
It REMOVES every joint, skin and animation: input proves arbitrary unrigged GLB compatibility,
not a new high-fidelity avatar. Outputs explicit provenance and 3D manual QA anchors.
"""
import argparse,copy,hashlib,json
from pathlib import Path
from fit_mesh_first_rig import Bundle,bones_global

def make_fixture(source, target, anchors, scale=0.78):
    b=Bundle(source)
    if len(b.g.get('skins',[]))!=1:raise ValueError('expected source fixture skinned rig')
    old=bones_global(b.g,b.g['skins'][0]['joints'])
    for mesh in b.g['meshes']:
        for p in mesh['primitives']:
            p['attributes'].pop('JOINTS_0',None)
            p['attributes'].pop('WEIGHTS_0',None)
            for part in [p['attributes']['POSITION'],*[t['POSITION'] for t in p.get('targets',[]) if 'POSITION' in t]]:
                val=b.read(part)
                a=b.g['accessors'][part]
                v=b.g['bufferViews'][a['bufferView']]
                ofs=v.get('byteOffset',0)+a.get('byteOffset',0)
                val=(val*scale).astype('<f4')
                b.data[ofs:ofs+val.nbytes]=val.tobytes()
                if 'min' in a:a['min']=val.min(axis=0).tolist()
                if 'max' in a:a['max']=val.max(axis=0).tolist()
    # Artificially change order of mesh nodes; prove the binder does not use legacy IDs.
    b.g['nodes']=[{'name':f'ImportedPart_{i:03d}', 'mesh':i} for i in range(len(b.g['meshes']))][::-1]
    b.g['scenes']=[{'nodes':list(range(len(b.g['nodes'])))}]
    b.g['scene']=0
    b.g['skins']=[]
    b.g['animations']=[]
    b.g['asset']['generator']='AIG independent unrigged GLB TEST FIXTURE FROM REJECTED PHASE6, NOT VISUAL AUTHORITY'
    b.g['extras']={'visualAuthority':'NOT_APPROVED','fixture':'UNRIGGED_ALL_SKELETONS_REMOVED'}
    sh=b.finish(target)
    reverse=json.loads(((Path(__file__).parent.parent/'reverse-authority.v1.json') if (Path(__file__).parent.parent/'reverse-authority.v1.json').exists() else (Path(__file__).parent/'reverse-authority.v1.json')).read_text(encoding='utf8'))
    declaration={'schemaVersion':1,'reverseAuthoritySHA256':reverse['source']['sha256'],
        'targetMeshSHA256':sh,'visualApproval':'NOT_APPROVED','allowedToPublish':False,
        'sourceLandmarks':'TECHNICAL_3D_UNITSPACE_NOT_2D_PIXELS','cameraCalibrated':False,
        '3dJointPositionsUnitless':{n:(p*scale).round(8).tolist() for n,p in old.items()}}
    Path(anchors).parent.mkdir(parents=True,exist_ok=True)
    Path(anchors).write_text(json.dumps(declaration,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    return dict(sourceWasRigged=True,targetIsUnrigged=True,meshCount=len(b.g['meshes']),scaleForTestOnly=scale,sha256=sh)

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--source',required=True);a.add_argument('--target',required=True);a.add_argument('--anchors',required=True)
    args=a.parse_args();print(json.dumps(make_fixture(args.source,args.target,args.anchors),indent=2))