#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]
REG = ROOT / 'design/ui/aigii-rgb-master-registry-v2.json'

MOBILE_SHA = {
    'HOME':'f360cb828ff6d05076792b0d04474503316dea85896f82f6452b0d6c9d7ae99e',
    'CAD':'dc528b399e6a756d1bb76fc9260ae3361cf2437487236725dd0ee8ea2cbcaa75',
    'CAM':'b9c27eb77c8a5bfc5dd932166cf7233c3b9506541ac979e5ac34bb1f82fc79af',
    'SIM':'dd9ce3230ce97a77cd2650c840aa176710292766f52b142865603fdade7c8cb8',
    '3AX':'4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28',
    '4AX':'a46c11e6f08b28dde24df066ac697c4b965079de1cb4df5091e58c7ab60d4a26',
    '5AX':'e8d8b0304873cd6768d93d20a495fa8969c9ec72adb09ba9810da5b3b25ec5b3',
    '6AX':'73f34e958bb22925ceed32b986443240b9322a77bf0cadbc1b81f62501683be6',
    'NC':'51d5ba0f7917ec2608710fcd8826b1defc07bc9dd676870ceae649ab0d9391e3',
    'AI':'92eca87fc882446c5ef0483d80539a9adf45a0d55a3d64be8943155930a67763',
}
DESKTOP_SHA = {
    'HOME':('61e00235ce9a7ac0d18bd0fb115307f7807f18cb32c149d93b50527b929b0ba2',1672,941,False,'BLOCK_NON_4K_SOURCE'),
    'CAD':('228ab62167f1c05e74a4165f5ef84d203fb230575d1149b8034ad2260a1fb264',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    'CAM':('8a517c7763da0830c027c6832e2e2ee10a3590b18ba0a184a7e37eee4a1d0b32',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    'SIM':('d0a858d0ba2807a39aaad8118e5a0e32c4a98b18f22b4200c15476364c87b2b9',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    '3AX':('c1f6eb8d2e2cbd0fb516f92f8f072ea90e511011432a15131d7c7a85235901fc',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    '4AX':('00ba1850278a32c0c847d731686e636ca6e4b62791206ba51da79ab8135f54c4',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    '5AX':('a1a12e90c4c7d6e5b0943226bfe13b3b38a2583771b18a7e6f315ffda8e591d0',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    '6AX':('bd44917891ae5c169c7f5b737af275d54a8476fa59060681ce6da6b56bf207b2',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    'NC':('675ec815e92b6f30b42ca6ac2883cc551ca0169e6091cef1a5b18cfa53b1194f',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
    'AI':('4763def7ec1472c9054d55ae61791dfb4b4b1246103980f56294cfe80f9912cd',3840,2160,True,'REGISTERED_4K_SOURCE_NOT_CURRENT_ALIAS'),
}

def fail(errors):
    print('AIGII_RGB_MASTER_REGISTRY_V2_FAIL')
    for e in errors:
        print(' -', e)
    return 1

def main():
    if not REG.is_file():
        return fail(['missing design/ui/aigii-rgb-master-registry-v2.json'])
    try:
        r = json.loads(REG.read_text(encoding='utf-8'))
    except Exception as ex:
        return fail([f'invalid registry JSON: {ex}'])

    e=[]
    if r.get('registryId') != 'AIGII-RGB-MASTER-REGISTRY-V2-20261018': e.append('registryId drift')
    if r.get('status') != 'ACTIVE_FAIL_CLOSED': e.append('registry must be ACTIVE_FAIL_CLOSED')
    if r.get('singleVisualAuthority') != 'AIG-II_RGB': e.append('single visual authority drift')
    lp=r.get('lookupPolicy',{})
    if lp.get('exactRegistryOnly') is not True: e.append('exactRegistryOnly must be true')
    for k in ('filenameFallback','semanticFallback','recentFileFallback'):
        if lp.get(k) is not False: e.append(f'{k} must be false')
    if lp.get('missingAuthority') != 'BLOCK': e.append('missingAuthority must BLOCK')

    sm=r.get('sourceManifests',{})
    mca=sm.get('mobileCurrentApproved',{})
    if mca.get('authorityId') != 'AIG_MOBILE_CURRENT_APPROVED_V1_20261016': e.append('mobile current-approved authorityId drift')
    if mca.get('dimensionStatus') != 'PENDING_4K_BYTE_VERIFICATION': e.append('mobile 4K dimension gate must stay pending')
    dsrc=sm.get('desktop438Source',{})
    if dsrc.get('authorityRoot') != '/AIG-II/438/ImageAuthority': e.append('desktop authority root drift')
    if dsrc.get('currentApprovedAliasFound') is not False: e.append('desktop current alias must remain unresolved')

    mobile=r.get('platforms',{}).get('MOBILE',{})
    for page,sha in MOBILE_SHA.items():
        x=mobile.get(page,{})
        if x.get('sha256')!=sha: e.append(f'MOBILE {page} SHA drift')
        if x.get('identityStatus')!='CURRENT_APPROVED': e.append(f'MOBILE {page} identity must be CURRENT_APPROVED')
        if x.get('dimensionStatus')!='PENDING_4K_BYTE_VERIFICATION': e.append(f'MOBILE {page} dimension status must stay pending')
        if x.get('runtimeStatus')!='BLOCK_4K_FINAL_UNTIL_DIMENSION_VERIFIED': e.append(f'MOBILE {page} must block 4K final')

    desktop=r.get('platforms',{}).get('DESKTOP',{})
    for page,(sha,w,h,native,status) in DESKTOP_SHA.items():
        x=desktop.get(page,{})
        if x.get('sha256')!=sha: e.append(f'DESKTOP {page} SHA drift')
        if (x.get('width'),x.get('height'))!=(w,h): e.append(f'DESKTOP {page} dimensions drift')
        if x.get('native4K') is not native: e.append(f'DESKTOP {page} native4K drift')
        if x.get('runtimeStatus')!=status: e.append(f'DESKTOP {page} runtime status drift')

    pm=r.get('projectMappings',{})
    if pm.get('AIG-II',{}).get('pages') != ['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']:
        e.append('AIG-II page scope drift')
    if pm.get('AIG',{}).get('pages') != ['HOME','CAD','CAM','SIM','3AX','NC','AI']:
        e.append('AIG first-project page scope drift')
    if pm.get('AIG',{}).get('notMounted') != ['4AX','5AX','6AX']:
        e.append('AIG notMounted drift')

    cp=r.get('cropPolicy',{})
    if cp.get('preferApprovedMasterCrop') is not True: e.append('approved master crop must be preferred')
    if cp.get('noUpscaleTo4K') is not True: e.append('noUpscaleTo4K must be true')
    required={'masterAuthorityId','sourceSHA256','x','y','w','h','normalizedBounds','cropSHA256'}
    if required != set(cp.get('provenanceRequired',[])): e.append('crop provenance contract drift')

    if e: return fail(e)
    print('AIGII_RGB_MASTER_REGISTRY_V2_PASS|EXACT_ID_ONLY|MOBILE_CURRENT_APPROVED_IDENTITY|MOBILE_4K_PENDING|DESKTOP_4K_SOURCES_LOCKED|HOME_NON4K_BLOCKED|AIGII_SINGLE_VISUAL_AUTHORITY|AIG_SCOPE_PROJECTION')
    return 0

if __name__ == '__main__':
    sys.exit(main())
