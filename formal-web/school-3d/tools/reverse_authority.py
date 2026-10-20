#!/usr/bin/env python3
"""Image-to-character *reference* reverse mapping, not a fake image-to-GLB converter.
Only observed image pixels are marked observed. Depth and occluded geometry remain UNKNOWN.
"""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

REGIONS={
    'primary_hero': (341,19,979,940),
    'face_identity': (504,75,777,355),
    'hair_silhouette': (385,27,981,660),
    'ribbon': (548,351,741,504),
    'blazer': (377,336,913,917),
    'shirt': (493,356,755,705),
    'plaid_skirt': (385,650,892,940),
    'setting_sakura': (0,0,353,357),
    'setting_campus': (275,142,462,419),
    'secondary_profile_candidate': (1181,4,1576,255),
    'rear_hair_outfit_candidate': (1230,711,1438,939)
}
# Estimates for tracking contours and matching the *visible front-quarter view* only.
# Coordinates are image pixels in the original 1672x941 collage.
KEYPOINTS={
    'crown': (628,48), 'fringe_center': (635,118),
    'left_eye_visible': (638,178), 'right_eye_visible': (713,189),
    'nose_tip': (691,221), 'mouth_center': (678,268),
    'chin': (661,314), 'left_cheek_outline': (573,224), 'right_cheek_outline': (756,241),
    'neck_base': (653,355), 'left_shoulder': (450,354), 'right_shoulder': (803,375),
    'left_blazer_hem': (398,885), 'right_blazer_hem': (901,864),
    'ribbon_center': (637,435), 'waistline': (653,677)
}
PALETTES={
    'skin_lit':(632,263), 'skin_rose':(687,235),
    'hair_base':(525,250), 'hair_backlit':(466,360),
    'jacket_navy':(430,450), 'shirt_white':(645,545),
    'ribbon_wine':(645,443), 'skirt_plaid':(566,750)
}
UNKNOWN=['unseen_side_face_geometry','full_back_of_head','ear_back_detail','shoe_sole','lower_legs_below_crop','true_surface_depth','hair_physics','nonvisible_cloth_seams','rigging_bind_pose','neutral_A_pose','physically_correct_skin_scattering']

def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def font(size):
    for p in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if Path(p).exists():return ImageFont.truetype(p,size)
    return ImageFont.load_default()
def median_patch(im,x,y,r=8):
    pix=np.asarray(im.convert('RGB'),dtype=np.uint8)
    patch=pix[max(0,y-r):y+r+1,max(0,x-r):x+r+1]
    return [int(v) for v in np.median(patch.reshape(-1,3),axis=0)]
def create(original,out):
    im=Image.open(original).convert('RGB');out=Path(out);out.mkdir(parents=True,exist_ok=True)
    assert im.size==(1672,941),'Image resolution changed: abort reverse authority chain'
    sha=digest(original)
    for name,bb in REGIONS.items():
        im.crop(bb).save(out/(name+'.png'))
    palette={key:{'rgb':median_patch(im,*pt),'source_xy':list(pt)} for key,pt in PALETTES.items()}
    manifest={
       'schemaVersion':1,'authorityId':'AIG_SCHOOL_HERO_20261020_REVERSE_CINEMATIC_REFERENCE',
       'source':{'basename':Path(original).name,'width':im.width,'height':im.height,'sha256':sha,
                 'status':'CINEMATIC_IMAGE_REFERENCE_NOT_APPROVED_AS_3D'},
       'method':'pixel-accurate reverse region mapping; only VISIBLE front-three-quarter image measures',
       'character':{'age':18,'navy_blazer':True,'white_shirt':True,'wine_bow':True,'navy_plaid_skirt':True,
                    'long_chestnut_hair':True,'cinematic_pink_cherry_campus':True},
       'observed_camera_view':'front-three-quarter, looking slightly left from character; no calibrated focal length',
       'regionRectangles':{name:{'xyxy':list(bb),'normalized_xywh':[round(bb[0]/im.width,6),round(bb[1]/im.height,6),round((bb[2]-bb[0])/im.width,6),round((bb[3]-bb[1])/im.height,6)],'pixelCrop':name+'.png'} for name,bb in REGIONS.items()},
       'estimatedVisibleKeypoints':{k: {'xy':list(v),'confidence':'manual approximate — requires landmark QA'} for k,v in KEYPOINTS.items()},
       'colorSamples':palette,
       'auxiliaryViews':{
          'secondary_profile_candidate':{'angle':'additional oblique face from same generated collage','identityMatch':'UNVERIFIED','geometryUse':'visual reference only; check consistency before 3D fitting'},
          'rear_hair_outfit_candidate':{'angle':'back view in same generated collage','identityMatch':'UNVERIFIED','geometryUse':'candidate hair length, backpack and skirt silhouette; do not infer hidden topology'}
       },
       'unobservableFromSingleImage':UNKNOWN,
       'nextRequiredEvidence':['character neutral front 3D render','side 3D render','back 3D render','same face in rotation','walk foot-ground & face-expression renders','skin hair cloth PBR shaders','mobile desktop acceptance'],
       'noFake3D':True,'allowCurrentProceduralPhase6ToBecomeAuthority':False,'releasedToHomepage':False,
       'reverseGate':'REFERENCE_EXTRACTED_ONLY_NOT_3D_MODEL'
    }
    (out/'reverse-authority.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    make_sheet(im,palette,sha,out/'reverse-comparison.png')
    return manifest

def fit(img,canvas,bb):
    bb=tuple(map(int,bb));w,h=bb[2]-bb[0],bb[3]-bb[1]
    tile=ImageOps.contain(img,(w,h),Image.Resampling.LANCZOS)
    x=bb[0]+(w-tile.width)//2;y=bb[1]+(h-tile.height)//2
    canvas.paste(tile,(x,y))

def make_sheet(im,palette,sha,out):
    w,h=1900,1400
    c=Image.new('RGB',(w,h),'#061019');d=ImageDraw.Draw(c)
    d.text((38,25),'AIG SCHOOL 3D · REVERSE AUTHORITY / STAGE 7',font=font(30),fill='#8ce9fd')
    d.text((38,69),'Reference image only  •  NOT a finished 3D model  •  no invented rear geometry',font=font(19),fill='#a3bccb')
    d.rounded_rectangle((35,119,1060,780),radius=14,outline='#335d70',width=2,fill='#091925')
    fit(im,c,(53,145,1041,757))
    d.text((50,787),'ORIGINAL CINEMATIC REFERENCE  /  1672 × 941',font=font(19),fill='#d3edf6')
    face=im.crop(REGIONS['face_identity']);hair=im.crop(REGIONS['hair_silhouette']);bow=im.crop(REGIONS['ribbon'])
    alt=im.crop(REGIONS['secondary_profile_candidate']);back=im.crop(REGIONS['rear_hair_outfit_candidate'])
    for nm,cr,bb in [('FACE / LOOK',face,(1091,132,1481,532)),('HAIR SILHOUETTE',hair,(1500,132,1860,532)),('BOW / UNIFORM',bow,(1091,574,1470,906))]:
        d.rounded_rectangle(bb,radius=13,outline='#335d70',width=2)
        d.text((bb[0]+12,bb[1]+10),nm,font=font(17),fill='#cde7fb')
        fit(cr,c,(bb[0]+14,bb[1]+47,bb[2]-14,bb[3]-10))
    for nm,cr,bb in [('ALT PROFILE / UNVERIFIED',alt,(1500,574,1682,906)),('BACK VIEW / UNVERIFIED',back,(1692,574,1867,906))]:
        d.rounded_rectangle(bb,radius=13,outline='#335d70',width=2)
        d.text((bb[0]+6,bb[1]+8),nm,font=font(10),fill='#ffd1a2')
        fit(cr,c,(bb[0]+7,bb[1]+36,bb[2]-7,bb[3]-10))
    d.text((38,842),'REFERENCE PALETTE (samples from original pixels, not invented shader values)',font=font(20),fill='#dceef5')
    for i,(name,px) in enumerate(palette.items()):
        col=i%4;row=i//4;x=44+col*257;y=892+row*122;rgb=tuple(px['rgb'])
        d.rounded_rectangle((x,y,x+106,y+87),radius=10,fill=rgb,outline='#91a9b1',width=2)
        d.text((x+118,y+14),name,font=font(17),fill='#eaf6ff')
        d.text((x+118,y+44),'#'+''.join(f'{v:02X}' for v in rgb),font=font(18),fill='#9abac5')
    d.text((39,1165),'UNSEEN / UNDETERMINED',font=font(22),fill='#ffd1a2')
    d.text((39,1210),'Back of hair  •  exact skull depth  •  feet  •  neutral rig pose  •  unseen clothing seams',font=font(19),fill='#d0d9e0')
    d.text((39,1251),'Next: build matching 3D front/side/back views; compare to approved face BEFORE homepage release.',font=font(19),fill='#d0d9e0')
    d.text((39,1330),'Authority SHA-256  '+sha,font=font(17),fill='#7694a4')
    c.save(out)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--out',required=True)
    a=ap.parse_args();result=create(a.source,a.out)
    print(json.dumps({'authority':result['source']['sha256'],'regions':len(result['regionRectangles']),'keypoints':len(result['estimatedVisibleKeypoints']),'unknowns':len(result['unobservableFromSingleImage'])}))