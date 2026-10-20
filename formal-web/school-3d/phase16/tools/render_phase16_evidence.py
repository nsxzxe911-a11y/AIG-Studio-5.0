"""Technical 3D GLB vertex-skinning projection, not a physically based GPU render."""
import argparse,sys,math,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_hair_cards import read_glb
from test_phase16_fine_hair import access

def qrot(q,v):
 x,y,z,w=q;vx,vy,vz=v
 t=(2*(y*vz-z*vy),2*(z*vx-x*vz),2*(x*vy-y*vx))
 return (vx+w*t[0]+y*t[2]-z*t[1],vy+w*t[1]+z*t[0]-x*t[2],vz+w*t[2]+x*t[1]-y*t[0])
def vadd(a,b):return tuple(a[i]+b[i] for i in range(3))
def vsub(a,b):return tuple(a[i]-b[i] for i in range(3))
def vmul(a,x):return tuple(z*x for z in a)

def load_fibers(glb,env):
 g,b=read_glb(glb);scale=env['mesh']['pixelToUnit']
 j=env['skeleton']['joints'][4]['xy'];head=((j[0]-653)*scale,(941-j[1])*scale,0)
 anim=g['animations'][-1];ch={c['target']['node']:anim['samplers'][c['sampler']]['output'] for c in anim['channels']}
 entries=[]
 for i in range(88):
  ids=g['skins'][1]['joints'];root_id=ids[7+i*2];tip_id=ids[8+i*2]
  root=vadd(head,g['nodes'][root_id]['translation']);mid=vadd(root,g['nodes'][tip_id]['translation'])
  qr=access(g,b,ch[root_id]);qt=access(g,b,ch[tip_id])
  for p in g['meshes'][18+i]['primitives']:
   vert=access(g,b,p['attributes']['POSITION']);weight=access(g,b,p['attributes']['WEIGHTS_0']);mat=g['materials'][p['material']]
   c=mat['pbrMetallicRoughness']['baseColorFactor']
   # sample each longitudinal segment front-left/right midpoint
   pos=[tuple((a+b)/2 for a,b in zip(vert[k*4],vert[k*4+1])) for k in range(len(vert)//4)]
   w=[weight[k*4][1] for k in range(len(pos))]
   entries.append((root,mid,qr,qt,pos,w,tuple(round(z*255) for z in c[:3]),len(g['meshes'][18+i]['primitives'])))
 return entries

def points_at(entry,frame):
 root,mid,qr,qt,points,weights,col,splits=entry
 r=qr[frame];q=qt[frame];pts=[]
 for v,w in zip(points,weights):
  # Parent rotation followed by child relative rotation (original GLB joint hierarchy)
  a=vadd(root,qrot(r,vsub(v,root)))
  b=vadd(root,qrot(r,vadd(vsub(mid,root),qrot(q,vsub(v,mid)))))
  pts.append(vadd(vmul(a,1-w),vmul(b,w)))
 return pts

def map2(v,angle,width=500,height=700):
 x,y,z=v;a=math.radians(angle)
 X=x*math.cos(a)+z*math.sin(a);Z=-x*math.sin(a)+z*math.cos(a)
 return (width*.5+X*375,104+(2.19-y)*375,Z)

def drawing(entries,frame=6,angle=0,w=520,h=700):
 I=Image.new('RGB',(w,h),'#101e2d');d=ImageDraw.Draw(I)
 ls=[]
 for ent in entries:
  pts=points_at(ent,frame)
  p=[map2(x,angle,w,h) for x in pts]
  ls.append((sum(x[2] for x in p)/len(p),p,ent[6],ent[7]))
 ls.sort(key=lambda item:item[0])
 # Lines are sampled from the GLB's deforming MESH middle surface.
 # Line stroke is ONLY evidence visualization, not the shader's actual alpha card rasterization.
 for _,pts,color,splits in ls:
  rgb=tuple(min(245,max(18,int(v*1.33))) for v in color)
  stroke=3 if splits==1 else 1
  for a,b in zip(pts,pts[1:]):
   d.line((a[0],a[1],b[0],b[1]),fill=rgb,width=stroke)
 d.rectangle((0,0,w-1,h-1),outline='#657a89',width=2)
 return I

def main():
 p=argparse.ArgumentParser();p.add_argument('--old',required=True);p.add_argument('--new',required=True);p.add_argument('--spec',required=True);p.add_argument('--image',required=True);p.add_argument('--out',required=True);p.add_argument('--video');a=p.parse_args()
 env=json.loads(Path(a.spec).read_text());old=load_fibers(a.old,env);new=load_fibers(a.new,env)
 img=Image.open(a.image).convert('RGB').crop((325,5,975,775));img.thumbnail((500,700))
 w,h=1650,795;I=Image.new('RGB',(w,h),'#0e1b29');d=ImageDraw.Draw(I)
 I.paste(img,(18,57));I.paste(drawing(old,6,0),(550,57));I.paste(drawing(new,6,0),(1100,57))
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
 small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
 for x,t in ((18,'Original image | 2D reference'),(550,'Phase15 | 88 coarse cards'),(1100,'Phase16 | 528 fine strands')):d.text((x,16),t,font=font,fill='#f6e6d2')
 d.text((18,761),'AIG original GLB skeletal mesh projection (centerline QA only) | not a photoreal GPU render | visual authority FAIL',font=small,fill='#e5a781')
 Path(a.out).parent.mkdir(parents=True,exist_ok=True);I.save(a.out,quality=92)
 print('comparison',a.out)
 if a.video:
  import cv2
  v=cv2.VideoWriter(a.video,cv2.VideoWriter_fourcc(*'mp4v'),12,(1080,630))
  for frame in range(24):
   oldv=drawing(old,frame,angle=12+12*math.sin(2*math.pi*frame/24),w=520,h=590)
   newv=drawing(new,frame,angle=12+12*math.sin(2*math.pi*frame/24),w=520,h=590)
   out=Image.new('RGB',(1080,630),'#0e1b29');out.paste(oldv,(10,35));out.paste(newv,(550,35));D=ImageDraw.Draw(out)
   D.text((15,8),'BEFORE: 88 COARSE CARDS',font=small,fill='white');D.text((555,8),'AFTER: 528 FINE CARD PRIMITIVES',font=small,fill='white')
   D.text((15,613),'3D GLB skeletal CPU projection technical test | NOT final facial/hair quality',font=small,fill='#e5a781')
   v.write(cv2.cvtColor(np.asarray(out),cv2.COLOR_RGB2BGR))
  v.release();print('video',a.video,Path(a.video).stat().st_size)
if __name__=='__main__':main()