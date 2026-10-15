from pathlib import Path

workflow = Path('.github/workflows/build-download.yml')
text = workflow.read_text(encoding='utf-8')

start = text.find('      - name: Studio offline Runtime UI visual evidence')
end = text.find('\n      - uses: actions/upload-artifact@v7', start)
if start < 0 or end < 0:
    print('ANDROID_EMULATOR_SCRIPT_SHELL_CONTRACT_FAIL|EVIDENCE_STEP_MISSING')
    raise SystemExit(1)

block = text[start:end]
errors = []
if 'set -euo pipefail' in block:
    errors.append('BASH_PIPEFAIL_IN_POSIX_SH')
if '            set -eu\n' not in block:
    errors.append('POSIX_SET_EU_MISSING')
if 'adb shell am start -W -n "$PKG/.MainActivity" > "$EVIDENCE/android_launch.txt"' not in block:
    errors.append('ADB_START_EXIT_PRESERVE_MISSING')
if 'cat "$EVIDENCE/android_launch.txt"' not in block:
    errors.append('LAUNCH_EVIDENCE_PRINT_MISSING')
if '| tee "$EVIDENCE/android_launch.txt"' in block:
    errors.append('ADB_START_PIPE_MASKS_EXIT')

if errors:
    print('ANDROID_EMULATOR_SCRIPT_SHELL_CONTRACT_FAIL|' + '|'.join(errors))
    raise SystemExit(1)

print('ANDROID_EMULATOR_SCRIPT_SHELL_CONTRACT_PASS|POSIX_SH|ADB_START_EXIT_PRESERVED|NO_PIPEFAIL')
