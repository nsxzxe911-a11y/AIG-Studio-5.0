#!/usr/bin/env python3
"""Generate a 2D, zero-thickness mesh-invariant debug skeleton over a verified reverse Authority image.
Never interprets screenshot coordinates as world-space 3D joints.
"""
import argparse, json, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DEFAULT = Path(__file__).resolve().parents[1] / 'AIG_3D_V1_Phase7_Reverse' / 'authority' / 'reverse-authority.json'
SHA = '83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910'

def spec_for(reverse):
    assert reverse['source']['sha256'] == SHA
    k = reverse['estimatedVisibleKeypoints']
    expected = ('crown', 'chin','neck_base','left_shoulder','right_shoulder','waistline','left_eye_visible','right_eye_visible')
    coords={name:k[name]['xy'] for name in expected}
    for xy in coords.values():
        assert len(xy)==2 and 0<=xy[0]<reverse['source']['width'] and 0<=xy[1]<reverse['source']['height']
    head=[round((coords['crown'][i]+coords['chin'][i])/2,2) for i in range(2)]
    shoulders=[round((coords['left_shoulder'][i]+coords['right_shoulder'][i])/2,2) for i in range(2)]
    chest=[round((shoulders[i]*2+coords['waistline'][i])/3,2) for i in range(2)]
    nodes={name:{'xy':xy, 'status':'observed-image-keypoint-approx', 'coordinateType':'IMAGE_PIXELS_NOT_3D'} for name,xy in coords.items()}
    nodes['head_center']={'xy':head,'status':'interpolated-for-debug-only','coordinateType':'IMAGE_PIXELS_NOT_3D'}
    nodes['chest_center']={'xy':chest,'status':'interpolated-for-debug-only','coordinateType':'IMAGE_PIXELS_NOT_3D'}
    links=[('crown','head_center','inferred'),('head_center','chin','inferred'),('chin','neck_base','inferred'),
           ('neck_base','left_shoulder','visual-reference'),('neck_base','right_shoulder','visual-reference'),
           ('neck_base','chest_center','inferred'),('chest_center','waistline','inferred')]
    return {
       'schemaVersion':1,'name':'AIG School Hero Slim Matchstick Reverse Rig DEBUG ONLY',
       'authorityImage':{'sha256':SHA,'width':reverse['source']['width'],'height':reverse['source']['height']},
       'style':{'strokeWidthSourcePixels':2,'maxStrokeWidthSourcePixels':3,'markerRadiusSourcePixels':3,
                'visualThicknessOnly':True,'caps':'round','strokeRGBA':'#55f0ea'},
       'coordinateType':'IMAGE_PIXELS_NOT_3D',
       'nodes':nodes,'segments':[{'a':a,'b':b,'kind':kind} for a,b,kind in links],
       'sizingContract':{
           'meshGeometryAlwaysWins':True,'allowBonesToStretchMesh':False,'allowFitImageToLegacyRig':False,
           'allowDebugBoneProxyVolume':False,'anyPhysicalBoneRadius':None,
           'legacyRig33NamesCanBeReused':True,'oldRigScaleIsAuthority':False,
           'allow2DPixelsAs3DAnchors':False,'mustComputeNew3DAnchorsAfterMeshExists':True,
           'skinWeightRebindBeforeAnimation':True,'inverseBindMatricesMustRecalculate':True,
           'useOldWalkOnlyAfterIKScaleCheck':True
       },
       'visibility':{
           'visibleHeadShouldersTorsoOnly':True,'armsOnlyWithFutureVerifiedLandmarks':True,
           'legsUnobservableFromApprovedCrop':True,'doNotInventHiddenJoints':True,
           'calibratedCamera':False,'approved3DGeometry':False
       },
       'release':{'webHeroAllowed':False,'status':'REVERSE_OVERLAY_QA_ONLY',
                  'trueFemaleRigged3DCharacterAvailable':False}
    }

def draw_overlay(image_path,spec,out_path):
    data=Path(image_path).read_bytes()
    assert hashlib.sha256(data).hexdigest()==spec['authorityImage']['sha256'],'SHA mismatch'
    im=Image.open(image_path).convert('RGBA');assert im.size==(spec['authorityImage']['width'],spec['authorityImage']['height'])
    over=Image.new('RGBA',im.size,(0,0,0,0));d=ImageDraw.Draw(over)
    width=spec['style']['strokeWidthSourcePixels'];r=spec['style']['markerRadiusSourcePixels']
    assert width<=3
    for seg in spec['segments']:
        a=spec['nodes'][seg['a']]['xy'];b=spec['nodes'][seg['b']]['xy'];col=(44,242,236,245) if seg['kind']=='visual-reference' else (255,194,99,220)
        d.line([tuple(a),tuple(b)],fill=col,width=width)
    for node in spec['nodes'].values():
        x,y=node['xy'];d.ellipse([x-r,y-r,x+r,y+r],fill=(2,11,16,220),outline=(131,255,250,250),width=1)
    output=Image.alpha_composite(im,over).convert('RGB');output.save(out_path,quality=94)
    return output

def main():
    p=argparse.ArgumentParser();p.add_argument('--reverse',required=True,type=Path);p.add_argument('--image',type=Path)
    p.add_argument('--out',required=True,type=Path);p.add_argument('--preview',type=Path)
    args=p.parse_args()
    rev=json.loads(args.reverse.read_text(encoding='utf8'));s=spec_for(rev)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    if args.preview:
        assert args.image is not None
        draw_overlay(args.image,s,args.preview)
    print(json.dumps({'sourceSHA':SHA,'nodes':len(s['nodes']),'segments':len(s['segments']),
                      'boneLinePx':s['style']['strokeWidthSourcePixels'],'meshAdjusted':False,'released':False}))
if __name__=='__main__':main()