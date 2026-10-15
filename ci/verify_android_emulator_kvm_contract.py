from pathlib import Path

workflow = Path('.github/workflows/build-download.yml')
text = workflow.read_text(encoding='utf-8')

required = [
    'Enable KVM group perms',
    'test -e /dev/kvm',
    'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"',
    'sudo udevadm control --reload-rules || true',
    'sudo udevadm trigger --name-match=kvm || true',
    'sudo chmod 666 /dev/kvm',
    'test -r /dev/kvm',
    'test -w /dev/kvm',
    'ANDROID_EMULATOR_KVM_READY=PASS',
]
missing = [item for item in required if item not in text]
if missing:
    print('ANDROID_EMULATOR_KVM_CONTRACT_FAIL|' + '|'.join(missing))
    raise SystemExit(1)

print('ANDROID_EMULATOR_KVM_CONTRACT_PASS|DEVICE_PRESENT|UDEV_BEST_EFFORT|CHMOD_FALLBACK|READ_WRITE_VERIFIED')
