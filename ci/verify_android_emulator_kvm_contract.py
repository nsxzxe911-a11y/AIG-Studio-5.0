from pathlib import Path

workflow = Path('.github/workflows/build-download.yml')
text = workflow.read_text(encoding='utf-8')

required = [
    'Enable KVM group perms',
    'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"',
    'sudo udevadm control --reload-rules',
    'sudo udevadm trigger --name-match=kvm',
]
missing = [item for item in required if item not in text]
if missing:
    print('ANDROID_EMULATOR_KVM_CONTRACT_FAIL|' + '|'.join(missing))
    raise SystemExit(1)

print('ANDROID_EMULATOR_KVM_CONTRACT_PASS|UBUNTU_KVM_0666|UDEV_RELOAD|UDEV_TRIGGER')
