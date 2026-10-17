#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / 'design/ui/home-runtime-derivative-v1.json'
REG = ROOT / 'design/ui/aigii-rgb-master-registry-v2.json'
CSS = ROOT / 'web/authority/aig-home-authority-v1.css'
INDEX = ROOT / 'web/index.html'


def fail(errors):
    print('WEB_HOME_AUTHORITY_CANVAS_CONTRACT_FAIL')
    for e in errors:
        print(' -', e)
    return 1


def load(path, label, errors):
    if not path.is_file():
        errors.append(f'missing {label}: {path.relative_to(ROOT)}')
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as ex:
        errors.append(f'invalid {label}: {ex}')
        return {}


def main():
    e=[]
    h=load(HOME,'HOME authority contract',e)
    r=load(REG,'AIG-II RGB registry V2',e)

    if h:
        if h.get('projectProjection')!='AIG': e.append('HOME contract must project to AIG first project')
        if h.get('visualAuthorityFamily')!='AIG-II_RGB': e.append('HOME must require AIG-II RGB visual authority')
        if h.get('pageId')!='HOME': e.append('HOME pageId drift')
        req=h.get('requiredNativeAuthority',{})
        if (req.get('width'),req.get('height'))!=(3840,2160): e.append('formal Desktop HOME must require native 3840x2160')
        if req.get('status')!='MISSING_NATIVE_4K_AUTHORITY': e.append('missing native 4K HOME must stay explicit')
        if req.get('fallbackPolicy')!='NO_IMAGE_SUBSTITUTION': e.append('HOME fallback must be NO_IMAGE_SUBSTITUTION')
        legacy=h.get('legacyAigReference',{})
        if legacy.get('role')!='REFERENCE_ONLY_NON_4K': e.append('legacy 1672 HOME must be reference-only')
        if legacy.get('runtimeAllowed') is not False: e.append('legacy 1672 HOME must not be runtime Authority')
        state=h.get('runtimeState',{})
        if state.get('status')!='BLOCKED_NO_NATIVE_4K_HOME': e.append('runtime must explicitly block missing native 4K HOME')
        if state.get('backgroundPolicy')!='NEUTRAL_BLACK_ONLY': e.append('blocked HOME must use neutral black only')
        if h.get('finalAuthorityStatus')!='BLOCKED_UNTIL_NATIVE_3840X2160_AIGII_HOME_REGISTERED': e.append('final HOME 4K block status drift')

    if r:
        if r.get('singleVisualAuthority')!='AIG-II_RGB': e.append('registry single visual authority drift')
        lp=r.get('lookupPolicy',{})
        if lp.get('exactRegistryOnly') is not True or lp.get('missingAuthority')!='BLOCK': e.append('registry must stay fail-closed exact-ID only')
        d=r.get('platforms',{}).get('DESKTOP',{}).get('HOME',{})
        if d.get('native4K') is not False: e.append('registry Desktop HOME must remain non-4K until replaced')
        if (d.get('width'),d.get('height'))!=(1672,941): e.append('registry Desktop HOME verified dimensions drift')
        if d.get('runtimeStatus')!='BLOCK_NON_4K_SOURCE_VERIFIED': e.append('registry Desktop HOME must be explicitly blocked')

    if not CSS.is_file():
        e.append('missing Authority CSS')
    else:
        css=CSS.read_text(encoding='utf-8')
        required=[
            'HOME_FINAL_4K_BLOCKED','max-width:3840px','aspect-ratio:16/9',
            'BTN.HOME.CARD.CAD','BTN.HOME.CARD.CAM','BTN.HOME.CARD.SIM','BTN.HOME.CARD.NC','BTN.HOME.QUICK.3AX',
            'HOME.SYSTEM_MESSAGES','pointer-events:auto','pointer-events:none'
        ]
        for token in required:
            if token not in css: e.append('CSS missing HOME blocked-contract token '+token)
        forbidden=['AIG_HOME_BODY_SAFE_Q90_V1.webp','max-width:1672px','aspect-ratio:1672/859','HOME_BODY_R1C1.webp','HOME_BODY_R2C4.webp']
        for token in forbidden:
            if token in css: e.append('obsolete/non-4K HOME runtime reference remains '+token)

    if not INDEX.is_file():
        e.append('missing web/index.html')
    else:
        html=INDEX.read_text(encoding='utf-8')
        for token in ['data-home-runtime','data-home-cad','data-home-cam','data-home-nc','data-open-page="3AX"']:
            if token not in html: e.append('HOME Runtime missing real native state/control '+token)

    if e:
        return fail(e)
    print('WEB_HOME_AUTHORITY_CANVAS_CONTRACT_PASS|AIGII_RGB_REQUIRED|NATIVE_3840X2160_REQUIRED|HOME_FINAL_4K_BLOCKED|NO_IMAGE_SUBSTITUTION|LEGACY_1672_REFERENCE_ONLY|REAL_NATIVE_CONTROLS_PRESERVED')
    return 0

if __name__=='__main__':
    sys.exit(main())
