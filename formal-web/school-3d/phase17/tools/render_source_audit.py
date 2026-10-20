#!/usr/bin/env python3
"""Plot actual glTF mesh XY projections and exact source UV polygons: tech audit only.
Does not fabricate cinematic GPU render; labels state explicitly.
"""
import argparse,json,struct,importlib.util,hashlib,io
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

p=Path(__file__).parent/'build_source_fidelity.py'
s=importlib.util.spec_from_file_location('fit17',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a=None
core=None
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def load_accessor(g,blob,idx):
 t=g['accessors'][idx];v=g['bufferViews'][t['bufferView']];off=v.get('byteOffset',0)+t.get('byteOffset',0)
 components={'VEC3':3,'VEC2':2,'VEC4':4,'SCALAR':1}[t['type']]
 dt={5126:'f',5123:'H',5125:'I'}[t['componentType']]
 n=t['count']*components
 return struct.unpack_from('<'+str(n)+dt,blob,off)

def polygon_mesh_mask(g,blob,meshids,size):
 mask=Image.new('L',size,0);draw=ImageDraw.Draw(mask)
 for mid in meshids:
  prim=g['meshes'][mid]['primitives'][0]
  v=load_accessor(g,blob,prim['attributes']['POSITION']);ii=load_accessor(g,blob,prim['indices'])
  pts=[(v[k*3]/.0025+653,941-v[k*3+1]/.0025) for k in range(len(v)//3)]
  for ia,ib,ic in zip(ii[0::3],ii[1::3],ii[2::3]):draw.polygon((pts[ia],pts[ib],pts[ic]),fill=255)
 return mask

def composite_shells(img,g,blob):
 W,H=img.size
 dst=Image.new('RGB',(W,H),(10,23,34))
 # Actual Phase13 source-image-UV face mesh and visible rear hair source geometry.
 frontmask=polygon_mesh_mask(g,blob,[12,15],(W,H))
 dst.paste(img,(0,0),frontmask)
 # Phase17 transparent cropped PNG is read from actual GLB, not recomputed here.
 tex=g['images'][-1]; v=g['bufferViews'][tex['bufferView']];off=v.get('byteOffset',0)
 png=Image.open(io.BytesIO(blob[off:off+v['byteLength']])).convert('RGBA')
 shellmask=polygon_mesh_mask(g,blob,range(106,110),(W,H))
 layer=Image.new('RGBA',(W,H));layer.paste(png,(365,30))
 import PIL.ImageChops
 layer.putalpha(PIL.ImageChops.multiply(layer.getchannel('A'),shellmask))
 dst=Image.alpha_composite(dst.convert('RGBA'),layer).convert('RGB')
 return dst

def main():
 ap=argparse.ArgumentParser()
 for n in ('source','phase16','phase17','report','out','hair-spec','phase15-builder','phase13-builder'):ap.add_argument('--'+n,required=True)
 args=ap.parse_args()
 global a,core
 m.PH15=Path(args.phase15_builder);m.CORE=Path(args.phase13_builder)
 a,core,_=m.modules()
 img=Image.open(args.source).convert('RGB');g,bin=a.read_glb(args.phase17);base,_=a.read_glb(args.phase16)
 r=json.loads(Path(args.report).read_text());out=composite_shells(img,g,bin)
 d=ImageDraw.Draw(out,'RGBA')
 palette={'left':(203,161,118,240),'right':(211,135,87,230),'fringe':(255,216,176,255)}
 groups={s['id']:s['group'] for s in json.loads(Path(args.hair_spec).read_text())['hair']['strands']}
 for id,path in r['paths'].items():
  col=palette[groups[id]]
  mesh=next(x for x in g['meshes'][18:106] if x['extras']['sourceGuideId']==id)
  prim=mesh['primitives'][0]
  colors=load_accessor(g,bin,prim['attributes']['COLOR_0'])
  opacity=[colors[k*4*4+3] for k in range(13)]  # one front/left vertex per section
  for k in range(12):
   if min(opacity[k],opacity[k+1])<0.32:continue
   ia=round(k*(len(path)-1)/12);ib=round((k+1)*(len(path)-1)/12)
   d.line([tuple(z) for z in path[ia:ib+1]],fill=col,width=1)
 crop=(355,32,988,649);out=out.crop(crop);src=img.crop(crop)
 old=Image.new('RGB',(633,617),(10,23,34)); draw=ImageDraw.Draw(old,'RGB')
 engine,_,_=m.modules();srcspec=json.load(open(args.hair_spec))
 for s in srcspec['hair']['strands']:
  oldpath=[engine.centerline(k/24,s,.0025) for k in range(25)]
  oldpath=[(x-355,y-32) for x,y in oldpath]
  draw.line(oldpath,fill=palette[s['group']][:3],width=2)
 size=(1920,790);paper=Image.new('RGB',size,(9,20,31));dr=ImageDraw.Draw(paper)
 f=ImageFont.truetype(FONTB,23);small=ImageFont.truetype(FONT,16)
 for i,frame in enumerate((src,old,out)):
  x=18+i*643
  paper.paste(frame,(x,58))
  dr.rectangle((x-1,57,x+634,676),outline=(75,102,118),width=1)
  title=('APPROVED PHOTO (reference)','PHASE16 | source guides (GLB)','PHASE17 | source-UV shells + 528 fibers')[i]
  dr.text((x,16),title,font=f,fill=(239,241,244))
 dr.text((22,712),'Phase17 renders real GLB XY shell + fitted fiber projection; source UV colors are exact SOURCE pixels.',font=small,fill=(173,205,219))
 dr.text((22,737),'2.5D reconstruction, NOT multiview 3D face/hair fidelity. Behind-head depth and unseen back are inferred.',font=small,fill=(244,181,111))
 paper.save(args.out,quality=94)
 print(json.dumps({'out':args.out,'size':size,'originalMeshes':len(base['meshes']),'newMeshes':len(g['meshes'])}))
if __name__=='__main__': main()