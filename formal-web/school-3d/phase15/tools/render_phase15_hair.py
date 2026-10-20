#!/usr/bin/env python3
"""Read Phase15 real GLB hair positions/joint quaternions and render actual geometry.
This is a technician's hair-mesh evidence, NOT a cinematic heroine render.
"""
import argparse, json, math, sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_hair_cards import read_glb
from test_phase15_hair import get_access, qrotate, add, sub, mul

def pick_font(sz=20):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf']:
        try:return ImageFont.truetype(f,sz)
        except OSError:pass
    return ImageFont.load_default()

def frame_model(glb,base,hair_spec,env_spec,frame=6):
    g,b=read_glb(Path(glb));s=json.loads(Path(hair_spec).read_text());e=json.loads(Path(env_spec).read_text())
    ani=g['animations'][-1];joints=g['skins'][1]['joints']
    ra=[]
    cache={}
    def access(i):
        if i not in cache:cache[i]=get_access(g,b,i)
        return cache[i]
    channels={c['target']['node']:ani['samplers'][c['sampler']]['output'] for c in ani['channels']}
    for i in range(88):
        pr=g['meshes'][18+i]['primitives'][0];poses=access(pr['attributes']['POSITION'])
        inds=[q[0] for q in access(pr['indices'])];weights=access(pr['attributes']['WEIGHTS_0'])
        root_id=joints[7+i*2];tip_id=joints[8+i*2]
        root_obj=g['nodes'][root_id];tip_obj=g['nodes'][tip_id]
        head=e['skeleton']['joints'][4]['xy'];scale=e['mesh']['pixelToUnit']
        head_xyz=((head[0]-653)*scale,(941-head[1])*scale,0)
        root=add(head_xyz,root_obj['translation']);mid=add(root,tip_obj['translation'])
        qr=access(channels[root_id])[frame];qt=access(channels[tip_id])[frame]
        vertices=[]
        for v,w in zip(poses,weights):
            r1=add(root,qrotate(qr,sub(v,root)))
            r2=add(root,qrotate(qr,add(sub(mid,root),qrotate(qt,sub(v,mid)))))
            vertices.append(add(mul(w[0],r1),mul(w[1],r2)))
        colors=s['hair']['colorPalette'];col=colors[int(s['hair']['strands'][i]['colorIndex'])%len(colors)]
        ra.append((vertices,inds,col))
    return ra,g

def projection(v,angle,screen_w=500,screen_h=640):
    x,y,z=v;a=math.radians(angle)
    X=x*math.cos(a)+z*math.sin(a)
    Z=-x*math.sin(a)+z*math.cos(a)
    scale=390
    return (screen_w//2+X*scale, 140 + (2.2-y)*scale, Z)

def render_panel(model,angle=0,w=520,h=760):
    I=Image.new('RGB',(w,h),'#122337');d=ImageDraw.Draw(I)
    polys=[]
    for vertices,indices,color in model:
        uv=[projection(v,angle,w,h) for v in vertices]
        for t in range(0,len(indices),3):
            a,b,c=indices[t:t+3]
            p0,p1,p2=uv[a],uv[b],uv[c]
            # Sort by depth, and use original hair material shades.
            polys.append(((p0[2]+p1[2]+p2[2])/3,(p0,p1,p2),color))
    polys.sort(key=lambda e:e[0])
    for depth,(a,b,c),cl in polys:
        v=int(cl[1:3],16),int(cl[3:5],16),int(cl[5:7],16)
        light=max(.76,min(1.43,1.14+depth*.4))
        rgb=tuple(max(0,min(255,int(x*light))) for x in v)
        d.polygon((a[:2],b[:2],c[:2]),fill=rgb)
    d.rectangle((0,0,w-1,h-1),outline='#52687b',width=2)
    return I

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--glb',required=True);ap.add_argument('--image',required=True)
    ap.add_argument('--spec',required=True);ap.add_argument('--envelope-spec',required=True);ap.add_argument('--out',required=True);ap.add_argument('--mp4')
    a=ap.parse_args();frames=[]
    model,g=frame_model(a.glb,None,a.spec,a.envelope_spec,frame=6)
    ref=Image.open(a.image).convert('RGB');crop=ref.crop((325,5,975,775));crop.thumbnail((500,760))
    pic=Image.new('RGB',(1630,835),'#101c2b')
    d=ImageDraw.Draw(pic);big=pick_font(22);small=pick_font(16)
    pic.paste(crop,(20,57));pic.paste(render_panel(model,0),(545,57));pic.paste(render_panel(model,38),(1080,57))
    d.text((18,15),'Reference image (not 3D)',font=big,fill='#e2edf5')
    d.text((545,15),'ACTUAL GLB 3D hair mesh | front',font=big,fill='#e2edf5')
    d.text((1080,15),'ACTUAL GLB 3D hair mesh | turned 38 deg',font=big,fill='#e2edf5')
    d.text((18,812),'AIG Phase15 technical QA | 88 skinned 3D hair cards | not an approved model/face/film',font=small,fill='#e5ac86')
    p=Path(a.out);p.parent.mkdir(parents=True,exist_ok=True);pic.save(p,quality=91)
    if a.mp4:
        import cv2,numpy as np
        fourcc=cv2.VideoWriter_fourcc(*'mp4v');w=cv2.VideoWriter(a.mp4,fourcc,12,(920,580))
        movements=[]
        for k in range(24):
            model,_=frame_model(a.glb,None,a.spec,a.envelope_spec,frame=k)
            panel=render_panel(model,angle=18+15*math.sin(2*math.pi*k/24),w=920,h=580)
            dr=ImageDraw.Draw(panel)
            dr.rectangle((0,0,920,40),fill='#152032')
            dr.text((12,11),'AIG original 3D hair card GLB: real skeletal wave | TECHNICAL ONLY',fill='white',font=pick_font(16))
            w.write(cv2.cvtColor(np.asarray(panel),cv2.COLOR_RGB2BGR))
        w.release()
        print('video bytes',Path(a.mp4).stat().st_size)
    print('preview',p,p.stat().st_size)
if __name__=='__main__':main()