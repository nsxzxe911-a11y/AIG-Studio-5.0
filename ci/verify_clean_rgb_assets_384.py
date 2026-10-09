from pathlib import Path
import hashlib, json, sys
root=Path(__file__).resolve().parents[1]
manifest=root/'app-production/src/main/assets/rgb-provenance.json'
errors=[]
if not manifest.exists(): errors.append('PROVENANCE_MANIFEST_MISSING')
else:
    data=json.loads(manifest.read_text(encoding='utf-8-sig'))
    if data.get('checkpoint')!='384': errors.append('CHECKPOINT_MISMATCH')
    for item in data.get('assets',[]):
        clean=root/item['clean']
        source=root/item['source']
        if not clean.exists() or not source.exists(): errors.append('ASSET_PATH_MISSING_'+item['surface'])
        else:
            h=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
            if h(clean)!=h(source): errors.append('SHA_MISMATCH_'+item['surface'])
    if len(data.get('assets',[]))!=10: errors.append('ASSET_COUNT_NOT_10')
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
if 'implementation(project(":app"))' in build: errors.append('LEGACY_APP_DEPENDENCY_FORBIDDEN')
if errors:
    print('CLEAN_RGB_ASSET_RED|'+'|'.join(errors)); sys.exit(1)
print('CLEAN_RGB_ASSET_PASS|AIG_CNC_384|10_OF_10_APPROVED|SHA256|NO_LEGACY_APP')
