#!/usr/bin/env python3
"""AIG Phase16: replace chunky Phase15 hair cards with six *fine* tapered 3D filaments per guide.

Original source-specific mesh/hair topology stays entirely in a real GLB, not a still image.
Works with self-written GLB writer; no third-party character/model asset. Uses only stdlib.
Every six filaments share their Phase15 2-bone spring rig; they do NOT have separate independent physics.
Source and back-face remain 2.5D estimated, and visual approval is always blocked.
"""
import argparse,hashlib,json,math,struct,zlib,importlib.util
from pathlib import Path

HERE=Path(__file__).resolve().parent
PHASE15_SOURCE=HERE.parent.parent/'phase15/tools/build_hair_cards.py'

def load_hair15(path):
 spec=importlib.util.spec_from_file_location('aig_phase15_hair',Path(path))
 if spec is None or spec.loader is None:raise ValueError('Phase15 source unavailable')
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 return mod

def rgba_mask_png(size=(64,256)):
 """Own PNG encoder: translucent tiny fibers with alpha anti-aliased sides & feathered tips.
 64x256 texels allow subpixel edges; roots opaque, tip alpha approaches zero.
 """
 w,h=size
 raw=bytearray()
 for iy in range(h):
  v=iy/(h-1)
  raw.append(0)  # PNG scanline filter 0
  for ix in range(w):
   u=(ix+.5)/w
   edge=max(0.0,min(1.0,(min(u,1-u)-.025)/.16))
   # rounded fiber transverse illumination, no solid plastic strip
   core=(.77+.23*(1-abs(2*u-1)**1.1))
   end=max(0.,min(1.,(1-v)/.27))
   end=end*end*(3-2*end)
   # micro variation against horizontal banding, deterministic
   glint=.94+.06*math.sin(35*u+2.4*math.sin(13*v))
   alpha=int(round(255*max(0.,min(1.,edge*end*core))))
   brightness=int(round(255*glint))
   raw.extend((brightness,brightness,brightness,alpha))
 def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')

def make_fine_hair(base_glb,source_img,hair_spec,envelope_spec,builder_path,out_glb,subdivisions=6):
 if subdivisions!=6:raise ValueError('v1 split fixed at 6 for deterministic quality Gate')
 hair15=load_hair15(PHASE15_SOURCE if PHASE15_SOURCE.exists() else HERE/'build_hair_cards.py')
 glb,original=hair15.read_glb(Path(base_glb))
 spec=json.loads(Path(hair_spec).read_text(encoding='utf8'))
 env=json.loads(Path(envelope_spec).read_text(encoding='utf8'))
 sha=hashlib.sha256(Path(source_img).read_bytes()).hexdigest()
 if sha!=glb.get('extras',{}).get('sourceImageSHA256') or sha!=spec['source']['sha256'] or sha!=env['source']['sha256']:
  raise ValueError('visual authority SHA drift')
 if not(glb['extras'].get('phase15') is True and glb['extras'].get('hairCardCount')==88):raise ValueError('Phase15 source mandatory')
 if len(glb.get('skins',[]))!=2 or len(glb['meshes'])!=106:raise ValueError('expected 106 original GLB mesh units')
 if len(glb['animations'][-1]['channels'])!=176:raise ValueError('Phase15 actual bone animation missing')
 if glb['extras'].get('visualAuthorityApproved') or glb['extras'].get('releaseAllowed'):raise ValueError('visual release forbidden')
 core=hair15.import_aig13_builder(Path(builder_path));wrap=core.GLB();wrap.g=glb;wrap.data=original
 # Self-generated PNG texture with actual alpha, embedded in GLB, one texture shared by all palette shades
 png=rgba_mask_png()
 buff=wrap.view(png)
 wrap.g.setdefault('images',[]).append({'name':'AIG_PROCEDURAL_FEATHERED_HAIR_ALPHA_NOT_AUTHORITY','bufferView':buff,'mimeType':'image/png'})
 wrap.g.setdefault('samplers',[]).append({'magFilter':9729,'minFilter':9729,'wrapS':33071,'wrapT':33071})
 texid=len(wrap.g.setdefault('textures',[]))
 wrap.g['textures'].append({'sampler':len(wrap.g['samplers'])-1,'source':len(wrap.g['images'])-1})
 hair_palette=spec['hair']['colorPalette'];materials=[]
 for i,hx in enumerate(hair_palette):
  rgb=[int(hx[q:q+2],16)/255. for q in (1,3,5)]
  materials.append(len(wrap.g['materials']))
  wrap.g['materials'].append({'name':'AIG_Phase16_FineFiber_'+str(i),'alphaMode':'BLEND','doubleSided':True,
    'pbrMetallicRoughness':{'baseColorFactor':rgb+[1.0],'baseColorTexture':{'index':texid},'metallicFactor':0.,'roughnessFactor':.81}})
 strand_total=0;tri_total=0;vert_total=0;means=[];mx=0
 scale=float(env['mesh']['pixelToUnit']);n=13
 for i,s in enumerate(spec['hair']['strands']):
  refmesh=wrap.g['meshes'][18+i]
  if refmesh['name']!='True3DHairCard_'+s['id'] or len(refmesh['primitives'])!=1:raise ValueError('hair mesh source drift')
  original_width=wrap.g['meshes'][18+i].get('extras',{}).get('widthFromReferencePixels')
  if original_width is None:raise ValueError('Phase15 width metadata lost')
  width_old=float(original_width);child_primitives=[]
  for child in range(subdivisions):
   shift=(child-(subdivisions-1)/2)*.143*width_old
   fiber_width=width_old*(.105+0.014*((child+i)%3))
   means.append(fiber_width);mx=max(mx,fiber_width)
   verts=[];norms=[];uv=[];jrows=[];weights=[];tris=[]
   for k in range(n):
    t=k/(n-1)
    cx,cy=hair15.centerline(t,s,scale)
    p=hair15.centerline(max(0,t-.025),s,scale);q=hair15.centerline(min(1,t+.025),s,scale)
    dx=q[0]-p[0];dy=q[1]-p[1];norm=math.hypot(dx,dy) or 1
    nx,ny=-dy/norm,dx/norm
    # Keep root anchored to original scalp; add child hairs around guide farther down.
    offset=shift*min(1,t/.18)+.15*math.sin(7*t+child*.8+i*.17)*t
    x=cx+nx*offset;y=cy+ny*offset
    # Actual mesh taper plus PNG alpha feathered end; tip is non-flat/nonzero but invisible in alpha.
    half=fiber_width*.5*(1-.90*t**1.5)
    for back in (False,True):
     z=.029+.00035*(i%6)+(.0013+(.0004*((child%3)-1)))*(1 if not back else -1)
     for side in (-1,1):
      xx=x+nx*half*side;yy=y+ny*half*side
      vx,vy=hair15.pixel_world(xx,yy,scale)
      # Tiny nonplanar twist assists highlight at 3/4 view, not invented hair physics
      verts.append((vx,vy,z+fiber_width*scale*.012*math.sin(t*5+child*.7)*side))
      norms.append((0.,0.,-1. if back else 1.))
      uv.append((0.01 if side<0 else 0.99,t))
      w=min(.98,max(0.,(t-.12)/.78))
      j=7+i*2;jrows.append((j,j+1,0,0));weights.append((1-w,w,0.,0.))
   for k in range(n-1):
    a=k*4;b=(k+1)*4
    tris.extend(((a,a+1,b),(a+1,b+1,b),(a+2,b+2,a+3),(a+3,b+2,b+3),
                 (a,b,a+2),(a+2,b,b+2),(a+1,a+3,b+1),(a+3,b+3,b+1)))
   last=(n-1)*4
   tris.extend(((0,2,1),(1,2,3),(last,last+1,last+2),(last+1,last+3,last+2)))
   idx=[x for tri in tris for x in tri]
   primitive={'attributes':{
       'POSITION':wrap.accessor('f',verts,'VEC3',34962,True),'NORMAL':wrap.accessor('f',norms,'VEC3',34962),
       'TEXCOORD_0':wrap.accessor('f',uv,'VEC2',34962),'JOINTS_0':wrap.accessor('H',jrows,'VEC4',34962),
       'WEIGHTS_0':wrap.accessor('f',weights,'VEC4',34962)},
       'indices':wrap.accessor('I',idx,'SCALAR',34963),'mode':4,
       'material':materials[(int(s['colorIndex'])+child//2)%len(materials)],
       'extras':{'phase16FineFiber':True,'sourceGuide':s['id'],'strandPart':child,'widthPx':fiber_width,'baseWidthPx':width_old,'depthProxyOnly':True}}
   child_primitives.append(primitive)
   strand_total+=1;tri_total+=len(tris);vert_total+=len(verts)
  refmesh['primitives']=child_primitives
  refmesh['name']='Phase16_FineHairBundle_'+s['id']
  refmesh['extras']={'subStrands':subdivisions,'originalWidthPx':width_old,'highestSubWidthPx':max(p['extras']['widthPx'] for p in child_primitives),
    'sourceGuideId':s['id'],'baseRigSharedAmongSubStrands':True}
 wrap.g['asset']['generator']='AIG self-developed Phase16 refined 528 finer tapered skinned hair card primitives / NOT VISUAL AUTHORITY'
 wrap.g.setdefault('extras',{}).update({'phase16':True,'phase16OriginalHairGuides':88,'phase16FineHairPrimitives':strand_total,
  'phase16TaperedTriangles':tri_total,'phase16MaxWidthPx':mx,'phase16AverageWidthPx':sum(means)/len(means),
  'originalPhase13MeshCount':18,'originalPhase15HairJointCount':176,'hairCardCount':88,
  'hairFiberAlphaTexture':True,'subStrandsShareSourceBoneMotion':True,'physicsPerSubStrand':False,
  'visualAuthorityApproved':False,'releaseAllowed':False,'hasGenuineFacialAI':False,'geometryEstimatedBack':True})
 out_glb=Path(out_glb);digest=wrap.write(out_glb)
 return {'output':str(out_glb),'sha256':digest,'bytes':out_glb.stat().st_size,
 'originalBaseMeshes':18,'hairGuideCount':88,'fineHairPrimitives':strand_total,'addedHairTriangles':tri_total,
 'addedHairVertices':vert_total,'meanFineWidthPixels':round(sum(means)/len(means),5),'maxFineWidthPixels':round(mx,5),
 'newHairJoints':0,'reusedAnimatedHairJoints':176,'embeddedRGBAHairMask':True,'sourceSHA256':sha,
 'visualApproval':False,'hairCardNotApproved':True,'widenOldSilhouette':False}

def main():
 p=argparse.ArgumentParser()
 for t in ['base','source','hair-spec','envelope-spec','phase13-builder','out']:p.add_argument('--'+t,required=True)
 p.add_argument('--report');a=p.parse_args()
 r=make_fine_hair(a.base,a.source,a.hair_spec,a.envelope_spec,a.phase13_builder,a.out)
 if a.report:Path(a.report).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps(r,ensure_ascii=False))
if __name__=='__main__':main()