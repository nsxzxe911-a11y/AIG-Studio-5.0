"""AIG FastModel 4.0 — self-authored geometric unknown-view completion.

Zero network; no weights; Pillow for image I/O. A bounded foreground mask
is converted to a smooth closed 3D volume. NOT photogrammetry, a humanoid rig,
or image synthesis of surfaces hidden from the camera. All inferred regions
are marked and formal release is always blocked.
"""
import argparse
import hashlib
import json
import math
import shutil
import struct
import sys
import tempfile
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

SCHEMA="AIG_FASTMODEL_NATIVE_4_0_GEOMETRIC_VOLUME_DRAFT"
RINGS=64
SIDES=32
ANGLES=(0,45,90,135,180,225,270,315)
MAX_PIXELS=12_000_000

def digest(path):
    with open(path,"rb") as stream:
        return hashlib.file_digest(stream,"sha256").hexdigest()

def foreground(path):
    path=Path(path)
    if not 100<=path.stat().st_size<=20*1024*1024:
        raise ValueError("AIG4_SOURCE_BYTES_INVALID")
    with Image.open(path) as image:
        if image.format not in ("JPEG","PNG","WEBP") or image.width*image.height>MAX_PIXELS:
            raise ValueError("AIG4_SOURCE_FORMAT_OR_SIZE")
        image.load()
        image.thumbnail((384,512))
        source=image.convert("RGBA")
    w,h=source.size
    pixels=source.load()
    has_alpha=sum(pixels[x,y][3]<64 for y in range(0,h,4) for x in range(0,w,4))>w*h/150
    if has_alpha:
        mask=[[pixels[x,y][3]>=128 for x in range(w)] for y in range(h)]
        method="SOURCE_ALPHA"
    else:
        border=[pixels[x,y][:3] for x in range(w) for y in (0,h-1)]
        border += [pixels[x,y][:3] for y in range(h) for x in (0,w-1)]
        center=[sum(p[k] for p in border)/len(border) for k in range(3)]
        noise=sum(sum((p[k]-center[k])**2 for k in range(3)) for p in border)/(3*len(border))
        # Complex photographic background must not silently turn into anatomy.
        if noise>20*20:
            raise ValueError("AIG4_COMPLEX_BACKGROUND_USE_RGBA_MASK")
        dist=lambda p:math.sqrt(sum((p[k]-center[k])**2 for k in range(3)))
        mask=[[dist(pixels[x,y])>=48 for x in range(w)] for y in range(h)]
        method="UNIFORM_BACKGROUND_DISTANCE_HEURISTIC"
    # largest 4-connected component: reject scattered shadows and flowers
    visited=set()
    best=[]
    for y in range(h):
        for x in range(w):
            if not mask[y][x] or (x,y) in visited:continue
            q=deque([(x,y)]);visited.add((x,y));part=[]
            while q:
                ax,ay=q.popleft();part.append((ax,ay))
                for bx,by in ((ax-1,ay),(ax+1,ay),(ax,ay-1),(ax,ay+1)):
                    if 0<=bx<w and 0<=by<h and mask[by][bx] and (bx,by) not in visited:
                        visited.add((bx,by));q.append((bx,by))
            if len(part)>len(best):best=part
    coverage=len(best)/(w*h)
    if not .07<=coverage<=.86:
        raise ValueError("AIG4_FOREGROUND_COVERAGE_UNSAFE")
    if min(x for x,_ in best)<=0 or max(x for x,_ in best)>=w-1:
        raise ValueError("AIG4_FOREGROUND_SIDE_CROPPED")
    if min(y for _,y in best)<=0 or max(y for _,y in best)>=h-1:
        raise ValueError("AIG4_FOREGROUND_HEIGHT_CROPPED")
    left=min(x for x,_ in best);right=max(x for x,_ in best)
    top=min(y for _,y in best);bottom=max(y for _,y in best)
    if bottom-top<.34*h or right-left<.12*w:
        raise ValueError("AIG4_FOREGROUND_DIMENSIONS_UNSAFE")
    rows={}
    for x,y in best:
        lo,hi=rows.get(y,(x,x))
        rows[y]=(min(lo,x),max(hi,x))
    return {"image":source,"rows":rows,"bbox":(left,top,right,bottom),
        "coverage":coverage,"method":method,"resolution":(w,h),
        "originalSHA256":digest(path),"sourceFile":str(path)}

def interpolate_row(rows,y):
    keys=sorted(rows)
    if y<=keys[0]:return rows[keys[0]]
    if y>=keys[-1]:return rows[keys[-1]]
    below=max(k for k in keys if k<=y)
    above=min(k for k in keys if k>=y)
    if below==above:return rows[below]
    t=(y-below)/(above-below)
    return tuple(rows[below][i]*(1-t)+rows[above][i]*t for i in (0,1))

def proportions(front,side=None):
    l,t,r,b=front["bbox"];width=r-l+1;height=b-t+1
    step=[t+height*i/10 for i in range(11)]
    anchors=[]
    for i,y in enumerate(step):
        a,z=interpolate_row(front["rows"],round(min(b,max(t,y))))
        anchors.append({"atHeight":round(i/10,3),"widthRatio":round((z-a+1)/height,5),
                        "centerRatio":round(((a+z)/2-l)/width,5),
                        "source":"OBSERVED_FRONT_SILHOUETTE"})
    return {"bboxXY":[l,t,r,b],"observedHeightPixels":height,
        "observedWidthPixels":width,"widthHeightRatio":round(width/height,5),
        "headToBodyRatio":{"value":None,"status":"UNCERTAIN_NO_LANDMARK_DETECTOR"},
        "shoulderWidth":{"value":None,"status":"UNCERTAIN_NO_SEMANTIC_LABELS"},
        "waistLine":{"value":None,"status":"UNCERTAIN_NO_SEMANTIC_LABELS"},
        "skirtHemCurve":{"value":None,"status":"UNCERTAIN_NO_GARMENT_SEGMENTATION"},
        "armLengthRatio":{"value":None,"status":"UNCERTAIN_NO_SEPARATE_LIMB_MASK"},
        "legLengthRatio":{"value":None,"status":"UNCERTAIN_NO_SEPARATE_LIMB_MASK"},
        "hairVolumeLeftRight":{"value":None,"status":"UNCERTAIN_NO_HAIR_CLASSIFIER"},
        "poseFacingYaw":{"value":0,"status":"ASSUMED_FRONT_CAMERA"},
        "ratiosByImageHeight":anchors,
        "depthConstraint": "OBSERVED_SIDE_SILHOUETTE_ONLY" if side else "INFERRED_SYMMETRY",
        "physicalUnitsCalibrated":False}

def volume(front,side=None):
    l,t,r,b=front["bbox"];h=b-t+1;original_w=r-l+1
    _,st,_,sb=side["bbox"] if side else (0,0,0,0)
    sw=(sb-st+1) if side else 1
    vertices=[];colors=[];normals=[];levels=[];confidence=[]
    for i in range(RINGS):
        yf=i/(RINGS-1)
        yimg=t+yf*(h-1)
        a,z=interpolate_row(front["rows"],round(yimg))
        # Long thin tips close into caps without collapsing all rings.
        half_width=max(.0025,(z-a+1)/(2*h))
        center=((a+z)/2-(l+r)/2)/h
        if side:
            sy=round(st+yf*(sw-1))
            sa,sbnd=interpolate_row(side["rows"],sy)
            depth=max(.005,(sbnd-sa+1)/(2*sw))
        else:depth=max(.005,half_width*.58)
        yy=.5-yf
        for j in range(SIDES):
            theta=j*math.tau/SIDES
            x=center+half_width*math.cos(theta)
            zed=depth*math.sin(theta)
            vertices.append((x,yy,zed))
            nx=math.cos(theta)/max(half_width,.001)
            nz=math.sin(theta)/max(depth,.001)
            hyp=math.hypot(nx,nz)
            normals.append((nx/hyp,0,nz/hyp))
            # front-facing sides use real 2D pixels only as a 2D color cue.
            # All back texture is a neutral placeholder; geometry is inferred.
            if math.sin(theta)>=.35:
                px=min(front["resolution"][0]-1,max(0,round((a+z)/2+
                   math.cos(theta)*(z-a)/2)))
                cr,cg,cb,_=front["image"].getpixel((px,min(front["resolution"][1]-1,round(yimg))))
                certainty="OBSERVED_2D_COLOR_INFERRED_3D_DEPTH"
                cc=.47 if side else .25
            elif math.sin(theta)<-.35:
                cr,cg,cb=82,91,109
                certainty="UNCERTAIN_BACK_SURFACE";cc=.10
            else:
                cr,cg,cb=125,135,151
                certainty="INFERRED_SIDE_SURFACE";cc=.25 if side else .16
            colors.append((cr/255,cg/255,cb/255,1.0))
            confidence.append(round(cc,2))
            levels.append(certainty)
    triangles=[]
    for i in range(RINGS-1):
        for j in range(SIDES):
            k=i*SIDES+j;n=i*SIDES+(j+1)%SIDES
            triangles.extend([k,n,k+SIDES,n,n+SIDES,k+SIDES])
    # End caps: actual closed volume, not a flat depthless card.
    ctop=len(vertices);vertices.append((0,.5,0));normals.append((0,1,0))
    colors.append((.4,.4,.4,1));confidence.append(.10);levels.append("UNCERTAIN_CAP")
    cbot=len(vertices);vertices.append((0,-.5,0));normals.append((0,-1,0))
    colors.append((.4,.4,.4,1));confidence.append(.10);levels.append("UNCERTAIN_CAP")
    for j in range(SIDES):
        n=(j+1)%SIDES
        triangles.extend((ctop,n,j))
        base=(RINGS-1)*SIDES
        triangles.extend((cbot,base+j,base+n))
    return vertices,normals,colors,triangles,confidence,levels

def write_glb(path,verts,normals,colors,indices,source_hash):
    data=bytearray();views=[];acc=[]
    def write(values,fmt,kind,component,counttype):
        padding=(-len(data))%4;data.extend(b"\0"*padding)
        offset=len(data)
        for v in values:
            values_tuple=v if isinstance(v,(tuple,list)) else (v,)
            data.extend(struct.pack("<"+fmt,*values_tuple))
        view=len(views)
        views.append({"buffer":0,"byteOffset":offset,"byteLength":len(data)-offset})
        accessor={"bufferView":view,"componentType":component,"count":len(values),"type":counttype}
        if kind=="pos":
            accessor["min"]=[min(row[k] for row in values) for k in range(3)]
            accessor["max"]=[max(row[k] for row in values) for k in range(3)]
        acc.append(accessor)
        return len(acc)-1
    p=write(verts,"3f","pos",5126,"VEC3")
    n=write(normals,"3f","normal",5126,"VEC3")
    c=write(colors,"4f","color",5126,"VEC4")
    i=write(indices,"I","indices",5125,"SCALAR")
    doc={"asset":{"version":"2.0","generator":"AIG FastModel 4.0 self-developed scaffold"},
      "scene":0,"scenes":[{"nodes":[0]}],"nodes":[{"mesh":0}],
      "meshes":[{"primitives":[{"attributes":{"POSITION":p,"NORMAL":n,"COLOR_0":c},
          "indices":i,"material":0,"mode":4}]}],
      "materials":[{"name":"AIG Draft only, inferred back neutral",
          "pbrMetallicRoughness":{"baseColorFactor":[1,1,1,1],"metallicFactor":0,
              "roughnessFactor":.94},"doubleSided":True}],
      "buffers":[{"byteLength":len(data)}],"bufferViews":views,"accessors":acc,
      "extras":{"sourceImageSHA256":source_hash,"structuralDraftOnly":True,
          "inferredUnseenGeometry":True,"approved3DModel":False,
          "realHeroineGLBApproved":False,"releaseAllowed":False,
          "rigged":False,"photogrammetryComplete":False}}
    block=json.dumps(doc,separators=(",",":"),ensure_ascii=False).encode("utf-8")
    block+=b" "*((-len(block))%4)
    data.extend(b"\0"*((-len(data))%4))
    size=12+8+len(block)+8+len(data)
    with open(path,"wb") as f:
        f.write(struct.pack("<III",0x46546c67,2,size))
        f.write(struct.pack("<II",len(block),0x4e4f534a));f.write(block)
        f.write(struct.pack("<II",len(data),0x004e4942));f.write(data)

def render_view(out,verts,colors,triangles,degrees):
    width,height=480,640
    im=Image.new("RGB",(width,height),(5,10,17));painter=ImageDraw.Draw(im)
    yaw=math.radians(degrees)
    projected=[]
    depth=[]
    scale=505
    for x,y,z in verts:
        xx=x*math.cos(yaw)+z*math.sin(yaw)
        zz=-x*math.sin(yaw)+z*math.cos(yaw)
        projected.append((width//2+xx*scale,height//2-y*scale))
        depth.append(zz)
    # Back-to-front triangle rasterization of the inferred scaffold.
    faces=[]
    for j in range(0,len(triangles),3):
        a,b,c=triangles[j:j+3]
        if any(v>=len(verts) for v in (a,b,c)):continue
        z=(depth[a]+depth[b]+depth[c])/3
        faces.append((z,a,b,c))
    for _,a,b,c in sorted(faces):
        vals=[colors[v] for v in (a,b,c)]
        rgb=tuple(round(max(0,min(255,255*sum(v[k] for v in vals)/3))) for k in range(3))
        painter.polygon([projected[a],projected[b],projected[c]],fill=rgb)
    painter.text((14,12),f"AIG native 4.0 / {degrees} degrees",fill=(204,229,247))
    painter.text((14,36),"3D volume projection, NOT a new photo",fill=(236,185,107))
    painter.text((14,height-24),"Depth/back surface inferred - QA required",fill=(236,185,107))
    im.save(out)

def build(source,output,side=None):
    source,output=Path(source).resolve(),Path(output).resolve()
    if output.exists():raise ValueError("AIG4_OUTPUT_EXISTS_NO_OVERWRITE")
    front=foreground(source)
    other=foreground(side) if side else None
    p=proportions(front,other)
    v,n,c,indices,confidence,levels=volume(front,other)
    output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".aig-native4-",dir=output.parent) as temporary:
        dest=Path(temporary)/"result";dest.mkdir()
        shutil.copyfile(source,dest/("original"+source.suffix.lower()))
        mesh=dest/"AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb"
        write_glb(mesh,v,n,c,indices,front["originalSHA256"])
        if side:
            sidepath=Path(side).resolve();shutil.copyfile(sidepath,dest/("side-original"+sidepath.suffix.lower()))
        folder=dest/"unknown-views";folder.mkdir()
        for yaw in ANGLES:
            render_view(folder/(f"{yaw:03d}-INFERRED.png"),v,c,indices,yaw)
        # Confidence by angle / row, not a semantic depth or accuracy certificate.
        cm=Image.new("RGB",(SIDES*12,RINGS*7),(0,0,0));paint=ImageDraw.Draw(cm)
        for k,q in enumerate(confidence[:RINGS*SIDES]):
            i,j=divmod(k,SIDES)
            t=round(255*q)
            paint.rectangle((j*12,i*7,(j+1)*12-1,(i+1)*7-1),fill=(200-t,t,60))
        cm.save(dest/"confidence-2D-HEURISTIC.png")
        scaffold={"schema":SCHEMA,"sourceSHA256":front["originalSHA256"],
          "sourceSize":[*front["resolution"]],"sourceMaskMode":front["method"],
          "sideSourceSHA256":other["originalSHA256"] if other else None,
          "originalPreserved":True,"networkRequestsMade":0,"creditSpend":0,
          "proportions":p,"meshVertexCount":len(v),"meshTriangleCount":len(indices)//3,
          "meshGLBSHA256":digest(mesh),"meshType":"CLOSED_ELLIPTICAL_SECTION_VOLUME",
          "generatedViewYawDegrees":list(ANGLES),
          "viewImagesAreRenderedProjectionsNotMissingPhotoGroundTruth":True,
          "uncertaintyLegend":{"OBSERVED":"2D source silhouette only",
             "INFERRED":"3D thickness or side geometry assumption",
             "UNCERTAIN":"hidden back, head/neck, skin, hair, and body parts"},
          "confidenceMean":round(sum(confidence)/len(confidence),4),
          "missingCameraCalibration":True,"unseenSurfacesInferred":True,
          "realBodyPartSeparation":False,"autoRiggingAvailable":False,
          "photogrammetryVerified":False,"formalHeroineApproved":False,
          "releaseAllowed":False}
        (dest/"scaffold.json").write_text(json.dumps(scaffold,ensure_ascii=False,indent=2),encoding="utf-8")
        (dest/"proportions.json").write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding="utf-8")
        if output.exists():raise ValueError("AIG4_OUTPUT_APPEARED_NO_OVERWRITE")
        dest.rename(output)
    return scaffold

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",required=True);parser.add_argument("--out",required=True)
    parser.add_argument("--side",default=None);parser.add_argument("--check-only",action="store_true")
    args=parser.parse_args(argv)
    try:
        front=foreground(args.source);side=foreground(args.side) if args.side else None
        result={"status":"INPUT_PRECHECK_ONLY","proportions":proportions(front,side),
                "sourceSHA256":front["originalSHA256"],"releaseAllowed":False} if args.check_only else build(args.source,args.out,args.side)
        print(json.dumps(result,ensure_ascii=False))
        return 0
    except (OSError,ValueError,ImportError) as error:
        print(json.dumps({"status":"BLOCKED","error":str(error),"releaseAllowed":False}),file=sys.stderr)
        return 1

if __name__=="__main__":sys.exit(main())
