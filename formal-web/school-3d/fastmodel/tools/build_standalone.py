#!/usr/bin/env python3
"""AIG original single-file Windows/Android HTML packer.
Makes offline HTML from in-repo JS and a user-owned, non-approved GLB.
Neither this packer nor the output constitutes 60fps evidence.
"""
from pathlib import Path
import argparse,base64,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def build(glb,out):
    raw=Path(glb).read_bytes()
    if raw[:4]!=b'glTF':raise ValueError('Expected glTF 2 binary asset')
    html=(ROOT/'web/index.html').read_text('utf8')
    data=(ROOT/'web/fastmodel-data.mjs').read_text('utf8').replace('export ','')
    policy=(ROOT/'web/resource-governor.mjs').read_text('utf8').replace('export ','')
    resolution=(ROOT/'web/resolution-policy.mjs').read_text('utf8').replace('export ','')
    graphics=(ROOT/'web/graphics-policy.mjs').read_text('utf8').replace('export ','')
    edges=(ROOT/'web/mesh-lines.mjs').read_text('utf8').replace('export ','')
    surface=(ROOT/'web/surface-guides.mjs').read_text('utf8').replace('export ','')
    scene=(ROOT/'web/scene-tools.mjs').read_text('utf8').replace('export ','')
    adaptive=(ROOT/'web/adaptive-detail.mjs').read_text('utf8').replace('export ','')
    clips=(ROOT/'web/animation-clips.mjs').read_text('utf8').replace('export ','')
    pose=(ROOT/'web/pose-evaluator.mjs').read_text('utf8').replace('export ','')
    anatomy=(ROOT/'web/anatomy-guard.mjs').read_text('utf8').replace('export ','')
    face=(ROOT/'web/character-face.mjs').read_text('utf8').replace('export ','')
    integrity=(ROOT/'web/character-integrity.mjs').read_text('utf8').replace('export ','')
    bridge=(ROOT/'web/seam-bridge.mjs').read_text('utf8').replace("import {decodeGLB,readAccessor} from './fastmodel-data.mjs';",'').replace('export ','')
    animationAudit=(ROOT/'web/animated-integrity.mjs').read_text('utf8').replace("import {createPoseEvaluator} from './pose-evaluator.mjs';",'').replace("import {selectAnimationTracks} from './animation-clips.mjs';",'').replace('export ','')
    scanCache=(ROOT/'web/scan-cache.mjs').read_text('utf8').replace('export ','')
    turbo=(ROOT/'web/scan-turbo.mjs').read_text('utf8').replace('export ','')
    scanDepth=(ROOT/'web/scan-depth.mjs').read_text('utf8').replace('export ','')
    scanColors=(ROOT/'web/scan-colors.mjs').read_text('utf8').replace('export ','')
    scanOverlay=(ROOT/'web/scan-overlay.mjs').read_text('utf8').replace("import {scanPalette,scanColor,scanColorLegend} from './scan-colors.mjs';",'').replace("import {SCAN_DEPTH_MODES,scanDepthCoordinate,sampleSourceDepth,classifySourceOcclusion} from './scan-depth.mjs';",'').replace('export ','')
    render=(ROOT/'web/renderer.mjs').read_text('utf8').replace("import {decodeGLB,readAccessor,buildBatches} from './fastmodel-data.mjs';",'').replace("import {assertRasterOnly,GRAPHICS_POLICY} from './graphics-policy.mjs';",'').replace("import {buildEdgeIndex,wireCap,WIRE_MODES,WIRE_DENSITIES,adaptiveWireStep} from './mesh-lines.mjs';",'').replace("import {surfaceGuideId} from './surface-guides.mjs';",'').replace("import {LIGHT_PRESETS} from './scene-tools.mjs';",'').replace("import {DETAIL_MODES,optionalDetailGroup,initialDetailState,nextDetailState,visiblePreviewEntries} from './adaptive-detail.mjs';",'').replace("import {createPoseEvaluator} from './pose-evaluator.mjs';",'').replace("import {selectAnimationTracks} from './animation-clips.mjs';",'').replace("import {auditAnatomyMetadata} from './anatomy-guard.mjs';",'').replace("import {faceShapeSignature,CharacterFaceRoster} from './character-face.mjs';",'').replace("import {ResourceGovernor,makeBudgets,RebuildableCache} from './resource-governor.mjs';",'').replace("import {checkRenderTarget} from './resolution-policy.mjs';",'').replace('export ','')
    main=(ROOT/'web/main.mjs').read_text('utf8').replace("import {FastModelView} from './renderer.mjs';",'').replace("import {WIRE_MODES,WIRE_DENSITIES} from './mesh-lines.mjs';",'').replace("import {SURFACE_GUIDES} from './surface-guides.mjs';",'').replace("import {decodeGLB,readAccessor,sampleVec3Accessor} from './fastmodel-data.mjs';",'').replace("import {SCAN_KINDS,scanGeometry,limitAngle,paintScaffold} from './scene-tools.mjs';",'').replace("import {auditAnatomyMetadata} from './anatomy-guard.mjs';",'').replace("import {inspectHeadNeckGeometry,inspectHairNeckOcclusion,assessAnimationDeviceEvidence} from './character-integrity.mjs';",'').replace("import {createHeadNeckBridgeCandidate} from './seam-bridge.mjs';",'').replace("import {inspectAnimatedIntegrity} from './animated-integrity.mjs';",'').replace("import {selectAnimationTracks} from './animation-clips.mjs';",'').replace("import {faceShapeSignature,CharacterFaceRoster} from './character-face.mjs';",'').replace("import {SCAN_MODES,SCAN_DENSITIES,buildScanOverlay,paintScanOverlay} from './scan-overlay.mjs';",'').replace("import {SCAN_PALETTE_MODES,scanColorLegend} from './scan-colors.mjs';",'').replace("import {SCAN_SPEED_MODES,createTurboScanController} from './scan-turbo.mjs';",'').replace("import {SCAN_CACHE_LIMITS,createScanDerivedCache} from './scan-cache.mjs';",'').replace("import {measuredFrameSummary} from './adaptive-detail.mjs';",'').replace("import {GRAPHICS_POLICY,assertRasterOnly} from './graphics-policy.mjs';",'').replace("import {DiskPressureGuard} from './resource-governor.mjs';",'').replace("import {RESOLUTION_PRESETS} from './resolution-policy.mjs';",'')
    old="let r=await fetch('../assets/phase17-visual-NOT-APPROVED.glb');"
    new="if(window.AIG_EMBEDDED_GLB){const bytes=Uint8Array.from(atob(window.AIG_EMBEDDED_GLB),c=>c.charCodeAt(0));await importGLB(bytes.buffer);return;}let r=await fetch('../assets/phase17-visual-NOT-APPROVED.glb');"
    if old not in main:raise ValueError('Page load contract changed')
    main=main.replace(old,new)
    encoded=base64.b64encode(raw).decode('ascii')
    payload='<script>\nwindow.AIG_EMBEDDED_GLB="'+encoded+'";\n'+data+'\n'+policy+'\n'+resolution+'\n'+graphics+'\n'+edges+'\n'+surface+'\n'+scene+'\n'+adaptive+'\n'+clips+'\n'+pose+'\n'+anatomy+'\n'+face+'\n'+integrity+'\n'+bridge+'\n'+animationAudit+'\n'+scanColors+'\n'+scanDepth+'\n'+turbo+'\n'+scanCache+'\n'+scanOverlay+'\n'+render+'\n'+main+'\n</script>'
    if re.search(r'^\s*(?:import|export)\s',payload,re.M):
        raise ValueError('Offline classic script has an unresolved module declaration')
    marker='<script type="module" src="./main.mjs"></script>'
    if html.count(marker)!=1:raise ValueError('Expected exactly one script tag')
    html=html.replace(marker,payload)
    out=Path(out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html,'utf8')
    print({'html':str(out),'bytes':out.stat().st_size,'sourceGLBSHA256':hashlib.sha256(raw).hexdigest(),'selfContained':True,'productionApproved':False})
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--glb',required=True);p.add_argument('--out',required=True);a=p.parse_args();build(a.glb,a.out)