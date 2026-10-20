#!/usr/bin/env python3
"""Original AIG source-image silhouette → 2.5D skinned envelope glTF2.
Only uses stdlib. This is NOT a true reverse-engineered body/back or approved 3D character.
The source image stays visually authoritative; the bone rest pose NEVER resizes vertices.
"""
import argparse, hashlib, json, math, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SPEC=ROOT/'mesh-envelope.v1.json'

def cross(a,b,c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

def triangulate(poly):
    """Handmade ear clipping, handles clockwise and counterclockwise polygon inputs."""
    coords=[tuple(float(v) for v in p) for p in poly]
    area=sum(coords[i][0]*coords[(i+1)%len(coords)][1]-coords[(i+1)%len(coords)][0]*coords[i][1] for i in range(len(coords)))
    if abs(area)<1e-8: raise ValueError('zero-area envelope polygon')
    sign=1 if area>0 else -1
    for i in range(len(coords)):
        if abs(cross(coords[i-1],coords[i],coords[(i+1)%len(coords)]))<1e-8: raise ValueError('collinear polygon anchor')
    remaining=list(range(len(coords)));faces=[]
    while len(remaining)>3:
        found=False
        for k in range(len(remaining)):
            ia,ib,ic=remaining[k-1],remaining[k],remaining[(k+1)%len(remaining)]
            a,b,c=coords[ia],coords[ib],coords[ic]
            if sign*cross(a,b,c)<1e-7:continue
            def inside(p):
                return all(sign*cross(e,f,p)>1e-8 for e,f in [(a,b),(b,c),(c,a)])
            if any(inside(coords[j]) for j in remaining if j not in (ia,ib,ic)):continue
            faces.append((ia,ib,ic));remaining.pop(k);found=True;break
        if not found:raise ValueError('self-crossing or degenerate envelope polygon')
    faces.append(tuple(remaining));return coords,faces

def subdivide(v,f,iterations):
    for _ in range(iterations):
        cache={};nextf=[]
        def half(a,b):
            key=tuple(sorted((a,b)))
            if key not in cache:
                x,y=v[a],v[b];cache[key]=len(v);v.append(((x[0]+y[0])/2,(x[1]+y[1])/2))
            return cache[key]
        for a,b,c in f:
            ab,bc,ca=half(a,b),half(b,c),half(c,a)
            nextf += [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]
        f=nextf
    return v,f

def to_world(px,py,spec):
    # z is NOT known: only front-facing proxy surface. No invented absolute height.
    return ((px-653)*spec['mesh']['pixelToUnit'],(941-py)*spec['mesh']['pixelToUnit'],0.0)

def rig_weight(xy,region_id,spec):
    # Visibly driven. Blend chest/hip and head/neck at boundaries, no large rigid proxy.
    y=xy[1]
    jids={j['name']:i for i,j in enumerate(spec['skeleton']['joints'])}
    if region_id=='hair' or region_id=='face':
        w=max(0.0,min(0.18,(y-245)/250))
        assign=[('Head',1-w),('Neck',w)]
    elif region_id=='torso_uniform':
        w=max(0.0,min(1.0,(y-425)/315))
        assign=[('Chest',1-w),('Hips',w)]
    elif region_id=='skirt': assign=[('Hips',1.0)]
    elif region_id=='left_sleeve': assign=[('LeftShoulder',0.85),('Chest',0.15)]
    elif region_id=='right_sleeve': assign=[('RightShoulder',0.85),('Chest',0.15)]
    else:raise ValueError('unsupported region')
    idx=[jids[n] for n,_ in assign];vals=[w for _,w in assign]
    while len(idx)<4:idx.append(0);vals.append(0.)
    return idx,vals

class GLB:
    def __init__(self):
        self.data=bytearray()
        self.g={'asset':{'version':'2.0','generator':'AIG self-developed Phase13 source-guided 2.5D envelope - NOT VISUAL AUTHORITY'},
                'scene':0,'scenes':[{'nodes':[]}], 'nodes':[],'meshes':[],'buffers':[],'bufferViews':[],
                'accessors':[],'skins':[],'animations':[], 'images':[],'textures':[],'samplers':[], 'materials':[]}
    def view(self,raw,target=None):
        while len(self.data)%4:self.data.append(0)
        off=len(self.data);self.data.extend(raw)
        item={'buffer':0,'byteOffset':off,'byteLength':len(raw)}
        if target is not None:item['target']=target
        self.g['bufferViews'].append(item);return len(self.g['bufferViews'])-1
    def accessor(self,fmt,rows,typ,target=None,minmax=False):
        if fmt=='f': c=5126
        elif fmt=='H':c=5123
        elif fmt=='I':c=5125
        else:raise ValueError(fmt)
        flat=[q for row in rows for q in (row if isinstance(row,(tuple,list)) else (row,))]
        raw=struct.pack('<'+fmt*len(flat),*flat)
        stride={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[typ]
        if len(flat)!=len(rows)*stride:raise ValueError('accessor dimension mismatch')
        a={'bufferView':self.view(raw,target),'componentType':c,'count':len(rows),'type':typ}
        if minmax and rows:
            a['min']=[float(min(row[k] for row in rows)) for k in range(stride)]
            a['max']=[float(max(row[k] for row in rows)) for k in range(stride)]
        self.g['accessors'].append(a);return len(self.g['accessors'])-1
    def write(self,out):
        self.g['buffers']=[{'byteLength':len(self.data)}]
        j=json.dumps(self.g,ensure_ascii=False,separators=(',',':')).encode('utf8')
        j+=b' ' * (-len(j)%4)
        binary=bytes(self.data)+b'\0'*(-len(self.data)%4)
        size=12+8+len(j)+8+len(binary)
        hdr=struct.pack('<III',0x46546c67,2,size)
        Path(out).parent.mkdir(parents=True,exist_ok=True)
        Path(out).write_bytes(hdr+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary)
        return hashlib.sha256(Path(out).read_bytes()).hexdigest()

def build(image,output,spec_path=SPEC):
    spec=json.loads(Path(spec_path).read_text(encoding='utf8'))
    assert spec['releaseAllowed'] is False and spec['approved3DModel'] is False
    assert spec['mesh']['originalPixelCoordinatePreserved']
    if hashlib.sha256(Path(image).read_bytes()).hexdigest()!=spec['source']['sha256']:
        raise ValueError('REVERSE_AUTHORITY_SHA_MISMATCH')
    data=Path(image).read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('source must be original PNG')
    w,h=struct.unpack('>II',data[16:24]);assert [w,h]==[spec['source']['width'],spec['source']['height']]
    gl=GLB();b=gl.view(data)
    gl.g['images'].append({'bufferView':b,'mimeType':'image/png','name':'ORIGINAL_APPROVED_SOURCE_IMAGE_NOT_MODEL'})
    gl.g['samplers'].append({'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071})
    gl.g['textures'].append({'sampler':0,'source':0})
    gl.g['materials'].append({'name':'Source_Image_Front_Reference_Not_Finished_3D',
       'doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':0.92},
       'extensions':{'KHR_materials_unlit':{}}})
    gl.g['materials'].append({'name':'INFERRED_BACKSIDE_NO_VISUAL_TRUTH',
       'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[0.12,0.13,0.18,1.0],
       'metallicFactor':0,'roughnessFactor':1},'extensions':{'KHR_materials_unlit':{}}})
    gl.g['extensionsUsed']=['KHR_materials_unlit']
    joints=spec['skeleton']['joints'];positions={j['name']:to_world(*j['xy'],spec) for j in joints}
    ids={j['name']:i for i,j in enumerate(joints)}
    for j in joints:
        p=positions[j['name']];parent=positions[j['parent']] if j['parent'] else (0,0,0)
        gl.g['nodes'].append({'name':j['name'],'translation':[a-b for a,b in zip(p,parent)]})
    for j in joints:
        if j['parent']:
            gl.g['nodes'][ids[j['parent']]].setdefault('children',[]).append(ids[j['name']])
    ibms=[]
    for j in joints:
        x,y,z=positions[j['name']]
        ibms.append([1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1])
    a=gl.accessor('f',ibms,'MAT4')
    gl.g['skins'].append({'name':'AIG_Image_Visible_7_Joint_Technical','joints':list(range(len(joints))),
       'skeleton':0,'inverseBindMatrices':a})
    total_tri=0;total_vert=0;preservation_error=0;surface_count=0
    def emit(name, verts, faces, tex, weights, normals, material):
        nonlocal total_tri,total_vert,surface_count
        joint_rows=[a for a,_ in weights];weight_rows=[b for _,b in weights]
        pr={'attributes':{'POSITION':gl.accessor('f',verts,'VEC3',34962,True),
             'NORMAL':gl.accessor('f',normals,'VEC3',34962),
             'TEXCOORD_0':gl.accessor('f',tex,'VEC2',34962),
             'JOINTS_0':gl.accessor('H',joint_rows,'VEC4',34962),
             'WEIGHTS_0':gl.accessor('f',weight_rows,'VEC4',34962)},
             'indices':gl.accessor('I',[idx for tri in faces for idx in tri],'SCALAR',34963),
             'material':material,'mode':4}
        gl.g['meshes'].append({'name':name,'primitives':[pr]})
        gl.g['nodes'].append({'name':name,'mesh':len(gl.g['meshes'])-1,'skin':0})
        gl.g['scenes'][0]['nodes'].append(len(gl.g['nodes'])-1)
        total_tri+=len(faces);total_vert+=len(verts);surface_count+=1
    for reg in spec['regions']:
        boundary,faces=triangulate(reg['polygon'])
        boundary_count=len(boundary)
        xy,faces=subdivide(boundary,faces,spec['mesh']['subdivision'])
        # Surface thickness is a visible envelope proxy, NOT inferred human depth.
        minx=min(v[0] for v in xy);maxx=max(v[0] for v in xy)
        cx=(minx+maxx)/2;rx=(maxx-minx)/2
        def bulge(x):
            q=max(-1.,min(1.,(x-cx)/max(rx,1e-6)))
            return (0.30+0.70*math.sqrt(max(0.,1-q*q)))
        depth=spec['mesh']['depthProxyUnits']
        front=[(to_world(x,y,spec)[0],to_world(x,y,spec)[1],depth*bulge(x)) for x,y in xy]
        back=[(px,py,-depth*0.72*bulge(x)) for (x,y),(px,py,_) in zip(xy,front)]
        tex=[(x/w,1-y/h) for x,y in xy]
        jweights=[rig_weight(point,reg['id'],spec) for point in xy]
        for i,(x,y) in enumerate(xy):
            xx,yy,_=front[i]
            preservation_error=max(preservation_error,abs(xx-(x-653)*spec['mesh']['pixelToUnit']),abs(yy-(h-y)*spec['mesh']['pixelToUnit']))
        # Original image is only applied to the observed front shell.
        frontfaces=[]
        for a,b,c in faces:
            if cross(xy[a],xy[b],xy[c])>0:frontfaces.append((a,c,b))
            else:frontfaces.append((a,b,c))
        emit('VisibleFront_'+reg['id'],front,frontfaces,tex,jweights,[(0.,0.,1.) for _ in xy],0)
        emit('HypotheticalBack_'+reg['id'],back,[tuple(reversed(f)) for f in frontfaces],tex,jweights,
             [(0.,0.,-1.) for _ in xy],1)
        # Close the sampled front/back silhouette with a 3D side wall; the wall is also hypothetical.
        edgecount={}
        for a,b,c in faces:
            for v0,v1 in ((a,b),(b,c),(c,a)):
                k=tuple(sorted((v0,v1)));edgecount[k]=edgecount.get(k,0)+1
        boundary_edges=[pair for pair,count in edgecount.items() if count==1]
        wallverts=[];walluv=[];wallweights=[];wallnorm=[];wallfaces=[]
        for a,b in boundary_edges:
            off=len(wallverts)
            wallverts.extend((front[a],front[b],back[b],back[a]))
            walluv.extend((tex[a],tex[b],tex[b],tex[a]))
            wallweights.extend((jweights[a],jweights[b],jweights[b],jweights[a]))
            dx=xy[b][0]-xy[a][0];dy=xy[b][1]-xy[a][1]
            d=math.hypot(dx,dy) or 1
            norm=(dy/d,-dx/d,0.)
            wallnorm.extend([norm]*4)
            wallfaces.extend(((off,off+1,off+2),(off,off+2,off+3)))
        emit('UnobservedSideWall_'+reg['id'],wallverts,wallfaces,walluv,wallweights,wallnorm,1)
    gl.g['scenes'][0]['nodes'].append(ids['Armature'])
    # Rotation around 3D Y: visible photo texture is approximate and may flatten at large angles.
    times=gl.accessor('f',[0.,0.75,1.5],'SCALAR')
    def qy(deg):
        v=math.radians(deg)/2;return [0.,math.sin(v),0.,math.cos(v)]
    def qz(deg):
        v=math.radians(deg)/2;return [0.,0.,math.sin(v),math.cos(v)]
    for label,bone,maxangle,fn in [('Head_Turn_2_5D_Technical','Head',12,qy),
                                    ('Left_Shoulder_Turn_Technical','LeftShoulder',-12,qz),
                                    ('Right_Shoulder_Turn_Technical','RightShoulder',12,qz)]:
        vals=gl.accessor('f',[fn(0),fn(maxangle),fn(0)],'VEC4')
        gl.g['animations'].append({'name':label,'samplers':[{'input':times,'output':vals,'interpolation':'LINEAR'}],
            'channels':[{'sampler':0,'target':{'node':ids[bone],'path':'rotation'}}]})
    gl.g['extras']={'sourceImageSHA256':spec['source']['sha256'],
        'releaseAllowed':False,'isFinalGirl':False,'cameraCalibrated':False,
        'meshOrigin':'source visible polygons from pixel silhouette',
        'unknownDepth':'no verified back, eyes depth, face mesh, or body below crop',
        'legacyDollGeometryUsed':False,'envelopeParts':len(spec['regions'])}
    digest=gl.write(output)
    return {'glbSHA256':digest,'triangles':total_tri,'vertices':total_vert,
      'skins':len(gl.g['skins']),'joints':len(joints),'animations':len(gl.g['animations']),
      'regions':len(spec['regions']),'surfaces':surface_count,'sourceImageSHA256':spec['source']['sha256'],
      'maxReferenceMeshMoveInRest':preservation_error,'visualApproval':'NOT_APPROVED',
      'depth':'INFERRED_2_5D_CLOSED_SURFACE_BACK_AND_EDGES_NOT_AUTHORITY','thirdPartyModelUsed':False}

def main():
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',required=True)
    p.add_argument('--report');p.add_argument('--spec',default=str(SPEC),help='Edited envelope JSON from AIG workbench');args=p.parse_args()
    report=build(args.source,args.out,args.spec)
    if args.report:
        Path(args.report).parent.mkdir(parents=True,exist_ok=True)
        Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__': main()