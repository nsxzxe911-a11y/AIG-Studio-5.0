#!/usr/bin/env python3
"""AIG School Hero Phase11: reverse-image landmarks vs actual 3D asset weak-perspective QA.

This is NOT 3D reconstruction, nor a calibrated camera solver, nor an automatic
cinematic-quality metric. Its only job is to reveal bad 3D proportions while keeping
visual approval fail-closed. Source RGB pixels are never treated as 3D positions.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
from scipy.optimize import least_squares

# These are correspondences for diagnostics, NOT exact anatomical feature fits.
# Jaw joint is not true chin surface; hip joint is not exact uniform waistline.
PAIRINGS = (
    ('left_eye_visible', 'LeftEye'),
    ('right_eye_visible', 'RightEye'),
    ('left_shoulder', 'LeftShoulder'),
    ('right_shoulder', 'RightShoulder'),
    ('neck_base', 'Neck'),
    ('chin', 'Jaw'),
    ('waistline', 'Hips'),
    ('fringe_center', 'HairFront'),
)
MUST_EXIST = ('source', 'estimatedVisibleKeypoints', 'regionRectangles')


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_inputs(authority_path: Path, image_path: Path, anchors_path: Path, model_path: Path):
    reference = json.loads(authority_path.read_text('utf-8'))
    anchors = json.loads(anchors_path.read_text('utf-8'))
    if any(k not in reference for k in MUST_EXIST):
        raise ValueError('Reverse manifest lacks landmark sections')
    ref_sha = reference['source']['sha256']
    if sha256(image_path) != ref_sha:
        raise ValueError('Authority image SHA256 does not match approved reverse manifest')
    model_sha = sha256(model_path)
    if anchors.get('targetMeshSHA256') != model_sha:
        raise ValueError('Independent 3D model SHA256 mismatched the supplied 3D anchors')
    if anchors.get('reverseAuthoritySHA256') != ref_sha:
        raise ValueError('3D anchors do not belong to the approved source image')
    if anchors.get('cameraCalibrated') is not False:
        raise ValueError('This diagnostic expects an UNCALIBRATED camera; use a different calibrated gate')
    if anchors.get('visualApproval') not in ('NOT_APPROVED', 'PENDING') or anchors.get('allowedToPublish') is not False:
        raise ValueError('Source fixture is mislabeled as production-ready; fail closed')
    points_3d = anchors.get('3dJointPositionsUnitless')
    if not points_3d or not all(name in points_3d for _, name in PAIRINGS):
        raise ValueError('Missing independent model-space joint anchors')
    refpts = reference['estimatedVisibleKeypoints']
    if not all(name in refpts for name, _ in PAIRINGS):
        raise ValueError('Missing 2D reference landmarks')
    if any(len(v['xy']) != 2 for k, v in refpts.items() if k in dict(PAIRINGS)):
        raise ValueError('Reference landmarks must be 2D points')
    with Image.open(image_path) as img:
        image_size = img.size
    if image_size != (reference['source']['width'], reference['source']['height']):
        raise ValueError('Reference image dimensions mismatch Authority')
    return reference, anchors


def weak_perspective(points3d: np.ndarray, params: np.ndarray):
    """Approximate camera matching; never interpret optimizer yaw as actual camera yaw."""
    yaw, pitch, roll, scale, tx, ty = params
    cy, sy = np.cos(yaw), np.sin(yaw)
    cp, sp = np.cos(pitch), np.sin(pitch)
    cr, sr = np.cos(roll), np.sin(roll)
    rotate_y = np.array([[cy, 0., sy], [0., 1., 0.], [-sy, 0., cy]])
    rotate_x = np.array([[1., 0., 0.], [0., cp, -sp], [0., sp, cp]])
    rotate_z = np.array([[cr, -sr, 0.], [sr, cr, 0.], [0., 0., 1.]])
    view = points3d @ (rotate_z @ rotate_x @ rotate_y).T
    return np.c_[tx + scale * view[:, 0], ty - scale * view[:, 1]]


def fit_projection(reference: dict, anchors: dict) -> dict[str, Any]:
    src = np.asarray([reference['estimatedVisibleKeypoints'][n]['xy'] for n, _ in PAIRINGS], dtype=float)
    dst = np.asarray([anchors['3dJointPositionsUnitless'][b] for _, b in PAIRINGS], dtype=float)
    if not np.isfinite(src).all() or not np.isfinite(dst).all():
        raise ValueError('Non-finite landmarks')
    center2 = src.mean(axis=0)
    spread3 = np.linalg.norm(dst - dst.mean(axis=0), axis=1).mean()
    scale0 = max(np.linalg.norm(src - center2, axis=1).mean() / max(spread3, 1e-9), 1.)
    origin = [0., 0., 0., scale0, center2[0], center2[1]]
    bounds = ([-1.5,-0.9,-0.4, 1, -500,-500], [1.5,0.9,0.4, 5000,5000,5000])
    def error(p):
        return (weak_perspective(dst, p) - src).ravel()
    # Small bounded multi-start yaw search avoids one obviously poor local solution.
    tries = []
    for yaw in [-0.85, -.45, 0., .45, .85]:
        initial = origin.copy(); initial[0] = yaw
        try:
            result = least_squares(error, initial, bounds=bounds, max_nfev=240, loss='soft_l1', f_scale=20)
            tries.append(result)
        except ValueError:
            continue
    if not tries:
        raise ValueError('Camera projection fitting failed')
    result = min(tries, key=lambda r: np.linalg.norm(r.fun))
    predicted = weak_perspective(dst, result.x)
    residual = np.linalg.norm(predicted - src, axis=1)
    head_px = abs(reference['estimatedVisibleKeypoints']['chin']['xy'][1] - reference['estimatedVisibleKeypoints']['crown']['xy'][1])
    if head_px <= 0:raise ValueError('Authority crown/chin data invalid')
    return {
        'coordinateSystem': 'uncalibrated weak-perspective diagnostic; fitted 2D projection only',
        'model3dAnchorsSource': 'independent manual QA fixture; NOT calibrated to face topology',
        'original2DPoints': src.tolist(), 'modelProjected2DPoints': predicted.tolist(),
        'pairs': [{'reference2d': n, 'model3dJoint': b, 'errorPx': round(float(residual[i]), 3)}
                  for i, (n, b) in enumerate(PAIRINGS)],
        'medianErrorPx': round(float(np.median(residual)), 3),
        'meanErrorPx': round(float(np.mean(residual)), 3),
        'maxErrorPx': round(float(np.max(residual)), 3),
        'meanErrorOverHeadPx': round(float(np.mean(residual)/head_px), 5),
        'fitParametersDiagnosticOnly': {'yawRad':round(float(result.x[0]),5),
                                        'pitchRad':round(float(result.x[1]),5),
                                        'rollRad':round(float(result.x[2]),5)},
        'isRealCalibratedCamera': False,
        'visualAuthorityPassed': False,
        'releaseAllowed': False,
        'status': 'TECHNICAL_DIAGNOSTIC_ONLY_VISUAL_NOT_APPROVED',
        'failReasons': ['actual 3D facial/cloth sculpt does not match approved reference',
                        'source camera not calibrated',
                        '3D joint semantics approximate and not model surface landmarks',
                        'no verified identity from side/back or S23/4K runtime'],
    }


def render_overlay(reference: dict, image_path: Path, fit: dict, output: Path, candidate_preview: Path | None = None):
    original = Image.open(image_path).convert('RGB')
    crop = reference['regionRectangles']['primary_hero']['xyxy']
    region = original.crop(tuple(crop))
    # Do not alter the actual reference image. Overlay only diagnostic point annotations.
    annotated = original.copy()
    painter = ImageDraw.Draw(annotated)
    for p, q in zip(fit['original2DPoints'], fit['modelProjected2DPoints']):
        x, y = map(int, p); px, py = map(int,q)
        painter.line((x,y,px,py), fill=(255,110,80),width=3)
        painter.ellipse((x-7,y-7,x+7,y+7), outline=(72,245,174),width=3)
        painter.rectangle((px-5,py-5,px+5,py+5), outline=(255,80,86),width=3)
    annotated = annotated.crop(tuple(crop))
    if candidate_preview and candidate_preview.is_file():
        candidate = Image.open(candidate_preview).convert('RGB')
    else:
        candidate = Image.new('RGB',(680,900),(18,31,45))
        dr=ImageDraw.Draw(candidate);dr.text((35,70),'3D candidate render missing',fill='white')
    width,height=1510,1050
    dst = Image.new('RGB',(width,height),(8,14,22)); d=ImageDraw.Draw(dst)
    fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    try: font=ImageFont.truetype(fontfile,20);small=ImageFont.truetype(fontfile,15)
    except OSError: font=ImageFont.load_default();small=font
    a=ImageOps.contain(annotated,(690,955));b=ImageOps.contain(candidate,(690,955))
    dst.paste(a,(16+(690-a.width)//2,48+(955-a.height)//2))
    dst.paste(b,(790+(690-b.width)//2,48+(955-b.height)//2))
    d.text((20,15),'APPROVED ORIGINAL: green=photo landmarks, red=projected 3D QA rig',font=small,fill=(200,250,225))
    d.text((790,15),'ACTUAL 3D TEST MODEL (REJECTED, NOT THE APPROVED CHARACTER)',font=small,fill=(255,189,147))
    d.text((18,1010),f"Mean landmark gap {fit['meanErrorPx']:.1f}px / head-height {fit['meanErrorOverHeadPx']:.3f}  |  camera NOT calibrated",font=small,fill=(250,197,138))
    output.parent.mkdir(parents=True,exist_ok=True);dst.save(output,quality=93)


def evaluate(authority: Path, image: Path, joints: Path, glb: Path, evidence: Path, overlay: Path, preview:Path|None):
    a,b=load_inputs(authority,image,joints,glb)
    fit=fit_projection(a,b)
    fit['referenceSHA256']=a['source']['sha256']
    fit['candidateModelSHA256']=sha256(glb)
    evidence.parent.mkdir(parents=True,exist_ok=True)
    evidence.write_text(json.dumps(fit,ensure_ascii=False,indent=2)+'\n','utf8')
    render_overlay(a,image,fit,overlay,preview)
    return fit


def main():
    ap=argparse.ArgumentParser()
    for flag in ['reverse','reference','joints','model','report','overlay']:
        ap.add_argument('--'+flag,type=Path,required=True)
    ap.add_argument('--preview',type=Path)
    args=ap.parse_args()
    output=evaluate(args.reverse,args.reference,args.joints,args.model,args.report,args.overlay,args.preview)
    print(json.dumps({k:v for k,v in output.items() if k in ('meanErrorPx','maxErrorPx','meanErrorOverHeadPx','visualAuthorityPassed','releaseAllowed','status')},ensure_ascii=False))

if __name__=='__main__': main()