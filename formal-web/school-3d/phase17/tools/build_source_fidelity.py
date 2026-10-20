#!/usr/bin/env python3
"""AIG School3D Phase17: source-guided restoration of face-adjacent hair.

Preserves Phase16 528 skinned cards/176 hair joints, but fits each geometry
centerline to the original approved photo and adds small UV-textured 2.5D
scalp/fringe/sweeps shells with NO imported third-party character parts.

Front-side image texture is OBSERVED; depths, backs, hair occlusion and
unseen angles are ESTIMATED. This does not constitute a realistic 3D head.
"""
import argparse,hashlib,importlib.util,json,math,io
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np

HERE=Path(__file__).resolve().parent
PH15=HERE.parent.parent/'phase15/tools/build_hair_cards.py'
CORE=HERE.parent.parent/'phase13/tools/build_envelope.py'

# Drawn by inspecting the 1672x941 APPROVED source's visible hero only.
# These are hand-guided polygons, NOT a claim of automatic hair segmentation.
CROWN=[(504,171),(514,123),(550,87),(607,50),(665,44),(705,49),(736,72),
       (762,117),(773,180),(757,219),(737,181),(711,143),(675,114),
       (636,124),(606,142),(578,183),(550,220),(516,207)]
LEFT=[(531,158),(512,189),(491,221),(469,272),(455,326),(430,393),
      (402,442),(383,480),(399,513),(426,489),(445,450),(470,405),
      (484,368),(504,337),(520,298),(540,266),(560,230),(574,184)]
RIGHT=[(700,91),(734,91),(757,117),(771,160),(771,213),(762,261),
       (775,321),(808,361),(849,394),(897,444),(953,479),(975,499),
       (960,524),(924,518),(891,490),(857,467),(810,414),(777,366),
       (747,314),(734,267),(745,211),(731,163)]
FRINGE=[(551,151),(571,118),(609,92),(662,78),(711,86),(733,110),
        (745,163),(731,197),(711,168),(688,147),(659,141),(642,162),
        (615,181),(590,205),(566,211),(547,190)]
REGIONS={'crown':CROWN,'left':LEFT,'right':RIGHT,'fringe':FRINGE}
# Parts intentionally avoid much of the visible cheek and facial feature area.
REFERENCE_FACE=[(617,147),(664,127),(703,135),(728,170),(743,207),
                (735,255),(717,299),(683,330),(640,324),(600,300),
                (582,259),(590,209)]

def modules():
 sp=importlib.util.spec_from_file_location('aig_hair15',PH15)
 a=importlib.util.module_from_spec(sp);sp.loader.exec_module(a)
 sp=importlib.util.spec_from_file_location('aig_core13',CORE)
 b=importlib.util.module_from_spec(sp);sp.loader.exec_module(b)
 return a,b,None

def poly_mask(shape,polys,face_exclude=False):
 w,h=shape; im=Image.new('L',(w,h));d=ImageDraw.Draw(im)
 for p in polys:d.polygon(p,fill=255)
 if face_exclude:d.polygon(REFERENCE_FACE,fill=0)
 return np.asarray(im,dtype=np.uint8)

def color_likelihood(arr):
 # Self-developed broad original-color classifier (hair brown/chestnut/highlight),
 # NOT a trained segmentation network. Never treat this as ground truth.
 rgb=arr.astype(np.float32);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
 brightness=np.max(rgb,axis=2)
 good=(r>=b*.90)&(r>=g*.82)&(g>=b*.77)&(brightness>24)&(brightness<250)
 blue=(b>r*1.13)&(b>g*1.04)
 green=(g>r*1.12)&(g>b*1.02)
 pale=(r>228)&(g>215)&(b>193)
 return (good &~blue &~green &~pale).astype(np.float32)

def fitting_paths(spec,img,polygons=REGIONS):
 """Source-informed smoothly compensated centerlines; guide roots not resized.

 A pen-like progressive search along the original trajectory finds nearby
 brown hair pixels inside curated ROI; displacement bounded to 34px.
 """
 a,b,c=modules(); w,h=img.size; ar=np.asarray(img.convert('RGB'))
 include=poly_mask((w,h),list(polygons.values()),face_exclude=True)>0
 likely=color_likelihood(ar)
 raw=spec['hair']['strands'];paths={}; report=[]
 for s in raw:
  path=[];n=25;g=s['group']; root=np.array(s['root'],float)
  for k in range(n):
   t=k/(n-1);cx,cy=a.centerline(t,s,.0025)
   pt0=np.array((cx,cy))
   # keep roots exact, and bring guides toward visible hair pixels after scalp
   if k==0:pt=pt0
   else:
    m=a.centerline(max(0,t-.006),s,.0025);q=a.centerline(min(1,t+.006),s,.0025)
    v=np.array(q)-np.array(m); v=v/(np.linalg.norm(v)+1e-9)
    normal=np.array([-v[1],v[0]])
    best=(-1e10,None)
    maxshift=28 if t<.30 else 40
    for delta in range(-maxshift,maxshift+1,4):
     p=pt0+normal*delta;x=int(round(p[0]));y=int(round(p[1]))
     if x<0 or x>=w or y<0 or y>=h:continue
     ok=float(include[y,x]); hair=float(likely[y,x])
     # Hair class and curated ROI are explicit proxy, NOT manual true labels.
     val=3.0*ok+2.5*hair-0.005*(delta**2)-.10*abs(delta)
     if g=='fringe' and y>215:val-=5.
     if val>best[0]:best=(val,p)
    pt=best[1] if best[1] is not None else pt0
   path.append([round(float(z),3) for z in pt])
  # Suppress zig-zagging from independent pixel choices; retain original root.
  for _ in range(5):
   smooth=[path[0]]
   for j in range(1,len(path)-1):
    smooth.append([round((path[j-1][axis]+2*path[j][axis]+path[j+1][axis])/4,3) for axis in (0,1)])
   smooth.append(path[-1]);path=smooth
  # source-color support evaluated only on interior (avoid scalp roots + offscreen tips)
  flags=[]
  for x,y in path[4:-2]:
   ix=int(round(x));iy=int(round(y))
   flags.append(bool(0<=ix<w and 0<=iy<h and include[iy,ix] and likely[iy,ix]))
  support=sum(flags)/len(flags) if flags else 0.
  baseline=[]
  for k in range(4,n-2):
   x,y=a.centerline(k/(n-1),s,.0025);ix=int(round(x));iy=int(round(y))
   baseline.append(bool(0<=ix<w and 0<=iy<h and include[iy,ix] and likely[iy,ix]))
  base=sum(baseline)/len(baseline)
  paths[s['id']]=path
  report.append({'id':s['id'],'group':g,'sourceColorSupportBefore':round(base,5),
                 'sourceColorSupportAfter':round(support,5),
                 'maxGuideCorrectionPx':round(max(np.linalg.norm(np.array(p)-np.array(a.centerline(j/(n-1),s,.0025))) for j,p in enumerate(path)),3)})
 return paths,report

def interp_path(path,t):
 pos=t*(len(path)-1);i=min(len(path)-2,int(pos));f=pos-i
 x0,y0=path[i];x1,y1=path[i+1]
 return (x0*(1-f)+x1*f,y0*(1-f)+y1*f)

def make_reconstruction(phase16_glb,source_image,hair_spec,envelope_spec,out_glb,report_out):
 a,core,_=modules()
 spec=json.loads(Path(hair_spec).read_text());env=json.loads(Path(envelope_spec).read_text())
 sha=hashlib.sha256(Path(source_image).read_bytes()).hexdigest()
 if sha!=spec['source']['sha256'] or sha!=env['source']['sha256']:raise ValueError('approved image SHA mismatch')
 g,data=a.read_glb(phase16_glb)
 if g.get('extras',{}).get('sourceImageSHA256')!=sha or g['extras'].get('phase16') is not True:raise ValueError('Phase16 input or exact authority missing')
 if len(g['meshes'])!=106 or len(g.get('skins',[]))!=2 or g['extras']['phase16FineHairPrimitives']!=528:raise ValueError('unexpected Phase16 source topology')
 old_mesh=json.dumps(g['meshes'][:18],sort_keys=True)
 img=Image.open(source_image).convert('RGB')
 if img.size!=(1672,941):raise ValueError('source image size mismatch')
 paths,quality=fitting_paths(spec,img)
 gl=core.GLB();gl.g=g;gl.data=data
 scale=float(env['mesh']['pixelToUnit']); by_id={s['id']:s for s in spec['hair']['strands']}
 moved=0; source_alpha=0
 # Exact source RGB in matte. Only visible pixels approved as hair color can show.
 # The evaluated facade must NEVER place brown hair across eyes, cheeks or neck.
 roi=(365,30,990,620)
 matte=poly_mask(img.size,list(REGIONS.values()),face_exclude=True)
 eligible=(color_likelihood(np.asarray(img))>.5)
 maskpixels=(matte>0)&eligible
 alpha=Image.fromarray((maskpixels.astype(np.uint8)*255),'L')
 alpha=alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
 face=Image.new('L',img.size,255)
 ImageDraw.Draw(face).polygon(REFERENCE_FACE,fill=0)
 from PIL import ImageChops
 alpha=ImageChops.multiply(alpha,face)
 # Adjust existing 528 real 3D card positions, preserve all 176 bones & 4 animations.
 for bundle in g['meshes'][18:106]:
  id=bundle['extras']['sourceGuideId'];s=by_id[id];guide=paths[id]
  width=float(bundle['extras']['originalWidthPx'])
  for child,prim in enumerate(bundle['primitives']):
   n=13;verts=[];colors=[]
   for k in range(n):
    t=k/(n-1);cx,cy=interp_path(guide,t)
    p=interp_path(guide,max(0,t-.008));q=interp_path(guide,min(1,t+.008))
    dx=q[0]-p[0];dy=q[1]-p[1];norm=math.hypot(dx,dy) or 1
    nx,ny=-dy/norm,dx/norm
    # preserve original six sub-strands spacing/geometry, only re-fit source path.
    shift=(child-2.5)*.143*width
    off=shift*min(1,t/.18)+.15*math.sin(7*t+child*.8+int(id[-2:])*.17)*t
    x=cx+nx*off;y=cy+ny*off
    fiber_width=float(prim['extras']['widthPx']);half=fiber_width*.5*(1-.90*t**1.5)
    index=int(id[-2:]);z_base=.029+.00035*((index+(0 if s['group']=='left' else 36 if s['group']=='right' else 72))%6)
    for back in (False,True):
     z=z_base+(.0013+.0004*((child%3)-1))*(1 if not back else -1)
     for side in (-1,1):
      xx=x+nx*half*side;yy=y+ny*half*side
      wx,wy=a.pixel_world(xx,yy,scale)
      verts.append((wx,wy,z+fiber_width*scale*.012*math.sin(t*5+child*.7)*side))
      px=int(round(xx));py=int(round(yy))
      opacity=alpha.getpixel((max(0,min(img.width-1,px)),max(0,min(img.height-1,py))))/255.
      colors.append((1.,1.,1.,opacity))
   prim['attributes']['POSITION']=gl.accessor('f',verts,'VEC3',34962,True)
   prim['attributes']['COLOR_0']=gl.accessor('f',colors,'VEC4',34962)
   moved+=len(verts)
 # Store the exact procedurally produced hair-alpha matte used for strands above.
 atlas=img.copy().convert('RGBA');atlas.putalpha(alpha)
 atlas=atlas.crop(roi)
 dataio=io.BytesIO();atlas.save(dataio,format='PNG',compress_level=7)
 view=gl.view(dataio.getvalue())
 image_idx=len(gl.g.setdefault('images',[]))
 gl.g['images'].append({'name':'AIG_PHASE17_APPROVED_SOURCE_HAIR_RGBA_MATTE_NOT_3D_AUTHORITY','bufferView':view,'mimeType':'image/png'})
 sampler_idx=len(gl.g.setdefault('samplers',[]))
 gl.g['samplers'].append({'magFilter':9729,'minFilter':9729,'wrapS':33071,'wrapT':33071})
 texidx=len(gl.g.setdefault('textures',[]));gl.g['textures'].append({'sampler':sampler_idx,'source':image_idx})
 matidx=len(gl.g['materials'])
 gl.g['materials'].append({'name':'Phase17_SelfDevelopedHairMatte_SOURCEPIXELS_NOT_RECONSTRUCTED_3D',
  'doubleSided':True,'alphaMode':'BLEND','pbrMetallicRoughness':{'baseColorTexture':{'index':texidx},
  'metallicFactor':0.,'roughnessFactor':.94},'extensions':{'KHR_materials_unlit':{}}})
 # Add exact-source RGB-mapped 2.5D scalp shells with alpha cutout, skin 0 HEAD.
 # The reference face remains UNALTERED in old Phase13 body mesh.
 for name,poly in REGIONS.items():
  points,ids=core.triangulate(poly)
  if not ids:raise ValueError('failed to triangulate '+name)
  verts=[];uv=[];joint=[];weight=[];norm=[]
  for x,y in poly:
   wx,wy=a.pixel_world(x,y,scale)
   verts.append((wx,wy,.0258+(0.0002 if name=='fringe' else -.0002)))
   uv.append(((x-roi[0])/(roi[2]-roi[0]),1-(y-roi[1])/(roi[3]-roi[1])))
   norm.append((0.,0.,1.))
   joint.append((4,0,0,0));weight.append((1.,0.,0.,0.))
  prim={'attributes':{'POSITION':gl.accessor('f',verts,'VEC3',34962,True),
    'NORMAL':gl.accessor('f',norm,'VEC3',34962),
    'TEXCOORD_0':gl.accessor('f',uv,'VEC2',34962),
    'JOINTS_0':gl.accessor('H',joint,'VEC4',34962),
    'WEIGHTS_0':gl.accessor('f',weight,'VEC4',34962)},
    'indices':gl.accessor('I',[int(q) for tri in ids for q in tri],'SCALAR',34963),
    'material':matidx,'mode':4,'extras':{'inferredVolume':True,'sourceExactRGBUV':True,
    'reverseVisibleHairSegment':name,'isHighQuality3DModel':False}}
  gl.g['meshes'].append({'name':'Phase17_SourceUVHairShell_'+name,'primitives':[prim]})
  ni=len(gl.g['nodes']);gl.g['nodes'].append({'name':'Phase17_ScalpShell_'+name,'mesh':len(gl.g['meshes'])-1,'skin':0});gl.g['scenes'][0]['nodes'].append(ni)
  source_alpha+=len(poly)
 if json.dumps(g['meshes'][:18],sort_keys=True)!=old_mesh:raise ValueError('changed original heroine mesh')
 bupport=sum(x['sourceColorSupportBefore'] for x in quality)/len(quality)
 aport=sum(x['sourceColorSupportAfter'] for x in quality)/len(quality)
 gl.g['asset']['generator']='AIG Original Phase17 Source-Guided UV Hair-Scalp Silhouette Restoration / NOT VISUAL AUTHORITY'
 gl.g['extras'].update({'phase17':True,'phase17NewUVHairShells':4,'phase17FittedFineStrands':528,
 'phase17SourceColorSupportBefore':round(bupport,5),'phase17SourceColorSupportAfter':round(aport,5),
 'phase17HairGuides':88,'sourceImageSHA256':sha,'legacyDollGeometryUsed':False,
 'visualAuthorityApproved':False,'releasedToHomepage':False,'releaseAllowed':False,
 'cameraCalibrated':False,'frontSideOnly':True,'backGeometryInferred':True,'sourceSegmentationFullyAutomatic':False,'hairRGBAOriginalColors':True,'faceRegionExcludedFromHairMatte':True,'hairFiberAlphaUsesOriginalSourceMatte':True,
 'qualityMetricIsHairPixelProxyNot3DFidelity':True})
 dest=Path(out_glb);dest.parent.mkdir(parents=True,exist_ok=True);digest=gl.write(dest)
 out={'output':str(dest),'sha256':digest,'bytes':dest.stat().st_size,
 'sourceSHA256':sha,'originalBodyMeshesUnchanged':18,'fitted3DFibers':528,'hairBoneChannelsPreserved':176,
 'uvTexturedScalpShellMeshes':4,'newMeshCount':len(g['meshes']),
 'meanSourceColorSupportBefore':round(bupport,5),'meanSourceColorSupportAfter':round(aport,5),
 'evaluation':'SOURCE-COLOR-PROXY-ONLY-NOT-CINEMATIC-3D-FIDELITY',
 'visualApproval':False,'bodyGeometryApproved':False,'trueFaceDepthRecovered':False,
 'segmentation':'manual regions plus deterministic color/alpha cutout; NOT human/AI validated',
 'hairGuideReport':quality,'paths':paths,'scalpPolygons':REGIONS}
 if report_out:Path(report_out).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 return out

def main():
 p=argparse.ArgumentParser()
 for n in ['base','source','hair-spec','envelope-spec','out']:p.add_argument('--'+n,required=True)
 p.add_argument('--report')
 p.add_argument('--phase15-builder',required=True);p.add_argument('--phase13-builder',required=True)
 args=p.parse_args()
 global PH15,CORE
 PH15=Path(args.phase15_builder);CORE=Path(args.phase13_builder)
 r=make_reconstruction(args.base,args.source,args.hair_spec,args.envelope_spec,args.out,args.report)
 print(json.dumps({k:v for k,v in r.items() if k not in ('hairGuideReport','paths','scalpPolygons')},ensure_ascii=False,indent=2))
if __name__=='__main__':main()