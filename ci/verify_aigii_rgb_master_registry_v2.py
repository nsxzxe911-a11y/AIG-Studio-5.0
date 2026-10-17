#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]
REG = ROOT / 'design/ui/aigii-rgb-master-registry-v2.json'

MOBILE = {
    'LOGIN':('ac08f30f583440e58e4bb6e7c0d301edbc1838b95dbef4a601ec351519325225',941,1672,'file_000000003a908211bf58968481afb8fb'),
    'HOME':('f360cb828ff6d05076792b0d04474503316dea85896f82f6452b0d6c9d7ae99e',941,1672,'file_00000000723482119c36d24ba9845ef6'),
    'CAD':('dc528b399e6a756d1bb76fc9260ae3361cf2437487236725dd0ee8ea2cbcaa75',941,1672,'file_0000000024bc820982dce24971445c13'),
    'CAM':('b9c27eb77c8a5bfc5dd932166cf7233c3b9506541ac979e5ac34bb1f82fc79af',941,1672,'file_000000002cb88209a5cb864582b4f9c0'),
    'SIM':('dd9ce3230ce97a77cd2650c840aa176710292766f52b142865603fdade7c8cb8',902,1536,'file_00000000e75c820995e04a3ce5e06913'),
    '3AX':('4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28',864,1536,'file_000000000f4482119606ae29b2a928d4'),
    '4AX':('a46c11e6f08b28dde24df066ac697c4b965079de1cb4df5091e58c7ab60d4a26',864,1536,'file_00000000ad9082119f3bd36d2610647a'),
    '5AX':('e8d8b0304873cd6768d93d20a495fa8969c9ec72adb09ba9810da5b3b25ec5b3',864,1536,'file_00000000958c821185e4480bf128e8c0'),
    '6AX':('73f34e958bb22925ceed32b986443240b9322a77bf0cadbc1b81f62501683be6',864,1536,'file_0000000076608209a51e33f6e97eb3a8'),
    'NC':('51d5ba0f7917ec2608710fcd8826b1defc07bc9dd676870ceae649ab0d9391e3',941,1672,'file_0000000020d082118ec8f3a29a5e77d4'),
    'AI':('92eca87fc882446c5ef0483d80539a9adf45a0d55a3d64be8943155930a67763',941,1672,'file_000000001af88209ba31554fb83450b6'),
}

DESKTOP = {
    'HOME':('61e00235ce9a7ac0d18bd0fb115307f7807f18cb32c149d93b50527b929b0ba2',1672,941,False,'BLOCK_NON_4K_SOURCE_VERIFIED','file_0000000020908209822a821f6fcd5015'),
    'CAD':('228ab62167f1c05e74a4165f5ef84d203fb230575d1149b8034ad2260a1fb264',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_00000000c4f882098b09b67431c8ecf8'),
    'CAM':('8a517c7763da0830c027c6832e2e2ee10a3590b18ba0a184a7e37eee4a1d0b32',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_000000000acc8209a03c0e081e2b5300'),
    'SIM':('d0a858d0ba2807a39aaad8118e5a0e32c4a98b18f22b4200c15476364c87b2b9',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_000000006cec820990231d2cf2ca22bb'),
    '3AX':('c1f6eb8d2e2cbd0fb516f92f8f072ea90e511011432a15131d7c7a85235901fc',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_000000000124820989ba45551f1ef397'),
    '4AX':('00ba1850278a32c0c847d731686e636ca6e4b62791206ba51da79ab8135f54c4',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_00000000171c8209b85ecce64d7286dc'),
    '5AX':('a1a12e90c4c7d6e5b0943226bfe13b3b38a2583771b18a7e6f315ffda8e591d0',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_000000002edc82099cfe64483632b70b'),
    '6AX':('bd44917891ae5c169c7f5b737af275d54a8476fa59060681ce6da6b56bf207b2',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_0000000038608209a61a3027af681550'),
    'NC':('675ec815e92b6f30b42ca6ac2883cc551ca0169e6091cef1a5b18cfa53b1194f',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_00000000a34c8209b6d3b0b71455fa3d'),
    'AI':('4763def7ec1472c9054d55ae61791dfb4b4b1246103980f56294cfe80f9912cd',3840,2160,True,'VERIFIED_4K_SOURCE_NOT_CURRENT_ALIAS','file_00000000bbc88209bae1912b524f1780'),
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
    if mca.get('dimensionStatus') != 'VERIFIED_NON_4K_CURRENT_APPROVED': e.append('mobile current-approved dimension status must be VERIFIED_NON_4K_CURRENT_APPROVED')
    dsrc=sm.get('desktop438Source',{})
    if dsrc.get('authorityRoot') != '/AIG-II/438/ImageAuthority': e.append('desktop authority root drift')
    if dsrc.get('currentApprovedAliasFound') is not False: e.append('desktop current alias must remain unresolved')

    mobile=r.get('platforms',{}).get('MOBILE',{})
    for page,(sha,w,h,file_id) in MOBILE.items():
        x=mobile.get(page,{})
        if x.get('sha256')!=sha: e.append(f'MOBILE {page} SHA drift')
        if x.get('libraryFileId')!=file_id: e.append(f'MOBILE {page} exact Library file ID drift')
        if x.get('identityStatus')!='CURRENT_APPROVED': e.append(f'MOBILE {page} identity must be CURRENT_APPROVED')
        if (x.get('width'),x.get('height'))!=(w,h): e.append(f'MOBILE {page} verified dimensions drift')
        if x.get('dimensionStatus')!='VERIFIED_NON_4K': e.append(f'MOBILE {page} dimension status must be VERIFIED_NON_4K')
        if x.get('rawByteStatus')!='VERIFIED': e.append(f'MOBILE {page} raw-byte verification missing')
        if x.get('runtimeStatus')!='BLOCK_NON_4K_CURRENT_APPROVED': e.append(f'MOBILE {page} must block non-4K current-approved asset')

    desktop=r.get('platforms',{}).get('DESKTOP',{})
    for page,(sha,w,h,native,status,file_id) in DESKTOP.items():
        x=desktop.get(page,{})
        if x.get('sha256')!=sha: e.append(f'DESKTOP {page} SHA drift')
        if x.get('libraryFileId')!=file_id: e.append(f'DESKTOP {page} exact Library file ID drift')
        if (x.get('width'),x.get('height'))!=(w,h): e.append(f'DESKTOP {page} dimensions drift')
        if x.get('native4K') is not native: e.append(f'DESKTOP {page} native4K drift')
        if x.get('rawByteStatus')!='VERIFIED': e.append(f'DESKTOP {page} raw-byte verification missing')
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
    print('AIGII_RGB_MASTER_REGISTRY_V2_PASS|EXACT_ID_ONLY|MOBILE_CURRENT_APPROVED_IDENTITY|MOBILE_NON4K_VERIFIED|DESKTOP_RAW_BYTES_VERIFIED|HOME_NON4K_BLOCKED|AIGII_SINGLE_VISUAL_AUTHORITY|AIG_SCOPE_PROJECTION')
    return 0

if __name__ == '__main__':
    sys.exit(main())
