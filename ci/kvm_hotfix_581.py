from pathlib import Path

p = Path('.github/workflows/build-download.yml')
text = p.read_text(encoding='utf-8')

old = '''      - name: Enable KVM group perms
        shell: bash
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm
          test -w /dev/kvm
          echo 'ANDROID_EMULATOR_KVM_READY=PASS'
'''

new = '''      - name: Enable KVM group perms
        shell: bash
        run: |
          set -euo pipefail
          test -e /dev/kvm
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules || true
          sudo udevadm trigger --name-match=kvm || true
          if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
            sudo chmod 666 /dev/kvm
          fi
          ls -l /dev/kvm
          test -r /dev/kvm
          test -w /dev/kvm
          echo 'ANDROID_EMULATOR_KVM_READY=PASS'
'''

if new in text:
    print('KVM_581_PATCH_ALREADY_PRESENT=PASS')
elif old in text:
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('KVM_581_PATCH_APPLIED=PASS')
else:
    raise SystemExit('KVM_581_EXPECTED_BLOCK_NOT_FOUND')
