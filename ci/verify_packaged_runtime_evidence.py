#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib
from pathlib import Path

p=argparse.ArgumentParser(description='Black-box AIG packaged Runtime evidence verifier')
p.add_argument('--android-apk',required=True)
p.add_argument('--windows-exe',required=True)
p.add_argument('--android-home',required=True)
p.add_argument('--windows-home',required=True)
p.add_argument('--android-contact-sheet',required=True)
p.add_argument('--windows-contact-sheet',required=True)
p.add_argument('--android-gpu-proof')
p.add_argument('--windows-gpu-proof')
p.add_argument('--require-gpu',action='store_true')
a=p.parse_args()

def need_file(label:str,value:str,min_bytes:int)->Path:
    f=Path(value)
    if not f.is_file(): raise SystemExit(f'PACKAGED_RUNTIME_EVIDENCE_FAIL|{label}|MISSING|{f}')
    if f.stat().st_size<min_bytes: raise SystemExit(f'PACKAGED_RUNTIME_EVIDENCE_FAIL|{label}|TOO_SMALL|{f.stat().st_size}')
    return f

def sha256(f:Path)->str:
    h=hashlib.sha256()
    with f.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

files={
    'ANDROID_APK':need_file('ANDROID_APK',a.android_apk,1_000_000),
    'WINDOWS_EXE':need_file('WINDOWS_EXE',a.windows_exe,100_000),
    'ANDROID_HOME':need_file('ANDROID_HOME',a.android_home,10_000),
    'WINDOWS_HOME':need_file('WINDOWS_HOME',a.windows_home,10_000),
    'ANDROID_10_SURFACE_CONTACT_SHEET':need_file('ANDROID_10_SURFACE_CONTACT_SHEET',a.android_contact_sheet,20_000),
    'WINDOWS_10_SURFACE_CONTACT_SHEET':need_file('WINDOWS_10_SURFACE_CONTACT_SHEET',a.windows_contact_sheet,20_000),
}
if a.require_gpu:
    if not a.android_gpu_proof or not a.windows_gpu_proof:
        raise SystemExit('PACKAGED_RUNTIME_EVIDENCE_FAIL|GPU_PROOF_ARGUMENTS_REQUIRED')
    files['ANDROID_GPU_PROOF']=need_file('ANDROID_GPU_PROOF',a.android_gpu_proof,2_000)
    files['WINDOWS_GPU_PROOF']=need_file('WINDOWS_GPU_PROOF',a.windows_gpu_proof,2_000)

print('PACKAGED_RUNTIME_EVIDENCE_READY')
for label,f in files.items(): print(f'{label}|{f.stat().st_size}|SHA256={sha256(f)}|{f}')
print('NOTE|This proves supplied artifacts exist; human/runtime review still owns visual and interaction acceptance.')
